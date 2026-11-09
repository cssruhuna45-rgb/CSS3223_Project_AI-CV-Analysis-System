package com.aiinterview.service;

import com.aiinterview.dto.JobAssessmentDto;
import com.aiinterview.dto.JobQuestionAddRequestDto;
import com.aiinterview.dto.JobQuestionRegenerateRequestDto;
import com.aiinterview.dto.JobQuestionRequestDto;
import com.aiinterview.dto.JobQuestionSettingsDto;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobQuestion;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.JobPostingRepository;
import com.aiinterview.repository.JobQuestionRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.JobQuestionServiceImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class JobQuestionServiceTest {

    private static final String RITA = "rita@example.com";
    private static final String OSCAR = "oscar@example.com";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private JobPostingRepository jobPostingRepository;

    @Mock
    private JobQuestionRepository jobQuestionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private PlatformTransactionManager transactionManager;

    private JobQuestionServiceImpl service;

    private User rita;
    private JobPosting job;

    /** Stands in for the job_questions table. */
    private final List<JobQuestion> stored = new ArrayList<>();
    private final AtomicLong ids = new AtomicLong(100);

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        service = new JobQuestionServiceImpl(
                jobPostingRepository, jobQuestionRepository, userRepository,
                aiServiceClient, objectMapper, transactionManager);

        rita = User.builder().id(10L).name("Rita").email(RITA).role(Role.RECRUITER).build();
        User oscar = User.builder().id(11L).name("Oscar").email(OSCAR).role(Role.RECRUITER).build();

        job = JobPosting.builder()
                .id(5L)
                .recruiter(rita)
                .title("Java Backend Intern")
                .jobField("backend_development")
                .jobDescription("Build REST APIs in Spring Boot with PostgreSQL.")
                .inviteCode("ABCD-EF23")
                .requiredSkills(new ArrayList<>(List.of("spring boot", "postgresql")))
                .questionCount(5)
                .build();

        when(userRepository.findByEmail(RITA)).thenReturn(Optional.of(rita));
        when(userRepository.findByEmail(OSCAR)).thenReturn(Optional.of(oscar));
        when(jobPostingRepository.findByIdAndRecruiterId(5L, 10L)).thenReturn(Optional.of(job));
        when(jobPostingRepository.findByIdAndRecruiterId(5L, 11L)).thenReturn(Optional.empty());
        when(jobPostingRepository.save(any(JobPosting.class))).thenAnswer(inv -> inv.getArgument(0));

        when(jobQuestionRepository.findByJobPostingIdOrderByPositionAsc(5L)).thenAnswer(inv ->
                stored.stream().sorted(Comparator.comparingInt(JobQuestion::getPosition)).toList());
        when(jobQuestionRepository.findById(anyLong())).thenAnswer(inv ->
                stored.stream().filter(q -> q.getId().equals(inv.getArgument(0))).findFirst());
        when(jobQuestionRepository.saveAll(any())).thenAnswer(inv -> {
            Iterable<JobQuestion> saved = inv.getArgument(0);
            saved.forEach(this::store);
            return saved;
        });
        when(jobQuestionRepository.save(any(JobQuestion.class))).thenAnswer(inv -> {
            store(inv.getArgument(0));
            return inv.getArgument(0);
        });
        doAnswer(inv -> {
            Collection<JobQuestion> gone = new ArrayList<>((Collection<JobQuestion>) inv.getArgument(0));
            stored.removeAll(gone);
            return null;
        }).when(jobQuestionRepository).deleteAll(any());
    }

    private void store(JobQuestion q) {
        if (q.getId() == null) {
            q.setId(ids.incrementAndGet());
        }
        if (!stored.contains(q)) {
            stored.add(q);
        }
    }

    // ---- fixtures ---------------------------------------------------

    private static final String[][] GOOD = {
            {"How does a database index speed up a SELECT query?", "easy"},
            {"Explain the difference between optimistic and pessimistic locking.", "easy"},
            {"When would you choose a message queue over a direct REST call?", "medium"},
            {"How do you make a REST endpoint idempotent under client retries?", "medium"},
            {"Describe how you would shard a PostgreSQL table that outgrew one node.", "hard"},
    };

    private JobQuestion question(int position, String text, String difficulty, String... points) {
        JobQuestion q = JobQuestion.builder()
                .jobPosting(job)
                .position(position)
                .questionText(text)
                .difficulty(difficulty)
                .topic("Topic " + position)
                .source(JobQuestion.SOURCE_AI)
                .keyPoints(new ArrayList<>(points.length == 0
                        ? List.of("First idea", "Second idea", "Third idea")
                        : List.of(points)))
                .build();
        store(q);
        return q;
    }

    private void storeGoodSet() {
        for (int i = 0; i < GOOD.length; i++) {
            question(i + 1, GOOD[i][0], GOOD[i][1]);
        }
    }

    private JsonNode aiDraft(String[][] rows) {
        ObjectNode response = objectMapper.createObjectNode();
        ArrayNode list = response.putArray("questions");
        for (String[] row : rows) {
            ObjectNode q = list.addObject();
            q.put("question", row[0]);
            q.put("difficulty", row[1]);
            q.put("topic", "Databases");
            q.putArray("key_points").add("First idea").add("Second idea").add("Third idea");
        }
        response.putArray("issues");
        return response;
    }

    private JobQuestionRequestDto edit(JobQuestion q) {
        return JobQuestionRequestDto.builder()
                .id(q.getId())
                .question(q.getQuestionText())
                .difficulty(q.getDifficulty())
                .topic(q.getTopic())
                .keyPoints(new ArrayList<>(q.getKeyPoints()))
                .build();
    }

    // ---- Generation ---------------------------------------------------

    @Test
    @DisplayName("generation sends the job's skills and count, and no CV")
    void generationRequestIsJobOnly() {
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(GOOD));

        service.generate(RITA, 5L);

        ArgumentCaptor<JsonNode> sent = ArgumentCaptor.forClass(JsonNode.class);
        verify(aiServiceClient).post(eq("/api/v1/assessment/questions/generate"), sent.capture());

        JsonNode body = sent.getValue();
        assertEquals(5, body.get("question_count").asInt());
        assertEquals("spring boot", body.get("required_skills").get(0).asText());
        assertEquals(job.getJobDescription(), body.get("job_description").asText());
        assertFalse(body.has("candidate_resume"));
        assertFalse(body.has("resume_id"));
    }

    @Test
    @DisplayName("a generated draft is stored in order, marked AI, and replaces the old draft")
    void generatedDraftStored() {
        question(1, "An old draft question nobody wants anymore?", "easy");
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(GOOD));

        JobAssessmentDto result = service.generate(RITA, 5L);

        assertEquals(5, result.getQuestions().size());
        assertEquals(GOOD[0][0], result.getQuestions().get(0).getQuestion());
        assertEquals(List.of(1, 2, 3, 4, 5), result.getQuestions().stream().map(q -> q.getPosition()).toList());
        assertTrue(result.getQuestions().stream().allMatch(q -> JobQuestion.SOURCE_AI.equals(q.getSource())));
        assertTrue(result.getIssues().isEmpty(), result.getIssues().toString());
    }

    @Test
    @DisplayName("an empty AI draft leaves the existing draft alone")
    void emptyDraftKeepsOld() {
        storeGoodSet();
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[0][]));

        assertThrows(RuntimeException.class, () -> service.generate(RITA, 5L));
        assertEquals(5, stored.size());
    }

    @Test
    @DisplayName("generation needs required skills")
    void generationNeedsSkills() {
        job.getRequiredSkills().clear();

        assertThrows(BadRequestException.class, () -> service.generate(RITA, 5L));
        verify(aiServiceClient, never()).post(anyString(), any());
    }

    @Test
    @DisplayName("one question can be regenerated without touching the others")
    void regenerateOne() {
        storeGoodSet();
        JobQuestion target = stored.get(2);
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[][]{
                {"How would you tune a slow PostgreSQL query plan?", "medium"}}));

        JobAssessmentDto result = service.regenerate(RITA, 5L, target.getId(), null);

        ArgumentCaptor<JsonNode> sent = ArgumentCaptor.forClass(JsonNode.class);
        verify(aiServiceClient).post(anyString(), sent.capture());
        assertEquals(1, sent.getValue().get("question_count").asInt());
        assertEquals(5, sent.getValue().get("existing_questions").size());
        assertFalse(sent.getValue().has("difficulty"));
        assertFalse(sent.getValue().has("topic"));

        assertEquals("How would you tune a slow PostgreSQL query plan?", result.getQuestions().get(2).getQuestion());
        assertEquals(GOOD[0][0], result.getQuestions().get(0).getQuestion());
        assertEquals(5, result.getQuestions().size());
    }

    @Test
    @DisplayName("regenerating at a chosen difficulty and topic sends both and keeps the recruiter's topic")
    void regenerateWithDifficultyAndTopic() {
        storeGoodSet();
        JobQuestion target = stored.get(0);
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[][]{
                {"How would you choose an isolation level for a payments table?", "hard"}}));

        JobAssessmentDto result = service.regenerate(RITA, 5L, target.getId(),
                JobQuestionRegenerateRequestDto.builder().difficulty("HARD").topic("  Transaction  isolation ").build());

        ArgumentCaptor<JsonNode> sent = ArgumentCaptor.forClass(JsonNode.class);
        verify(aiServiceClient).post(anyString(), sent.capture());
        assertEquals("hard", sent.getValue().get("difficulty").asText());
        assertEquals("Transaction isolation", sent.getValue().get("topic").asText());

        var replaced = result.getQuestions().get(0);
        assertEquals("How would you choose an isolation level for a payments table?", replaced.getQuestion());
        assertEquals("hard", replaced.getDifficulty());
        assertEquals("Transaction isolation", replaced.getTopic());
    }

    @Test
    @DisplayName("a replacement at the wrong difficulty is refused, leaving the question as it was")
    void regenerateWrongDifficultyRefused() {
        storeGoodSet();
        JobQuestion target = stored.get(0);
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[][]{
                {"What does a primary key guarantee in a relational table?", "easy"}}));

        assertThrows(RuntimeException.class, () -> service.regenerate(RITA, 5L, target.getId(),
                JobQuestionRegenerateRequestDto.builder().difficulty("hard").build()));
        assertEquals(GOOD[0][0], target.getQuestionText());
    }

    @Test
    @DisplayName("an unknown difficulty is refused before the AI is called")
    void regenerateBadDifficulty() {
        storeGoodSet();

        assertThrows(BadRequestException.class, () -> service.regenerate(RITA, 5L, stored.get(0).getId(),
                JobQuestionRegenerateRequestDto.builder().difficulty("extreme").build()));
        verify(aiServiceClient, never()).post(anyString(), any());
    }

    // ---- Adding one question ------------------------------------------

    private static JobQuestionAddRequestDto addRequest(String difficulty, String topic, String... draft) {
        return JobQuestionAddRequestDto.builder()
                .difficulty(difficulty)
                .topic(topic)
                .draftQuestions(new ArrayList<>(List.of(draft)))
                .build();
    }

    @Test
    @DisplayName("adding with AI appends one question and leaves the others as they were")
    void addAppendsOne() {
        storeGoodSet();
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[][]{
                {"How would you design pagination for a large REST collection?", "hard"}}));

        JobAssessmentDto result = service.addGenerated(RITA, 5L,
                addRequest("HARD", "  REST  pagination ", "An unsaved edit the recruiter typed into the editor?"));

        ArgumentCaptor<JsonNode> sent = ArgumentCaptor.forClass(JsonNode.class);
        verify(aiServiceClient).post(eq("/api/v1/assessment/questions/generate"), sent.capture());
        JsonNode body = sent.getValue();
        assertEquals(1, body.get("question_count").asInt());
        assertEquals("hard", body.get("difficulty").asText());
        assertEquals("REST pagination", body.get("topic").asText());
        // Saved questions and the editor's unsaved text are both avoided.
        assertEquals(6, body.get("existing_questions").size());
        assertEquals(job.getJobDescription(), body.get("job_description").asText());
        assertFalse(body.has("candidate_resume"));

        assertEquals(6, result.getQuestions().size());
        for (int i = 0; i < GOOD.length; i++) {
            assertEquals(GOOD[i][0], result.getQuestions().get(i).getQuestion());
        }
        var added = result.getQuestions().get(5);
        assertEquals("How would you design pagination for a large REST collection?", added.getQuestion());
        assertEquals(6, added.getPosition());
        assertEquals("hard", added.getDifficulty());
        assertEquals("REST pagination", added.getTopic());
        assertEquals(JobQuestion.SOURCE_AI, added.getSource());
    }

    @Test
    @DisplayName("adding does not change the question count; the mismatch is reported, not hidden")
    void addKeepsCountRule() {
        storeGoodSet();
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[][]{
                {"How would you design pagination for a large REST collection?", "medium"}}));

        JobAssessmentDto result = service.addGenerated(RITA, 5L, addRequest("medium", null));

        assertEquals(5, result.getQuestionCount());
        assertTrue(result.getIssues().contains("Expected 5 questions, found 6."), result.getIssues().toString());
    }

    @Test
    @DisplayName("a full set takes no more questions, and the AI is not called")
    void addRefusedAtLimit() {
        for (int i = 1; i <= JobPosting.MAX_QUESTION_COUNT; i++) {
            question(i, "Distinct question number " + i + " about databases and APIs?", "medium");
        }

        BadRequestException refused = assertThrows(BadRequestException.class,
                () -> service.addGenerated(RITA, 5L, addRequest("easy", null)));
        assertTrue(refused.getMessage().contains("maximum of 10"));
        verify(aiServiceClient, never()).post(anyString(), any());
        assertEquals(10, stored.size());
    }

    @Test
    @DisplayName("a generated question that repeats one in the set is not added")
    void addRefusesDuplicate() {
        storeGoodSet();
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[][]{
                {GOOD[0][0], "easy"}}));

        assertThrows(RuntimeException.class, () -> service.addGenerated(RITA, 5L, addRequest("easy", null)));
        assertEquals(5, stored.size());
    }

    @Test
    @DisplayName("a generated question matching an unsaved draft question is not added")
    void addRefusesDuplicateOfUnsavedText() {
        storeGoodSet();
        String unsaved = "What is the purpose of a foreign key constraint in PostgreSQL?";
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[][]{{unsaved, "easy"}}));

        assertThrows(RuntimeException.class, () -> service.addGenerated(RITA, 5L, addRequest("easy", null, unsaved)));
        assertEquals(5, stored.size());
    }

    @Test
    @DisplayName("a failed or empty generation leaves the set unchanged")
    void addFailureKeepsSet() {
        storeGoodSet();
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[0][]));

        assertThrows(RuntimeException.class, () -> service.addGenerated(RITA, 5L, addRequest("easy", null)));
        assertEquals(5, stored.size());
    }

    @Test
    @DisplayName("an added question at the wrong difficulty is refused")
    void addWrongDifficultyRefused() {
        storeGoodSet();
        when(aiServiceClient.post(anyString(), any())).thenReturn(aiDraft(new String[][]{
                {"What does a primary key guarantee in a relational table?", "easy"}}));

        assertThrows(RuntimeException.class, () -> service.addGenerated(RITA, 5L, addRequest("hard", null)));
        assertEquals(5, stored.size());
    }

    @Test
    @DisplayName("adding needs a difficulty, and checks it before the AI is called")
    void addNeedsDifficulty() {
        storeGoodSet();

        assertThrows(BadRequestException.class, () -> service.addGenerated(RITA, 5L, addRequest(null, null)));
        assertThrows(BadRequestException.class, () -> service.addGenerated(RITA, 5L, addRequest("extreme", null)));
        verify(aiServiceClient, never()).post(anyString(), any());
    }

    @Test
    @DisplayName("an approved set cannot have questions added")
    void addRefusedWhenApproved() {
        storeGoodSet();
        job.setQuestionsApprovedAt(LocalDateTime.now());

        assertThrows(ConflictException.class, () -> service.addGenerated(RITA, 5L, addRequest("easy", null)));
        verify(aiServiceClient, never()).post(anyString(), any());
    }

    @Test
    @DisplayName("another recruiter cannot add to this job")
    void addOwnJobOnly() {
        storeGoodSet();

        assertThrows(ResourceNotFoundException.class, () -> service.addGenerated(OSCAR, 5L, addRequest("easy", null)));
        verify(aiServiceClient, never()).post(anyString(), any());
    }

    // ---- Editing ------------------------------------------------------

    @Test
    @DisplayName("saving the draft keeps order, tracks recruiter edits and removes what was dropped")
    void saveDraft() {
        storeGoodSet();
        List<JobQuestion> before = new ArrayList<>(stored);

        JobQuestionRequestDto edited = edit(before.get(1));
        edited.setQuestion("Explain optimistic locking and when it fails under contention.");

        JobQuestionRequestDto added = JobQuestionRequestDto.builder()
                .question("  How do you   keep an API backward compatible? ")
                .difficulty("Hard")
                .keyPoints(List.of("Versioning", " ", "Additive changes"))
                .build();

        // Order: 5, edited 2, new, 1. Questions 3 and 4 are removed.
        JobAssessmentDto result = service.saveDraft(RITA, 5L,
                List.of(edit(before.get(4)), edited, added, edit(before.get(0))));

        assertEquals(4, result.getQuestions().size());
        assertEquals(GOOD[4][0], result.getQuestions().get(0).getQuestion());
        assertEquals(JobQuestion.SOURCE_AI, result.getQuestions().get(0).getSource());
        assertEquals(JobQuestion.SOURCE_RECRUITER, result.getQuestions().get(1).getSource());
        assertEquals("How do you keep an API backward compatible?", result.getQuestions().get(2).getQuestion());
        assertEquals("hard", result.getQuestions().get(2).getDifficulty());
        assertEquals(List.of("Versioning", "Additive changes"), result.getQuestions().get(2).getKeyPoints());
        assertEquals(JobQuestion.SOURCE_RECRUITER, result.getQuestions().get(2).getSource());
        assertTrue(result.getIssues().contains("Expected 5 questions, found 4."));
    }

    @Test
    @DisplayName("a question id from another job cannot be pulled into this one")
    void foreignQuestionRefused() {
        JobQuestionRequestDto foreign = JobQuestionRequestDto.builder()
                .id(9_999L).question(GOOD[0][0]).difficulty("easy").keyPoints(List.of("a", "b")).build();

        assertThrows(BadRequestException.class, () -> service.saveDraft(RITA, 5L, List.of(foreign)));
    }

    @Test
    @DisplayName("an unknown difficulty is refused on save")
    void badDifficultyRefused() {
        JobQuestionRequestDto q = JobQuestionRequestDto.builder()
                .question(GOOD[0][0]).difficulty("expert").keyPoints(List.of("a", "b")).build();

        assertThrows(BadRequestException.class, () -> service.saveDraft(RITA, 5L, List.of(q)));
    }

    @Test
    @DisplayName("settings: skills are normalised and the count must be 5-10")
    void settings() {
        JobAssessmentDto result = service.updateSettings(RITA, 5L,
                JobQuestionSettingsDto.builder().requiredSkills(List.of(" Kafka", "kafka ", "Docker")).questionCount(8).build());

        assertEquals(List.of("kafka", "docker"), result.getRequiredSkills());
        assertEquals(8, result.getQuestionCount());

        assertThrows(BadRequestException.class, () -> service.updateSettings(RITA, 5L,
                JobQuestionSettingsDto.builder().requiredSkills(List.of("kafka")).questionCount(4).build()));
    }

    // ---- Approval -----------------------------------------------------

    @Test
    @DisplayName("a valid set is approved and records who approved it")
    void approves() {
        storeGoodSet();

        JobAssessmentDto result = service.approve(RITA, 5L);

        assertTrue(result.isApproved());
        assertNotNull(job.getQuestionsApprovedAt());
        assertEquals(rita, job.getQuestionsApprovedBy());
        assertEquals("Rita", result.getApprovedBy());
    }

    @Test
    @DisplayName("approval needs exactly the chosen number of questions")
    void approvalNeedsExactCount() {
        storeGoodSet();
        job.setQuestionCount(6);

        BadRequestException e = assertThrows(BadRequestException.class, () -> service.approve(RITA, 5L));
        assertTrue(e.getMessage().contains("Expected 6 questions, found 5."));
        assertFalse(job.isQuestionsApproved());
    }

    @Test
    @DisplayName("approval needs key points on every question")
    void approvalNeedsKeyPoints() {
        storeGoodSet();
        stored.get(3).setKeyPoints(new ArrayList<>(List.of("Only one")));

        BadRequestException e = assertThrows(BadRequestException.class, () -> service.approve(RITA, 5L));
        assertTrue(e.getMessage().contains("Question 4 needs at least 2 key points"));
    }

    @Test
    @DisplayName("approval refuses duplicate questions")
    void approvalRefusesDuplicates() {
        storeGoodSet();
        stored.get(4).setQuestionText(GOOD[0][0]);

        BadRequestException e = assertThrows(BadRequestException.class, () -> service.approve(RITA, 5L));
        assertTrue(e.getMessage().contains("Question 5 repeats"));
    }

    @Test
    @DisplayName("approval needs a difficulty mix")
    void approvalNeedsMix() {
        storeGoodSet();
        stored.forEach(q -> q.setDifficulty("medium"));

        BadRequestException e = assertThrows(BadRequestException.class, () -> service.approve(RITA, 5L));
        assertTrue(e.getMessage().contains("Use at least two difficulty levels."));
    }

    @Test
    @DisplayName("an approved set is locked")
    void approvedIsImmutable() {
        storeGoodSet();
        job.setQuestionsApprovedAt(LocalDateTime.now());

        assertThrows(ConflictException.class, () -> service.generate(RITA, 5L));
        assertThrows(ConflictException.class, () -> service.regenerate(RITA, 5L, stored.get(0).getId(), null));
        assertThrows(ConflictException.class, () -> service.saveDraft(RITA, 5L, List.of()));
        assertThrows(ConflictException.class, () -> service.approve(RITA, 5L));
        assertThrows(ConflictException.class, () -> service.updateSettings(RITA, 5L,
                JobQuestionSettingsDto.builder().requiredSkills(List.of("x")).questionCount(5).build()));

        verify(aiServiceClient, never()).post(anyString(), any());
        assertEquals(5, stored.size());
    }

    @Test
    @DisplayName("another recruiter's job is not found")
    void otherRecruiterRefused() {
        storeGoodSet();

        assertThrows(ResourceNotFoundException.class, () -> service.getAssessment(OSCAR, 5L));
        assertThrows(ResourceNotFoundException.class, () -> service.approve(OSCAR, 5L));
        assertThrows(ResourceNotFoundException.class, () -> service.generate(OSCAR, 5L));
        assertFalse(job.isQuestionsApproved());
    }

    // ---- Interview start ----------------------------------------------

    @Test
    @DisplayName("an unapproved set cannot be used for an interview")
    void unapprovedNotUsable() {
        storeGoodSet();

        assertThrows(ConflictException.class, () -> service.getApprovedQuestions(job));
        assertThrows(ConflictException.class, () -> service.fixedQuestionsPayload(job));
    }

    @Test
    @DisplayName("an existing job without questions is not ready")
    void legacyJobNotReady() {
        job.getRequiredSkills().clear();

        assertThrows(ConflictException.class, () -> service.getApprovedQuestions(job));

        JobAssessmentDto view = service.getAssessment(RITA, 5L);
        assertFalse(view.isApproved());
        assertTrue(view.getIssues().contains("Add at least one required skill."));
    }

    @Test
    @DisplayName("the AI payload carries the approved questions in order, with key points")
    void fixedPayload() {
        storeGoodSet();
        job.setQuestionsApprovedAt(LocalDateTime.now());

        ArrayNode payload = service.fixedQuestionsPayload(job);

        assertEquals(5, payload.size());
        for (int i = 0; i < GOOD.length; i++) {
            assertEquals(i + 1, payload.get(i).get("position").asInt());
            assertEquals(GOOD[i][0], payload.get(i).get("question").asText());
            assertEquals(GOOD[i][1], payload.get(i).get("difficulty").asText());
            assertEquals(stored.get(i).getId().longValue(), payload.get(i).get("question_id").asLong());
            assertEquals(3, payload.get(i).get("key_points").size());
        }
    }
}
