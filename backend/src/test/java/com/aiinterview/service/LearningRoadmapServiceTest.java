package com.aiinterview.service;

import com.aiinterview.dto.RoadmapGenerateRequestDto;
import com.aiinterview.dto.RoadmapResponseDto;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.LearningRoadmap;
import com.aiinterview.entity.User;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.LearningRoadmapRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.LearningRoadmapServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LearningRoadmapServiceTest {

    private static final String EMAIL = "candidate@example.com";
    private static final Long USER_ID = 42L;
    private static final String SESSION_ID = "session-test-uuid";

    @Mock
    private LearningRoadmapRepository roadmapRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private InterviewSessionRepository sessionRepository;

    @Mock
    private AiServiceClient aiServiceClient;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private LearningRoadmapServiceImpl roadmapService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(USER_ID).email(EMAIL).build();
    }

    @Test
    @DisplayName("generates and persists a 14-day learning roadmap")
    void generatesAndPersistsRoadmap() {
        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        InterviewSession session = InterviewSession.builder()
                .sessionId(SESSION_ID)
                .score(75)
                .jobDescription("Senior Backend Developer\nRequirements: Java, Spring Boot")
                .feedbackJson("{\"improvements\": [\"Concurrency issues\"], \"strengths\": [\"Clean code\"]}")
                .build();
        when(sessionRepository.findBySessionId(SESSION_ID)).thenReturn(Optional.of(session));

        ObjectNode aiResponse = objectMapper.createObjectNode();
        aiResponse.put("title", "14-Day Accelerated Upskilling Roadmap: Senior Backend Developer");
        aiResponse.put("target_role", "Senior Backend Developer");
        aiResponse.put("duration_days", 14);
        aiResponse.put("summary", "Master concurrency and thread safety.");
        aiResponse.putArray("days");

        when(aiServiceClient.post(eq("/api/v1/roadmap/generate"), any())).thenReturn(aiResponse);

        when(roadmapRepository.findBySessionIdAndUserEmail(SESSION_ID, EMAIL)).thenReturn(Optional.empty());
        when(roadmapRepository.save(any(LearningRoadmap.class))).thenAnswer(invocation -> {
            LearningRoadmap rm = invocation.getArgument(0);
            rm.setId(101L);
            rm.setCreatedAt(LocalDateTime.now());
            return rm;
        });

        RoadmapGenerateRequestDto request = RoadmapGenerateRequestDto.builder()
                .sessionId(SESSION_ID)
                .durationDays(14)
                .build();

        RoadmapResponseDto response = roadmapService.generateAndSaveRoadmap(EMAIL, request);

        assertNotNull(response);
        assertEquals(101L, response.getId());
        assertEquals("14-Day Accelerated Upskilling Roadmap: Senior Backend Developer", response.getTitle());
        assertEquals(14, response.getDurationDays());
        assertEquals(75, response.getOverallScore());

        verify(roadmapRepository).save(any(LearningRoadmap.class));
    }

    @Test
    @DisplayName("updates progress by marking a day complete and then incomplete")
    void updatesProgress() {
        LearningRoadmap roadmap = LearningRoadmap.builder()
                .id(202L)
                .user(user)
                .title("14-Day Roadmap")
                .durationDays(14)
                .completedDaysJson("[]")
                .createdAt(LocalDateTime.now())
                .build();

        when(roadmapRepository.findByIdAndUserEmail(202L, EMAIL)).thenReturn(Optional.of(roadmap));
        when(roadmapRepository.save(any(LearningRoadmap.class))).thenAnswer(i -> i.getArgument(0));

        // Mark day 1 complete
        RoadmapResponseDto updated1 = roadmapService.updateProgress(EMAIL, 202L, 1, true);
        assertTrue(updated1.getCompletedDays().contains(1));

        // Mark day 5 complete
        roadmap.setCompletedDaysJson("[1]");
        RoadmapResponseDto updated2 = roadmapService.updateProgress(EMAIL, 202L, 5, true);
        assertTrue(updated2.getCompletedDays().contains(1));
        assertTrue(updated2.getCompletedDays().contains(5));

        // Mark day 1 incomplete
        roadmap.setCompletedDaysJson("[1, 5]");
        RoadmapResponseDto updated3 = roadmapService.updateProgress(EMAIL, 202L, 1, false);
        assertFalse(updated3.getCompletedDays().contains(1));
        assertTrue(updated3.getCompletedDays().contains(5));
    }

    @Test
    @DisplayName("fetches stored roadmap by interview session id")
    void fetchesBySessionId() {
        LearningRoadmap roadmap = LearningRoadmap.builder()
                .id(303L)
                .sessionId(SESSION_ID)
                .user(user)
                .title("Session Roadmap")
                .durationDays(14)
                .completedDaysJson("[1, 2]")
                .createdAt(LocalDateTime.now())
                .build();

        when(roadmapRepository.findBySessionIdAndUserEmail(SESSION_ID, EMAIL))
                .thenReturn(Optional.of(roadmap));

        Optional<RoadmapResponseDto> opt = roadmapService.getBySessionId(EMAIL, SESSION_ID);
        assertTrue(opt.isPresent());
        assertEquals(303L, opt.get().getId());
        assertEquals(List.of(1, 2), opt.get().getCompletedDays());
    }
}
