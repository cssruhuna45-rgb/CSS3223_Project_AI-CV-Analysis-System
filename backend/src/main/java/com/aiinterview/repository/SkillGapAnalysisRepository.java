package com.aiinterview.repository;

import com.aiinterview.entity.SkillGapAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SkillGapAnalysisRepository
        extends JpaRepository<SkillGapAnalysis, Long> {

    /** Every analysis of one CV, newest first. The page's one query. */
    List<SkillGapAnalysis> findByResumeIdOrderByAnalysedAtDesc(Long resumeId);

    /**
     * The current analysis of this CV for this field, if there is one.
     * Re-analysing the same pair replaces it rather than adding a row.
     */
    Optional<SkillGapAnalysis> findByResumeIdAndJobField(Long resumeId, String jobField);

    /** Used when a CV is deleted. */
    void deleteByResumeId(Long resumeId);
}
