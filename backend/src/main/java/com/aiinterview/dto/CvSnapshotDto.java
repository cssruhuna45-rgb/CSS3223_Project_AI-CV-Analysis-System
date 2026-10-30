package com.aiinterview.dto;

import com.aiinterview.entity.EducationItem;
import com.aiinterview.entity.ExperienceItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * The CV analysis a recruiter reviewed, as it stood when the candidate
 * applied.
 *
 * <p>Stored as JSON on the application and deserialised back into this
 * shape when a recruiter opens the applicant. It is a snapshot, not a
 * live read: the candidate may since have re-uploaded or re-analysed
 * their CV, and that must not change the evidence behind a decision
 * already made.
 *
 * <p>This project owns the shape - it is built from the stored
 * {@code ResumeAnalysis} rather than passed through from the AI service
 * - so it is a typed DTO rather than a raw {@code JsonNode}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CvSnapshotDto {

    private String summary;

    private List<String> skills;

    private List<ExperienceItem> experience;

    private List<EducationItem> education;

    private List<String> certifications;

    /**
     * An empty snapshot, for an application whose CV had not been
     * analysed, or whose stored snapshot could not be read back. The
     * page then shows the CV file on its own rather than failing.
     */
    public static CvSnapshotDto empty() {
        return CvSnapshotDto.builder()
                .summary(null)
                .skills(new ArrayList<>())
                .experience(new ArrayList<>())
                .education(new ArrayList<>())
                .certifications(new ArrayList<>())
                .build();
    }
}
