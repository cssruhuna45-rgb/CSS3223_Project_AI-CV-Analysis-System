package com.aiinterview.dto;

import com.aiinterview.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One recruiter account as the administrator reviews it.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecruiterAccountDto {

    private Long id;
    private String name;
    private String email;

    /** "pending", "approved" or "rejected". */
    private String approvalStatus;

    private LocalDateTime registeredAt;

    public static RecruiterAccountDto from(User user) {
        return RecruiterAccountDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .approvalStatus(user.getApprovalStatus().toWireValue())
                .registeredAt(user.getCreatedAt())
                .build();
    }
}
