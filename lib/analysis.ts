import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { pipeline } from "@xenova/transformers";

let classifier: any = null;
async function getClassifier() {
  if (!classifier) {
    classifier = await pipeline(
      "zero-shot-classification",
      "Xenova/nli-deberta-v3-xsmall"
    );
  }
  return classifier;
}

// Split long text into manageable chunks, breaking on sentence boundaries
// where possible so we don't cut mid-sentence.
function chunkText(text: string, maxChars = 800): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? " " : "") + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

// Run zero-shot classification across all chunks, then average the
// scores per label (weighted by chunk length) to get an overall result
// for the whole text instead of just the first ~512 tokens.
async function classifyLongText(text: string, labels: string[]) {
  const clf = await getClassifier();
  const chunks = chunkText(text);

  const labelTotals: Record<string, number> = {};
  labels.forEach((l) => (labelTotals[l] = 0));
  let totalWeight = 0;

  for (const chunk of chunks) {
    const result = await clf(chunk, labels);
    const weight = chunk.length;
    result.labels.forEach((label: string, i: number) => {
      labelTotals[label] += result.scores[i] * weight;
    });
    totalWeight += weight;
  }

  const averaged = labels
    .map((label) => ({
      label,
      score: totalWeight > 0 ? labelTotals[label] / totalWeight : 0,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    labels: averaged.map((a) => a.label),
    scores: averaged.map((a) => a.score),
    chunkCount: chunks.length,
  };
}

// 1. Stance detection — is the text FOR or AGAINST a specific topic?
export const stanceDetectionTool = tool(
  async ({ text, topic }: { text: string; topic: string }) => {
    const result = await classifyLongText(text, [
      `in favor of ${topic}`,
      `against ${topic}`,
      `neutral about ${topic}`,
    ]);
    return JSON.stringify(result);
  },
  {
    name: "stance_detection",
    description:
      "Detect whether a piece of text (e.g. a video transcript) is in favor of, against, or neutral about a specific topic. Handles long text by analyzing it in chunks and averaging results. Provide the text and the topic to check stance on, e.g. topic: 'AI'.",
    schema: z.object({
      text: z.string().describe("The text to analyze"),
      topic: z
        .string()
        .describe("The topic to detect stance toward, e.g. 'AI', 'climate change'"),
    }),
  }
);

// 2. Emotion detection — finer-grained emotional tone, with optional custom labels
const DEFAULT_EMOTIONS = [
  "anger",
  "animosity",
  "fear",
  "joy",
  "sadness",
  "disgust",
  "surprise",
  "neutral",
];

export const emotionDetectionTool = tool(
  async ({ text, emotions }: { text: string; emotions?: string[] }) => {
    const labels =
      emotions && emotions.length > 0 ? emotions : DEFAULT_EMOTIONS;
    const result = await classifyLongText(text, labels);
    return JSON.stringify(result);
  },
  {
    name: "emotion_detection",
    description:
      "Detect the dominant emotion expressed in a piece of text. By default checks for anger, animosity, fear, joy, sadness, disgust, surprise, and neutral — but you can pass a custom list of emotions to check for instead if the context calls for something more specific (e.g. excitement, hope, anxiety, sarcasm).",
    schema: z.object({
      text: z.string().describe("The text to analyze for emotional tone"),
      emotions: z
        .array(z.string())
        .optional()
        .describe(
          "Optional custom list of emotion labels to check for, instead of the default set"
        ),
    }),
  }
);