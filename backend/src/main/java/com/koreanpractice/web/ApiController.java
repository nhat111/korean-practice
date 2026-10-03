package com.koreanpractice.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.koreanpractice.ai.AiProvider;
import com.koreanpractice.config.AppProperties;
import com.koreanpractice.progress.ProgressStore;
import com.koreanpractice.progress.ProgressStore.Snapshot;
import com.koreanpractice.tutor.EmailDtos.EmailCheckRequest;
import com.koreanpractice.tutor.EmailDtos.EmailCheckResponse;
import com.koreanpractice.tutor.RoleplayDtos.RoleplayRequest;
import com.koreanpractice.tutor.RoleplayDtos.RoleplayResponse;
import com.koreanpractice.tutor.TutorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ApiController {

    public record HealthResponse(String status, String aiProvider, boolean aiEnabled, boolean accessKeyRequired) {}

    public record ProgressPutRequest(@NotNull JsonNode progress) {}

    private final AiProvider ai;
    private final TutorService tutor;
    private final ProgressStore progress;
    private final AppProperties props;

    public ApiController(AiProvider ai, TutorService tutor, ProgressStore progress, AppProperties props) {
        this.ai = ai;
        this.tutor = tutor;
        this.progress = progress;
        this.props = props;
    }

    /** Open endpoint (no access key) used by the frontend to detect and wake the server. */
    @GetMapping("/health")
    public HealthResponse health() {
        return new HealthResponse("ok", ai.name(), ai.enabled(), props.accessKeyRequired());
    }

    @PostMapping("/roleplay")
    public RoleplayResponse roleplay(@Valid @RequestBody RoleplayRequest request) {
        return tutor.roleplay(request);
    }

    @PostMapping("/email/check")
    public EmailCheckResponse checkEmail(@Valid @RequestBody EmailCheckRequest request) {
        return tutor.checkEmail(request);
    }

    @GetMapping("/progress")
    public ResponseEntity<Snapshot> getProgress() {
        return progress.load().map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/progress")
    public Snapshot putProgress(@Valid @RequestBody ProgressPutRequest request) {
        if (!request.progress().isObject()) {
            throw new IllegalArgumentException("progress must be a JSON object");
        }
        return progress.save(request.progress());
    }
}
