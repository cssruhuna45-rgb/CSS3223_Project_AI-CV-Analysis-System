package com.aiinterview.service;

import com.aiinterview.dto.AuthResponse;
import com.aiinterview.dto.LoginRequest;
import com.aiinterview.dto.RegisterRequest;
import com.aiinterview.dto.UserDto;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);

    /**
     * The signed-in account as it is stored now - so a recruiter
     * waiting for approval can see it arrive without logging out.
     */
    UserDto currentUser(String email);
}
