import { useEffect, useRef, useState } from "react";
import { useAIChat, type ChatMessage } from "../stores/useAIChat";
import { cn } from "../../../util/cn";

interface AIChatProps {
    /** Current code from the editor */
    currentCode: string;
    /** Callback when new code is generated */
    onCodeGenerated: (code: string) => void;
}

const ChatMessageBubble = ({ message }: { message: ChatMessage }) => {
    const isUser = message.role === "user";

    return (
        <div
            className={cn(
                "flex w-full",
                isUser ? "justify-end" : "justify-start",
            )}
        >
            <div
                className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    isUser
                        ? "bg-primary text-primary-content rounded-br-md"
                        : "bg-base-200 text-base-content rounded-bl-md",
                )}
            >
                {isUser
                    ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    )
                    : (
                        <div className="whitespace-pre-wrap">
                            {/* For assistant, show just the explanation, not the full code */}
                            {message.generatedCode
                                ? (
                                    <>
                                        <p>
                                            {message.content
                                                .replace(
                                                    /```(?:javascript|js)?\s*\n[\s\S]*?```/g,
                                                    "",
                                                )
                                                .trim() || "コードを更新しました！"}
                                        </p>
                                        <p className="text-xs opacity-70 mt-1">
                                            ✓ コードを反映しました
                                        </p>
                                    </>
                                )
                                : message.content}
                        </div>
                    )}
            </div>
        </div>
    );
};

const LoadingIndicator = () => (
    <div className="flex justify-start w-full">
        <div className="bg-base-200 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-base-content/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-base-content/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-base-content/50 rounded-full animate-bounce" />
            </div>
        </div>
    </div>
);

const StreamingBubble = ({ content }: { content: string }) => {
    // Remove code blocks from display, show just the explanation
    const displayContent = content
        .replace(/```(?:javascript|js)?\s*\n[\s\S]*?```/g, "")
        .trim();

    return (
        <div className="flex justify-start w-full">
            <div className="max-w-[85%] bg-base-200 text-base-content rounded-2xl rounded-bl-md px-4 py-2 text-sm">
                <div className="whitespace-pre-wrap">
                    {displayContent || "考え中..."}
                    <span className="inline-block w-2 h-4 bg-base-content/50 ml-1 animate-pulse" />
                </div>
            </div>
        </div>
    );
};

export const AIChat = ({ currentCode, onCodeGenerated }: AIChatProps) => {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const { messages, isLoading, streamingContent, error, sendMessage, clearError } =
        useAIChat();

    // Auto-scroll to bottom when new messages arrive or streaming updates
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading, streamingContent]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) return;

        setInput("");

        const generatedCode = await sendMessage(trimmedInput, currentCode);

        if (generatedCode) {
            onCodeGenerated(generatedCode);
        }

        // Focus back on input
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Enter (without Shift)
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flex flex-col h-full bg-base-100">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {messages.length === 0
                    ? (
                        <div className="flex flex-col items-center justify-center h-full text-base-content/50 text-center p-4">
                            <div className="text-4xl mb-2">🎮</div>
                            <p className="text-sm">
                                AIにゲームの作り方を教えてもらおう！
                            </p>
                            <p className="text-xs mt-2 opacity-70">
                                例：「キャラクターを追加して」「ジャンプさせて」
                            </p>
                        </div>
                    )
                    : (
                        <>
                            {messages.map((msg) => (
                                <ChatMessageBubble key={msg.id} message={msg} />
                            ))}
                        </>
                    )}

                {isLoading && (
                    streamingContent
                        ? <StreamingBubble content={streamingContent} />
                        : <LoadingIndicator />
                )}

                {error && (
                    <div className="bg-error/20 text-error rounded-lg p-3 text-sm">
                        <p className="font-medium">{error.message}</p>
                        {error.details && (
                            <p className="text-xs mt-1 opacity-70">
                                {error.details}
                            </p>
                        )}
                        <button
                            className="text-xs underline mt-2"
                            onClick={clearError}
                        >
                            閉じる
                        </button>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input area - optimized for tablet touch */}
            <form
                onSubmit={handleSubmit}
                className="border-t border-base-200 p-3 sm:p-4"
            >
                <div className="flex gap-2 sm:gap-3 items-end">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="AIに指示を出そう..."
                        className="textarea textarea-bordered flex-1 min-h-[52px] sm:min-h-[56px] max-h-32 resize-none text-base sm:text-lg"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className={cn(
                            "btn btn-primary min-w-[52px] min-h-[52px] sm:min-w-[56px] sm:min-h-[56px]",
                            isLoading && "loading",
                        )}
                        disabled={!input.trim() || isLoading}
                    >
                        {!isLoading && (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-6 h-6"
                            >
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                            </svg>
                        )}
                    </button>
                </div>
                <p className="text-xs text-base-content/50 mt-2 text-center hidden sm:block">
                    Enterで送信 / Shift+Enterで改行
                </p>
            </form>
        </div>
    );
};

export default AIChat;
