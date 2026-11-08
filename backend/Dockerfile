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

# Retry dropped downloads rather than failing the image.
#
# Maven Central cutting one connection short should not cost the whole
# build - it has done exactly that here, once mid-download on
# mockito-core ("Premature end of Content-Length delimited message
# body") and once mid-handshake on the parent POM ("Remote host
# terminated the handshake / SSL peer shut down incorrectly").
#
# Two layers, because neither covers everything alone:
#  - The aether.* flags tune the resolver's own HTTP retries. Maven
#    3.9 resolves through the native transport, not Wagon, so the old
#    maven.wagon.* flags were silently ignored.
#  - The shell loop re-runs the whole step. Resolver retries skip SSL
#    handshake failures by design; the loop does not. Artifacts already
#    in ~/.m2 are kept, so each attempt resumes rather than restarts.
# The pip steps in ai-service/Dockerfile carry the same protection.
ENV MAVEN_HTTP_OPTS="-Daether.connector.http.retryHandler.count=5 \
    -Daether.connector.http.retryHandler.requestSentEnabled=true \
    -Daether.connector.http.connectionMaxTtl=120 \
    -Daether.connector.requestTimeout=60000"

RUN chmod +x mvnw \
    && for i in 1 2 3 4 5; do \
         ./mvnw -B -q $MAVEN_HTTP_OPTS dependency:go-offline && exit 0; \
         echo "dependency download failed (attempt $i/5), retrying in $((i * 10))s" >&2; \
         sleep $((i * 10)); \
       done; \
    exit 1

COPY src/ src/

# Fail the build if the jar did not come out whole. A full disk once
# left a zero-byte app.jar in the image, which built and pushed
# happily and then crash-looped at run time with "Invalid or corrupt
# jarfile" - a confusing way to find out, and a long way from the
# cause. Checking here turns that into a build failure instead.
#
# jar rather than unzip: it ships with the JDK that is already here,
# so the check costs no extra package.
#
# Same retry loop as above: go-offline is known to miss a few plugins,
# which package then fetches over the network.
RUN for i in 1 2 3; do \
         ./mvnw -B -q $MAVEN_HTTP_OPTS clean package -DskipTests && break; \
         [ "$i" = 3 ] && exit 1; \
         echo "package failed (attempt $i/3), retrying in $((i * 10))s" >&2; \
         sleep $((i * 10)); \
       done \
    && jarfile=$(ls target/*.jar | head -1) \
    && test -s "$jarfile" \
    && jar tf "$jarfile" > /dev/null \
    && echo "built $(stat -c %s "$jarfile") byte jar"

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
