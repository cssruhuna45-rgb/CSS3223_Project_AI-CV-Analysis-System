package com.aiinterview.service.impl;

import com.aiinterview.dto.RecruiterAccountDto;
import com.aiinterview.entity.ApprovalStatus;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminServiceImpl.class);

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RecruiterAccountDto> listRecruiters() {

        return userRepository.findByRoleOrderByCreatedAtDesc(Role.RECRUITER)
                .stream()
                .map(RecruiterAccountDto::from)
                .toList();
    }

    @Override
    @Transactional
    public RecruiterAccountDto approveRecruiter(Long userId) {
        return decide(userId, ApprovalStatus.APPROVED);
    }

    @Override
    @Transactional
    public RecruiterAccountDto rejectRecruiter(Long userId) {
        return decide(userId, ApprovalStatus.REJECTED);
    }

    /**
     * Records the decision on a recruiter account.
     *
     * <p>Either decision can be changed later - a rejected recruiter
     * can be approved after all, and an approved one rejected to take
     * access away. The change takes effect on the recruiter's next
     * request, because CustomUserDetailsService reads the status from
     * the database every time rather than from the token.
     *
     * <p>An id that is not a recruiter is reported as not found. The
     * approval column means nothing for candidates and administrators,
     * and "rejecting" an administrator must not be possible from here.
     */
    private RecruiterAccountDto decide(Long userId, ApprovalStatus decision) {

        User user = userRepository.findById(userId)
                .filter(u -> u.getRole() == Role.RECRUITER)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No recruiter account with id " + userId
                ));

        user.setApprovalStatus(decision);

        User saved = userRepository.save(user);

        log.info("Recruiter account {} set to {}", userId, decision);

        return RecruiterAccountDto.from(saved);
    }
}
