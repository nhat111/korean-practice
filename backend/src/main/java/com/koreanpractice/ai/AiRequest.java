package com.koreanpractice.ai;

import java.util.List;

/**
 * @param system      instructions for the model
 * @param messages    conversation, oldest first
 * @param responseType record the JSON output is parsed into
 * @param jsonExample example of the expected JSON, for providers without schema support
 */
public record AiRequest<T>(String system, List<AiMessage> messages, Class<T> responseType, String jsonExample) {

    public record AiMessage(Role role, String text) {}

    public enum Role {
        USER,
        ASSISTANT
    }
}
