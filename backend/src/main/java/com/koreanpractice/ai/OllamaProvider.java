package com.koreanpractice.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Local model via Ollama's /api/chat in JSON mode. The expected JSON shape is
 * described in the system prompt and the result is validated by parsing it
 * into the response record.
 */
public class OllamaProvider implements AiProvider {

    private final RestClient http;
    private final String model;
    private final ObjectMapper mapper;

    public OllamaProvider(RestClient http, String model, ObjectMapper mapper) {
        this.http = http;
        this.model = model;
        this.mapper = mapper;
    }

    @Override
    public String name() {
        return "ollama";
    }

    @Override
    public <T> T generate(AiRequest<T> request) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of(
                "role", "system",
                "content", request.system()
                        + "\n\nRespond with a single JSON object only, exactly in this shape:\n"
                        + request.jsonExample()));
        for (AiRequest.AiMessage m : request.messages()) {
            messages.add(Map.of("role", m.role() == AiRequest.Role.USER ? "user" : "assistant", "content", m.text()));
        }
        Map<String, Object> body = Map.of("model", model, "messages", messages, "stream", false, "format", "json");

        JsonNode response;
        try {
            response = http.post().uri("/api/chat").body(body).retrieve().body(JsonNode.class);
        } catch (RestClientException e) {
            throw new AiProviderException("Ollama request failed: " + e.getMessage(), e);
        }
        String content = response == null ? null : response.path("message").path("content").asText(null);
        if (content == null || content.isBlank()) {
            throw new AiProviderException("Ollama returned no content");
        }
        try {
            return mapper.readValue(content, request.responseType());
        } catch (JsonProcessingException e) {
            throw new AiProviderException("Ollama returned JSON in an unexpected shape", e);
        }
    }
}
