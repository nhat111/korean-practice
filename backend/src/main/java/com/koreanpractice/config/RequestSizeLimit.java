package com.koreanpractice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Rejects request bodies larger than app.progress.max-bytes (the progress snapshot is the largest). */
@Component
public class RequestSizeLimit extends OncePerRequestFilter {

    private final long maxBytes;

    public RequestSizeLimit(AppProperties props) {
        this.maxBytes = props.progress().maxBytes();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getContentLengthLong() > maxBytes) {
            response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"error\":\"too_large\",\"message\":\"Request body too large\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
