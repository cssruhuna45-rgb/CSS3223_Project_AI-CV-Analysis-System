package com.aiinterview.service;

import com.aiinterview.dto.JobPostingDto;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobPublicationStatus;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.JobPublicationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for a recruiter publishing, unpublishing and archiving jobs.
 *
 * <p>The important refusals are ownership ones: every change is made
 * through a lookup scoped to the recruiter from the token, so these
 * check that another recruiter's job is "not found" and never saved.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JobPublicationServiceTest {

    private static final String RITA = "rita@example.com";
    private static final String OSCAR = "oscar@example.com";

    @Mock
    private JobPostingRepository jobPostingRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private JobPublicationServiceImpl service;

    private JobPosting job;

    @BeforeEach
    void setUp() {
        User rita = User.builder().id(10L).name("Rita").email(RITA).role(Role.RECRUITER).build();
        User oscar = User.builder().id(11L).name("Oscar").email(OSCAR).role(Role.RECRUITER).build();

        job = JobPosting.builder()
                .id(5L)
                .recruiter(rita)
                .title("Java Backend Intern")
                .inviteCode("ABCD-EF23")
                .open(true)
                .requiredSkills(new ArrayList<>(List.of("java")))
                .build();

        when(userRepository.findByEmail(RITA)).thenReturn(Optional.of(rita));
        when(userRepository.findByEmail(OSCAR)).thenReturn(Optional.of(oscar));
        when(jobPostingRepository.findByIdAndRecruiterId(5L, 10L)).thenReturn(Optional.of(job));
        when(jobPostingRepository.findByIdAndRecruiterId(5L, 11L)).thenReturn(Optional.empty());
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("publishing lists the job and records when")
    void publishListsTheJob() {
        JobPostingDto dto = service.publish(RITA, 5L);

        assertEquals("PUBLISHED", dto.getPublicationStatus());
        assertNotNull(dto.getPublishedAt());
        assertTrue(job.isPubliclyListed());
    }

    @Test
    @DisplayName("publishing does not open or close the job")
    void publishLeavesOpenAlone() {
        job.setOpen(false);

        JobPostingDto dto = service.publish(RITA, 5L);

        assertFalse(dto.isOpen());
    }

    @Test
    @DisplayName("unpublishing takes the job off the list and keeps its invite code")
    void unpublishHidesTheJob() {
        job.setPublicationStatus(JobPublicationStatus.PUBLISHED);
        job.setPublishedAt(LocalDateTime.now());

        JobPostingDto dto = service.unpublish(RITA, 5L);

        assertEquals("DRAFT", dto.getPublicationStatus());
        assertFalse(job.isPubliclyListed());
        assertEquals("ABCD-EF23", dto.getInviteCode());
    }

    @Test
    @DisplayName("an archived job is hidden even if it was published")
    void archiveHidesAPublishedJob() {
        job.setPublicationStatus(JobPublicationStatus.PUBLISHED);

        JobPostingDto dto = service.archive(RITA, 5L);

        assertTrue(dto.isArchived());
        assertFalse(job.isPubliclyListed());
    }

    @Test
    @DisplayName("unarchiving brings the job back as it was")
    void unarchiveRestores() {
        job.setPublicationStatus(JobPublicationStatus.PUBLISHED);
        job.setArchived(true);

        JobPostingDto dto = service.unarchive(RITA, 5L);

        assertFalse(dto.isArchived());
        assertEquals("PUBLISHED", dto.getPublicationStatus());
        assertTrue(job.isPubliclyListed());
    }

    @Test
    @DisplayName("an archived job cannot be published until it is unarchived")
    void archivedJobCannotBePublished() {
        job.setArchived(true);

        assertThrows(ConflictException.class, () -> service.publish(RITA, 5L));
        verify(jobPostingRepository, never()).save(any());
    }

    @Test
    @DisplayName("a recruiter cannot publish, unpublish or archive another recruiter's job")
    void anotherRecruitersJobIsNotFound() {
        assertThrows(ResourceNotFoundException.class, () -> service.publish(OSCAR, 5L));
        assertThrows(ResourceNotFoundException.class, () -> service.unpublish(OSCAR, 5L));
        assertThrows(ResourceNotFoundException.class, () -> service.archive(OSCAR, 5L));
        assertThrows(ResourceNotFoundException.class, () -> service.unarchive(OSCAR, 5L));

        verify(jobPostingRepository, never()).save(any());
        assertEquals(JobPublicationStatus.DRAFT, job.getPublicationStatus());
        assertFalse(job.isArchived());
    }
}
