package com.aiinterview.controller;

import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.service.AiServiceClient;
import com.aiinterview.service.InterviewPersistenceService;
import com.aiinterview.service.JobPostingService;
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
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers what the AI gateway refuses to pass on.
 *
 * <p>The proxy exists so that Gemini usage sits behind a login, but a
 * login is not the only thing it has to check. Two bodies arriving from
 * the browser are dangerous on their own terms: one that asks the AI
 * service to rebuild the shared vector store, and one that names an
 * interview session belonging to a different candidate.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiProxyControllerTest {

    private static final String EMAIL = "candidate@example.com";

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private AiServiceClient aiServiceClient;

    @Mock
    private InterviewPersistenceService interviewPersistenceService;

    @Mock
    private JobPostingService jobPostingService;

    private AiProxyController controller;

    private Authentication authentication;

    @BeforeEach
    void setUp() {

        controller = new AiProxyController(
                aiServiceClient,
                interviewPersistenceService,
                jobPostingService
        );

        authentication = new UsernamePasswordAuthenticationToken(
                EMAIL,
                "n/a",
                List.of()
        );

        when(aiServiceClient.post(anyString(), any()))
                .thenReturn(json("{\"answer\": \"ok\", \"chunks\": []}"));

        when(jobPostingService.applyInvite(anyString(), any()))
                .thenAnswer(call -> call.getArgument(1));
    }

    private JsonNode json(String raw) {
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            throw new IllegalArgumentException(e);
        }
    }

    /** The body the AI service was actually asked to act on. */
    private JsonNode forwardedTo(String path) {

        ArgumentCaptor<JsonNode> captor = ArgumentCaptor.forClass(JsonNode.class);

        verify(aiServiceClient).post(eq(path), captor.capture());

        return captor.getValue();
    }

    // ========================================================
    // Rebuilding the knowledge base
    // ========================================================

    @Test
    @DisplayName("A RAG query cannot ask for the vector store to be rebuilt")
    void stripsForceRebuildFromRagQuery() {

        // The AI service accepts this flag on its query endpoint and
        // acts on it by deleting the Chroma directory. The route is
        // open to every signed-in user, so one candidate could wipe
        // the knowledge base the rest of them are searching.
        controller.queryRag(
                json("{\"question\": \"What is STAR?\", \"force_rebuild\": true}"),
                authentication
        );

        JsonNode forwarded = forwardedTo("/api/v1/rag/query");

        assertFalse(forwarded.has("force_rebuild"));

        // Only the flag goes. The AI service still owns the schema.
        assertEquals("What is STAR?", forwarded.get("question").asText());
    }

    @Test
    @DisplayName("An ordinary RAG query is forwarded untouched")
    void leavesAnOrdinaryRagQueryAlone() {

        controller.queryRag(
                json("{\"question\": \"What is STAR?\", \"top_k\": 3}"),
                authentication
        );

        JsonNode forwarded = forwardedTo("/api/v1/rag/query");

        assertEquals("What is STAR?", forwarded.get("question").asText());
        assertEquals(3, forwarded.get("top_k").asInt());
    }

    @Test
    @DisplayName("Asking for a rebuild still returns the answer to the question")
    void stillAnswersWhenTheFlagIsStripped() {

        // The flag is dropped rather than treated as an error: the
        // question itself is a perfectly ordinary one.
        assertDoesNotThrow(() -> controller.queryRag(
                json("{\"question\": \"What is STAR?\", \"force_rebuild\": true}"),
                authentication
        ));
    }

    // ========================================================
    // Somebody else's interview
    // ========================================================

    @Test
    @DisplayName("A foreign session id is refused before the AI service is called")
    void checksSessionOwnershipBeforeForwardingAnAnswer() {

        doThrow(new UnauthorizedAccessException("This interview session does not belong to you."))
                .when(interviewPersistenceService)
                .requireSessionOwnership(eq(EMAIL), any());

        assertThrows(
                UnauthorizedAccessException.class,
                () -> controller.submitAnswer(
                        json("{\"session_id\": \"sess-of-somebody-else\", \"answer\": \"...\"}"),
                        authentication
                )
        );

        // The point of the fix. Grading first and refusing to store the
        // result afterwards still hands over the grade.
        verify(aiServiceClient, never()).post(anyString(), any());
        verify(interviewPersistenceService, never()).recordAnswer(anyString(), any(), any());
    }

    @Test
    @DisplayName("Finishing somebody else's interview does not reach the scorecard")
    void checksSessionOwnershipBeforeForwardingAFinish() {

        doThrow(new UnauthorizedAccessException("This interview session does not belong to you."))
                .when(interviewPersistenceService)
                .requireSessionOwnership(eq(EMAIL), any());

        assertThrows(
                UnauthorizedAccessException.class,
                () -> controller.finishInterview(
                        json("{\"session_id\": \"sess-of-somebody-else\"}"),
                        authentication
                )
        );

        verify(aiServiceClient, never()).post(anyString(), any());
    }

    @Test
    @DisplayName("The model answer for somebody else's question is refused")
    void checksSessionOwnershipBeforeHandingOutAModelAnswer() {

        // This route returns what the candidate is being graded against.
        doThrow(new UnauthorizedAccessException("This interview session does not belong to you."))
                .when(interviewPersistenceService)
                .requireSessionOwnership(eq(EMAIL), any());

        assertThrows(
                UnauthorizedAccessException.class,
                () -> controller.interviewModelAnswer(
                        json("{\"session_id\": \"sess-of-somebody-else\"}"),
                        authentication
                )
        );

        verify(aiServiceClient, never()).post(anyString(), any());
    }

    @Test
    @DisplayName("Generating a question from somebody else's session is refused")
    void checksSessionOwnershipBeforeGeneratingAQuestion() {

        // The AI service generates from the session's adaptive state -
        // the difficulty, topic and context built from that candidate's
        // CV and the answers they have already given.
        doThrow(new UnauthorizedAccessException("This interview session does not belong to you."))
                .when(interviewPersistenceService)
                .requireSessionOwnership(eq(EMAIL), any());

        assertThrows(
                UnauthorizedAccessException.class,
                () -> controller.generateQuestion(
                        json("{\"session_id\": \"sess-of-somebody-else\"}"),
                        authentication
                )
        );

        verify(aiServiceClient, never()).post(anyString(), any());
    }

    @Test
    @DisplayName("A standalone question names no session and is generated")
    void generatesAStandaloneQuestionWithoutASession() {

        // No session id, so the gate finds nothing to refuse and the
        // request is an ordinary one.
        controller.generateQuestion(
                json("{\"job_field\": \"backend_development\", \"difficulty\": \"medium\"}"),
                authentication
        );

        verify(interviewPersistenceService).requireSessionOwnership(eq(EMAIL), any());
        verify(aiServiceClient).post(eq("/api/v1/interview/question"), any());
    }

    @Test
    @DisplayName("A candidate's own answer is graded and recorded as before")
    void forwardsAndRecordsAnOwnedSession() {

        controller.submitAnswer(
                json("{\"session_id\": \"sess-mine\", \"answer\": \"Spring manages the bean.\"}"),
                authentication
        );

        verify(interviewPersistenceService).requireSessionOwnership(eq(EMAIL), any());
        verify(aiServiceClient).post(eq("/api/v1/interview/answer"), any());
        verify(interviewPersistenceService).recordAnswer(eq(EMAIL), any(), any());
    }

    @Test
    @DisplayName("Starting an interview is gated too, and claims no session")
    void checksOwnershipOnStartWhereThereIsNoSessionYet() {

        controller.startInterview(
                json("{\"job_description\": \"Backend engineer\"}"),
                authentication
        );

        // The gate runs, finds no session id, and lets it through: the
        // id does not exist until the AI service answers.
        verify(interviewPersistenceService).requireSessionOwnership(eq(EMAIL), any());
        verify(aiServiceClient).post(eq("/api/v1/interview/start"), any());
    }

    // ========================================================
    // The login the proxy exists for
    // ========================================================

    @Test
    @DisplayName("An anonymous caller reaches neither the gate nor the AI service")
    void refusesAnAnonymousCaller() {

        UnauthorizedAccessException refused = assertThrows(
                UnauthorizedAccessException.class,
                () -> controller.queryRag(json("{\"question\": \"hi\"}"), null)
        );

        assertTrue(refused.getMessage().contains("Authentication is required"));
        verify(aiServiceClient, never()).post(anyString(), any());
    }
}
