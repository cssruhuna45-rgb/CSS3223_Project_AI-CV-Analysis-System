package com.aiinterview.controller;

import com.aiinterview.dto.ResumeResponseDto;
import com.aiinterview.service.ResumeService;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/resumes")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class ResumeController {

    private final ResumeService resumeService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ResumeResponseDto> uploadResume(
            @RequestParam("file") MultipartFile file,
            Authentication authentication
    ) {
        String userEmail = authentication.getName();

        ResumeResponseDto response =
                resumeService.uploadResume(file, userEmail);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<ResumeResponseDto>> getUserResumes(
            Authentication authentication
    ) {
        String userEmail = authentication.getName();

        List<ResumeResponseDto> resumes =
                resumeService.getUserResumes(userEmail);

        return ResponseEntity.ok(resumes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResumeResponseDto> getResumeById(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String userEmail = authentication.getName();

        ResumeResponseDto resume =
                resumeService.getResumeById(id, userEmail);

        return ResponseEntity.ok(resume);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteResume(
            @PathVariable Long id,
            Authentication authentication
    ) {
        String userEmail = authentication.getName();

        resumeService.deleteResume(id, userEmail);

        return ResponseEntity.noContent().build();
    }
}

