# Spring Boot backend.
#
# Two stages so the runtime image carries a JRE and a jar rather than a
# JDK, Maven and the whole dependency cache.

# ------------------------------------------------------------------
# Build
# ------------------------------------------------------------------
FROM eclipse-temurin:23-jdk AS build

WORKDIR /build

# Copy the wrapper and the POM alone first. Dependencies only change
# when pom.xml does, so this layer stays cached across source edits and
# a rebuild does not re-download Maven Central.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
RUN ./mvnw -B -q clean package -DskipTests

# ------------------------------------------------------------------
# Runtime
# ------------------------------------------------------------------
FROM eclipse-temurin:23-jre

# tesseract-ocr backs the OCR fallback in PdfTextExtractionService,
# used when an uploaded PDF has no text layer. Without it a scanned CV
# fails; ordinary PDFs never touch it.
# Acquire::Retries because a Debian mirror dropping one connection
# should not fail the whole image build - it did exactly that here.
RUN apt-get -o Acquire::Retries=5 update \
    && apt-get -o Acquire::Retries=5 install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng curl \
    && rm -rf /var/lib/apt/lists/*

ENV TESSERACT_DATA_PATH=/usr/share/tesseract-ocr/5/tessdata

# Run as a normal user: nothing here needs root, and a container that
# cannot write outside its own directories is a smaller problem if the
# application is ever tricked into writing somewhere unexpected.
RUN useradd --create-home --shell /usr/sbin/nologin app
WORKDIR /app

# Uploaded CVs land here. Declared as a volume in compose so they
# survive a rebuild.
RUN mkdir -p /app/uploads/resumes && chown -R app:app /app

COPY --from=build --chown=app:app /build/target/*.jar app.jar

USER app
EXPOSE 8080

# Fails until Flyway has migrated and the context is up, which is what
# compose waits on before starting anything that depends on this.
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=10 \
    CMD curl -fsS http://localhost:8080/api/v1/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
