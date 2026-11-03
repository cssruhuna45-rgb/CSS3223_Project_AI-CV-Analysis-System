package com.aiinterview.controller;

import com.aiinterview.dto.AuthResponse;
import com.aiinterview.dto.ForgotPasswordRequest;
import com.aiinterview.dto.LoginRequest;
import com.aiinterview.exception.TooManyRequestsException;
import com.aiinterview.security.RateLimiter;
import com.aiinterview.service.AuthService;
import com.aiinterview.service.PasswordRecoveryService;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Sign-in and reset-email limits, with a real RateLimiter so the
 * counting itself is what is tested.
 */
class AuthControllerRateLimitTest {

    private final AuthService authService = mock(AuthService.class);

    private final PasswordRecoveryService passwordRecovery = mock(PasswordRecoveryService.class);

    private final AuthController controller =
            new AuthController(authService, passwordRecovery, new RateLimiter());

    private static LoginRequest login(String email) {
        return LoginRequest.builder().email(email).password("guess").build();
    }

    @Test
    void the11thWrongPasswordIsRefusedBeforeItIsChecked() {
        when(authService.login(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        for (int i = 0; i < 10; i++) {
            assertThrows(BadCredentialsException.class, () -> controller.login(login("cara@example.com")));
        }

        assertThrows(TooManyRequestsException.class, () -> controller.login(login("cara@example.com")));
        verify(authService, times(10)).login(any());
    }

    @Test
    void changingTheCaseOfTheEmailDoesNotGetRoundIt() {
        when(authService.login(any())).thenThrow(new BadCredentialsException("Bad credentials"));

        for (int i = 0; i < 10; i++) {
            assertThrows(BadCredentialsException.class, () -> controller.login(login("cara@example.com")));
        }

        assertThrows(TooManyRequestsException.class, () -> controller.login(login(" CARA@Example.com ")));
    }

    @Test
    void aSuccessfulSignInClearsTheCount() {
        when(authService.login(any())).thenAnswer(call -> {
            LoginRequest request = call.getArgument(0);
            if (!"right".equals(request.getPassword())) {
                throw new BadCredentialsException("Bad credentials");
            }
            return new AuthResponse();
        });

        for (int i = 0; i < 9; i++) {
            assertThrows(BadCredentialsException.class, () -> controller.login(
                    LoginRequest.builder().email("cara@example.com").password("wrong").build()));
        }
        controller.login(LoginRequest.builder().email("cara@example.com").password("right").build());

        for (int i = 0; i < 9; i++) {
            assertThrows(BadCredentialsException.class, () -> controller.login(
                    LoginRequest.builder().email("cara@example.com").password("wrong").build()));
        }
    }

    @Test
    void anotherAccountCanStillSignIn() {
        when(authService.login(any())).thenThrow(new BadCredentialsException("Bad credentials"));
        for (int i = 0; i < 11; i++) {
            try {
                controller.login(login("cara@example.com"));
            } catch (RuntimeException ignored) {
                // wrong password, then the limit
            }
        }

        assertThrows(BadCredentialsException.class, () -> controller.login(login("olly@example.com")));
    }

    @Test
    void onlyThreeResetEmailsAnHourForOneAddress() {
        ForgotPasswordRequest request = new ForgotPasswordRequest("cara@example.com");

        for (int i = 0; i < 3; i++) {
            assertDoesNotThrow(() -> controller.forgotPassword(request));
        }

        assertThrows(TooManyRequestsException.class, () -> controller.forgotPassword(request));
        verify(passwordRecovery, times(3)).requestReset("cara@example.com");
        verify(passwordRecovery, never()).requestReset("olly@example.com");
    }
}
