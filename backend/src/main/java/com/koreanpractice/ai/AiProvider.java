package com.koreanpractice.ai;

/**
 * A language model that returns a JSON object of a given type.
 * Selected by {@code app.ai.provider} (AI_PROVIDER env var): none | ollama | claude.
 */
public interface AiProvider {

    /** Short id shown by /api/health, e.g. "claude". */
    String name();

    /** Whether AI endpoints can be used. False for {@link NoAiProvider}. */
    default boolean enabled() {
        return true;
    }

    /**
     * Runs one request and returns the parsed result.
     *
     * @throws AiDisabledException when no provider is configured
     * @throws AiProviderException when the provider fails or returns unusable output
     */
    <T> T generate(AiRequest<T> request);
}
