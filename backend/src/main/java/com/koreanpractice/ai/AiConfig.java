package com.koreanpractice.ai;

import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.koreanpractice.config.AppProperties;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class AiConfig {

    private static final Logger log = LoggerFactory.getLogger(AiConfig.class);

    @Bean
    AiProvider aiProvider(AppProperties props, ObjectMapper mapper) {
        AppProperties.Ai ai = props.ai();
        String provider = ai.provider() == null ? "none" : ai.provider().trim().toLowerCase(Locale.ROOT);
        AiProvider selected = switch (provider) {
            case "claude" -> claude(ai);
            case "ollama" -> ollama(ai, mapper);
            case "none", "" -> new NoAiProvider();
            default -> {
                log.warn("Unknown AI_PROVIDER '{}'; AI features are disabled", provider);
                yield new NoAiProvider();
            }
        };
        log.info("AI provider: {}", selected.name());
        return selected;
    }

    private AiProvider claude(AppProperties.Ai ai) {
        String key = System.getenv("ANTHROPIC_API_KEY");
        if (key == null || key.isBlank()) {
            // Fail soft: the server still starts and progress sync keeps working.
            log.warn("AI_PROVIDER=claude but ANTHROPIC_API_KEY is not set; AI features are disabled");
            return new NoAiProvider();
        }
        var client = AnthropicOkHttpClient.builder()
                .fromEnv()
                .timeout(ai.requestTimeout())
                .maxRetries(2)
                .build();
        return new ClaudeProvider(client, ai.claude());
    }

    private AiProvider ollama(AppProperties.Ai ai, ObjectMapper mapper) {
        var factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(ai.requestTimeout());
        var http = RestClient.builder()
                .baseUrl(ai.ollama().baseUrl())
                .requestFactory(factory)
                .build();
        return new OllamaProvider(http, ai.ollama().model(), mapper);
    }
}
