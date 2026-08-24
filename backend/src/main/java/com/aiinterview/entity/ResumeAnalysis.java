package com.aiinterview.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.List;

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

    @Column(nullable = false)
    private Integer score;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @ElementCollection
    @CollectionTable(
            name = "resume_analysis_skills",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Column(name = "skill")
    private List<String> skills;

    @ElementCollection
    @CollectionTable(
            name = "resume_analysis_strengths",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Column(name = "strength")
    private List<String> strengths;

    @ElementCollection
    @CollectionTable(
            name = "resume_analysis_weaknesses",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Column(name = "weakness")
    private List<String> weaknesses;

    @ElementCollection
    @CollectionTable(
            name = "resume_analysis_missing_skills",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Column(name = "missing_skill")
    private List<String> missingSkills;

    @ElementCollection
    @CollectionTable(
            name = "resume_analysis_recommendations",
            joinColumns = @JoinColumn(name = "analysis_id")
    )
    @Column(name = "recommendation")
    private List<String> recommendations;
}