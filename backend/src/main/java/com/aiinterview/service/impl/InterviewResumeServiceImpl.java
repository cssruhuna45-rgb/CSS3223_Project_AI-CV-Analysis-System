package com.aiinterview.service.impl;

import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.InterviewTurn;
import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.ConflictException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.AiServiceClient;
import com.aiinterview.service.InterviewEligibilityService;
import com.aiinterview.service.InterviewEligibilityService.InterviewAccess;
import com.aiinterview.service.InterviewResumeService;
import com.aiinterview.service.JobQuestionService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InterviewResumeServiceImpl implements InterviewResumeService {

    private static final Logger log =
            LoggerFactory.getLogger(InterviewResumeServiceImpl.class);

    private static final String PRACTICE_NOT_RESUMABLE =
            "Only a job interview can be resumed. Start a new practice interview instead.";

    private static final String NOT_RESUMABLE =
            "This interview can no longer be continued.";

    private final UserRepository userRepository;

    private final InterviewSessionRepository interviewSessionRepository;

    private final InterviewEligibilityService interviewEligibilityService;

    private final JobQuestionService jobQuestionService;

    private final AiServiceClient aiServiceClient;

    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public JsonNode resume(String userEmail, String sessionId) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        InterviewSession session = interviewSessionRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + sessionId));

        // The session id travels through the browser, so it is never
        // enough on its own to continue somebody else's interview.
        if (session.getUser() == null || !session.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedAccessException("You do not have permission to resume this interview.");
        }

        JobPosting job = session.getJobPosting();
        JobApplication application = session.getJobApplication();

        if (job == null || application == null) {
            throw new BadRequestException(PRACTICE_NOT_RESUMABLE);
        }

        // The rules the applications page used to offer Resume, read
        // again here: a finished attempt, a rejected application or a
        // closed job all stop it, with the same message the page shows.
        InterviewAccess access = interviewEligibilityService.describeAccess(application);

        if (!access.resumable() || !sessionId.equals(access.sessionId())) {
            throw new ConflictException(access.message() == null ? NOT_RESUMABLE : access.message());
        }

        JsonNode resumed = aiServiceClient.post("/api/v1/interview/resume", resumeRequest(session, job));

        log.info("Candidate {} resumed interview session {}", user.getId(), sessionId);

        // For the page heading. The page no longer has the invite it
        // started from after a reload.
        if (resumed instanceof ObjectNode body) {
            body.put("job_title", job.getTitle());
            body.put("company", job.getCompany());
        }

        return resumed;
    }

    /**
     * Everything the AI service needs to rebuild the session if it has
     * expired: the job's text and approved questions, as at the start,
     * and the answers stored so far, in order.
     */
    private ObjectNode resumeRequest(InterviewSession session, JobPosting job) {

        ObjectNode request = objectMapper.createObjectNode();

        request.put("session_id", session.getSessionId());
        request.put("job_description", job.getJobDescription());
        request.put("job_field", job.getJobField());
        request.set("fixed_questions", jobQuestionService.fixedQuestionsPayload(job));

        ArrayNode answers = request.putArray("answers");

        // Answers fill the turns from the front, so the first
        // unanswered turn is the question that was on screen.
        for (InterviewTurn turn : session.getTurns()) {

            if (turn.getAnswer() == null) {
                break;
            }

            answers.add(turn.getAnswer());
        }

        return request;
    }
}
