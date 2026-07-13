"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BotIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const createChat = useMutation(api.chats.createChat);
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isCreating) return;

    setIsCreating(true);
    try {
      const title =
        trimmedInput.length > 50
          ? trimmedInput.slice(0, 50) + "..."
          : trimmedInput;

      const chatId = await createChat({ title });

      router.push(
        `/dashboard/chat/${chatId}?initialMessage=${encodeURIComponent(
          trimmedInput
        )}`
      );
    } catch (error) {
      console.error("Failed to create chat:", error);
      setIsCreating(false);
    }
  };

  return (
    <main className="flex flex-col h-[calc(100vh-theme(spacing.14))]">
      <section className="flex-1 flex items-center justify-center p-4 overflow-y-auto">
        <div className="relative max-w-2xl w-full">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-gray-100 to-gray-50/50 rounded-3xl"></div>
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f5f5f5_1px,transparent_1px),linear-gradient(to_bottom,#f5f5f5_1px,transparent_1px)] bg-[size:4rem_4rem] rounded-3xl"></div>

          <div className="relative space-y-6 p-8 text-center">
            <div className="bg-white/60 backdrop-blur-sm shadow-sm ring-1 ring-gray-200/50 rounded-2xl p-6 space-y-4">
              <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl p-4 inline-flex">
                <BotIcon className="w-12 h-12 text-gray-600" />
              </div>
              <h2 className="text-2xl font-semibold bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Welcome to the AI Agent Chat
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                Start a new conversation below. Your AI assistant is ready to
                help with any task.
              </p>
              <div className="pt-2 flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Real-time responses
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  Stock data & calculations
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  Research tools
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Agent..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
              disabled={isCreating}
              autoFocus
            />
            <Button
              type="submit"
              disabled={isCreating || !input.trim()}
              className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <ArrowRight />
            </Button>
          </div>
        </form>
      </footer>
    </main>
  );
}