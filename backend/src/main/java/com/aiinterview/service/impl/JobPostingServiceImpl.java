package com.aiinterview.service.impl;

import com.aiinterview.dto.JobInviteDto;
import com.aiinterview.dto.JobPostingDto;
import com.aiinterview.dto.JobPostingRequestDto;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.JobPostingService;
import com.aiinterview.service.JobQuestionService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class JobPostingServiceImpl implements JobPostingService {

    private static final Logger log = LoggerFactory.getLogger(JobPostingServiceImpl.class);

    /**
     * Letters and digits a person can read back over the phone: no 0/O,
     * 1/I/L. 31 symbols over 8 places is about 850 billion codes, so
     * guessing one that belongs to somebody's job is not practical.
     */
    private static final String CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

    private static final int CODE_LENGTH = 8;

    private static final int MAX_CODE_ATTEMPTS = 10;

    /**
     * Shown for a code that does not exist and for a closed job alike,
     * so the answer does not tell anyone which codes are real.
     */
    private static final String INVALID_CODE =
            "This invite code is not valid, or the job is no longer taking candidates.";

    private static final String NO_ANSWERS_DURING_EXAM =
            "Expected answers are not available while a job interview is in progress.";

    /**
     * How long an unfinished job interview keeps expected answers
     * blocked after its last activity. Matches the AI service's idle
     * session TTL (SESSION_IDLE_TTL_SECONDS, 6 hours): after that the
     * interview cannot be continued anyway, and an abandoned one must
     * not block practice for good.
     */
    private static final Duration JOB_INTERVIEW_IDLE_LIMIT = Duration.ofHours(6);

    /** The AI service's start field for a job's approved questions. */
    private static final String FIXED_QUESTIONS = "fixed_questions";

    /** CV-derived start fields a job interview must not carry. */
    private static final List<String> SKILL_GAP_FIELDS = List.of(
            "matched_skills", "related_skills", "missing_skills", "additional_skills"
    );

    private final SecureRandom random = new SecureRandom();

    private final JobPostingRepository jobPostingRepository;
    private final InterviewSessionRepository interviewSessionRepository;
    private final UserRepository userRepository;
    private final JobQuestionService jobQuestionService;

    // ========================================================
    // Recruiter
    // ========================================================

    @Override
    @Transactional
    public JobPostingDto create(String recruiterEmail, JobPostingRequestDto request) {

        User recruiter = user(recruiterEmail);

        String jobField = request.getJobField() == null ? "" : request.getJobField().trim();

        if (!JobPosting.JOB_FIELDS.contains(jobField)) {
            throw new BadRequestException("Choose one of the listed job fields.");
        }

        String company = request.getCompany() == null ? "" : request.getCompany().trim();

        List<String> skills = JobAssessmentRules.normalizeSkills(request.getRequiredSkills());

        if (skills.isEmpty()) {
            throw new BadRequestException("List at least one required skill.");
        }

        if (!JobAssessmentRules.isValidQuestionCount(request.getQuestionCount())) {
            throw new BadRequestException("Choose between 5 and 10 questions.");
        }

        JobPosting job = JobPosting.builder()
                .recruiter(recruiter)
                .title(request.getTitle().trim())
                .company(company.isEmpty() ? null : company)
                .jobField(jobField)
                .jobDescription(request.getJobDescription().trim())
                .inviteCode(newInviteCode())
                .open(true)
                .requiredSkills(new ArrayList<>(skills))
                .questionCount(request.getQuestionCount())
                .build();

        JobPosting saved = jobPostingRepository.save(job);

        log.info("Recruiter {} created job {} ({})", recruiter.getId(), saved.getId(), saved.getInviteCode());

        return JobPostingDto.from(saved, 0, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public List<JobPostingDto> listMine(String recruiterEmail) {

        User recruiter = user(recruiterEmail);

        Map<Long, long[]> counts = new HashMap<>();

        for (Object[] row : interviewSessionRepository.countByJobForRecruiter(recruiter.getId())) {
            counts.put(
                    (Long) row[0],
                    new long[]{toLong(row[1]), toLong(row[2])}
            );
        }

        return jobPostingRepository.findByRecruiterIdOrderByCreatedAtDesc(recruiter.getId())
                .stream()
                .map(job -> {
                    long[] c = counts.getOrDefault(job.getId(), new long[]{0, 0});
                    return JobPostingDto.from(job, c[0], c[1]);
                })
                .toList();
    }

    @Override
    @Transactional
    public JobPostingDto setOpen(String recruiterEmail, Long jobId, boolean open) {

        User recruiter = user(recruiterEmail);

        // Looked up together with the owner, so another recruiter's job
        // id is "not found" rather than something that can be closed.
        JobPosting job = jobPostingRepository.findByIdAndRecruiterId(jobId, recruiter.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No job with id " + jobId));

        job.setOpen(open);

        return JobPostingDto.from(jobPostingRepository.save(job), 0, 0);
    }

    // ========================================================
    // Candidate
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public JobInviteDto previewInvite(String candidateEmail, String inviteCode) {

        User candidate = user(candidateEmail);
        JobPosting job = openJob(inviteCode);

        return JobInviteDto.builder()
                .inviteCode(job.getInviteCode())
                .title(job.getTitle())
                .company(job.getCompany())
                .jobField(job.getJobField())
                .jobDescription(job.getJobDescription())
                .recruiterName(job.getRecruiter().getName())
                .alreadyCompleted(alreadyCompleted(candidate, job))
                .interviewReady(job.isQuestionsApproved())
                .questionCount(job.getQuestionCount())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public JsonNode applyInvite(String candidateEmail, JsonNode startRequest) {

        if (startRequest == null || !startRequest.isObject()) {
            return startRequest;
        }

        JsonNode rawCode = startRequest.get("invite_code");

        if (rawCode == null || rawCode.isNull() || rawCode.asText().isBlank()) {
            // A fixed question set only ever comes from a job's approved
            // questions, added below. One sent by the browser is dropped.
            if (startRequest.has(FIXED_QUESTIONS)) {
                ObjectNode practice = ((ObjectNode) startRequest).deepCopy();
                practice.remove(FIXED_QUESTIONS);
                return practice;
            }
            return startRequest;
        }

        User candidate = user(candidateEmail);

        // Recruiters and administrators do not sit interviews; letting
        // them would put their own rows into a recruiter's results.
        if (candidate.getRole() != Role.CANDIDATE) {
            throw new BadRequestException("Only candidate accounts can take a job interview.");
        }

        JobPosting job = openJob(rawCode.asText());

        if (alreadyCompleted(candidate, job)) {
            throw new ConflictException(
                    "You have already completed the interview for this job."
            );
        }

        // The approved questions, in order. Refused (409) while the job
        // has none approved, so its interview shows as not ready.
        ArrayNode fixedQuestions = jobQuestionService.fixedQuestionsPayload(job);

        ObjectNode forwarded = ((ObjectNode) startRequest).deepCopy();

        // The job's own text, not whatever the browser sent. This is what
        // makes every candidate's result for the job comparable.
        forwarded.put("job_description", job.getJobDescription());
        forwarded.put("job_field", job.getJobField());
        forwarded.put("invite_code", job.getInviteCode());

        // A job interview is always an exam: a practice answer can be
        // rewritten after reading the model answer.
        forwarded.put("mode", InterviewSession.MODE_EXAM);

        // Every candidate gets the same questions, so nothing from this
        // candidate's CV goes to the AI service with them.
        forwarded.set(FIXED_QUESTIONS, fixedQuestions);
        forwarded.put("candidate_resume", "");

        for (String field : SKILL_GAP_FIELDS) {
            forwarded.putArray(field);
        }

        return forwarded;
    }

    @Override
    @Transactional(readOnly = true)
    public void requireNoJobInterviewInProgress(String userEmail, JsonNode modelAnswerRequest) {

        JsonNode rawSession = modelAnswerRequest == null ? null : modelAnswerRequest.get("session_id");
        String sessionId = rawSession == null || rawSession.isNull() ? "" : rawSession.asText().trim();

        if (!sessionId.isEmpty()) {
            boolean jobInterviewRunning = interviewSessionRepository.findBySessionId(sessionId)
                    .filter(s -> s.getJobPosting() != null && !s.isCompleted())
                    .isPresent();

            if (jobInterviewRunning) {
                throw new UnauthorizedAccessException(NO_ANSWERS_DURING_EXAM);
            }
        }

        // Without a session id the request could still be for a question
        // on screen in a job interview, so any running one blocks it.
        User user = user(userEmail);

        if (interviewSessionRepository.existsByUserIdAndJobPostingIsNotNullAndStatusAndUpdatedAtAfter(
                user.getId(),
                InterviewSession.STATUS_ACTIVE,
                LocalDateTime.now().minus(JOB_INTERVIEW_IDLE_LIMIT))) {
            throw new UnauthorizedAccessException(NO_ANSWERS_DURING_EXAM);
        }
    }

    @Override
    public Optional<String> normalizeCode(String raw) {

        if (raw == null) {
            return Optional.empty();
        }

        // People type codes in lower case, with spaces, or without the
        // dash; all of those should still find the job.
        String compact = raw.toUpperCase().replaceAll("[^A-Z0-9]", "");

        if (compact.length() != CODE_LENGTH) {
            return Optional.empty();
        }

        return Optional.of(compact.substring(0, 4) + "-" + compact.substring(4));
    }

    // ========================================================
    // Internals
    // ========================================================

    private JobPosting openJob(String rawCode) {

        return normalizeCode(rawCode)
                .flatMap(jobPostingRepository::findByInviteCode)
                .filter(JobPosting::isOpen)
                .orElseThrow(() -> new ResourceNotFoundException(INVALID_CODE));
    }

    private boolean alreadyCompleted(User candidate, JobPosting job) {
        return interviewSessionRepository.existsByUserIdAndJobPostingIdAndStatus(
                candidate.getId(),
                job.getId(),
                InterviewSession.STATUS_COMPLETED
        );
    }

    /**
     * A fresh code in the form ABCD-EF23. Checked against existing ones
     * because a collision, however unlikely, would send one job's
     * candidates to another.
     */
    private String newInviteCode() {

        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {

            StringBuilder code = new StringBuilder(CODE_LENGTH + 1);

            for (int i = 0; i < CODE_LENGTH; i++) {
                if (i == 4) {
                    code.append('-');
                }
                code.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
            }

            String candidate = code.toString();

            if (!jobPostingRepository.existsByInviteCode(candidate)) {
                return candidate;
            }
        }

        throw new IllegalStateException("Could not generate a unique invite code");
    }

    private User user(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    private static long toLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0L;
    }
}
