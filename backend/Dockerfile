# syntax=docker/dockerfile:1
# Multi-stage build for Render's free tier (0.1 CPU, 512 MB RAM).
# Build locally: docker build -t korean-practice-backend backend/

# ---- 1. Build the jar ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /src
# Resolve dependencies first so they are cached until pom.xml changes.
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src src
RUN mvn -q -B package -DskipTests

# ---- 2. Runtime: JRE only, non-root, with a CDS archive for fast cold starts ----
FROM eclipse-temurin:21-jre AS runtime
WORKDIR /app
RUN useradd --system --uid 10001 --home /app app

# Unpack the Spring Boot jar (faster class loading than the nested fat jar).
COPY --from=build /src/target/app.jar /tmp/app.jar
RUN java -Djarmode=tools -jar /tmp/app.jar extract --destination /app/extracted \
    && rm /tmp/app.jar

# Training run: start the context once and record loaded classes into a
# Class Data Sharing archive. Must use the same JRE as at runtime.
# Measured locally on 1 CPU: ~2.2 s to healthy vs ~7.9 s for a plain fat jar.
RUN cd /app/extracted \
    && java -XX:ArchiveClassesAtExit=app.jsa -Dspring.context.exit=onRefresh -jar app.jar \
    && mkdir -p /app/data && chown -R app /app/data

USER app
WORKDIR /app/extracted
ENV PROGRESS_FILE=/app/data/progress.json
# Tuned for 512 MB / low CPU: small heap share, serial GC, C1-only JIT (faster
# startup), smaller thread stacks; exit on OOM so Render restarts the service.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=60 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k -XX:+ExitOnOutOfMemoryError"
# Render injects PORT (default 10000); the app reads it via server.port=${PORT:8080}.
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -XX:SharedArchiveFile=app.jsa -jar app.jar"]
