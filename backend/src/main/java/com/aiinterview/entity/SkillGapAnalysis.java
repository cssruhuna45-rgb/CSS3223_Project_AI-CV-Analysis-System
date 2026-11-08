package com.aiinterview.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * One CV compared against one job field, kept so the candidate can
 * look at it again.
 *
 * <p>The analysis used to live in the browser's sessionStorage and
 * was lost with the tab. It is stored because re-running it is not
 * repeatable: the AI service extracts the candidate's skills with a
 * model call before the deterministic matching, so the same CV and
 * field can come back with a different percentage. Showing the stored
 * row is the only way the page can give a candidate the same numbers
 * twice.
 *
 * <p>{@code resultJson} is the AI service's reply copied verbatim, in
 * the shape the browser already renders. The denormalised columns
 * beside it exist so the list of a CV's analyses can be drawn without
 * parsing every snapshot.
 */
@Entity
@Table(
        name = "skill_gap_analyses",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_skill_gap_analyses_resume_field",
                columnNames = {"resume_id", "job_field"}
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"resume", "resultJson"})
@EqualsAndHashCode(exclude = {"resume", "resultJson"})
public class SkillGapAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    /** As the AI service names it, for example {@code backend_development}. */
    @Column(name = "job_field", nullable = false, length = 64)
    private String jobField;

    /**
     * As it is shown. Stored rather than looked up, so a row still
     * reads correctly after the field list is edited.
     */
    @Column(name = "job_field_name", nullable = false, length = 128)
    private String jobFieldName;

    @Column(name = "match_percentage", nullable = false)
    private Integer matchPercentage;

    @Column(name = "gap_percentage", nullable = false)
    private Integer gapPercentage;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    /**
     * The whole response, verbatim. A new field in the AI service's
     * reply is kept without a migration, and the stored view renders
     * through the same code as a fresh one.
     */
    @Column(name = "result_json", nullable = false, columnDefinition = "TEXT")
    private String resultJson;

    @Column(name = "analysed_at", nullable = false)
    private LocalDateTime analysedAt;
}
