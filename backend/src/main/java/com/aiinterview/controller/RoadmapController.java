package com.aiinterview.controller;

import com.aiinterview.dto.RoadmapGenerateRequestDto;
import com.aiinterview.dto.RoadmapProgressUpdateDto;
import com.aiinterview.dto.RoadmapResponseDto;
import com.aiinterview.service.LearningRoadmapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller for managing 14-day learning roadmaps and day completion progress.
 */
@RestController
@RequestMapping("/api/v1/roadmaps")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class RoadmapController {

    private final LearningRoadmapService roadmapService;

    @Operation(summary = "Generate and persist a 14-day personalized learning roadmap")
    @PostMapping("/generate")
    public ResponseEntity<RoadmapResponseDto> generateRoadmap(
            @Valid @RequestBody RoadmapGenerateRequestDto request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                roadmapService.generateAndSaveRoadmap(authentication.getName(), request)
        );
    }

    @Operation(summary = "Get stored roadmap for a specific interview session")
    @GetMapping("/session/{sessionId}")
    public ResponseEntity<RoadmapResponseDto> getRoadmapBySession(
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        return roadmapService.getBySessionId(authentication.getName(), sessionId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Get candidate's most recent learning roadmap")
    @GetMapping("/latest")
    public ResponseEntity<RoadmapResponseDto> getLatestRoadmap(
            Authentication authentication
    ) {
        return roadmapService.getLatest(authentication.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Get learning roadmap by ID")
    @GetMapping("/{id}")
    public ResponseEntity<RoadmapResponseDto> getRoadmapById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return roadmapService.getById(authentication.getName(), id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Update completion status of a day in the roadmap")
    @PutMapping("/{id}/progress")
    public ResponseEntity<RoadmapResponseDto> updateProgress(
            @PathVariable Long id,
            @Valid @RequestBody RoadmapProgressUpdateDto dto,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                roadmapService.updateProgress(authentication.getName(), id, dto.getDayNumber(), dto.getCompleted())
        );
    }
}
