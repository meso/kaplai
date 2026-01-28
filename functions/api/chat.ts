/**
 * Cloudflare AI Gateway Proxy with OpenAI SDK Compatibility
 *
 * Uses the /compat endpoint for unified access to multiple LLM providers.
 *
 * Environment variables:
 * - CF_ACCOUNT_ID: Cloudflare account ID
 * - AI_GATEWAY_NAME: AI Gateway name
 * - CF_API_TOKEN: Cloudflare API token (for Unified Billing) or provider API key (for BYO Key)
 * - LLM_MODEL: Model to use (e.g., "anthropic/claude-sonnet-4-5")
 */

import OpenAI from "openai";

interface Env {
    CF_ACCOUNT_ID: string;
    AI_GATEWAY_NAME: string;
    CF_API_TOKEN: string;
    LLM_MODEL?: string;
}

interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

interface ChatRequest {
    messages: ChatMessage[];
    model?: string;
}

// CORS headers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;

    // Check required environment variables
    if (
        !env.CF_ACCOUNT_ID || !env.AI_GATEWAY_NAME
        || !env.CF_API_TOKEN
    ) {
        return new Response(
            JSON.stringify({ error: "AI Gateway not configured" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            },
        );
    }

    try {
        const body: ChatRequest = await request.json();

        // Default model - can be overridden by request or environment
        const model = body.model || env.LLM_MODEL
            || "anthropic/claude-sonnet-4-5";

        // Create OpenAI client with AI Gateway compat endpoint
        const client = new OpenAI({
            apiKey: env.CF_API_TOKEN,
            baseURL:
                `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.AI_GATEWAY_NAME}/compat`,
        });

        // Create streaming response
        const stream = await client.chat.completions.create({
            model,
            messages: body.messages,
            max_tokens: 4096,
            stream: true,
        });

        // Convert OpenAI stream to SSE format for the client
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content;
                        if (content) {
                            // Send in Anthropic-compatible SSE format for client compatibility
                            const sseData = JSON.stringify({
                                type: "content_block_delta",
                                delta: { type: "text_delta", text: content },
                            });
                            controller.enqueue(
                                encoder.encode(`data: ${sseData}\n\n`),
                            );
                        }
                    }
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return new Response(
            JSON.stringify({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error",
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    ...corsHeaders,
                },
            },
        );
    }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
};
