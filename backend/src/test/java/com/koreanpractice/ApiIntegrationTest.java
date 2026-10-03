package com.koreanpractice;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** Full app with the default (no AI) provider and an access key. */
@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {

    private static final String ORIGIN = "https://korean.example.app";
    private static final String KEY = "secret-key";

    @TempDir
    static Path tmp;

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("app.access-key", () -> KEY);
        // Trailing slash and a wildcard pattern, as users tend to paste them.
        r.add("app.cors-allowed-origins", () -> ORIGIN + "/, https://korean-practice-*.vercel.app");
        r.add("app.ai.provider", () -> "none");
        r.add("app.progress.file", () -> tmp.resolve("progress.json").toString());
    }

    @Autowired
    MockMvc mvc;

    @Test
    void healthIsOpenAndReportsConfig() throws Exception {
        mvc.perform(get("/api/health").header("Origin", ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN))
                .andExpect(jsonPath("$.aiProvider").value("none"))
                .andExpect(jsonPath("$.aiEnabled").value(false))
                .andExpect(jsonPath("$.accessKeyRequired").value(true));
    }

    @Test
    void missingKeyIs401WithCorsHeaders() throws Exception {
        mvc.perform(get("/api/progress").header("Origin", ORIGIN))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN))
                .andExpect(jsonPath("$.error").value("unauthorized"));
    }

    @Test
    void preflightPassesWithoutKey() throws Exception {
        mvc.perform(options("/api/roleplay")
                        .header("Origin", ORIGIN)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type,x-access-key"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ORIGIN));
    }

    @Test
    void vercelPreviewOriginsMatchWildcard() throws Exception {
        String preview = "https://korean-practice-git-feature-nhat.vercel.app";
        mvc.perform(get("/api/health").header("Origin", preview))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", preview));
    }

    @Test
    void otherOriginsAreRejected() throws Exception {
        mvc.perform(get("/api/health").header("Origin", "https://evil.example"))
                .andExpect(status().isForbidden());
    }

    @Test
    void aiEndpointsReturn503WhenDisabled() throws Exception {
        mvc.perform(post("/api/roleplay").header("X-Access-Key", KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"안녕하세요\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").value("ai_disabled"));
    }

    @Test
    void validationErrorsAre400() throws Exception {
        mvc.perform(post("/api/email/check").header("X-Access-Key", KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"text\":\"\",\"politeness\":\"banmal\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("bad_request"));
    }

    @Test
    void progressRoundTrip() throws Exception {
        mvc.perform(put("/api/progress").header("X-Access-Key", KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"progress\":{\"version\":1,\"cards\":{},\"scenarios\":{},\"emails\":{},\"speaking\":[]}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updatedAt").exists());

        mvc.perform(get("/api/progress").header("X-Access-Key", KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.progress.version").value(1))
                .andExpect(content -> content.getResponse().getContentAsString().contains("speaking"));

        mvc.perform(put("/api/progress").header("X-Access-Key", KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"progress\":[1,2]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("JSON object")));
    }
}
