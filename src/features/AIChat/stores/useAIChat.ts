import { create } from "zustand";
import { SYSTEM_PROMPT } from "../systemPrompt";

export interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    /** If this is an assistant message, the generated code (if any) */
    generatedCode?: string;
}

interface AIError {
    message: string;
    details?: string;
}

interface AIChatState {
    /** Chat message history (for UI display only, not sent to LLM) */
    messages: ChatMessage[];
    /** Whether we're currently waiting for a response */
    isLoading: boolean;
    /** Current streaming content (updated in real-time) */
    streamingContent: string;
    /** Current error, if any */
    error: AIError | null;
    /** Whether AI chat feature is enabled */
    isEnabled: boolean;
}

interface AIChatActions {
    /** Send a message to the AI */
    sendMessage: (
        userMessage: string,
        currentCode: string,
    ) => Promise<string | null>;
    /** Clear chat history */
    clearHistory: () => void;
    /** Clear error */
    clearError: () => void;
    /** Set enabled state */
    setEnabled: (enabled: boolean) => void;
}

type AIChatStore = AIChatState & AIChatActions;

const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * Extract code from markdown code blocks
 */
const extractCode = (content: string): string | null => {
    // Match ```javascript or ```js or just ```
    const codeBlockRegex = /```(?:javascript|js)?\s*\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);
    return match ? match[1].trim() : null;
};

/**
 * Parse Anthropic SSE stream and extract text content
 */
async function* parseAnthropicStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<string> {
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;

                try {
                    const parsed = JSON.parse(data);
                    // Anthropic streaming format: content_block_delta contains text
                    if (
                        parsed.type === "content_block_delta"
                        && parsed.delta?.type === "text_delta"
                    ) {
                        yield parsed.delta.text;
                    }
                } catch {
                    // Ignore JSON parse errors for incomplete chunks
                }
            }
        }
    }
}

export const useAIChat = create<AIChatStore>((set, get) => ({
    // State
    messages: [],
    isLoading: false,
    streamingContent: "",
    error: null,
    isEnabled: true,

    // Actions
    sendMessage: async (userMessage: string, currentCode: string) => {
        const state = get();

        if (state.isLoading) {
            return null;
        }

        // Add user message to history
        const userMsg: ChatMessage = {
            id: generateId(),
            role: "user",
            content: userMessage,
            timestamp: new Date(),
        };

        set({
            messages: [...state.messages, userMsg],
            isLoading: true,
            streamingContent: "",
            error: null,
        });

        try {
            // Build messages for LLM (only system prompt + current code + user message)
            const llmMessages = [
                {
                    role: "system" as const,
                    content: SYSTEM_PROMPT,
                },
                {
                    role: "user" as const,
                    content: `## 現在のコード

\`\`\`javascript
${currentCode}
\`\`\`

## ユーザーの指示

${userMessage}`,
                },
            ];

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: llmMessages,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.error
                        || `API request failed with status ${response.status}`,
                );
            }

            // Handle streaming response
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("Response body is not readable");
            }

            let fullContent = "";

            for await (const chunk of parseAnthropicStream(reader)) {
                fullContent += chunk;
                set({ streamingContent: fullContent });
            }

            // Extract code from response
            const generatedCode = extractCode(fullContent);

            // Add assistant message to history
            const assistantMsg: ChatMessage = {
                id: generateId(),
                role: "assistant",
                content: fullContent,
                timestamp: new Date(),
                generatedCode: generatedCode || undefined,
            };

            set((state) => ({
                messages: [...state.messages, assistantMsg],
                isLoading: false,
                streamingContent: "",
            }));

            return generatedCode;
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : "Unknown error occurred";

            set({
                isLoading: false,
                streamingContent: "",
                error: {
                    message: "AIからの応答を取得できませんでした",
                    details: errorMessage,
                },
            });

            return null;
        }
    },

    clearHistory: () => {
        set({ messages: [], error: null, streamingContent: "" });
    },

    clearError: () => {
        set({ error: null });
    },

    setEnabled: (enabled: boolean) => {
        set({ isEnabled: enabled });
    },
}));
