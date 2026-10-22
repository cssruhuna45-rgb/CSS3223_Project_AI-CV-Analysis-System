package com.aiinterview.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "resumes")
@EqualsAndHashCode(exclude = "resumes")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Name cannot be blank")
    @Column(nullable = false)
    private String name;

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email must be a valid email address")
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank(message = "Password cannot be null or blank")
    @Column(nullable = false)
    private String password;

    /**
     * Decides what the account may see. The column is NOT NULL in the
     * database, so leaving this unset makes every insert fail.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    @Builder.Default
    private Role role = Role.CANDIDATE;

    /**
     * Disabled accounts cannot authenticate. Also NOT NULL in the
     * database.
     */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * A recruiter gets recruiter access only once this is APPROVED.
     * Everyone else is APPROVED from the start. NOT NULL in the
     * database (V6).
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 16)
    @Builder.Default
    private ApprovalStatus approvalStatus = ApprovalStatus.APPROVED;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Resume> resumes = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * The one question every recruiter-only path asks: is this a
     * recruiter an administrator has let in?
     */
    public boolean isApprovedRecruiter() {
        return role == Role.RECRUITER && approvalStatus == ApprovalStatus.APPROVED;
    }
}
