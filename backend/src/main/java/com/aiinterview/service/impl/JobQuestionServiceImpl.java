package com.aiinterview.service.impl;

import com.aiinterview.dto.JobAssessmentDto;
import com.aiinterview.dto.JobQuestionDto;
import com.aiinterview.dto.JobQuestionRequestDto;
import com.aiinterview.dto.JobQuestionSettingsDto;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobQuestion;
import com.aiinterview.entity.User;
import com.aiinterview.exception.AiServiceException;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.JobQuestionRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.AiServiceClient;
import com.aiinterview.service.JobQuestionService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class JobQuestionServiceImpl implements JobQuestionService {

    private static final Logger log = LoggerFactory.getLogger(JobQuestionServiceImpl.class);

    static final String GENERATE_PATH = "/api/v1/assessment/questions/generate";

    private static final String NOT_READY =
            "This job's interview is not ready yet. The recruiter has not approved its questions.";

    private static final String LOCKED =
            "These questions are approved and can no longer change. Create a new job for a different assessment.";

    private final JobPostingRepository jobPostingRepository;
    private final JobQuestionRepository jobQuestionRepository;
    private final UserRepository userRepository;
    private final AiServiceClient aiServiceClient;
    private final ObjectMapper objectMapper;

    /**
     * Generation waits on the AI service for up to a few minutes. That
     * wait happens between two short transactions instead of inside one,
     * so a slow model does not hold a database connection the whole time.
     */
    private final TransactionTemplate transactions;

    public JobQuestionServiceImpl(
            JobPostingRepository jobPostingRepository,
            JobQuestionRepository jobQuestionRepository,
            UserRepository userRepository,
            AiServiceClient aiServiceClient,
            ObjectMapper objectMapper,
            PlatformTransactionManager transactionManager
    ) {
        this.jobPostingRepository = jobPostingRepository;
        this.jobQuestionRepository = jobQuestionRepository;
        this.userRepository = userRepository;
        this.aiServiceClient = aiServiceClient;
        this.objectMapper = objectMapper;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    // ========================================================
    // Recruiter
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public JobAssessmentDto getAssessment(String recruiterEmail, Long jobId) {
        return assessment(ownedJob(recruiterEmail, jobId));
    }

    @Override
    @Transactional
    public JobAssessmentDto updateSettings(String recruiterEmail, Long jobId, JobQuestionSettingsDto settings) {

        JobPosting job = ownedJob(recruiterEmail, jobId);
        requireDraft(job);

        List<String> skills = JobAssessmentRules.normalizeSkills(settings.getRequiredSkills());

        if (skills.isEmpty()) {
            throw new BadRequestException("List at least one required skill.");
        }

        if (!JobAssessmentRules.isValidQuestionCount(settings.getQuestionCount())) {
            throw new BadRequestException("Choose between 5 and 10 questions.");
        }

        job.getRequiredSkills().clear();
        job.getRequiredSkills().addAll(skills);
        job.setQuestionCount(settings.getQuestionCount());

        return assessment(jobPostingRepository.save(job));
    }

    @Override
    public JobAssessmentDto generate(String recruiterEmail, Long jobId) {

        ObjectNode request = transactions.execute(status -> {
            JobPosting job = ownedJob(recruiterEmail, jobId);
            requireDraft(job);
            requireSkills(job);
            return generationRequest(job, job.getQuestionCount(), List.of());
        });

        List<JobQuestion> drafted = draftedQuestions(aiServiceClient.post(GENERATE_PATH, request));

        if (drafted.isEmpty()) {
            throw noQuestions();
        }

        return transactions.execute(status -> {
            // Looked up again: the job may have been approved or edited
            // while the model was writing.
            JobPosting job = ownedJob(recruiterEmail, jobId);
            requireDraft(job);

            jobQuestionRepository.deleteAll(jobQuestionRepository.findByJobPostingIdOrderByPositionAsc(job.getId()));

            for (int i = 0; i < drafted.size(); i++) {
                JobQuestion q = drafted.get(i);
                q.setJobPosting(job);
                q.setPosition(i + 1);
            }

            jobQuestionRepository.saveAll(drafted);

            log.info("Drafted {} question(s) for job {}", drafted.size(), job.getId());

            return assessment(job);
        });
    }

    @Override
    public JobAssessmentDto regenerate(String recruiterEmail, Long jobId, Long questionId) {

        ObjectNode request = transactions.execute(status -> {
            JobPosting job = ownedJob(recruiterEmail, jobId);
            requireDraft(job);
            requireSkills(job);
            questionOf(job, questionId);

            // Every question in the set, the one being replaced included,
            // so the replacement repeats none of them.
            List<String> avoid = new ArrayList<>();

            for (JobQuestion q : jobQuestionRepository.findByJobPostingIdOrderByPositionAsc(job.getId())) {
                avoid.add(q.getQuestionText());
            }

            return generationRequest(job, 1, avoid);
        });

        List<JobQuestion> drafted = draftedQuestions(aiServiceClient.post(GENERATE_PATH, request));

        if (drafted.isEmpty()) {
            throw noQuestions();
        }

        JobQuestion replacement = drafted.get(0);

        return transactions.execute(status -> {
            JobPosting job = ownedJob(recruiterEmail, jobId);
            requireDraft(job);

            JobQuestion question = questionOf(job, questionId);
            question.setQuestionText(replacement.getQuestionText());
            question.setDifficulty(replacement.getDifficulty());
            question.setTopic(replacement.getTopic());
            question.getKeyPoints().clear();
            question.getKeyPoints().addAll(replacement.getKeyPoints());
            question.setSource(JobQuestion.SOURCE_AI);

            jobQuestionRepository.save(question);

            return assessment(job);
        });
    }

    @Override
    @Transactional
    public JobAssessmentDto saveDraft(String recruiterEmail, Long jobId, List<JobQuestionRequestDto> questions) {

        JobPosting job = ownedJob(recruiterEmail, jobId);
        requireDraft(job);

        if (questions.size() > JobPosting.MAX_QUESTION_COUNT) {
            throw new BadRequestException("A job can have at most 10 questions.");
        }

        Map<Long, JobQuestion> existing = new LinkedHashMap<>();

        for (JobQuestion q : jobQuestionRepository.findByJobPostingIdOrderByPositionAsc(job.getId())) {
            existing.put(q.getId(), q);
        }

        List<JobQuestion> kept = new ArrayList<>();

        for (int i = 0; i < questions.size(); i++) {

            JobQuestionRequestDto in = questions.get(i);

            String text = clean(in.getQuestion());
            String difficulty = in.getDifficulty() == null ? "" : in.getDifficulty().trim().toLowerCase(Locale.ROOT);
            String topic = clean(in.getTopic());
            List<String> points = cleanPoints(in.getKeyPoints());

            if (!JobQuestion.DIFFICULTIES.contains(difficulty)) {
                throw new BadRequestException("Question " + (i + 1) + " needs a difficulty of easy, medium or hard.");
            }

            JobQuestion question;

            if (in.getId() == null) {
                question = JobQuestion.builder()
                        .jobPosting(job)
                        .source(JobQuestion.SOURCE_RECRUITER)
                        .build();
            } else {
                // Only this job's own questions; an id from another job
                // is refused rather than moved here.
                question = existing.remove(in.getId());

                if (question == null) {
                    throw new BadRequestException("Question " + (i + 1) + " is not part of this job.");
                }

                boolean changed = !Objects.equals(question.getQuestionText(), text)
                        || !Objects.equals(question.getDifficulty(), difficulty)
                        || !Objects.equals(question.getTopic(), topic)
                        || !Objects.equals(question.getKeyPoints(), points);

                if (changed) {
                    question.setSource(JobQuestion.SOURCE_RECRUITER);
                }
            }

            question.setPosition(i + 1);
            question.setQuestionText(text);
            question.setDifficulty(difficulty);
            question.setTopic(topic);
            question.getKeyPoints().clear();
            question.getKeyPoints().addAll(points);

            kept.add(question);
        }

        // Whatever the editor no longer sent was removed by the recruiter.
        jobQuestionRepository.deleteAll(existing.values());
        jobQuestionRepository.saveAll(kept);

        return assessment(job);
    }

    @Override
    @Transactional
    public JobAssessmentDto approve(String recruiterEmail, Long jobId) {

        User recruiter = user(recruiterEmail);
        JobPosting job = ownedJob(recruiter, jobId);
        requireDraft(job);
        requireSkills(job);

        List<JobQuestion> questions = jobQuestionRepository.findByJobPostingIdOrderByPositionAsc(job.getId());
        List<String> issues = JobAssessmentRules.setIssues(questions, job.getQuestionCount());

        if (!issues.isEmpty()) {
            throw new BadRequestException("These questions cannot be approved yet: " + String.join(" ", issues));
        }

        job.setQuestionsApprovedAt(LocalDateTime.now());
        job.setQuestionsApprovedBy(recruiter);

        JobPosting saved = jobPostingRepository.save(job);

        log.info("Recruiter {} approved {} question(s) for job {}", recruiter.getId(), questions.size(), job.getId());

        return assessment(saved);
    }

    // ========================================================
    // Interview start
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public List<JobQuestion> getApprovedQuestions(JobPosting job) {

        if (!job.isQuestionsApproved()) {
            throw new ConflictException(NOT_READY);
        }

        List<JobQuestion> questions = jobQuestionRepository.findByJobPostingIdOrderByPositionAsc(job.getId());

        // Approval already checked the count; this guards against rows
        // changed behind the service's back.
        if (questions.size() != job.getQuestionCount()) {
            log.error("Job {} is approved with {} question(s) but expects {}",
                    job.getId(), questions.size(), job.getQuestionCount());
            throw new ConflictException(NOT_READY);
        }

        return questions;
    }

    @Override
    @Transactional(readOnly = true)
    public ArrayNode fixedQuestionsPayload(JobPosting job) {

        ArrayNode payload = objectMapper.createArrayNode();

        for (JobQuestion q : getApprovedQuestions(job)) {

            ObjectNode node = payload.addObject();
            node.put("question_id", q.getId());
            node.put("position", q.getPosition());
            node.put("question", q.getQuestionText());
            node.put("difficulty", q.getDifficulty());
            node.put("topic", q.getTopic() == null ? "" : q.getTopic());

            ArrayNode points = node.putArray("key_points");
            q.getKeyPoints().forEach(points::add);
        }

        return payload;
    }

    // ========================================================
    // Internals
    // ========================================================

    private JobAssessmentDto assessment(JobPosting job) {

        List<JobQuestion> questions = jobQuestionRepository.findByJobPostingIdOrderByPositionAsc(job.getId());

        List<String> issues = new ArrayList<>();

        if (!job.isQuestionsApproved()) {
            if (job.getRequiredSkills().isEmpty()) {
                issues.add("Add at least one required skill.");
            }
            issues.addAll(JobAssessmentRules.setIssues(questions, job.getQuestionCount()));
        }

        return JobAssessmentDto.builder()
                .jobId(job.getId())
                .title(job.getTitle())
                .requiredSkills(List.copyOf(job.getRequiredSkills()))
                .questionCount(job.getQuestionCount())
                .approved(job.isQuestionsApproved())
                .approvedAt(job.getQuestionsApprovedAt())
                .approvedBy(job.getQuestionsApprovedBy() == null ? null : job.getQuestionsApprovedBy().getName())
                .questions(questions.stream().map(JobQuestionDto::from).toList())
                .issues(issues)
                .build();
    }

    /**
     * The AI request. Job fields only: there is no CV in it, because
     * every candidate for the job is asked the same questions.
     */
    private ObjectNode generationRequest(JobPosting job, int count, List<String> existing) {

        ObjectNode request = objectMapper.createObjectNode();
        request.put("job_title", job.getTitle());
        request.put("job_field", job.getJobField());
        request.put("job_description", job.getJobDescription());
        request.put("question_count", count);

        ArrayNode skills = request.putArray("required_skills");
        job.getRequiredSkills().forEach(skills::add);

        ArrayNode avoid = request.putArray("existing_questions");
        existing.forEach(avoid::add);

        return request;
    }

    /** The AI service's draft as unsaved entities, source AI. */
    private List<JobQuestion> draftedQuestions(JsonNode response) {

        List<JobQuestion> drafted = new ArrayList<>();
        JsonNode list = response == null ? null : response.get("questions");

        if (list == null || !list.isArray()) {
            return drafted;
        }

        for (JsonNode node : list) {

            String text = clean(node.path("question").asText(""));
            String difficulty = node.path("difficulty").asText("").trim().toLowerCase(Locale.ROOT);

            // The AI service already validated these; a question that
            // would break a column limit is still not stored.
            if (text == null || text.length() > JobAssessmentRules.MAX_QUESTION_LENGTH
                    || !JobQuestion.DIFFICULTIES.contains(difficulty)) {
                continue;
            }

            List<String> points = new ArrayList<>();

            for (JsonNode p : node.path("key_points")) {
                String point = clean(p.asText(""));
                if (point != null && point.length() <= JobAssessmentRules.MAX_KEY_POINT_LENGTH
                        && points.size() < JobAssessmentRules.MAX_KEY_POINTS) {
                    points.add(point);
                }
            }

            String topic = clean(node.path("topic").asText(""));

            drafted.add(JobQuestion.builder()
                    .questionText(text)
                    .difficulty(difficulty)
                    .topic(topic == null ? null : truncate(topic, JobAssessmentRules.MAX_TOPIC_LENGTH))
                    .keyPoints(points)
                    .source(JobQuestion.SOURCE_AI)
                    .build());

            if (drafted.size() == JobPosting.MAX_QUESTION_COUNT) {
                break;
            }
        }

        return drafted;
    }

    private static AiServiceException noQuestions() {
        return new AiServiceException(
                "The AI service did not return any usable questions. Please try again.", 502, null);
    }

    private JobQuestion questionOf(JobPosting job, Long questionId) {
        return jobQuestionRepository.findById(questionId)
                .filter(q -> q.getJobPosting().getId().equals(job.getId()))
                .orElseThrow(() -> new ResourceNotFoundException("No question with id " + questionId));
    }

    private static void requireDraft(JobPosting job) {
        if (job.isQuestionsApproved()) {
            throw new ConflictException(LOCKED);
        }
    }

    private static void requireSkills(JobPosting job) {
        if (job.getRequiredSkills().isEmpty()) {
            throw new BadRequestException("Add at least one required skill to this job first.");
        }
    }

    private JobPosting ownedJob(String recruiterEmail, Long jobId) {
        return ownedJob(user(recruiterEmail), jobId);
    }

    /**
     * Looked up together with the owner, so another recruiter's job id
     * is "not found" rather than something that can be read or changed.
     */
    private JobPosting ownedJob(User recruiter, Long jobId) {
        return jobPostingRepository.findByIdAndRecruiterId(jobId, recruiter.getId())
                .orElseThrow(() -> new ResourceNotFoundException("No job with id " + jobId));
    }

    private User user(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + email));
    }

    /** Trimmed with inner whitespace collapsed; null when empty. */
    private static String clean(String value) {

        if (value == null) {
            return null;
        }

        String cleaned = value.trim().replaceAll("\\s+", " ");

        return cleaned.isEmpty() ? null : cleaned;
    }

    private static List<String> cleanPoints(List<String> raw) {

        List<String> points = new ArrayList<>();

        for (String p : raw == null ? List.<String>of() : raw) {
            String point = clean(p);
            if (point != null) {
                points.add(point);
            }
        }

        return points;
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
