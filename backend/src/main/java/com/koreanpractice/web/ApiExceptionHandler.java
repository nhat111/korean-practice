package com.koreanpractice.web;

import com.koreanpractice.ai.AiDisabledException;
import com.koreanpractice.ai.AiProviderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps errors to {"error": code, "message": text}; the frontend switches on `error`. */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    public record ApiError(String error, String message) {}

    @ExceptionHandler(AiDisabledException.class)
    ResponseEntity<ApiError> aiDisabled(AiDisabledException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new ApiError("ai_disabled", e.getMessage()));
    }

    @ExceptionHandler(AiProviderException.class)
    ResponseEntity<ApiError> aiFailed(AiProviderException e) {
        log.warn("AI provider error: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ApiError("ai_failed", e.getMessage()));
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
            IllegalArgumentException.class})
    ResponseEntity<ApiError> badRequest(Exception e) {
        String message = e instanceof MethodArgumentNotValidException m
                ? m.getBindingResult().getFieldErrors().stream()
                        .map(f -> f.getField() + " " + f.getDefaultMessage())
                        .findFirst().orElse("invalid request")
                : e instanceof HttpMessageNotReadableException ? "invalid JSON body" : e.getMessage();
        return ResponseEntity.badRequest().body(new ApiError("bad_request", message));
    }
}
