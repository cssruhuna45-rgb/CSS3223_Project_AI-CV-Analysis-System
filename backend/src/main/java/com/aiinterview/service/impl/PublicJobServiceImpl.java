package com.aiinterview.service.impl;

import com.aiinterview.dto.PublicJobDetailDto;
import com.aiinterview.dto.PublicJobDto;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobPublicationStatus;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.InterviewEligibilityService;
import com.aiinterview.service.PublicJobService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PublicJobServiceImpl implements PublicJobService {

    /**
     * Shown for a job that does not exist and for one that is not
     * listed alike, so the answer does not tell anyone which private
     * jobs exist.
     */
    private static final String NOT_LISTED = "This job is not available.";

    private final JobPostingRepository jobPostingRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final UserRepository userRepository;
    private final InterviewEligibilityService interviewEligibilityService;

    @Override
    @Transactional(readOnly = true)
    public List<PublicJobDto> listPublished() {
        return jobPostingRepository
                .findByPublicationStatusAndArchivedFalseOrderByPublishedAtDesc(JobPublicationStatus.PUBLISHED)
                .stream()
                .map(PublicJobDto::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicJobDetailDto getPublished(String candidateEmail, Long jobId) {

        User candidate = userRepository.findByEmail(candidateEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + candidateEmail));

        JobPosting job = jobPostingRepository
                .findByIdAndPublicationStatusAndArchivedFalse(jobId, JobPublicationStatus.PUBLISHED)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_LISTED));

        // This candidate's own application, if they have one, so the
        // page shows its status instead of a second application form.
        JobApplication application = jobApplicationRepository
                .findByJobPostingIdAndCandidateId(job.getId(), candidate.getId())
                .orElse(null);

        InterviewEligibilityService.InterviewAccess access = application == null
                ? null
                : interviewEligibilityService.describeAccess(application);

        return PublicJobDetailDto.builder()
                .jobId(job.getId())
                .title(job.getTitle())
                .company(job.getCompany())
                .jobField(job.getJobField())
                .jobDescription(job.getJobDescription())
                .requiredSkills(List.copyOf(job.getRequiredSkills()))
                .publishedAt(job.getPublishedAt())
                .open(job.isOpen())
                .recruiterName(job.getRecruiter().getName())
                .interviewReady(job.isQuestionsApproved())
                .questionCount(job.getQuestionCount())
                .applicationId(application == null ? null : application.getId())
                .applicationStatus(application == null ? null : application.getStatus().name())
                .applicationStatusLabel(application == null ? null : application.getStatus().getLabel())
                .interviewAvailable(access != null && access.available())
                .interviewMessage(access == null ? null : access.message())
                .build();
    }
}
