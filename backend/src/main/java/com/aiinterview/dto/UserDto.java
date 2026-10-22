package com.aiinterview.dto;

import com.aiinterview.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String name;
    private String email;

    /**
     * Lowercase role ("candidate" / "recruiter" / "admin"). The frontend routes on
     * this, so it must come from the server rather than from whatever
     * the user picked in the form.
     */
    private String role;

    /**
     * Lowercase approval state ("pending" / "approved" / "rejected").
     * Only ever anything but "approved" for a recruiter; the frontend
     * shows a waiting page instead of the dashboard until it is.
     */
    private String approvalStatus;

    public static UserDto from(User user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().toWireValue())
                .approvalStatus(user.getApprovalStatus().toWireValue())
                .build();
    }
}
