package com.aiinterview.service.impl;

import com.aiinterview.dto.AuthResponse;
import com.aiinterview.dto.LoginRequest;
import com.aiinterview.dto.RegisterRequest;
import com.aiinterview.dto.UserDto;
import com.aiinterview.entity.ApprovalStatus;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.exception.DuplicateEmailException;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.security.JwtService;
import com.aiinterview.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail().toLowerCase().trim())) {
            throw new DuplicateEmailException(
                    "An account with this email already exists. Sign in instead, or reset your password if you've forgotten it.");
        }

        // bcrypt reads at most 72 bytes. Without this the encoder throws
        // and the user sees a server error instead of a reason.
        if (request.getPassword().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("This password is too long. Try a shorter password.");
        }

        Role role = Role.fromWireValue(request.getRole());

        User user = User.builder()
                .name(request.getName().trim())
                .email(request.getEmail().toLowerCase().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                // A recruiter sees other people's results, so asking for
                // the role is not enough to get it: an administrator
                // approves the account first. CustomUserDetailsService
                // withholds ROLE_RECRUITER until then.
                .approvalStatus(
                        role == Role.RECRUITER
                                ? ApprovalStatus.PENDING
                                : ApprovalStatus.APPROVED
                )
                .active(true)
                .build();

        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(savedUser.getEmail(), savedUser.getId());

        return AuthResponse.builder()
                .token(token)
                .user(UserDto.from(savedUser))
                .build();
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        // A disabled account must not be able to obtain a token.
        if (!user.isActive()) {
            throw new BadCredentialsException("Invalid email or password");
        }

        // A pending or rejected recruiter still signs in: the token only
        // proves who they are, and the waiting page needs it to ask
        // whether the decision has been made. What they may do is
        // decided per request from the stored approval status.
        String token = jwtService.generateToken(user.getEmail(), user.getId());

        return AuthResponse.builder()
                .token(token)
                .user(UserDto.from(user))
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto currentUser(String email) {
        return userRepository.findByEmail(email)
                .map(UserDto::from)
                .orElseThrow(() -> new ResourceNotFoundException("We couldn't find your account. Please sign in again."));
    }
}
