package com.aiinterview.service;

import com.aiinterview.dto.RecruiterOverviewResponse;

public interface RecruiterDashboardService {

    /**
     * Every candidate's interviews plus the headline totals.
     *
     * <p>Crosses candidates, so callers must already have established
     * that the caller is a recruiter.
     */
    RecruiterOverviewResponse getOverview();
}
