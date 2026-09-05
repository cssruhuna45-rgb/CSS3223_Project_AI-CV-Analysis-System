package com.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A job field the AI service considers a good match for the candidate,
 * with how strongly it matched.
 */
@Embeddable
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendedJobFieldItem {

    /**
     * Internal identifier, e.g. "backend_development".
     */
    @Column(name = "job_field")
    private String field;

    @Column(name = "job_field_name")
    private String name;

    @Column(name = "match_percentage")
    private Integer matchPercentage;
}
