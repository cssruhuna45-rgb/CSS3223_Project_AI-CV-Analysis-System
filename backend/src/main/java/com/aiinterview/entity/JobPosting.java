package com.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * A job a recruiter is interviewing for, and the invite code that
 * links candidates' interviews to it (V7).
 *
 * <p>The job description and field are fixed here by the recruiter, so
 * every candidate who joins with the code is interviewed against the
 * same text - their scores are comparable because of that.
 */
@Entity
@Table(name = "job_postings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "recruiter")
@EqualsAndHashCode(of = "id")
public class JobPosting {

    /**
     * The job fields the AI service knows. Must match the keys of
     * JOB_FIELDS in ai-service/app/skill_gap/skill_catalog.py and the
     * ids in frontend/src/constants/jobFields.js: an unknown field would
     * reach the interview with no skills catalogue behind it.
     */
    public static final Set<String> JOB_FIELDS = Set.of(
            "software_engineering",
            "backend_development",
            "frontend_development",
            "full_stack_development",
            "devops_cloud",
            "cloud_architecture",
            "data_engineering",
            "ai_machine_learning",
            "cybersecurity",
            "qa_testing"
    );

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruiter_id", nullable = false)
    private User recruiter;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    /**
     * Shown to the candidate before they agree to share their result,
     * so they know who will see it. Optional.
     */
    @Column(name = "company", length = 150)
    private String company;

    @Column(name = "job_field", nullable = false, length = 64)
    private String jobField;

    @Column(name = "job_description", nullable = false, columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "invite_code", nullable = false, unique = true, length = 16)
    private String inviteCode;

    /**
     * A closed job keeps its results but accepts no new candidates.
     */
    @Column(name = "is_open", nullable = false)
    @Builder.Default
    private boolean open = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
