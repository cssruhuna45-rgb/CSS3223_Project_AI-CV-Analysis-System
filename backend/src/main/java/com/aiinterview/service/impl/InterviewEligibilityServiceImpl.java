package com.aiinterview.service.impl;

import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.service.InterviewEligibilityService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class InterviewEligibilityServiceImpl implements InterviewEligibilityService {

    private static final Logger log =
            LoggerFactory.getLogger(InterviewEligibilityServiceImpl.class);

    // Messages written for the candidate. None of them says which
    // internal check failed, whether the recruiter has opened the
    // application, or whether questions exist in draft.

    private static final String NOT_APPLIED =
            "Apply for this job before starting its interview.";

    private static final String UNDER_REVIEW =
            "Your application is still under review. The interview opens "
                    + "once the recruiter shortlists you.";

    private static final String NOT_SELECTED =
            "This application was not selected, so its interview is not available.";

    private static final String ALREADY_COMPLETED =
            "You have already completed the interview for this job.";

    private static final String JOB_CLOSED =
            "This job is no longer taking candidates.";

    private static final String NOT_READY =
            "The interview for this job is not ready yet. Please check back later.";

    private static final String IN_PROGRESS =
            "Your interview for this job is already under way. Continue the "
                    + "attempt you started; it cannot be restarted.";

    private final JobApplicationRepository jobApplicationRepository;

    private final InterviewSessionRepository interviewSessionRepository;

    // ========================================================
    // Enforcement
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public JobApplication requireEligibleApplication(User candidate, JobPosting job) {

        // 1. A candidate account. Recruiters and administrators do not
        //    sit interviews; letting them would file their own rows
        //    among a recruiter's candidates.
        if (candidate.getRole() != Role.CANDIDATE) {
            throw new BadRequestException("Only candidate accounts can take a job interview.");
        }

        // 2. An application of their own for this job. Looked up by
        //    (candidate from the token, job from the invite code), so
        //    an application id in a request body is never consulted and
        //    one candidate can never borrow another's shortlisting.
        JobApplication application = jobApplicationRepository
                .findByJobPostingIdAndCandidateId(job.getId(), candidate.getId())
                .orElseThrow(() -> new UnauthorizedAccessException(NOT_APPLIED));

        // 3. Shortlisted, and nothing else.
        if (!application.allowsInterview()) {
            throw new ConflictException(statusRefusal(application.getStatus()));
        }

        // 4. The job still open. A closed job keeps its results but
        //    takes no new candidates.
        if (!job.isOpen()) {
            throw new ConflictException(JOB_CLOSED);
        }

        // 5. Person 1's approved question set exists. A job with only a
        //    draft is not interviewable, and the candidate is told it is
        //    not ready rather than what state the draft is in.
        if (!job.isQuestionsApproved()) {
            throw new ConflictException(NOT_READY);
        }

        // 6. The one permitted attempt is unused. A completed attempt
        //    is final; an attempt still running is resumed, not
        //    restarted, so a double-clicked start cannot become two
        //    goes at the same assessment.
        attempt(application).ifPresent(session -> {
            throw new ConflictException(
                    session.isCompleted() ? ALREADY_COMPLETED : IN_PROGRESS
            );
        });

        log.debug(
                "Candidate {} is eligible for job {} through application {}",
                candidate.getId(),
                job.getId(),
                application.getId()
        );

        return application;
    }

    // ========================================================
    // Reading, for the candidate's own status page
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public InterviewAccess describeAccess(JobApplication application) {

        JobPosting job = application.getJobPosting();

        if (!application.allowsInterview()) {
            return unavailable(statusRefusal(application.getStatus()));
        }

        if (!job.isOpen()) {
            return unavailable(JOB_CLOSED);
        }

        if (!job.isQuestionsApproved()) {
            return unavailable(NOT_READY);
        }

        Optional<InterviewSession> attempt = attempt(application);

        if (attempt.isEmpty()) {
            // Shortlisted, job ready, attempt unused.
            return new InterviewAccess(true, false, null, null);
        }

        InterviewSession session = attempt.get();

        if (session.isCompleted()) {
            return unavailable(ALREADY_COMPLETED);
        }

        // Under way: offered as a resume rather than a fresh start, and
        // the session id lets the page continue the right attempt.
        return new InterviewAccess(true, true, session.getSessionId(), null);
    }

    // ========================================================
    // Internals
    // ========================================================

    /**
     * The attempt made for this application, if any. At most one row
     * can exist; a unique index enforces it.
     */
    private Optional<InterviewSession> attempt(JobApplication application) {
        return interviewSessionRepository.findByJobApplicationId(application.getId());
    }

    /**
     * What to tell a candidate whose application is not shortlisted.
     *
     * <p>INTERVIEWED is reported as already completed rather than as a
     * status problem: from the candidate's side that is what it is.
     */
    private static String statusRefusal(ApplicationStatus status) {

        return switch (status) {
            case APPLIED -> UNDER_REVIEW;
            case REJECTED -> NOT_SELECTED;
            case INTERVIEWED -> ALREADY_COMPLETED;
            case SHORTLISTED -> NOT_READY;
        };
    }

    private static InterviewAccess unavailable(String message) {
        return new InterviewAccess(false, false, null, message);
    }
}
