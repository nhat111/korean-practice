package com.koreanpractice.tutor;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class EmailDtos {

    private EmailDtos() {}

    /**
     * @param text       the learner's Korean email or message
     * @param politeness target speech level: "hasipsio" (formal email) or "haeyo" (messenger); optional
     * @param situation  optional context (Vietnamese or Korean)
     */
    public record EmailCheckRequest(
            @NotBlank @Size(max = 4000) String text,
            @Pattern(regexp = "hasipsio|haeyo") String politeness,
            @Size(max = 1000) String situation) {}

    public record EmailCheckResponse(
            @JsonPropertyDescription("The full email rewritten in natural business Korean")
            String corrected,
            @JsonPropertyDescription("Each concrete mistake found; empty if none")
            List<Correction> corrections,
            @JsonPropertyDescription("Overall feedback in Vietnamese, 2-4 sentences")
            String explanationVi,
            @JsonPropertyDescription("Overall quality from 0 to 100")
            int score) {}
}
