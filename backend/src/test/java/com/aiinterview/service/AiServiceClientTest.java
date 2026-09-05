package com.aiinterview.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiServiceClientTest {

    private static final String VALID_KEY = "a-sufficiently-long-internal-key";

    private AiServiceClient newClient(String baseUrl, String key) {
        return new AiServiceClient(new ObjectMapper(), baseUrl, key);
    }

    @ParameterizedTest(name = "key = \"{0}\"")
    @ValueSource(strings = {"", "   "})
    @DisplayName("refuses to build without an internal API key")
    void rejectsBlankKey(String key) {

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> newClient("http://localhost:8000", key)
        );

        assertTrue(ex.getMessage().contains("AI_SERVICE_INTERNAL_API_KEY"));
    }

    @Test
    @DisplayName("refuses to build when the key property is absent")
    void rejectsNullKey() {

        assertThrows(
                IllegalStateException.class,
                () -> newClient("http://localhost:8000", null)
        );
    }

    @Test
    @DisplayName("accepts a configured key")
    void acceptsConfiguredKey() {

        assertDoesNotThrow(
                () -> newClient("http://localhost:8000", VALID_KEY)
        );
    }

    @Test
    @DisplayName("a trailing slash on the base URL does not produce a double slash")
    void trimsTrailingSlash() {

        // A "//api/v1/..." path would 404 against the AI service.
        assertEquals(
                "http://localhost:8000",
                AiServiceClient.normalizeBaseUrl("http://localhost:8000///")
        );

        assertEquals(
                "http://ai-service:8000",
                AiServiceClient.normalizeBaseUrl("  http://ai-service:8000/  ")
        );

        assertEquals(
                "http://localhost:8000",
                AiServiceClient.normalizeBaseUrl("http://localhost:8000")
        );
    }
}
