package com.aiinterview.controller;

import com.aiinterview.dto.AuthResponse;
import com.aiinterview.dto.LoginRequest;
import com.aiinterview.dto.RegisterRequest;
import com.aiinterview.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final com.aiinterview.service.PasswordRecoveryService passwordRecovery;

    @PostMapping("/forgot-password")
    public java.util.Map<String, String> forgotPassword(
            @Valid @RequestBody com.aiinterview.dto.ForgotPasswordRequest request) {
        passwordRecovery.requestReset(request.email());
        return java.util.Map.of("message", "If an active account exists for that email, a password reset link will be sent. Check your inbox and spam folder.");
    }

    @PostMapping("/reset-password")
    public java.util.Map<String, String> resetPassword(
            @Valid @RequestBody com.aiinterview.dto.ResetPasswordRequest request) {
        passwordRecovery.reset(request.token(), request.password());
        return java.util.Map.of("message", "Your password has been reset. Sign in with your new password.");
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
