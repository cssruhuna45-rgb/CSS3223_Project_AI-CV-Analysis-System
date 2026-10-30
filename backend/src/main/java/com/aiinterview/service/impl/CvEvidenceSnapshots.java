package com.aiinterview.service.impl;

import com.aiinterview.dto.CvSnapshotDto;
import com.aiinterview.entity.EducationItem;
import com.aiinterview.entity.ExperienceItem;
import com.aiinterview.entity.ResumeAnalysis;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

/**
 * Turns a CV analysis into the frozen copy stored on an application,
 * and back again.
 *
 * <p>Written once when the candidate applies and only ever read after
 * that. The whole point is that re-uploading or re-analysing a CV
 * cannot change what a recruiter already reviewed, so nothing here
 * follows a live association back to {@code resume_analysis}.
 */
final class CvEvidenceSnapshots {

    private static final Logger log =
            LoggerFactory.getLogger(CvEvidenceSnapshots.class);

    private CvEvidenceSnapshots() {
    }

    /**
     * The analysis as JSON, for the application's
     * {@code analysis_snapshot} column.
     *
     * <p>Lazy collections are copied while the caller's transaction is
     * still open. Null when there is no analysis - a CV that was
     * uploaded but never analysed - which the recruiter's page shows as
     * an empty snapshot beside the CV file itself.
     */
    static String toJson(ResumeAnalysis analysis, ObjectMapper objectMapper) {

        if (analysis == null) {
            return null;
        }

        CvSnapshotDto snapshot = CvSnapshotDto.builder()
                .summary(analysis.getSummary())
                .skills(new ArrayList<>(analysis.getSkills()))
                .experience(new ArrayList<>(analysis.getExperience()))
                .education(new ArrayList<>(analysis.getEducation()))
                .certifications(new ArrayList<>(analysis.getCertifications()))
                .build();

        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (Exception e) {
            // The application is still worth storing without its
            // snapshot: the CV file is on it, and the recruiter can
            // open that. Losing the application over this would be
            // the worse outcome.
            log.warn("Could not store CV analysis snapshot: {}", e.getMessage());
            return null;
        }
    }

    /**
     * The stored snapshot, for a recruiter reading the application.
     *
     * <p>An empty snapshot rather than an exception when the column is
     * null or unreadable, so one damaged row cannot take down a whole
     * applicant list.
     */
    static CvSnapshotDto fromJson(String json, ObjectMapper objectMapper) {

        if (json == null || json.isBlank()) {
            return CvSnapshotDto.empty();
        }

        try {
            CvSnapshotDto snapshot = objectMapper.readValue(json, CvSnapshotDto.class);
            return snapshot == null ? CvSnapshotDto.empty() : snapshot;
        } catch (Exception e) {
            log.warn("Could not read CV analysis snapshot: {}", e.getMessage());
            return CvSnapshotDto.empty();
        }
    }

    /**
     * The skills to match against the job, read back out of the stored
     * snapshot.
     *
     * <p>Taken from the snapshot rather than from the live analysis so
     * that the match and the evidence a recruiter reads are the same
     * set of skills.
     */
    static List<String> skillsOf(CvSnapshotDto snapshot) {
        return snapshot == null || snapshot.getSkills() == null
                ? List.of()
                : snapshot.getSkills();
    }

    /**
     * The candidate's background in one line, for an applicant list
     * row: their most recent role and where.
     */
    static String experienceSummary(CvSnapshotDto snapshot) {

        if (snapshot == null || snapshot.getExperience() == null) {
            return null;
        }

        for (ExperienceItem item : snapshot.getExperience()) {

            if (item == null) {
                continue;
            }

            String line = join(item.getRole(), item.getCompany(), item.getDuration());

            if (!line.isEmpty()) {
                return line;
            }
        }

        return null;
    }

    /**
     * The candidate's qualification in one line: degree, field and
     * where.
     */
    static String educationSummary(CvSnapshotDto snapshot) {

        if (snapshot == null || snapshot.getEducation() == null) {
            return null;
        }

        for (EducationItem item : snapshot.getEducation()) {

            if (item == null) {
                continue;
            }

            String degree = join(item.getDegree(), item.getField());
            String line = join(
                    degree.isEmpty() ? null : degree,
                    item.getInstitution(),
                    item.getYear()
            );

            if (!line.isEmpty()) {
                return line;
            }
        }

        return null;
    }

    /** Non-blank parts joined with a middle dot, in the order given. */
    private static String join(String... parts) {

        List<String> present = new ArrayList<>(parts.length);

        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                present.add(part.trim());
            }
        }

        return String.join(" · ", present);
    }
}
