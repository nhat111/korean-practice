package com.koreanpractice.ai;

/** No AI provider is configured; maps to HTTP 503. */
public class AiDisabledException extends RuntimeException {

    public AiDisabledException() {
        super("AI is disabled on this server (AI_PROVIDER=none)");
    }
}
