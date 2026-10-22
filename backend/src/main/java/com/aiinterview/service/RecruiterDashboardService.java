package com.aiinterview.service;

import com.aiinterview.dto.RecruiterOverviewResponse;

public interface RecruiterDashboardService {

    /**
     * The interviews taken for this recruiter's own jobs, plus the
     * headline totals over them.
     *
     * @param recruiterEmail the signed-in recruiter, from the token
     * @param jobId          one of their jobs to narrow to, or null for all
     */
    RecruiterOverviewResponse getOverview(String recruiterEmail, Long jobId);
}
