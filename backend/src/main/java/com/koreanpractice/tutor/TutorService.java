package com.koreanpractice.tutor;

import com.koreanpractice.ai.AiProvider;
import com.koreanpractice.ai.AiProviderException;
import com.koreanpractice.ai.AiRequest;
import com.koreanpractice.ai.AiRequest.AiMessage;
import com.koreanpractice.ai.AiRequest.Role;
import com.koreanpractice.tutor.EmailDtos.EmailCheckRequest;
import com.koreanpractice.tutor.EmailDtos.EmailCheckResponse;
import com.koreanpractice.tutor.RoleplayDtos.ChatTurn;
import com.koreanpractice.tutor.RoleplayDtos.RoleplayRequest;
import com.koreanpractice.tutor.RoleplayDtos.RoleplayResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/** Builds the tutoring prompts and post-processes AI output. */
@Service
public class TutorService {

    static final Set<String> CORRECTION_TYPES = Set.of("grammar", "politeness", "vocabulary", "spelling", "format");

    private static final String LEARNER = """
            The learner is a Vietnamese Java developer at an IT outsourcing company, TOPIK level 3, \
            who works with Korean clients. Write Korean at TOPIK 3-4 level: natural business Korean as \
            actually used in Korean IT companies (meetings, email, Slack/KakaoWork), with IT loanwords \
            Koreans really use (배포, 이슈, 일정, 커밋...). Write every explanation in Vietnamese with full \
            diacritics.""";

    private static final String CORRECTION_RULES = """
            For corrections: list each concrete mistake (grammar, particles, spelling such as 되/돼, \
            wrong or inconsistent speech level, missing honorifics, unnatural word choice, requests that \
            are too direct for a client). `original` must be copied exactly from the learner's text, \
            `corrected` is the fix, `type` is one of grammar, politeness, vocabulary, spelling, format. \
            Do not report acceptable stylistic variations. Return an empty list when there are no mistakes.""";

    private static final String DEFAULT_SCENARIO =
            "A regular check-in about an ongoing web project (Spring Boot backend, React frontend).";

    private static final String ROLEPLAY_EXAMPLE = """
            {"reply": "...", "replyVi": "...", "corrections": [{"original": "...", "corrected": "...", \
            "type": "grammar", "explanationVi": "..."}], "naturalVersion": "...", "explanationVi": "..."}""";

    private static final String EMAIL_EXAMPLE = """
            {"corrected": "...", "corrections": [{"original": "...", "corrected": "...", "type": "politeness", \
            "explanationVi": "..."}], "explanationVi": "...", "score": 80}""";

    private final AiProvider ai;

    public TutorService(AiProvider ai) {
        this.ai = ai;
    }

    public RoleplayResponse roleplay(RoleplayRequest req) {
        String scenario = isBlank(req.scenario()) ? DEFAULT_SCENARIO : req.scenario().trim();
        String system = """
                You play a Korean client (고객사 담당자, e.g. 김 팀장) in an IT outsourcing project, \
                talking with a developer from the vendor company. Scenario: %s

                %s

                `reply`: stay in character. 1-3 sentences of natural Korean the client would really say; \
                use polite 해요체 or 하십시오체 as a Korean client would. Move the conversation forward \
                realistically: ask follow-up questions, raise issues, ask for dates or details. Never use \
                Vietnamese or English in `reply`. `replyVi` is its Vietnamese translation.

                You are also a tutor for the learner's LAST message only:
                %s
                `naturalVersion`: how a fluent Korean professional in the learner's position would say the \
                same thing to this client, keeping the meaning. If the learner wrote in Vietnamese or \
                English, translate it into natural Korean here.
                `explanationVi`: 1-3 sentences: overall feedback, whether the speech level fits, one tip.
                If the learner has not said anything yet, open the conversation as the client and leave \
                corrections empty and naturalVersion and explanationVi as empty strings."""
                .formatted(scenario, LEARNER, CORRECTION_RULES);

        List<AiMessage> messages = new ArrayList<>();
        // The API requires the conversation to start with a user turn.
        messages.add(new AiMessage(Role.USER, "(대화 시작)"));
        if (req.history() != null) {
            for (ChatTurn t : req.history()) {
                messages.add(new AiMessage("client".equals(t.role()) ? Role.ASSISTANT : Role.USER, t.text()));
            }
        }
        if (!isBlank(req.message())) {
            messages.add(new AiMessage(Role.USER, req.message().trim()));
        } else if (req.history() != null && !req.history().isEmpty()) {
            throw new IllegalArgumentException("message must not be empty after the conversation has started");
        }

        RoleplayResponse r = ai.generate(new AiRequest<>(system, messages, RoleplayResponse.class, ROLEPLAY_EXAMPLE));
        if (r == null || isBlank(r.reply())) throw new AiProviderException("AI returned an empty reply");
        return new RoleplayResponse(
                r.reply().trim(),
                nullToEmpty(r.replyVi()),
                cleanCorrections(r.corrections(), req.message()),
                nullToEmpty(r.naturalVersion()),
                nullToEmpty(r.explanationVi()));
    }

    public EmailCheckResponse checkEmail(EmailCheckRequest req) {
        String level = switch (req.politeness() == null ? "" : req.politeness()) {
            case "hasipsio" -> "하십시오체 (formal email to a client)";
            case "haeyo" -> "polite 해요체 (Slack/KakaoWork message)";
            default -> "whichever level fits the situation (formal email: 하십시오체; messenger: polite 해요체)";
        };
        String system = """
                You are a Korean business-writing tutor. The learner wrote an email or chat message to a \
                Korean client. %s

                Target speech level: %s. Situation: %s

                `corrected`: the full text rewritten in natural business Korean with the same content and \
                line breaks where sensible; keep the learner's meaning, fix the subject line if vague.
                %s
                `explanationVi`: 2-4 sentences of overall feedback, including whether the speech level is \
                consistent. `score`: overall quality from 0 to 100."""
                .formatted(LEARNER, level, isBlank(req.situation()) ? "not given" : req.situation().trim(),
                        CORRECTION_RULES);

        List<AiMessage> messages = List.of(new AiMessage(Role.USER, req.text()));
        EmailCheckResponse r = ai.generate(new AiRequest<>(system, messages, EmailCheckResponse.class, EMAIL_EXAMPLE));
        if (r == null || isBlank(r.corrected())) throw new AiProviderException("AI returned an empty correction");
        return new EmailCheckResponse(
                r.corrected().trim(),
                cleanCorrections(r.corrections(), req.text()),
                nullToEmpty(r.explanationVi()),
                Math.max(0, Math.min(100, r.score())));
    }

    /** Drops malformed items and normalizes unknown types, so the frontend can trust the shape. */
    static List<Correction> cleanCorrections(List<Correction> raw, String source) {
        if (raw == null || isBlank(source)) return List.of();
        return raw.stream()
                .filter(c -> c != null && !isBlank(c.original()) && !isBlank(c.corrected()))
                .filter(c -> !c.original().trim().equals(c.corrected().trim()))
                .map(c -> new Correction(
                        c.original(),
                        c.corrected(),
                        CORRECTION_TYPES.contains(c.type()) ? c.type() : "grammar",
                        nullToEmpty(c.explanationVi())))
                .toList();
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s.trim();
    }
}
