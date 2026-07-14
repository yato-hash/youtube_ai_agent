# AI Agent Assistant

A tool-using AI chat agent built with Next.js and Google's Gemini API. Unlike a plain chatbot, it can decide on its own when to look something up, pull live data, or run a calculation instead of just generating text from what it already knows.

**Live demo:** [youtube-ai-agent-alpha.vercel.app](https://youtube-ai-agent-alpha.vercel.app)

## Overview

The app is a real-time chat interface where the assistant has access to a set of tools it can call mid-conversation. When you ask something that needs current information or exact computation, the agent picks the right tool, runs it, and folds the result back into its response — all streamed to the UI as it happens, including a live view of each tool call's input and output.

The agent logic (deciding what to do next: answer directly, call a tool, or call another tool based on the last result) is built as a graph using LangGraph, rather than a single prompt-and-response call.

## Features

- Real-time streaming responses (Server-Sent Events)
- Tool-calling agent that chains multiple tools together when a question needs it
- Persistent, per-user chat history (Convex)
- Authentication (Clerk)
- Auto-create and auto-send: typing a message on the landing screen creates a new chat and sends it immediately, without a separate "new chat" step
- Live terminal-style view of each tool call in the chat, showing exactly what was sent and what came back
- Collapsible sidebar with chat history, works on both desktop and mobile

## Tools

| Tool | Description |
|---|---|
| `youtube_transcript` | Retrieves the transcript of a YouTube video for summarizing, analyzing tone, or answering questions about its content |
| `google_books` | Searches Google Books by title, author, or keyword |
| `wikipedia` | Looks up a topic on Wikipedia; also used proactively to explain unfamiliar terms (e.g. "P/E ratio") in plain language |
| `stock_data` | Returns current price, open/high/low, volume, and daily change for a given stock ticker (Alpha Vantage) |
| `calculator` | Evaluates exact mathematical expressions — used for financial math like compound interest, since LLMs are unreliable at multi-step arithmetic on their own |

## Tech stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS, shadcn/ui
- **Auth:** Clerk
- **Database:** Convex
- **LLM orchestration:** LangChain, LangGraph
- **Model:** Google Gemini (`gemini-2.5-flash`)
- **Streaming transport:** Server-Sent Events over a Next.js API route

## Project structure

```
app/
  api/chat/stream/route.ts    # SSE endpoint, streams the agent's response
  dashboard/                  # Chat UI (landing page + individual chat pages)
components/
  ChatInterface.tsx            # Main chat UI, handles streaming and tool-call display
  Sidebar.tsx                  # Chat history, collapsible nav
  Header.tsx
lib/
  langgraph.ts                 # Agent graph definition (model, tools, routing logic)
  tools.ts                     # Tool definitions (youtube_transcript, stock_data, etc.)
  context/navigation.tsx       # Sidebar open/close state
constants/
  systemMessage.ts             # System prompt and tool usage instructions
convex/
  schema.ts, chats.ts, messages.ts   # Database schema and queries/mutations
```

## Environment variables

Create a `.env.local` file in the project root:

```
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
GOOGLE_API_KEY=
GOOGLE_BOOKS_API_KEY=
ALPHA_VANTAGE_API_KEY=
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Convex dashboard, after creating a project |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk dashboard, API Keys section |
| `GOOGLE_API_KEY` | Google AI Studio |
| `GOOGLE_BOOKS_API_KEY` | Google Cloud Console → enable Books API → create an API key |
| `ALPHA_VANTAGE_API_KEY` | alphavantage.co — free instant signup |

## Running locally

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:3000`.

## Deploying

The project is deployed on Vercel. A few things worth knowing if you're deploying your own copy:

- Add every variable from `.env.local` into Vercel's **Project Settings → Environment Variables** — Vercel doesn't read the local `.env.local` file, so this step is easy to miss.
- If you're using Clerk, add your Vercel domain under Clerk's dashboard (Development instances auto-detect the deploy domain, but it's worth confirming sign-in works on the live URL before assuming it's fine).
- The chat API route needs the Node.js runtime, not Edge (see below) — make sure that isn't accidentally changed during deployment.

## Notes on the implementation

- The API route that streams chat responses runs on the **Node.js runtime** (`export const runtime = "nodejs"`), not Edge — this is required for full compatibility with the packages used in the agent pipeline.
- Tool calls are plain LangChain tools (`tool()` + Zod schemas) defined directly in the codebase, rather than routed through an external hosted tool-calling service — this avoids a dependency on third-party infrastructure for core functionality.
- The frontend parses a custom SSE protocol distinguishing plain text tokens, tool-call start/end events, and stream completion, which is what powers the live tool-call terminal view in the chat.

## License

MIT
