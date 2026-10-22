package com.aiinterview.service;

import com.aiinterview.dto.RecruiterAccountDto;
import com.aiinterview.entity.ApprovalStatus;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.AdminServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AdminServiceImpl adminService;

    private User account(long id, Role role, ApprovalStatus status) {
        return User.builder()
                .id(id)
                .name("Account " + id)
                .email("account" + id + "@example.com")
                .password("hash")
                .role(role)
                .approvalStatus(status)
                .build();
    }

    @Test
    @DisplayName("Approving a pending recruiter gives them recruiter access")
    void approvesPendingRecruiter() {
        User recruiter = account(5, Role.RECRUITER, ApprovalStatus.PENDING);
        when(userRepository.findById(5L)).thenReturn(Optional.of(recruiter));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        RecruiterAccountDto result = adminService.approveRecruiter(5L);

        assertEquals("approved", result.getApprovalStatus());
        assertEquals(true, recruiter.isApprovedRecruiter());
    }

    @Test
    @DisplayName("Rejecting an approved recruiter takes their access away")
    void rejectsApprovedRecruiter() {
        User recruiter = account(6, Role.RECRUITER, ApprovalStatus.APPROVED);
        when(userRepository.findById(6L)).thenReturn(Optional.of(recruiter));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        RecruiterAccountDto result = adminService.rejectRecruiter(6L);

        assertEquals("rejected", result.getApprovalStatus());
        assertEquals(false, recruiter.isApprovedRecruiter());
    }

    @Test
    @DisplayName("Only recruiter accounts can be approved or rejected")
    void refusesNonRecruiters() {
        when(userRepository.findById(1L))
                .thenReturn(Optional.of(account(1, Role.ADMIN, ApprovalStatus.APPROVED)));
        when(userRepository.findById(2L))
                .thenReturn(Optional.of(account(2, Role.CANDIDATE, ApprovalStatus.APPROVED)));

        assertThrows(ResourceNotFoundException.class, () -> adminService.rejectRecruiter(1L));
        assertThrows(ResourceNotFoundException.class, () -> adminService.approveRecruiter(2L));

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("An unknown id is not found")
    void unknownId() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> adminService.approveRecruiter(99L));
    }
}
