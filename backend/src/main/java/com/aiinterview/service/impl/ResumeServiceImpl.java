package com.aiinterview.service.impl;

import com.aiinterview.dto.ResumeResponseDto;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.InvalidFileException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.repository.ResumeAnalysisRepository;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.FileStorageService;
import com.aiinterview.service.PdfTextExtractionService;
import com.aiinterview.service.ResumeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
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
        private final ResumeAnalysisRepository resumeAnalysisRepository;
        private final JobApplicationRepository jobApplicationRepository;

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

        // The name and Content-Type above both come from the browser, so
        // a renamed file passes them. A real PDF says so in its first
        // bytes; check that before anything is written to disk.
        if (!hasPdfHeader(file)) {

            throw new InvalidFileException(
                    "This file is not a valid PDF. Please upload a PDF document.");
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

        // 8. Save resume so that the database generates the resume ID
        Resume savedResume = resumeRepository.save(resume);

        // AI analysis deliberately does NOT happen here. It is best
        // effort, and anything it did inside this transaction could
        // mark it rollback-only and take the upload down with it. The
        // controller runs it once this transaction has committed.
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

        // A CV sent with a job application is what the recruiter is
        // reviewing, and the database refuses to drop it (V11, ON
        // DELETE RESTRICT). Say so instead of failing with a 500.
        if (jobApplicationRepository.existsBySubmittedResumeId(resume.getId())) {

            throw new ConflictException(
                    "This CV was submitted with a job application, so it cannot be deleted.");
        }

        // The analysis row points at the resume with no ON DELETE
        // CASCADE, so it has to go first.
        resumeAnalysisRepository.findByResumeId(resume.getId())
                .ifPresent(resumeAnalysisRepository::delete);

        // Delete database record. Flushed now so a database failure
        // stops us before the file is gone.
        resumeRepository.delete(resume);
        resumeRepository.flush();

        // Delete physical file
        fileStorageService.deleteFile(
                resume.getFilePath());
    }

    /**
     * Whether the upload starts like a PDF. The specification lets
     * "%PDF-" sit anywhere in the first 1024 bytes, so look that far.
     */
    private boolean hasPdfHeader(MultipartFile file) {

        try (InputStream in = file.getInputStream()) {

            String head = new String(in.readNBytes(1024), StandardCharsets.ISO_8859_1);

            return head.contains("%PDF-");

        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Convert Resume entity to ResumeResponseDto
     */
    private ResumeResponseDto mapToDto(
            Resume resume) {

        return ResumeResponseDto.builder()
                .id(resume.getId())
                .originalFileName(resume.getOriginalFileName())
                .fileSize(resume.getFileSize())
                .contentType(resume.getContentType())
                .extractedText(resume.getExtractedText())
                .uploadedAt(resume.getUploadedAt())
                .updatedAt(resume.getUpdatedAt())
                .build();
    }
}