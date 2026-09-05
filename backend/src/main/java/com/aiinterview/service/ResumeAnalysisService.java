package com.aiinterview.service;

public interface ResumeAnalysisService {

    /**
     * Ask the AI service to analyze a stored resume and persist the
     * result.
     *
     * <p>Must be called only after the resume's own transaction has
     * committed: the analysis row has a foreign key to it.
     *
     * @return true when an analysis was stored
     */
    boolean analyzeAndStore(Long resumeId);
}
