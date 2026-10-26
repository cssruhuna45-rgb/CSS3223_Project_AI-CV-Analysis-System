package com.aiinterview.service;

import com.aiinterview.dto.ResumeResponseDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ResumeService {
    ResumeResponseDto uploadResume(MultipartFile file, String userEmail);
    ResumeResponseDto uploadResume(MultipartFile file, String userEmail, String requestKey);
    List<ResumeResponseDto> getUserResumes(String userEmail);
    ResumeResponseDto getResumeById(Long id, String userEmail);
    void deleteResume(Long id, String userEmail);
}
