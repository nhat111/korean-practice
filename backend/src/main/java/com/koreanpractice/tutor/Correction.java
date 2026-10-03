package com.koreanpractice.tutor;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;

/** One mistake in the learner's Korean. Same shape as EmailCorrection in the frontend. */
public record Correction(
        @JsonPropertyDescription("Exact text copied from the learner's message that is wrong")
        String original,
        @JsonPropertyDescription("Corrected Korean text")
        String corrected,
        @JsonPropertyDescription("One of: grammar, politeness, vocabulary, spelling, format")
        String type,
        @JsonPropertyDescription("Short explanation in Vietnamese")
        String explanationVi) {}
