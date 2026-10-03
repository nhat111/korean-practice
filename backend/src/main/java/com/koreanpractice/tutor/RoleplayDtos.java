package com.koreanpractice.tutor;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class RoleplayDtos {

    private RoleplayDtos() {}

    /** A previous line of the conversation. role: "client" (the AI) or "user" (the learner). */
    public record ChatTurn(
            @NotNull @Pattern(regexp = "client|user") String role,
            @NotBlank @Size(max = 1000) String text) {}

    /**
     * @param scenario optional situation description (Vietnamese or Korean)
     * @param history  previous turns, oldest first
     * @param message  the learner's new line; empty with empty history = ask the client to open
     */
    public record RoleplayRequest(
            @Size(max = 500) String scenario,
            @Valid @Size(max = 40) List<ChatTurn> history,
            @Size(max = 1000) String message) {}

    public record RoleplayResponse(
            @JsonPropertyDescription("The client's next line, in Korean, in character")
            String reply,
            @JsonPropertyDescription("Vietnamese translation of reply")
            String replyVi,
            @JsonPropertyDescription("Mistakes in the learner's last message; empty if none or no message")
            List<Correction> corrections,
            @JsonPropertyDescription("How a fluent Korean professional would say the learner's last message; empty if no message")
            String naturalVersion,
            @JsonPropertyDescription("1-3 sentences of feedback in Vietnamese; empty if no message")
            String explanationVi) {}
}
