package com.aiinterview.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Stored result of an AI resume analysis.
 *
 * <p>The shape mirrors what the Python AI service actually returns.
 * It previously carried score, strengths, weaknesses, missing skills
 * and recommendations, none of which the service produces any more -
 * the null score in particular failed the NOT NULL column and silently
 * poisoned the whole upload transaction.
 */
@Entity
@Table(name = "resume_analysis")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false, unique = true)
    private Resume resume;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "resume_analysis_skills",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Column(name = "skill")
    @Builder.Default
    private List<String> skills = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "resume_analysis_experience",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Builder.Default
    private List<ExperienceItem> experience = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "resume_analysis_education",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Builder.Default
    private List<EducationItem> education = new ArrayList<>();

    @OneToMany(
            mappedBy = "analysis",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @Builder.Default
    private List<ResumeAnalysisProject> projects = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "resume_analysis_certifications",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Column(name = "certification")
    @Builder.Default
    private List<String> certifications = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "resume_analysis_recommended_fields",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Builder.Default
    private List<RecommendedJobFieldItem> recommendedJobFields = new ArrayList<>();

    /**
     * Keeps both sides of the project association consistent; the
     * child's analysis_id is NOT NULL.
     */
    public void addProject(ResumeAnalysisProject project) {
        project.setAnalysis(this);
        this.projects.add(project);
    }
}
