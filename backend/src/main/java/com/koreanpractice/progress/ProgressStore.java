package com.koreanpractice.progress;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.koreanpractice.config.AppProperties;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Stores one progress snapshot (the frontend's kp:progress:v1 object, kept opaque)
 * in a JSON file. Single-user app, so one file is enough. Note: on Render's free
 * tier the disk is ephemeral; the browser's localStorage stays the source of truth.
 */
@Component
public class ProgressStore {

    public record Snapshot(JsonNode progress, Instant updatedAt) {}

    private final Path file;
    private final ObjectMapper mapper;

    public ProgressStore(AppProperties props, ObjectMapper mapper) {
        this.file = Path.of(props.progress().file());
        this.mapper = mapper;
    }

    public synchronized Optional<Snapshot> load() {
        if (!Files.exists(file)) return Optional.empty();
        try {
            return Optional.of(mapper.readValue(file.toFile(), Snapshot.class));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read " + file, e);
        }
    }

    public synchronized Snapshot save(JsonNode progress) {
        var snapshot = new Snapshot(progress, Instant.now());
        try {
            Path dir = file.toAbsolutePath().getParent();
            Files.createDirectories(dir);
            // Write to a temp file and move, so a crash never leaves a half-written file.
            Path tmp = Files.createTempFile(dir, "progress", ".tmp");
            mapper.writeValue(tmp.toFile(), snapshot);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not write " + file, e);
        }
        return snapshot;
    }
}
