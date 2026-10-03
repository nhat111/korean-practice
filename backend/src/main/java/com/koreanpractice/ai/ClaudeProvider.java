package com.koreanpractice.ai;

import com.anthropic.client.AnthropicClient;
import com.anthropic.core.JsonValue;
import com.anthropic.errors.AnthropicException;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.OutputConfig;
import com.anthropic.models.messages.StopReason;
import com.anthropic.models.messages.StructuredMessage;
import com.anthropic.models.messages.StructuredMessageCreateParams;
import com.anthropic.models.messages.StructuredOutputConfig;
import com.koreanpractice.config.AppProperties;

/**
 * Claude via the official Anthropic Java SDK, using structured outputs so the
 * response is always valid JSON for the requested record type.
 * The API key comes from the ANTHROPIC_API_KEY environment variable.
 */
public class ClaudeProvider implements AiProvider {

    // Server-side refusal fallback: if a safety classifier declines the request,
    // the API retries it on a suitable fallback model within the same call.
    private static final String FALLBACK_BETA = "server-side-fallback-2026-07-01";

    private final AnthropicClient client;
    private final AppProperties.Claude config;

    public ClaudeProvider(AnthropicClient client, AppProperties.Claude config) {
        this.client = client;
        this.config = config;
    }

    @Override
    public String name() {
        return "claude";
    }

    @Override
    public <T> T generate(AiRequest<T> request) {
        StructuredMessageCreateParams.Builder<T> builder = MessageCreateParams.builder()
                .model(config.model())
                .maxTokens(config.maxTokens())
                .system(request.system())
                .outputConfig(StructuredOutputConfig.<T>builder()
                        .effort(OutputConfig.Effort.of(config.effort()))
                        .format(request.responseType())
                        .build())
                .putAdditionalHeader("anthropic-beta", FALLBACK_BETA)
                .putAdditionalBodyProperty("fallbacks", JsonValue.from("default"));
        for (AiRequest.AiMessage m : request.messages()) {
            if (m.role() == AiRequest.Role.USER) builder.addUserMessage(m.text());
            else builder.addAssistantMessage(m.text());
        }

        StructuredMessage<T> response;
        try {
            response = client.messages().create(builder.build());
        } catch (AnthropicException e) {
            throw new AiProviderException("Claude request failed: " + e.getMessage(), e);
        }

        if (response.stopReason().filter(StopReason.REFUSAL::equals).isPresent()) {
            throw new AiProviderException("Claude declined this request");
        }
        if (response.stopReason().filter(StopReason.MAX_TOKENS::equals).isPresent()) {
            throw new AiProviderException("Claude response was cut off (max_tokens)");
        }
        return response.content().stream()
                .flatMap(block -> block.text().stream())
                .map(text -> text.text())
                .findFirst()
                .orElseThrow(() -> new AiProviderException("Claude returned no text"));
    }
}
