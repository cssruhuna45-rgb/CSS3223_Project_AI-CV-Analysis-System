package com.aiinterview.service;

import com.aiinterview.entity.Resume;
import com.aiinterview.entity.SkillGapAnalysis;
import com.aiinterview.entity.User;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.SkillGapAnalysisRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.SkillGapPersistenceServiceImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers storing a skill gap analysis against the CV it was run on.
 *
 * <p>The resume id travels through the browser, so most of what
 * matters here is what the recorder declines to write.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SkillGapPersistenceServiceTest {

    private static final String EMAIL = "candidate@example.com";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private SkillGapAnalysisRepository skillGapAnalysisRepository;

    @Mock
    private ResumeRepository resumeRepository;

    @Mock
    private UserRepository userRepository;

    private SkillGapPersistenceServiceImpl service;

    private User user;

    private Resume resume;

    @BeforeEach
    void setUp() {

        user = User.builder().id(7L).email(EMAIL).build();

        resume = Resume.builder()
                .id(42L)
                .user(user)
                .originalFileName("cara-cv.pdf")
                .build();

        service = new SkillGapPersistenceServiceImpl(
                skillGapAnalysisRepository,
                resumeRepository,
                userRepository
        );

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));
        when(resumeRepository.findById(42L)).thenReturn(Optional.of(resume));
        when(skillGapAnalysisRepository.findByResumeIdAndJobField(any(), any()))
                .thenReturn(Optional.empty());
    }

    private JsonNode json(String raw) {
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException(e);
        }
    }

    private JsonNode request() {
        return json("{\"resume_id\": 42, \"job_field\": \"backend_development\"}");
    }

    private JsonNode response() {
        return json("""
                {
                  "resume_id": 42,
                  "job_field": "backend_development",
                  "job_field_name": "Backend Development",
                  "required_skills": ["Java", "Spring Boot", "PostgreSQL"],
                  "candidate_skills": ["Java", "Spring Boot", "Docker"],
                  "matched_skills": ["Java", "Spring Boot"],
                  "related_skills": ["Docker"],
                  "missing_skills": ["PostgreSQL"],
                  "additional_skills": ["Docker"],
                  "match_percentage": 67,
                  "gap_percentage": 33,
                  "summary": "The candidate has a moderate skill match for Backend Development.",
                  "recommendations": ["Learn PostgreSQL"]
                }
                """);
    }

    private SkillGapAnalysis captureSaved() {

        ArgumentCaptor<SkillGapAnalysis> captor =
                ArgumentCaptor.forClass(SkillGapAnalysis.class);

        verify(skillGapAnalysisRepository).save(captor.capture());

        return captor.getValue();
    }

    // ========================================================
    // Storing
    // ========================================================

    @Test
    @DisplayName("Stores the analysis against the CV it was run on")
    void storesTheAnalysis() {

        service.record(EMAIL, request(), response());

        SkillGapAnalysis saved = captureSaved();

        assertEquals(42L, saved.getResume().getId());
        assertEquals("backend_development", saved.getJobField());
        assertEquals("Backend Development", saved.getJobFieldName());
        assertEquals(67, saved.getMatchPercentage());
        assertEquals(33, saved.getGapPercentage());
        assertTrue(saved.getSummary().contains("moderate skill match"));
        assertNotNull(saved.getAnalysedAt());
    }

    @Test
    @DisplayName("Keeps the whole response, so the stored view can draw the skills")
    void keepsTheWholeResponse() {

        service.record(EMAIL, request(), response());

        JsonNode stored = json(captureSaved().getResultJson());

        assertEquals("PostgreSQL", stored.get("missing_skills").get(0).asText());
        assertEquals(2, stored.get("matched_skills").size());
        assertEquals("Learn PostgreSQL", stored.get("recommendations").get(0).asText());
    }

    @Test
    @DisplayName("Analysing the same CV and field again replaces the stored row")
    void replacesRatherThanDuplicating() {

        SkillGapAnalysis existing = SkillGapAnalysis.builder()
                .id(5L)
                .resume(resume)
                .jobField("backend_development")
                .matchPercentage(20)
                .gapPercentage(80)
                .analysedAt(LocalDateTime.now().minusDays(3))
                .build();

        when(skillGapAnalysisRepository
                .findByResumeIdAndJobField(42L, "backend_development"))
                .thenReturn(Optional.of(existing));

        service.record(EMAIL, request(), response());

        SkillGapAnalysis saved = captureSaved();

        // The same row, carrying the new numbers.
        assertEquals(5L, saved.getId());
        assertEquals(67, saved.getMatchPercentage());
    }

    @Test
    @DisplayName("The resume id may arrive on the response alone")
    void acceptsTheResumeIdFromTheResponse() {

        service.record(EMAIL, json("{\"job_field\": \"backend_development\"}"), response());

        assertEquals(42L, captureSaved().getResume().getId());
    }

    // ========================================================
    // What it declines to write
    // ========================================================

    @Test
    @DisplayName("Will not file an analysis against another candidate's CV")
    void refusesAForeignResume() {

        User someoneElse = User.builder().id(99L).email("other@example.com").build();
        resume.setUser(someoneElse);

        service.record(EMAIL, request(), response());

        verify(skillGapAnalysisRepository, never()).save(any());
    }

    @Test
    @DisplayName("A resume id that is no CV stores nothing")
    void ignoresAnUnknownResume() {

        // CVUpload falls back to Date.now() when an upload returns no
        // id, and that is not a CV.
        when(resumeRepository.findById(any())).thenReturn(Optional.empty());

        service.record(EMAIL, request(), response());

        verify(skillGapAnalysisRepository, never()).save(any());
    }

    @Test
    @DisplayName("A request naming no CV stores nothing")
    void ignoresAMissingResumeId() {

        service.record(
                EMAIL,
                json("{\"job_field\": \"backend_development\"}"),
                json("{\"job_field\": \"backend_development\", \"match_percentage\": 67, \"gap_percentage\": 33}")
        );

        verify(skillGapAnalysisRepository, never()).save(any());
    }

    @Test
    @DisplayName("A response with no job field stores nothing")
    void ignoresAMissingJobField() {

        service.record(EMAIL, request(), json("""
                {"resume_id": 42, "match_percentage": 67, "gap_percentage": 33}
                """));

        verify(skillGapAnalysisRepository, never()).save(any());
    }

    @Test
    @DisplayName("A response with no percentages stores nothing")
    void ignoresAMissingPercentage() {

        // A row with no percentage would draw as "0% match", which is
        // a worse answer than having no stored analysis at all.
        service.record(EMAIL, request(), json("""
                {"resume_id": 42, "job_field": "backend_development",
                 "job_field_name": "Backend Development"}
                """));

        verify(skillGapAnalysisRepository, never()).save(any());
    }

    @Test
    @DisplayName("A genuine zero percent is still stored")
    void storesAGenuineZero() {

        // Telling "no match" apart from "no analysis" is the whole
        // point of refusing the case above.
        service.record(EMAIL, request(), json("""
                {"resume_id": 42, "job_field": "backend_development",
                 "job_field_name": "Backend Development",
                 "match_percentage": 0, "gap_percentage": 100}
                """));

        assertEquals(0, captureSaved().getMatchPercentage());
    }

    @Test
    @DisplayName("A response that is not an object stores nothing")
    void ignoresANonObjectResponse() {

        service.record(EMAIL, request(), json("[]"));

        verify(skillGapAnalysisRepository, never()).save(any());
    }

    @Test
    @DisplayName("Falls back to the field identifier when no display name came back")
    void fallsBackToTheFieldIdentifier() {

        service.record(EMAIL, request(), json("""
                {"resume_id": 42, "job_field": "backend_development",
                 "match_percentage": 67, "gap_percentage": 33}
                """));

        assertEquals("backend_development", captureSaved().getJobFieldName());
    }
}
