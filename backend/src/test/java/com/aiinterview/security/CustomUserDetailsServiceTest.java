package com.aiinterview.security;

import com.aiinterview.entity.ApprovalStatus;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The authority decides what hasRole(...) lets through, so this is the
 * test that proves an unapproved recruiter cannot reach recruiter data.
 */
class CustomUserDetailsServiceTest {

    private User user(Role role, ApprovalStatus status) {
        return User.builder().role(role).approvalStatus(status).build();
    }

    @Test
    @DisplayName("Only an approved recruiter is granted ROLE_RECRUITER")
    void recruiterAuthorityFollowsApproval() {
        assertEquals("ROLE_RECRUITER",
                CustomUserDetailsService.authorityFor(user(Role.RECRUITER, ApprovalStatus.APPROVED)));
        assertEquals("ROLE_PENDING_RECRUITER",
                CustomUserDetailsService.authorityFor(user(Role.RECRUITER, ApprovalStatus.PENDING)));
        assertEquals("ROLE_PENDING_RECRUITER",
                CustomUserDetailsService.authorityFor(user(Role.RECRUITER, ApprovalStatus.REJECTED)));
    }

    @Test
    @DisplayName("Candidates and administrators keep their own role")
    void otherRolesUnchanged() {
        assertEquals("ROLE_CANDIDATE",
                CustomUserDetailsService.authorityFor(user(Role.CANDIDATE, ApprovalStatus.APPROVED)));
        assertEquals("ROLE_ADMIN",
                CustomUserDetailsService.authorityFor(user(Role.ADMIN, ApprovalStatus.APPROVED)));
    }
}
