package com.koreanpractice.ai;

/** Default provider: AI features are off, everything else (progress sync) still works. */
public class NoAiProvider implements AiProvider {

    @Override
    public String name() {
        return "none";
    }

    @Override
    public boolean enabled() {
        return false;
    }

    @Override
    public <T> T generate(AiRequest<T> request) {
        throw new AiDisabledException();
    }
}
