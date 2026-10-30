package com.aiinterview.service;

import com.aiinterview.entity.JobApplication;
import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.User;

/**
 * The one gate between a candidate and a job's interview.
 *
 * <p>Every condition is checked here, server side, from the database.
 * The candidate's own status page hides the Start Interview action when
 * it should not be offered, but that is a convenience: a request that
 * skips the page, replays an old one or edits the payload still has to
 * come through here, and a hidden button is not a permission.
 *
 * <p>Nothing in a request body is trusted. The candidate is the one
 * from the token, the application is looked up by (candidate, job), and
 * the approved questions come from Person 1's service reading the
 * database - never from the browser.
 */
public interface InterviewEligibilityService {

    /**
     * Checks that this candidate may sit this job's interview now, and
     * returns the application the attempt belongs to.
     *
     * <p>In order: the requester is a candidate; they have an
     * application for this job; it is SHORTLISTED; the job is open; the
     * job's questions are approved; and they have not already used
     * their attempt.
     *
     * @return the candidate's application, for the caller to link the
     *         new session to
     *
     * @throws com.aiinterview.exception.BadRequestException when the
     *         account is not a candidate
     * @throws com.aiinterview.exception.UnauthorizedAccessException
     *         when there is no application for this candidate and job
     * @throws com.aiinterview.exception.ConflictException when the
     *         application is not shortlisted, the job is closed or not
     *         ready, or the attempt is already used or under way
     */
    JobApplication requireEligibleApplication(User candidate, JobPosting job);

    /**
     * The same rules, read rather than enforced, for the candidate's
     * status page.
     *
     * <p>Answers whether to offer the action and what to say instead,
     * without throwing. Messages are written for the candidate and say
     * nothing about internal state - not which check failed, not
     * whether questions exist in draft.
     */
    InterviewAccess describeAccess(JobApplication application);

    /**
     * @param available whether the interview can be started now
     * @param resumable whether an attempt is already under way, so the
     *                  action should read "Resume" rather than "Start"
     * @param sessionId the attempt to resume, or null
     * @param message   why it cannot be started, or null when it can
     */
    record InterviewAccess(
            boolean available,
            boolean resumable,
            String sessionId,
            String message
    ) {
    }
}
