package com.aiinterview.service;

import com.aiinterview.dto.ResumeResponseDto;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.User;
import com.aiinterview.exception.InvalidFileException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.ResumeServiceImpl;
import com.aiinterview.service.PdfTextExtractionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResumeServiceTest {

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private PdfTextExtractionService pdfTextExtractionService;

    @InjectMocks
    private ResumeServiceImpl resumeService;

    private User user1;
    private User user2;
    private Resume resumeUser1;
    private MockMultipartFile validPdfFile;
    private MockMultipartFile invalidTxtFile;

    @BeforeEach
    void setUp() {
        user1 = User.builder()
                .id(1L)
                .name("Alice Candidate")
                .email("alice@example.com")
                .password("hashedPassword123")
                .build();

        user2 = User.builder()
                .id(2L)
                .name("Bob Intruder")
                .email("bob@example.com")
                .password("hashedPassword456")
                .build();

        resumeUser1 = Resume.builder()
                .id(100L)
                .user(user1)
                .originalFileName("alice_resume.pdf")
                .storedFileName("uuid_alice_resume.pdf")
                .filePath("uploads/resumes/uuid_alice_resume.pdf")
                .fileSize(102400L)
                .contentType("application/pdf")
                .uploadedAt(LocalDateTime.now())
                .build();

        validPdfFile = new MockMultipartFile(
                "file",
                "my_resume.pdf",
                "application/pdf",
                "%PDF-1.4 Mock PDF Content".getBytes()
        );

        invalidTxtFile = new MockMultipartFile(
                "file",
                "script.txt",
                "text/plain",
                "Not a pdf file content".getBytes()
        );
    }

    @Test
    @DisplayName("Should successfully upload valid PDF resume")
    void testUploadValidPdfResume() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user1));
        when(fileStorageService.storeFile(any(), anyString())).thenReturn("uploads/resumes/stored_file.pdf");
        when(pdfTextExtractionService.extractText(anyString())).thenReturn("Alice Candidate Software Engineer Java Spring Boot Python");
        when(resumeRepository.save(any(Resume.class))).thenReturn(resumeUser1);

        ResumeResponseDto result = resumeService.uploadResume(validPdfFile, "alice@example.com");

        assertNotNull(result);
        assertEquals("alice_resume.pdf", result.getOriginalFileName());
        assertEquals("application/pdf", result.getContentType());
        verify(fileStorageService).storeFile(any(), anyString());
        verify(resumeRepository).save(any(Resume.class));
    }

    @Test
    @DisplayName("Should reject non-PDF file upload")
    void testRejectNonPdfUpload() {
        assertThrows(InvalidFileException.class, () -> 
            resumeService.uploadResume(invalidTxtFile, "alice@example.com")
        );

        verify(fileStorageService, never()).storeFile(any(), anyString());
        verify(resumeRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should fetch resumes belonging ONLY to authenticated user")
    void testGetUserResumesIsolation() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user1));
        when(resumeRepository.findByUserIdOrderByUploadedAtDesc(1L)).thenReturn(List.of(resumeUser1));

        List<ResumeResponseDto> result = resumeService.getUserResumes("alice@example.com");

        assertEquals(1, result.size());
        assertEquals("alice_resume.pdf", result.get(0).getOriginalFileName());
        verify(resumeRepository).findByUserIdOrderByUploadedAtDesc(1L);
    }

    @Test
    @DisplayName("Should prevent user from accessing another user's resume")
    void testPreventAccessToOtherUserResume() {
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(user2));
        when(resumeRepository.findById(100L)).thenReturn(Optional.of(resumeUser1)); // Belongs to user1

        assertThrows(UnauthorizedAccessException.class, () ->
            resumeService.getResumeById(100L, "bob@example.com")
        );
    }

    @Test
    @DisplayName("Should prevent user from deleting another user's resume")
    void testPreventDeleteOtherUserResume() {
        when(userRepository.findByEmail("bob@example.com")).thenReturn(Optional.of(user2));
        when(resumeRepository.findById(100L)).thenReturn(Optional.of(resumeUser1)); // Belongs to user1

        assertThrows(UnauthorizedAccessException.class, () ->
            resumeService.deleteResume(100L, "bob@example.com")
        );

        verify(fileStorageService, never()).deleteFile(anyString());
        verify(resumeRepository, never()).delete(any());
    }
}
