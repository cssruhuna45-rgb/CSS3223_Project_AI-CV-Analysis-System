package com.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One work experience entry extracted from a resume.
 *
 * <p>Column names match the existing resume_analysis_experience table.
 */
@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExperienceItem {

    private String company;

    private String role;

    private String duration;

    @Column(columnDefinition = "TEXT")
    private String description;
}
