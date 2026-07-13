import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 1. YouTube Transcript
export const youtubeTranscriptTool = tool(
  async ({ videoUrl }: { videoUrl: string }) => {
    const videoIdMatch = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    if (!videoId) return "Invalid YouTube URL provided.";

    const { YoutubeTranscript } = await import("youtube-transcript");
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const text = transcript.map((t) => t.text).join(" ");
      return JSON.stringify({ videoId, transcript: text });
    } catch (err) {
      return `Failed to fetch transcript: ${(err as Error).message}`;
    }
  },
  {
    name: "youtube_transcript",
    description:
      "Retrieve transcripts for a given YouTube video. Provide videoUrl in the format https://www.youtube.com/watch?v=VIDEO_ID. Returns the video title and timestamped captions.",
    schema: z.object({
      videoUrl: z.string().describe("Full YouTube video URL"),
    }),
  }
);

// 2. Google Books
export const googleBooksTool = tool(
  async ({ q }: { q: string }) => {
    const normalizedQuery = q.replace(/\+/g, " ");
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      normalizedQuery
    )}${apiKey ? `&key=${apiKey}` : ""}`;

    const res = await fetch(url);
    if (!res.ok) {
      return `Google Books API error: ${res.status} ${res.statusText}`;
    }
    const data = await res.json();
    return JSON.stringify(data.items?.slice(0, 5) ?? []);
  },
  {
    name: "google_books",
    description:
      "Retrieve information from Google Books. Find books by search string, for example to search for Daniel Keyes 'Flowers for Algernon' use q: 'intitle:flowers+inauthor:keyes'",
    schema: z.object({
      q: z.string().describe("Google Books search query string"),
    }),
  }
);

// 3. Wikipedia
export const wikipediaTool = tool(
  async ({ query }: { query: string }) => {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query
      )}&format=json&origin=*`
    );
    const searchData = await searchRes.json();
    const topResult = searchData.query?.search?.[0];
    if (!topResult) return "No Wikipedia results found.";

    const pageRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(
        topResult.title
      )}&format=json&origin=*`
    );
    const pageData = await pageRes.json();
    const pages = pageData.query?.pages ?? {};
    const page = Object.values(pages)[0] as any;

    return JSON.stringify({ title: topResult.title, extract: page?.extract });
  },
  {
    name: "wikipedia",
    description: "Retrieve information from Wikipedia.",
    schema: z.object({
      query: z.string().describe("Search term to look up on Wikipedia"),
    }),
  }
);

// 4. Stock Data (Stooq — free, no API key required)
export const stockDataTool = tool(
  async ({ ticker }: { ticker: string }) => {
    const symbol = ticker.trim().toUpperCase();
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      return "Stock data tool is not configured: missing ALPHA_VANTAGE_API_KEY.";
    }

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) {
      return `Stock data API error: ${res.status} ${res.statusText}`;
    }

    const data = await res.json();
    const quote = data["Global Quote"];

    if (!quote || Object.keys(quote).length === 0) {
      return `No stock data found for ticker "${ticker}". It may be an invalid symbol, or the free API rate limit (25 requests/day) may have been reached.`;
    }

    return JSON.stringify({
      symbol: quote["01. symbol"],
      open: quote["02. open"],
      high: quote["03. high"],
      low: quote["04. low"],
      price: quote["05. price"],
      volume: quote["06. volume"],
      latestTradingDay: quote["07. latest trading day"],
      previousClose: quote["08. previous close"],
      change: quote["09. change"],
      changePercent: quote["10. change percent"],
    });
  },
  {
    name: "stock_data",
    description:
      "Retrieve the latest stock price and trading data for a given ticker symbol (e.g. 'AAPL' for Apple, 'GOOGL' for Google, 'TSLA' for Tesla). Returns current price, open, high, low, volume, previous close, and percent change.",
    schema: z.object({
      ticker: z.string().describe("Stock ticker symbol, e.g. 'AAPL'"),
    }),
  }
);

// 5. Calculator (precise math, since LLMs are unreliable at exact arithmetic)
export const calculatorTool = tool(
  async ({ expression }: { expression: string }) => {
    try {
      const math = await import("mathjs");
      const result = math.evaluate(expression);
      return JSON.stringify({ expression, result });
    } catch (err) {
      return `Failed to evaluate expression "${expression}": ${(err as Error).message}`;
    }
  },
  {
    name: "calculator",
    description:
      "Evaluate a precise mathematical expression. Use this for any calculation instead of computing it yourself, especially for financial math like compound interest, percentages, loan payments, or multi-step arithmetic. Supports standard math syntax, e.g. '1000 * (1 + 0.05)^10' or 'sqrt(144) + 3^2'.",
    schema: z.object({
      expression: z
        .string()
        .describe("A mathematical expression to evaluate, e.g. '500 * 1.05^3'"),
    }),
  }
);

export const tools = [
  youtubeTranscriptTool,
  googleBooksTool,
  wikipediaTool,
  stockDataTool,
  calculatorTool,
];