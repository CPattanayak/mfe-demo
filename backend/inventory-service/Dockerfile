# Build context is the REPO ROOT (see docker-compose.yml: context: .,
# dockerfile: backend/inventory-service/Dockerfile) because this module's
# pom.xml now inherits from the root reactor/aggregator pom.xml.

# --- build stage ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Copy just the POMs first (root + all modules) to maximize Docker layer
# caching for dependency resolution.
COPY pom.xml .
COPY backend/product-service/pom.xml backend/product-service/pom.xml
COPY backend/order-service/pom.xml backend/order-service/pom.xml
COPY backend/inventory-service/pom.xml backend/inventory-service/pom.xml
RUN mvn -B -q -pl backend/inventory-service -am dependency:go-offline

# Now bring in the actual sources and build just this module (+ its
# dependencies in the reactor, via -am).
COPY backend/inventory-service/src backend/inventory-service/src
RUN mvn -B -q -pl backend/inventory-service -am clean package -DskipTests

# --- runtime stage ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /workspace/backend/inventory-service/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
