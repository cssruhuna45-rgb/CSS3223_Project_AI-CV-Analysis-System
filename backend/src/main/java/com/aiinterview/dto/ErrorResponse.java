package com.aiinterview.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;
    private String error;

    /**
     * Stable identifier the frontend switches on, e.g. CONFLICT or
     * AI_UNAVAILABLE. {@code message} is always written for the user;
     * technical detail stays in the server log.
     */
    private String code;

    private String message;
    private String path;
    private Map<String, String> fieldErrors;
}
