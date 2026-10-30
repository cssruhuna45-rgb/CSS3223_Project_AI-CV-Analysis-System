package com.aiinterview.service.impl;

import com.aiinterview.dto.ApplicantDetailDto;
import com.aiinterview.dto.ApplicantSummaryDto;
import com.aiinterview.dto.ApplicationDecisionRequestDto;
import com.aiinterview.dto.ComparisonAnswerDto;
import com.aiinterview.dto.ComparisonCandidateDto;
import com.aiinterview.dto.CvSnapshotDto;
import com.aiinterview.dto.JobComparisonDto;
import com.aiinterview.dto.SkillMatchDto;
import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.HiringDecision;
import com.aiinterview.entity.HiringDecisionValue;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobQuestion;
import com.aiinterview.entity.PublicationStatus;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.HiringDecisionRepository;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.JobApplicationRepository;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.JobQuestionService;
import com.aiinterview.service.RecruiterApplicationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecruiterApplicationServiceImpl implements RecruiterApplicationService {

    private static final Logger log =
            LoggerFactory.getLogger(RecruiterApplicationServiceImpl.class);

    private final JobApplicationRepository jobApplicationRepository;
    private final HiringDecisionRepository hiringDecisionRepository;
    private final JobPostingRepository jobPostingRepository;
    private final InterviewSessionRepository interviewSessionRepository;
    private final UserRepository userRepository;
    private final JobQuestionService jobQuestionService;
    private final ObjectMapper objectMapper;

    // ========================================================
    // Reviewing
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public List<ApplicantSummaryDto> listApplicants(String recruiterEmail, Long jobId) {

        User recruiter = user(recruiterEmail);

        // Confirms the job is this recruiter's before anything else, so
        // another recruiter's job id is "not found" rather than an
        // empty applicant list that implies the job exists.
        requireOwnJob(recruiter, jobId);

        List<JobApplication> applications =
                jobApplicationRepository.findForRecruiterJob(jobId, recruiter.getId());

        // One query for every attempt on the job rather than one per
        // applicant, so a job with eighty candidates does not fire
        // eighty selects to find their scores.
        Map<Long, InterviewSession> attempts = attemptsByApplication(jobId, recruiter.getId());

        return applications.stream()
                .map(application -> toSummary(application, attempts.get(application.getId())))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ApplicantDetailDto getApplicant(String recruiterEmail, Long applicationId) {

        User recruiter = user(recruiterEmail);

        JobApplication application = requireOwnApplication(recruiter, applicationId);

        JobPosting job = application.getJobPosting();

        CvSnapshotDto snapshot = CvEvidenceSnapshots.fromJson(
                application.getAnalysisSnapshot(),
                objectMapper
        );

        InterviewSession attempt = interviewSessionRepository
                .findByJobApplicationId(application.getId())
                .orElse(null);

        return ApplicantDetailDto.builder()
                .summary(toSummary(application, attempt))
                .jobId(job.getId())
                .jobTitle(job.getTitle())
                .requiredSkills(List.copyOf(job.getRequiredSkills()))
                .cvSnapshot(snapshot)
                .decisionOpen(!application.getStatus().isDecided())
                .consentVersion(application.getConsentVersion())
                .build();
    }

    // ========================================================
    // Deciding
    // ========================================================

    @Override
    @Transactional
    public ApplicantSummaryDto decide(
            String recruiterEmail,
            Long applicationId,
            ApplicationDecisionRequestDto request
    ) {

        User recruiter = user(recruiterEmail);

        ApplicationStatus decision = request.getDecision();

        // INTERVIEWED is the system's to set, and nothing may put an
        // application back to APPLIED. Checked against the set rather
        // than trusting that deserialising the enum narrowed it.
        if (!ApplicationStatus.RECRUITER_DECISIONS.contains(decision)) {
            throw new BadRequestException(
                    "A recruiter may only shortlist or reject an applicant."
            );
        }

        JobApplication application = requireOwnApplication(recruiter, applicationId);

        ApplicationStatus current = application.getStatus();

        // A double-clicked button, or two reviewers pressing the same
        // thing: the decision already stands, so this is a no-op rather
        // than a failure.
        if (current == decision) {
            return toSummary(application, attemptOf(application));
        }

        if (!current.canTransitionTo(decision)) {
            throw new ConflictException(conflictMessage(current));
        }

        application.setStatus(decision);
        application.setDecidedAt(LocalDateTime.now());
        application.setDecidedBy(recruiter);

        jobApplicationRepository.save(application);

        log.info(
                "Recruiter {} set application {} to {}",
                recruiter.getId(),
                applicationId,
                decision
        );

        return toSummary(application, attemptOf(application));
    }

    // ========================================================
    // Comparing
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public JobComparisonDto compare(String recruiterEmail, Long jobId) {

        User recruiter = user(recruiterEmail);

        JobPosting job = requireOwnJob(recruiter, jobId);

        List<JobComparisonDto.QuestionHeaderDto> questions = job.isQuestionsApproved()
                ? questionHeaders(job)
                : List.of();

        List<InterviewSession> completed = interviewSessionRepository
                .findCompletedForRecruiterJob(jobId, recruiter.getId());

        // Decisions for the whole column set in one query, keyed by
        // application, rather than one lookup per candidate.
        Map<Long, HiringDecision> decisions = hiringDecisionRepository
                .findByApplicationIds(
                        completed.stream()
                                .map(s -> s.getJobApplication().getId())
                                .toList()
                )
                .stream()
                .collect(Collectors.toMap(
                        d -> d.getJobApplication().getId(),
                        d -> d
                ));

        List<ComparisonCandidateDto> candidates = completed.stream()
                .map(session -> toComparisonCandidate(
                        session,
                        decisions.get(session.getJobApplication().getId())
                ))
                .toList();

        return JobComparisonDto.builder()
                .jobId(job.getId())
                .jobTitle(job.getTitle())
                .company(job.getCompany())
                .questions(questions)
                .candidates(candidates)
                .build();
    }

    /**
     * The approved questions as column headers, without their key
     * points.
     *
     * <p>Read through Person 1's service so there is one definition of
     * what "the approved set" means, and so an unapproved job is
     * refused there rather than half-compared here.
     */
    private List<JobComparisonDto.QuestionHeaderDto> questionHeaders(JobPosting job) {

        List<JobQuestion> approved = jobQuestionService.getApprovedQuestions(job);

        List<JobComparisonDto.QuestionHeaderDto> headers = new ArrayList<>(approved.size());

        for (JobQuestion question : approved) {
            headers.add(JobComparisonDto.QuestionHeaderDto.builder()
                    .id(question.getId())
                    .position(question.getPosition())
                    .question(question.getQuestionText())
                    .difficulty(question.getDifficulty())
                    .topic(question.getTopic())
                    .build());
        }

        return headers;
    }

    /**
     * @param decision the recruiter's own decision, draft or published,
     *                 or null when they have not started one. This is a
     *                 recruiter-facing view, so a draft is shown here -
     *                 it is the candidate's view that never sees one.
     */
    private ComparisonCandidateDto toComparisonCandidate(
            InterviewSession session,
            HiringDecision decision
    ) {

        JobApplication application = session.getJobApplication();
        User candidate = application.getCandidate();

        HiringDecisionValue value = decision == null
                ? HiringDecisionValue.PENDING
                : decision.getDecision();

        PublicationStatus publication = decision == null
                ? PublicationStatus.DRAFT
                : decision.getPublicationStatus();

        return ComparisonCandidateDto.builder()
                .hiringDecision(value.name())
                .hiringDecisionLabel(value.getLabel())
                .publicationStatus(publication.name())
                .decisionPublished(publication.isPublished())
                .applicationId(application.getId())
                .candidateId(candidate.getId())
                .candidateName(candidate.getName())
                .candidateEmail(candidate.getEmail())
                .status(application.getStatus().name())
                .statusLabel(application.getStatus().getLabel())
                .matchPercentage(application.getMatchPercentage())
                .interviewScore(session.getScore())
                .feedbackSummary(session.getFeedbackSummary())
                .completedAt(session.getCompletedAt())
                .answers(answersOf(session))
                .build();
    }

    /**
     * The per-question grading out of the stored scorecard.
     *
     * <p>Read from the {@code per_question} entries the interview
     * service wrote, including the approved question id it recorded
     * against each one - that id is what aligns one candidate's answer
     * with another's. An unreadable or absent scorecard gives an empty
     * list, so the candidate still appears with their overall score
     * rather than breaking the whole comparison.
     */
    private List<ComparisonAnswerDto> answersOf(InterviewSession session) {

        String json = session.getFeedbackJson();

        if (json == null || json.isBlank()) {
            return List.of();
        }

        JsonNode perQuestion;

        try {
            perQuestion = objectMapper.readTree(json).get("per_question");
        } catch (Exception e) {
            log.warn(
                    "Could not read the scorecard for session {}: {}",
                    session.getSessionId(),
                    e.getMessage()
            );
            return List.of();
        }

        if (perQuestion == null || !perQuestion.isArray()) {
            return List.of();
        }

        List<ComparisonAnswerDto> answers = new ArrayList<>(perQuestion.size());

        for (JsonNode entry : perQuestion) {
            answers.add(ComparisonAnswerDto.builder()
                    .questionId(longOrNull(entry, "question_id"))
                    .questionNumber(intOrNull(entry, "question_number"))
                    .score(intOrNull(entry, "score"))
                    .verdict(text(entry, "verdict"))
                    .answer(text(entry, "answer"))
                    .whatWasGood(text(entry, "what_was_good"))
                    .whatWasMissing(text(entry, "what_was_missing"))
                    .build());
        }

        return answers;
    }

    // ========================================================
    // Internals
    // ========================================================

    private ApplicantSummaryDto toSummary(JobApplication application, InterviewSession attempt) {

        CvSnapshotDto snapshot = CvEvidenceSnapshots.fromJson(
                application.getAnalysisSnapshot(),
                objectMapper
        );

        User candidate = application.getCandidate();
        User decidedBy = application.getDecidedBy();

        boolean completed = attempt != null && attempt.isCompleted();

        return ApplicantSummaryDto.builder()
                .applicationId(application.getId())
                .candidateId(candidate.getId())
                .candidateName(candidate.getName())
                .candidateEmail(candidate.getEmail())
                .appliedAt(application.getAppliedAt())
                .submittedResumeId(application.getSubmittedResume().getId())
                .submittedCvFileName(application.getSubmittedResume().getOriginalFileName())
                .match(SkillMatchDto.from(application))
                .experienceSummary(CvEvidenceSnapshots.experienceSummary(snapshot))
                .educationSummary(CvEvidenceSnapshots.educationSummary(snapshot))
                .status(application.getStatus().name())
                .statusLabel(application.getStatus().getLabel())
                .decidedAt(application.getDecidedAt())
                .decidedByName(decidedBy == null ? null : decidedBy.getName())
                .interviewCompleted(completed)
                .interviewScore(completed ? attempt.getScore() : null)
                .build();
    }

    /**
     * The attempts on one job, keyed by application id.
     */
    private Map<Long, InterviewSession> attemptsByApplication(Long jobId, Long recruiterId) {

        Map<Long, InterviewSession> byApplication = new HashMap<>();

        for (InterviewSession session
                : interviewSessionRepository.findCompletedForRecruiterJob(jobId, recruiterId)) {

            JobApplication application = session.getJobApplication();

            if (application != null) {
                byApplication.put(application.getId(), session);
            }
        }

        return byApplication;
    }

    private InterviewSession attemptOf(JobApplication application) {
        return interviewSessionRepository
                .findByJobApplicationId(application.getId())
                .orElse(null);
    }

    /**
     * One of the recruiter's own jobs.
     *
     * <p>Looked up together with the owner, so another recruiter's job
     * id is "not found" rather than something whose applicants can be
     * listed.
     */
    private JobPosting requireOwnJob(User recruiter, Long jobId) {
        return jobPostingRepository.findByIdAndRecruiterId(jobId, recruiter.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No job with id " + jobId));
    }

    /**
     * One application on one of the recruiter's own jobs. The ownership
     * test is inside the query.
     */
    private JobApplication requireOwnApplication(User recruiter, Long applicationId) {
        return jobApplicationRepository
                .findByIdForRecruiter(applicationId, recruiter.getId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No application with id " + applicationId
                ));
    }

    private static String conflictMessage(ApplicationStatus current) {

        return switch (current) {
            case SHORTLISTED -> "This applicant is already shortlisted.";
            case REJECTED -> "This applicant has already been rejected.";
            case INTERVIEWED -> "This applicant has already completed the interview.";
            case APPLIED -> "That decision cannot be applied to this applicant.";
        };
    }

    private static String text(JsonNode node, String field) {

        JsonNode value = node == null ? null : node.get(field);

        return value == null || value.isNull() ? null : value.asText();
    }

    private static Integer intOrNull(JsonNode node, String field) {

        JsonNode value = node == null ? null : node.get(field);

        return value == null || !value.isNumber() ? null : value.asInt();
    }

    private static Long longOrNull(JsonNode node, String field) {

        JsonNode value = node == null ? null : node.get(field);

        return value == null || !value.isNumber() ? null : value.asLong();
    }

    private User user(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }
}
