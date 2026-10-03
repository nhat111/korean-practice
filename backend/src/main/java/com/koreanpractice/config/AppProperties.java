package com.koreanpractice.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        List<String> corsAllowedOrigins,
        String accessKey,
        Progress progress,
        Ai ai) {

    public record Progress(String file, long maxBytes) {}

    public record Ai(String provider, Duration requestTimeout, Claude claude, Ollama ollama) {}

    public record Claude(String model, String effort, long maxTokens) {}

    public record Ollama(String baseUrl, String model) {}

    public boolean accessKeyRequired() {
        return accessKey != null && !accessKey.isBlank();
    }
}
