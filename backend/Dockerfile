# ---- Build stage ----
FROM maven:3.9.9-eclipse-temurin-23 AS build

WORKDIR /app

# Copy pom first for dependency caching
COPY pom.xml .

RUN mvn dependency:go-offline -B

# Copy source
COPY src ./src

# Build application
RUN mvn clean package -DskipTests


# ---- Runtime stage ----
FROM eclipse-temurin:23-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
