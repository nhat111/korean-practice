package com.koreanpractice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.koreanpractice.ai.AiProviderException;
import com.koreanpractice.ai.OllamaProvider;
import com.koreanpractice.tutor.EmailDtos.EmailCheckRequest;
import com.koreanpractice.tutor.EmailDtos.EmailCheckResponse;
import com.koreanpractice.tutor.TutorService;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class OllamaProviderTest {

    private static final ObjectMapper mapper = new ObjectMapper();

    private static TutorService tutor(FakeHttpServer server) {
        var http = RestClient.builder().baseUrl(server.url()).build();
        return new TutorService(new OllamaProvider(http, "qwen2.5:7b", mapper));
    }

    private static String chat(String content) throws Exception {
        return mapper.writeValueAsString(mapper.createObjectNode()
                .put("model", "qwen2.5:7b")
                .put("done", true)
                .set("message", mapper.createObjectNode().put("role", "assistant").put("content", content)));
    }

    @Test
    void parsesJsonModeResponse() throws Exception {
        String content = """
                {"corrected":"확인 부탁드립니다.","corrections":[{"original":"확인 부탁해.","corrected":"확인 부탁드립니다.",
                 "type":"unknown-type","explanationVi":"반말"}],"explanationVi":"Ổn.","score":140}""";
        try (var server = new FakeHttpServer(chat(content))) {
            EmailCheckResponse r = tutor(server).checkEmail(new EmailCheckRequest("확인 부탁해.", "hasipsio", null));

            assertThat(r.corrected()).isEqualTo("확인 부탁드립니다.");
            assertThat(r.score()).isEqualTo(100); // clamped
            assertThat(r.corrections().get(0).type()).isEqualTo("grammar"); // unknown type normalized

            var body = mapper.readTree(server.requests.get(0).body());
            assertThat(server.requests.get(0).path()).isEqualTo("/api/chat");
            assertThat(body.path("format").asText()).isEqualTo("json");
            assertThat(body.path("stream").asBoolean()).isFalse();
            assertThat(body.path("messages").get(0).path("content").asText()).contains("하십시오체");
        }
    }

    @Test
    void wrongShapeIsProviderError() throws Exception {
        try (var server = new FakeHttpServer(chat("not json"))) {
            assertThatThrownBy(() -> tutor(server).checkEmail(new EmailCheckRequest("안녕", null, null)))
                    .isInstanceOf(AiProviderException.class);
        }
    }
}
