# syntax=docker/dockerfile:1

# ---- Build stage: compile and package with Maven (fast-jar layout) ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Resolve dependencies first so this layer is reused while only sources change.
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline

COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B package -DskipTests

# ---- Runtime stage: JRE 21 only ----
FROM eclipse-temurin:21-jre
WORKDIR /deployments

# The Compose healthcheck probes Quarkus over HTTP.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the fast-jar in layers, from least to most frequently changed.
COPY --from=build /build/target/quarkus-app/lib/ ./lib/
COPY --from=build /build/target/quarkus-app/*.jar ./
COPY --from=build /build/target/quarkus-app/app/ ./app/
COPY --from=build /build/target/quarkus-app/quarkus/ ./quarkus/

# Run as an unprivileged user.
RUN useradd --system --uid 185 --no-create-home quarkus
USER 185

ENV JAVA_OPTS="-Djava.util.logging.manager=org.jboss.logmanager.LogManager"
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /deployments/quarkus-run.jar"]
