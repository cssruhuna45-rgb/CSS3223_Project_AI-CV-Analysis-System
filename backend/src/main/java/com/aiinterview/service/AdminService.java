package com.aiinterview.service;

import com.aiinterview.dto.RecruiterAccountDto;

import java.util.List;

/**
 * What an administrator can do. Today that is deciding who may act as
 * a recruiter.
 */
public interface AdminService {

    /** Every recruiter account, newest first, whatever its status. */
    List<RecruiterAccountDto> listRecruiters();

    RecruiterAccountDto approveRecruiter(Long userId);

    RecruiterAccountDto rejectRecruiter(Long userId);
}
