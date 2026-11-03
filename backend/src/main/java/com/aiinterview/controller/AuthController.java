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

    // Guessing a password one attempt at a time. Counted per account
    // rather than per IP: behind nginx every request comes from the same
    // address, and spreading guesses over many addresses would not get
    // round a per-account limit. A successful sign-in clears the count.
    private static final int LOGIN_ATTEMPTS = 10;
    private static final java.time.Duration LOGIN_WINDOW = java.time.Duration.ofMinutes(15);

    // Filling someone's inbox with reset emails.
    private static final int RESET_EMAILS = 3;
    private static final java.time.Duration RESET_WINDOW = java.time.Duration.ofHours(1);

    private final AuthService authService;
    private final com.aiinterview.service.PasswordRecoveryService passwordRecovery;
    private final com.aiinterview.security.RateLimiter rateLimiter;

    @PostMapping("/forgot-password")
    public java.util.Map<String, String> forgotPassword(
            @Valid @RequestBody com.aiinterview.dto.ForgotPasswordRequest request) {
        // Counted whether or not the account exists, so the limit says
        // nothing about which emails are registered.
        rateLimiter.check("reset:" + normalise(request.email()), RESET_EMAILS, RESET_WINDOW,
                "Too many reset requests for this email. Please wait an hour and try again.");
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
        String key = "login:" + normalise(request.getEmail());
        rateLimiter.check(key, LOGIN_ATTEMPTS, LOGIN_WINDOW,
                "Too many sign-in attempts. Please wait 15 minutes and try again, or reset your password.");
        AuthResponse response = authService.login(request);
        rateLimiter.reset(key);
        return ResponseEntity.ok(response);
    }

    /** So "Cara@Example.com " and "cara@example.com" share one count. */
    private static String normalise(String email) {
        return email == null ? "" : email.trim().toLowerCase(java.util.Locale.ROOT);
    }
}
