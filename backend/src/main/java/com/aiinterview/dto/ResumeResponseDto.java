package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeResponseDto {
    private Long id;
    private String originalFileName;
    private Long fileSize;
    private String contentType;
    private String extractedText;
    private LocalDateTime uploadedAt;
    private LocalDateTime updatedAt;
}
