package com.aiinterview.controller;

import com.aiinterview.dto.UserDto;
import com.aiinterview.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The signed-in account.
 *
 * <p>Not under /api/v1/auth on purpose: SecurityConfig leaves that
 * path open for sign-in and registration, and this endpoint must
 * require a valid token.
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class UserController {

    private final AuthService authService;

    @Operation(summary = "The signed-in account, including its approval status")
    @GetMapping("/me")
    public ResponseEntity<UserDto> me(Authentication authentication) {

        // The email comes from the verified token, never from the
        // request, so this can only ever describe the caller.
        return ResponseEntity.ok(authService.currentUser(authentication.getName()));
    }
}
