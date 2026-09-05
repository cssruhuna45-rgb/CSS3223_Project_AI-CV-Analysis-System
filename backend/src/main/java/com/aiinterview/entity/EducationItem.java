package com.aiinterview.entity;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * One education entry extracted from a resume.
 *
 * <p>Column names match the existing resume_analysis_education table.
 */
@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EducationItem {

    private String institution;

    private String degree;

    private String field;

    private String year;
}
