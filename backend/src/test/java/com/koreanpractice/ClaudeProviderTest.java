package com.koreanpractice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.koreanpractice.ai.AiProviderException;
import com.koreanpractice.ai.ClaudeProvider;
import com.koreanpractice.config.AppProperties;
import com.koreanpractice.tutor.RoleplayDtos.RoleplayRequest;
import com.koreanpractice.tutor.RoleplayDtos.RoleplayResponse;
import com.koreanpractice.tutor.TutorService;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Runs the real SDK against a fake Messages API to check the request and response handling. */
class ClaudeProviderTest {

    private static final ObjectMapper mapper = new ObjectMapper();

    private static String message(String stopReason, String text) throws Exception {
        return mapper.writeValueAsString(mapper.readTree("""
                {"id":"msg_1","type":"message","role":"assistant","model":"claude-opus-5-5",
                 "stop_reason":"%s","stop_sequence":null,
                 "usage":{"input_tokens":10,"output_tokens":20},
                 "content":[{"type":"text","text":""}]}""".formatted(stopReason))).replace(
                "\"text\":\"\"", "\"text\":" + mapper.writeValueAsString(text));
    }

    private static TutorService tutor(FakeHttpServer server) {
        var client = AnthropicOkHttpClient.builder().apiKey("test-key").baseUrl(server.url()).maxRetries(0).build();
        var provider = new ClaudeProvider(client, new AppProperties.Claude("claude-opus-5-5", "medium", 16000));
        return new TutorService(provider);
    }

    @Test
    void sendsStructuredOutputRequestAndParsesResult() throws Exception {
        String json = """
                {"reply":"네, 확인했습니다. 배포는 언제 가능할까요?","replyVi":"Vâng, tôi đã xác nhận. Khi nào có thể deploy?",
                 "corrections":[{"original":"했어요","corrected":"했습니다","type":"politeness","explanationVi":"Dùng 하십시오체"}],
                 "naturalVersion":"API 개발을 완료했습니다.","explanationVi":"Tốt."}""";
        try (var server = new FakeHttpServer(message("end_turn", json))) {
            RoleplayResponse r = tutor(server).roleplay(new RoleplayRequest(null, List.of(), "API 개발 다 했어요"));

            assertThat(r.reply()).startsWith("네, 확인했습니다");
            assertThat(r.corrections()).hasSize(1);
            assertThat(r.corrections().get(0).type()).isEqualTo("politeness");

            var req = server.requests.get(0);
            assertThat(req.path()).isEqualTo("/v1/messages");
            assertThat(req.headers().get("Anthropic-beta")).anyMatch(v -> v.contains("server-side-fallback-2026-07-01"));
            JsonNode body = mapper.readTree(req.body());
            assertThat(body.path("model").asText()).isEqualTo("claude-opus-5-5");
            assertThat(body.path("fallbacks").asText()).isEqualTo("default");
            assertThat(body.path("output_config").path("effort").asText()).isEqualTo("medium");
            assertThat(body.path("output_config").path("format").path("type").asText()).isEqualTo("json_schema");
            assertThat(body.path("output_config").path("format").path("schema").path("properties").has("naturalVersion"))
                    .isTrue();
            assertThat(body.has("thinking")).isFalse();
            // Conversation starts with a user turn even when the client speaks first.
            assertThat(body.path("messages").get(0).path("role").asText()).isEqualTo("user");
            assertThat(body.path("system").asText()).contains("Korean client");
        }
    }

    @Test
    void refusalBecomesProviderError() throws Exception {
        try (var server = new FakeHttpServer(message("refusal", "{}"))) {
            assertThatThrownBy(() -> tutor(server).roleplay(new RoleplayRequest(null, List.of(), "안녕하세요")))
                    .isInstanceOf(AiProviderException.class)
                    .hasMessageContaining("declined");
        }
    }
}
