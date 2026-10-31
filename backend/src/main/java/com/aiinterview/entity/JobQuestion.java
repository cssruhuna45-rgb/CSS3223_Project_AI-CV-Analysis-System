package com.aiinterview.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * One question of a job's fixed interview (V10).
 *
 * <p>Drafted by the AI service from the job's required skills, edited
 * by the recruiter, then approved with the rest of the set. Every
 * candidate for the job is asked the approved questions in
 * {@link #position} order and graded against the same
 * {@link #keyPoints}, which never leave the server.
 */
@Entity
@Table(name = "job_questions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"jobPosting", "keyPoints"})
@EqualsAndHashCode(of = "id")
public class JobQuestion {

    public static final String SOURCE_AI = "AI";

    public static final String SOURCE_RECRUITER = "RECRUITER";

    /** Must match DIFFICULTY_LEVELS in ai-service question_generator.py. */
    public static final Set<String> DIFFICULTIES = Set.of("easy", "medium", "hard");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_posting_id", nullable = false)
    private JobPosting jobPosting;

    /** 1-based order the question is asked in. */
    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    /** easy, medium or hard. */
    @Column(name = "difficulty", nullable = false, length = 16)
    private String difficulty;

    @Column(name = "topic", length = 120)
    private String topic;

    /**
     * SOURCE_AI while the text is as the generator wrote it;
     * SOURCE_RECRUITER once the recruiter wrote or changed it.
     */
    @Column(name = "source", nullable = false, length = 16)
    private String source;

    /** What a complete answer must cover; the grader's reference. */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "job_question_key_points",
            joinColumns = @JoinColumn(name = "question_id")
    )
    @OrderColumn(name = "position")
    @Column(name = "key_point", nullable = false, length = 300)
    @Builder.Default
    private List<String> keyPoints = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
