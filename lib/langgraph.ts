import {
  AIMessage,
  BaseMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import SYSTEM_MESSAGE from "@/constants/systemMessage";
import { tools } from "@/lib/tools";

const trimmer = trimMessages({
  maxTokens: 10,
  strategy: "last",
  tokenCounter: (msgs) => msgs.length,
  includeSystem: true,
  allowPartial: false,
  startOn: "human",
});

const toolNode = new ToolNode(tools);

const initialiseModel = () => {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-lite",
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.7,
    maxOutputTokens: 4096,
    streaming: true,
  }).bindTools(tools);

  return model;
};

function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  if (lastMessage.tool_calls?.length) {
    return "tools";
  }

  if (lastMessage.content && lastMessage._getType() === "tool") {
    return "agent";
  }

  return END;
}

const createWorkflow = () => {
  const model = initialiseModel();

  return new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state, config) => {
      const systemContent = SYSTEM_MESSAGE;

      const promptTemplate = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemContent),
        new MessagesPlaceholder("messages"),
      ]);

      const trimmedMessages = await trimmer.invoke(state.messages);
      const prompt = await promptTemplate.invoke({ messages: trimmedMessages });

      const response = await model.invoke(prompt, config);

      return { messages: [response] };
    })
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");
};

export async function submitQuestion(messages: BaseMessage[], chatId: string) {
  const workflow = createWorkflow();

  const checkpointer = new MemorySaver();
  const app = workflow.compile({ checkpointer });

  const stream = await app.streamEvents(
    { messages },
    {
      version: "v2",
      configurable: { thread_id: chatId },
      streamMode: "messages",
      runId: chatId,
    }
  );
  return stream;
}