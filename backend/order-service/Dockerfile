# Build context is the REPO ROOT (see docker-compose.yml: context: .,
# dockerfile: backend/order-service/Dockerfile) because this module's
# pom.xml now inherits from the root reactor/aggregator pom.xml.

# --- build stage ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml .
COPY backend/product-service/pom.xml backend/product-service/pom.xml
COPY backend/order-service/pom.xml backend/order-service/pom.xml
COPY backend/inventory-service/pom.xml backend/inventory-service/pom.xml
COPY backend/rating-service/pom.xml backend/rating-service/pom.xml
RUN mvn -B -q -pl backend/order-service -am dependency:go-offline

COPY backend/order-service/src backend/order-service/src
RUN mvn -B -q -pl backend/order-service -am clean package -DskipTests

# --- runtime stage ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /workspace/backend/order-service/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
