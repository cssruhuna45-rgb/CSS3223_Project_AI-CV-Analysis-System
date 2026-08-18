package com.aiinterview.controller;

import com.aiinterview.dto.HealthResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

    @GetMapping("/health")
    public ResponseEntity<HealthResponseDto> getHealthStatus() {
        HealthResponseDto response = HealthResponseDto.builder()
                .status("UP")
                .service("AI Interview Platform Backend")
                .build();
        return ResponseEntity.ok(response);
    }
}
