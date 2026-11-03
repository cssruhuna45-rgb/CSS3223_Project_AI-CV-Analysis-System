package com.aiinterview.service.impl;

import com.aiinterview.dto.JobPostingDto;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobPublicationStatus;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.JobPublicationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class JobPublicationServiceImpl implements JobPublicationService {

    private static final Logger log = LoggerFactory.getLogger(JobPublicationServiceImpl.class);

    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public JobPostingDto publish(String recruiterEmail, Long jobId) {

        JobPosting job = ownJob(recruiterEmail, jobId);

        // Archived means hidden everywhere; publishing it would say
        // otherwise. Unarchive first.
        if (job.isArchived()) {
            throw new ConflictException("Unarchive this job before publishing it.");
        }

        job.setPublicationStatus(JobPublicationStatus.PUBLISHED);
        job.setPublishedAt(LocalDateTime.now());

        return saved(job, "published");
    }

    @Override
    @Transactional
    public JobPostingDto unpublish(String recruiterEmail, Long jobId) {

        JobPosting job = ownJob(recruiterEmail, jobId);

        // publishedAt is kept: it is when the job was last listed.
        job.setPublicationStatus(JobPublicationStatus.DRAFT);

        return saved(job, "unpublished");
    }

    @Override
    @Transactional
    public JobPostingDto archive(String recruiterEmail, Long jobId) {

        JobPosting job = ownJob(recruiterEmail, jobId);

        job.setArchived(true);

        return saved(job, "archived");
    }

    @Override
    @Transactional
    public JobPostingDto unarchive(String recruiterEmail, Long jobId) {

        JobPosting job = ownJob(recruiterEmail, jobId);

        job.setArchived(false);

        return saved(job, "unarchived");
    }

    // ========================================================
    // Internals
    // ========================================================

    /**
     * Looked up together with the owner, so another recruiter's job id
     * is "not found" rather than something that can be changed.
     */
    private JobPosting ownJob(String recruiterEmail, Long jobId) {

        User recruiter = userRepository.findByEmail(recruiterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + recruiterEmail));

        return jobPostingRepository.findByIdAndRecruiterId(jobId, recruiter.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No job with id " + jobId));
    }

    /**
     * Counts are not recomputed for one job; like closing a job, the
     * page keeps the ones it already shows.
     */
    private JobPostingDto saved(JobPosting job, String change) {

        JobPosting saved = jobPostingRepository.save(job);

        log.info("Recruiter {} {} job {}", saved.getRecruiter().getId(), change, saved.getId());

        return JobPostingDto.from(saved, 0, 0);
    }
}
