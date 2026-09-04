package com.aiinterview.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * A project extracted from a resume.
 *
 * <p>Modelled as an entity rather than an embeddable because it holds a
 * collection of its own ({@code technologies}), and JPA does not allow
 * an element collection inside an element collection.
 */
@Entity
@Table(name = "resume_analysis_projects")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeAnalysisProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_id", nullable = false)
    private ResumeAnalysis analysis;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "resume_analysis_project_technologies",
            joinColumns = @JoinColumn(name = "project_id")
    )
    @Column(name = "technology")
    @Builder.Default
    private List<String> technologies = new ArrayList<>();
}
