package com.aiinterview.service;

import com.aiinterview.dto.ResumeAnalysisRequest;
import com.aiinterview.dto.ResumeAnalysisResponse;
import com.aiinterview.exception.AiServiceException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Server-to-server client for the Python AI service.
 *
 * <p>The AI service is not reachable from the browser. Every call made
 * here carries the shared internal API key, which the AI service
 * requires on all of its endpoints.
 */
@Service
public class AiServiceClient {

    private static final Logger log =
            LoggerFactory.getLogger(AiServiceClient.class);

    private static final String INTERNAL_API_KEY_HEADER =
            "X-Internal-Api-Key";

    /**
     * Generous, because a single interview turn runs an LLM call.
     */
    private static final Duration REQUEST_TIMEOUT =
            Duration.ofSeconds(120);

    private static final Duration CONNECT_TIMEOUT =
            Duration.ofSeconds(10);

    private final ObjectMapper objectMapper;

    private final String baseUrl;

    private final String internalApiKey;

    private final HttpClient httpClient =
            HttpClient.newBuilder()
                    .version(HttpClient.Version.HTTP_1_1)
                    .connectTimeout(CONNECT_TIMEOUT)
                    .build();

    public AiServiceClient(
            ObjectMapper objectMapper,
            @Value("${ai-service.url}") String baseUrl,
            @Value("${ai-service.internal-api-key:}") String internalApiKey
    ) {
        this.objectMapper = objectMapper;

        this.baseUrl = normalizeBaseUrl(baseUrl);

        this.internalApiKey = internalApiKey == null
                ? ""
                : internalApiKey.trim();

        if (this.internalApiKey.isEmpty()) {
            throw new IllegalStateException(
                    "ai-service.internal-api-key is not configured. Set "
                            + "AI_SERVICE_INTERNAL_API_KEY to the same value as "
                            + "INTERNAL_API_KEY in ai-service/.env, otherwise "
                            + "every AI call will be rejected with 401."
            );
        }
    }

    // ========================================================
    // Generic pass-through
    //
    // Returning JsonNode keeps the AI service's rich response
    // schemas in one place instead of mirroring them as Java DTOs
    // that would drift out of sync.
    // ========================================================

    public JsonNode post(String path, JsonNode body) {

        String jsonBody;

        try {
            jsonBody = objectMapper.writeValueAsString(
                    body == null
                            ? objectMapper.createObjectNode()
                            : body
            );
        } catch (Exception e) {
            throw new AiServiceException(
                    "Failed to serialize AI service request body",
                    e
            );
        }

        HttpRequest request = baseRequest(path)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        return send(request, path);
    }

    public JsonNode get(String path) {

        HttpRequest request = baseRequest(path)
                .GET()
                .build();

        return send(request, path);
    }

    // ========================================================
    // Typed helpers
    // ========================================================

    public ResumeAnalysisResponse analyzeResume(
            Long resumeId,
            String resumeText
    ) {

        ResumeAnalysisRequest request =
                ResumeAnalysisRequest.builder()
                        .resumeId(resumeId)
                        .text(resumeText)
                        .build();

        JsonNode response = post(
                "/api/v1/resume/analyze",
                objectMapper.valueToTree(request)
        );

        try {
            return objectMapper.treeToValue(
                    response,
                    ResumeAnalysisResponse.class
            );
        } catch (Exception e) {
            throw new AiServiceException(
                    "Failed to parse AI service resume analysis response",
                    e
            );
        }
    }

    // ========================================================
    // Internals
    // ========================================================

    /**
     * Drops trailing slashes so that {@code baseUrl + path} never
     * yields "//api/v1/...", which the AI service would 404 on.
     */
    static String normalizeBaseUrl(String baseUrl) {
        return baseUrl == null
                ? ""
                : baseUrl.trim().replaceAll("/+$", "");
    }

    private HttpRequest.Builder baseRequest(String path) {

        return HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .header("Accept", "application/json")
                .header(INTERNAL_API_KEY_HEADER, internalApiKey)
                .timeout(REQUEST_TIMEOUT);
    }

    private JsonNode send(HttpRequest request, String path) {

        HttpResponse<String> response;

        try {
            response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new AiServiceException(
                    "Interrupted while calling AI service " + path,
                    e
            );
        } catch (Exception e) {
            throw new AiServiceException(
                    "AI service is unreachable at " + baseUrl + path,
                    e
            );
        }

        int status = response.statusCode();

        if (status < 200 || status >= 300) {

            log.warn(
                    "AI service {} returned HTTP {}",
                    path,
                    status
            );

            throw new AiServiceException(
                    "AI service returned HTTP " + status,
                    status,
                    response.body()
            );
        }

        try {
            return objectMapper.readTree(response.body());
        } catch (Exception e) {
            throw new AiServiceException(
                    "AI service returned a non-JSON response for " + path,
                    e
            );
        }
    }
}
