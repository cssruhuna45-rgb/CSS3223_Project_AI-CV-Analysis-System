package com.aiinterview.service.impl;

import com.aiinterview.dto.CandidateApplicationDto;
import com.aiinterview.dto.CvSnapshotDto;
import com.aiinterview.dto.JobApplicationRequestDto;
import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.ResumeAnalysis;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.ResumeAnalysisRepository;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.InterviewEligibilityService;
import com.aiinterview.service.JobApplicationService;
import com.aiinterview.service.SkillMatchService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobApplicationServiceImpl implements JobApplicationService {

    private static final Logger log =
            LoggerFactory.getLogger(JobApplicationServiceImpl.class);

    /**
     * Shown for a job that does not exist and for a closed one alike,
     * so the answer does not tell anyone which job ids are real.
     */
    private static final String UNAVAILABLE_JOB =
            "This job is not available, or is no longer taking candidates.";

    private final JobApplicationRepository jobApplicationRepository;
    private final JobPostingRepository jobPostingRepository;
    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final UserRepository userRepository;
    private final SkillMatchService skillMatchService;
    private final InterviewEligibilityService interviewEligibilityService;
    private final ObjectMapper objectMapper;

    // ========================================================
    // Applying
    // ========================================================

    @Override
    @Transactional
    public CandidateApplicationDto apply(
            String candidateEmail,
            Long jobId,
            JobApplicationRequestDto request
    ) {

        User candidate = user(candidateEmail);

        // Recruiters and administrators do not apply for jobs; their
        // rows would land among a recruiter's candidates.
        if (candidate.getRole() != Role.CANDIDATE) {
            throw new BadRequestException("Only candidate accounts can apply for a job.");
        }

        // Consent is checked here as well as by bean validation on the
        // request and a CHECK constraint on the table. Pressing Apply
        // is not consent: the box has to have been ticked.
        if (!request.isConsentGranted()) {
            throw new BadRequestException(
                    "Agree to share your CV with this recruiter before applying."
            );
        }

        JobPosting job = jobPostingRepository.findById(jobId)
                .filter(JobPosting::isOpen)
                .orElseThrow(() -> new ResourceNotFoundException(UNAVAILABLE_JOB));

        // A job with no stated requirements cannot be matched against,
        // and a recruiter reviewing it would have nothing to compare a
        // CV with. Jobs created before V10 are in this state until
        // their skills are filled in.
        if (job.getRequiredSkills().isEmpty()) {
            throw new BadRequestException(
                    "This job is not ready for applications yet."
            );
        }

        // Checked before the insert so a repeat submit is a clear 409.
        // The unique constraint is what makes it safe under a race; see
        // the catch below.
        if (jobApplicationRepository.existsByJobPostingIdAndCandidateId(jobId, candidate.getId())) {
            throw new ConflictException("You have already applied for this job.");
        }

        // The CV must be one of this candidate's own. Looked up by
        // (id, owner), so another candidate's resume id is "not found"
        // rather than something that can be attached to an application
        // and shown to a recruiter.
        Resume resume = resumeRepository
                .findByIdAndUserId(request.getResumeId(), candidate.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "That CV is not available. Choose one of your uploaded CVs."
                ));

        JobApplication application = buildApplication(job, candidate, resume);

        try {
            application = jobApplicationRepository.saveAndFlush(application);
        } catch (DataIntegrityViolationException e) {
            // Two submits raced each other and both passed the check
            // above. The unique constraint on (job, candidate) kept the
            // second one out, which is exactly what it is for.
            log.info(
                    "Duplicate application for job {} by candidate {} was refused",
                    jobId,
                    candidate.getId()
            );
            throw new ConflictException("You have already applied for this job.");
        }

        log.info(
                "Candidate {} applied for job {} as application {} with CV {} ({}% match)",
                candidate.getId(),
                jobId,
                application.getId(),
                resume.getId(),
                application.getMatchPercentage()
        );

        return toDto(application);
    }

    /**
     * A new application with its CV evidence frozen and its skill match
     * computed.
     *
     * <p>The snapshot is taken first and the match is then computed
     * from the snapshot's own skills, so the number a recruiter sees
     * and the skills they read came from the same analysis.
     */
    private JobApplication buildApplication(JobPosting job, User candidate, Resume resume) {

        ResumeAnalysis analysis = resumeAnalysisRepository
                .findByResumeId(resume.getId())
                .orElse(null);

        String snapshotJson = CvEvidenceSnapshots.toJson(analysis, objectMapper);

        CvSnapshotDto snapshot = CvEvidenceSnapshots.fromJson(snapshotJson, objectMapper);

        SkillMatchService.SkillMatchResult match = skillMatchService.match(
                job.getRequiredSkills(),
                CvEvidenceSnapshots.skillsOf(snapshot)
        );

        LocalDateTime now = LocalDateTime.now();

        return JobApplication.builder()
                .jobPosting(job)
                .candidate(candidate)
                .submittedResume(resume)
                .analysisSnapshot(snapshotJson)
                .consentGranted(true)
                .consentAt(now)
                .consentVersion(JobApplication.CURRENT_CONSENT_VERSION)
                .matchPercentage(match.matchPercentage())
                .requiredSkillCount(match.requiredSkillCount())
                .matchedSkills(new ArrayList<>(match.matchedSkills()))
                .relatedSkills(new ArrayList<>(match.relatedSkills()))
                .missingSkills(new ArrayList<>(match.missingSkills()))
                // Always APPLIED. Nothing shortlists a candidate
                // automatically, whatever the match percentage says.
                .status(ApplicationStatus.APPLIED)
                .appliedAt(now)
                .build();
    }

    // ========================================================
    // Reading
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public List<CandidateApplicationDto> listMine(String candidateEmail) {

        User candidate = user(candidateEmail);

        return jobApplicationRepository.findForCandidate(candidate.getId())
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CandidateApplicationDto getMine(String candidateEmail, Long applicationId) {

        User candidate = user(candidateEmail);

        // Loaded and then checked against the signed-in candidate, so
        // another candidate's application id is "not found".
        JobApplication application = jobApplicationRepository.findById(applicationId)
                .filter(a -> a.getCandidate().getId().equals(candidate.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No application with id " + applicationId
                ));

        return toDto(application);
    }

    // ========================================================
    // Internals
    // ========================================================

    private CandidateApplicationDto toDto(JobApplication application) {

        JobPosting job = application.getJobPosting();

        InterviewEligibilityService.InterviewAccess access =
                interviewEligibilityService.describeAccess(application);

        return CandidateApplicationDto.builder()
                .applicationId(application.getId())
                .jobId(job.getId())
                .jobTitle(job.getTitle())
                .company(job.getCompany())
                .recruiterName(job.getRecruiter().getName())
                .inviteCode(job.getInviteCode())
                .status(application.getStatus().name())
                .statusLabel(application.getStatus().getLabel())
                .submittedCvFileName(application.getSubmittedResume().getOriginalFileName())
                .appliedAt(application.getAppliedAt())
                .decidedAt(application.getDecidedAt())
                .interviewCompletedAt(application.getInterviewCompletedAt())
                .interviewAvailable(access.available())
                .interviewResumable(access.resumable())
                .interviewMessage(access.message())
                .build();
    }

    private User user(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
