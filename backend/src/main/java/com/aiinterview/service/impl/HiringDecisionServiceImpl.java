package com.aiinterview.service.impl;

import com.aiinterview.dto.CandidateFinalResultDto;
import com.aiinterview.dto.HiringDecisionDto;
import com.aiinterview.dto.HiringDecisionRequestDto;
import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.HiringDecision;
import com.aiinterview.entity.HiringDecisionEvent;
import com.aiinterview.entity.HiringDecisionValue;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.PublicationStatus;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.HiringDecisionEventRepository;
import com.aiinterview.repository.HiringDecisionRepository;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.HiringDecisionService;
import com.aiinterview.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class HiringDecisionServiceImpl implements HiringDecisionService {

    private static final Logger log =
            LoggerFactory.getLogger(HiringDecisionServiceImpl.class);

    private static final String NOT_INTERVIEWED =
            "This candidate has not completed the interview, so there is no "
                    + "result to decide on yet.";

    private static final String ALREADY_PUBLISHED =
            "This decision has already been announced to the candidate and "
                    + "cannot be changed here.";

    private static final String NOTHING_TO_PUBLISH =
            "Save a decision before announcing it.";

    private static final String STILL_PENDING =
            "Choose whether this candidate is selected before announcing the decision.";

    /** What a candidate reads while no decision has been announced. */
    private static final String AWAITING_DECISION =
            "Your interview has been completed successfully. The recruiter is "
                    + "reviewing your application. Your final result will appear "
                    + "here once announced.";

    /** What a candidate reads before they have even finished the interview. */
    private static final String NOT_YET_INTERVIEWED =
            "Your final result will appear here once you have completed the "
                    + "interview and the recruiter has made their decision.";

    private final HiringDecisionRepository hiringDecisionRepository;
    private final HiringDecisionEventRepository hiringDecisionEventRepository;
    private final JobApplicationRepository jobApplicationRepository;
    private final InterviewSessionRepository interviewSessionRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // ========================================================
    // Recruiter
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public HiringDecisionDto getForRecruiter(String recruiterEmail, Long applicationId) {

        User recruiter = user(recruiterEmail);

        // Confirms ownership first, so another recruiter's application
        // id is "not found" rather than a decision they can read.
        requireOwnApplication(recruiter, applicationId);

        return hiringDecisionRepository
                .findForRecruiter(applicationId, recruiter.getId())
                .map(HiringDecisionDto::from)
                .orElseGet(() -> HiringDecisionDto.undecided(applicationId));
    }

    @Override
    @Transactional
    public HiringDecisionDto saveDraft(
            String recruiterEmail,
            Long applicationId,
            HiringDecisionRequestDto request
    ) {

        User recruiter = user(recruiterEmail);

        JobApplication application = requireOwnApplication(recruiter, applicationId);

        requireCompletedInterview(application);

        HiringDecision decision = hiringDecisionRepository
                .findByJobApplicationId(applicationId)
                .orElse(null);

        // A published decision is final here. Correcting one is a
        // deliberate, audited act - not something a stray save does.
        if (decision != null && decision.isPublished()) {
            throw new ConflictException(ALREADY_PUBLISHED);
        }

        if (decision == null) {
            decision = HiringDecision.builder()
                    .jobApplication(application)
                    .build();
        }

        decision.setDecision(request.getDecision());
        decision.setCandidateFeedback(trimToNull(request.getCandidateFeedback()));
        decision.setInternalNotes(trimToNull(request.getInternalNotes()));
        decision.setDecidedBy(recruiter);
        decision.setDecidedAt(LocalDateTime.now());
        decision.setPublicationStatus(PublicationStatus.DRAFT);

        decision = hiringDecisionRepository.save(decision);

        record(decision, HiringDecisionEvent.ACTION_DRAFTED, recruiter);

        log.info(
                "Recruiter {} saved a {} draft decision for application {}",
                recruiter.getId(),
                decision.getDecision(),
                applicationId
        );

        return HiringDecisionDto.from(decision);
    }

    @Override
    @Transactional
    public HiringDecisionDto publish(String recruiterEmail, Long applicationId) {

        User recruiter = user(recruiterEmail);

        JobApplication application = requireOwnApplication(recruiter, applicationId);

        requireCompletedInterview(application);

        HiringDecision decision = hiringDecisionRepository
                .findByJobApplicationId(applicationId)
                .orElseThrow(() -> new ConflictException(NOTHING_TO_PUBLISH));

        // Already announced: return it unchanged rather than failing,
        // and notify nobody a second time. A double-clicked Publish, or
        // a retried request, lands here.
        if (decision.isPublished()) {
            log.debug("Decision for application {} is already published", applicationId);
            return HiringDecisionDto.from(decision);
        }

        // "We have not decided" is not an announcement.
        if (!decision.getDecision().isPublishable()) {
            throw new ConflictException(STILL_PENDING);
        }

        decision.setPublicationStatus(PublicationStatus.PUBLISHED);
        decision.setPublishedAt(LocalDateTime.now());

        decision = hiringDecisionRepository.save(decision);

        record(decision, HiringDecisionEvent.ACTION_PUBLISHED, recruiter);

        // In the same transaction as the publication, so a candidate
        // can never be notified about a decision that was not stored -
        // nor have one stored without being told.
        notificationService.notifyHiringDecisionPublished(decision);

        log.info(
                "Recruiter {} published a {} decision for application {}",
                recruiter.getId(),
                decision.getDecision(),
                applicationId
        );

        return HiringDecisionDto.from(decision);
    }

    // ========================================================
    // Candidate
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public CandidateFinalResultDto getFinalResult(String candidateEmail, Long applicationId) {

        User candidate = user(candidateEmail);

        // The application must be this candidate's; somebody else's id
        // is "not found".
        JobApplication application = jobApplicationRepository.findById(applicationId)
                .filter(a -> a.getCandidate().getId().equals(candidate.getId()))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No application with id " + applicationId
                ));

        // Only published rows are loaded at all. A draft is not
        // filtered out of the response - it is never read, so there is
        // no shape of this call in which one could leak.
        Optional<HiringDecision> published = hiringDecisionRepository
                .findPublishedForCandidate(applicationId, candidate.getId());

        JobPosting job = application.getJobPosting();

        CandidateFinalResultDto.CandidateFinalResultDtoBuilder result =
                CandidateFinalResultDto.builder()
                        .applicationId(application.getId())
                        .jobId(job.getId())
                        .jobTitle(job.getTitle())
                        .company(job.getCompany())
                        .recruiterName(job.getRecruiter().getName())
                        .applicationStatus(application.getStatus().name())
                        .applicationStatusLabel(application.getStatus().getLabel())
                        .interviewCompletedAt(application.getInterviewCompletedAt());

        if (published.isEmpty()) {
            // Indistinguishable from "the recruiter has written a
            // draft", which is the point.
            return result
                    .announced(false)
                    .decision(HiringDecisionValue.PENDING.name())
                    .decisionLabel(HiringDecisionValue.PENDING.getLabel())
                    .selected(false)
                    .message(application.getStatus() == ApplicationStatus.INTERVIEWED
                            ? AWAITING_DECISION
                            : NOT_YET_INTERVIEWED)
                    .build();
        }

        HiringDecision decision = published.get();

        return result
                .announced(true)
                .decision(decision.getDecision().name())
                .decisionLabel(decision.getDecision().getLabel())
                .selected(decision.getDecision() == HiringDecisionValue.SELECTED)
                .feedback(decision.getCandidateFeedback())
                .announcedAt(decision.getPublishedAt())
                .build();
    }

    // ========================================================
    // Internals
    // ========================================================

    /**
     * One application on one of the recruiter's own jobs. The
     * ownership test lives inside the query, so an id belonging to
     * another recruiter is "not found" rather than a 403 that confirms
     * the application exists.
     */
    private JobApplication requireOwnApplication(User recruiter, Long applicationId) {
        return jobApplicationRepository
                .findByIdForRecruiter(applicationId, recruiter.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No application with id " + applicationId
                ));
    }

    /**
     * There must be a finished interview to decide on.
     *
     * <p>Both conditions are checked: the application reached
     * INTERVIEWED, and a completed attempt is actually stored against
     * it. The status alone would be enough in normal operation, but a
     * hiring decision is not the place to assume the two agree.
     */
    private void requireCompletedInterview(JobApplication application) {

        if (application.getStatus() != ApplicationStatus.INTERVIEWED) {
            throw new ConflictException(NOT_INTERVIEWED);
        }

        boolean completed = interviewSessionRepository
                .findByJobApplicationId(application.getId())
                .filter(InterviewSession::isCompleted)
                .isPresent();

        if (!completed) {
            throw new ConflictException(NOT_INTERVIEWED);
        }
    }

    /** Appends one step to the decision's history. */
    private void record(HiringDecision decision, String action, User actor) {

        hiringDecisionEventRepository.save(HiringDecisionEvent.builder()
                .hiringDecision(decision)
                .action(action)
                .decision(decision.getDecision())
                .publicationStatus(decision.getPublicationStatus())
                .actor(actor)
                .build());
    }

    private static String trimToNull(String value) {

        if (value == null) {
            return null;
        }

        String trimmed = value.trim();

        return trimmed.isEmpty() ? null : trimmed;
    }

    private User user(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
