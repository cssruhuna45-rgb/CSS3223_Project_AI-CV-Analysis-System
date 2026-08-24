package com.aiinterview.service.impl;

import com.aiinterview.dto.ResumeAnalysisResponse;
import com.aiinterview.dto.ResumeResponseDto;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.ResumeAnalysis;
import com.aiinterview.entity.User;
import com.aiinterview.exception.InvalidFileException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.ResumeAnalysisRepository;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.AiServiceClient;
import com.aiinterview.service.FileStorageService;
import com.aiinterview.service.PdfTextExtractionService;
import com.aiinterview.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ResumeServiceImpl implements ResumeService {

        private final ResumeRepository resumeRepository;
        private final UserRepository userRepository;
        private final FileStorageService fileStorageService;
        private final PdfTextExtractionService pdfTextExtractionService;
        private final AiServiceClient aiServiceClient;
        private final ResumeAnalysisRepository resumeAnalysisRepository;

    @Override
    @Transactional
    public ResumeResponseDto uploadResume(MultipartFile file, String userEmail) {

        // 1. Validate file
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("Cannot upload an empty file.");
        }

        String originalFilename = StringUtils.cleanPath(
                Objects.requireNonNull(file.getOriginalFilename()));

        // 2. Validate PDF
        if (!originalFilename.toLowerCase().endsWith(".pdf") ||
                (file.getContentType() != null &&
                        !file.getContentType().equalsIgnoreCase("application/pdf"))) {

            throw new InvalidFileException(
                    "Invalid file format. Only PDF files (.pdf) are allowed.");
        }

        // 3. Find user
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with email: " + userEmail));

        // 4. Generate unique stored filename
        String storedFileName = UUID.randomUUID() + "_" + originalFilename;

        // 5. Store PDF file
        String filePath = fileStorageService
                .storeFile(file, storedFileName)
                .toString();

        // 6. Create Resume entity
        Resume resume = Resume.builder()
                .user(user)
                .originalFileName(originalFilename)
                .storedFileName(storedFileName)
                .filePath(filePath)
                .fileSize(file.getSize())
                .contentType("application/pdf")
                .processingStatus("PENDING")
                .build();

        // 7. Extract PDF text
        try {

            resume.setProcessingStatus("PROCESSING");

            String extractedText = pdfTextExtractionService.extractText(filePath);

            resume.setExtractedText(extractedText);
            resume.setProcessingStatus("COMPLETED");

        } catch (Exception e) {

            resume.setProcessingStatus("FAILED");

            System.err.println(
                    "PDF text extraction failed: "
                            + e.getMessage());
        }

        // 8. Save resume first so that the database generates resume ID
Resume savedResume = resumeRepository.save(resume);

// 9. Analyze resume using AI service
if ("COMPLETED".equals(savedResume.getProcessingStatus())) {

    try {

        ResumeAnalysisResponse analysis =
                aiServiceClient.analyzeResume(
                        savedResume.getId(),
                        savedResume.getExtractedText()
                );

        // 10. Save AI analysis result
        ResumeAnalysis resumeAnalysis =
                ResumeAnalysis.builder()
                        .resume(savedResume)
                        .score(analysis.getScore())
                        .summary(analysis.getSummary())
                        .skills(analysis.getSkills())
                        .strengths(analysis.getStrengths())
                        .weaknesses(analysis.getWeaknesses())
                        .missingSkills(analysis.getMissingSkills())
                        .recommendations(analysis.getRecommendations())
                        .build();

        resumeAnalysisRepository.save(resumeAnalysis);

    } catch (Exception e) {

        System.err.println(
                "AI resume analysis failed: "
                        + e.getMessage()
        );
    }
}

// 11. Return response
return mapToDto(savedResume);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ResumeResponseDto> getUserResumes(
            String userEmail) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with email: "
                                + userEmail));

        return resumeRepository
                .findByUserIdOrderByUploadedAtDesc(user.getId())
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ResumeResponseDto getResumeById(
            Long id,
            String userEmail) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with email: "
                                + userEmail));

        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Resume not found with id: " + id));

        // Check ownership
        if (!resume.getUser().getId()
                .equals(user.getId())) {

            throw new UnauthorizedAccessException(
                    "You do not have permission to access this resume.");
        }

        return mapToDto(resume);
    }

    @Override
    @Transactional
    public void deleteResume(
            Long id,
            String userEmail) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with email: "
                                + userEmail));

        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Resume not found with id: " + id));

        // Check ownership
        if (!resume.getUser().getId()
                .equals(user.getId())) {

            throw new UnauthorizedAccessException(
                    "You do not have permission to delete this resume.");
        }

        // Delete physical file
        fileStorageService.deleteFile(
                resume.getFilePath());

        // Delete database record
        resumeRepository.delete(resume);
    }

    /**
     * Convert Resume entity to ResumeResponseDto
     */
    private ResumeResponseDto mapToDto(
            Resume resume) {

        return ResumeResponseDto.builder()
                .id(resume.getId())
                .originalFileName(
                        resume.getOriginalFileName())
                .fileSize(
                        resume.getFileSize())
                .contentType(
                        resume.getContentType())
                .uploadedAt(
                        resume.getUploadedAt())
                .updatedAt(
                        resume.getUpdatedAt())
                .build();
    }
}