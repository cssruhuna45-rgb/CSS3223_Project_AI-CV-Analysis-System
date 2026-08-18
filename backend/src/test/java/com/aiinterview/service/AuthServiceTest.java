package com.aiinterview.service;

import com.aiinterview.dto.AuthResponse;
import com.aiinterview.dto.LoginRequest;
import com.aiinterview.dto.RegisterRequest;
import com.aiinterview.entity.User;
import com.aiinterview.exception.DuplicateEmailException;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.security.JwtService;
import com.aiinterview.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthServiceImpl authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;
    private User savedUser;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .name("Test User")
                .email("test@example.com")
                .password("Password123!")
                .build();

        loginRequest = LoginRequest.builder()
                .email("test@example.com")
                .password("Password123!")
                .build();

        savedUser = User.builder()
                .id(1L)
                .name("Test User")
                .email("test@example.com")
                .password("$2a$10$hashedBCryptPasswordString")
                .build();
    }

    @Test
    @DisplayName("Should successfully register user and return JWT token")
    void testSuccessfulRegistration() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$hashedBCryptPasswordString");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateToken(anyString(), anyLong())).thenReturn("mock.jwt.token");

        AuthResponse response = authService.register(registerRequest);

        assertNotNull(response);
        assertEquals("mock.jwt.token", response.getToken());
        assertNotNull(response.getUser());
        assertEquals("test@example.com", response.getUser().getEmail());
        assertEquals("Test User", response.getUser().getName());

        // Verify password is explicitly hashed before save
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(userCaptor.capture());
        assertEquals("$2a$10$hashedBCryptPasswordString", userCaptor.getValue().getPassword());
        assertNotEquals("Password123!", userCaptor.getValue().getPassword());
    }

    @Test
    @DisplayName("Should throw DuplicateEmailException when email already exists")
    void testDuplicateEmailRegistration() {
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        assertThrows(DuplicateEmailException.class, () -> authService.register(registerRequest));

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should successfully login user with correct credentials")
    void testSuccessfulLogin() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches("Password123!", savedUser.getPassword())).thenReturn(true);
        when(jwtService.generateToken("test@example.com", 1L)).thenReturn("mock.jwt.token");

        AuthResponse response = authService.login(loginRequest);

        assertNotNull(response);
        assertEquals("mock.jwt.token", response.getToken());
        assertEquals(1L, response.getUser().getId());
        assertEquals("test@example.com", response.getUser().getEmail());
    }

    @Test
    @DisplayName("Should throw BadCredentialsException when login password does not match")
    void testInvalidPasswordLogin() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(savedUser));
        when(passwordEncoder.matches("WrongPassword", savedUser.getPassword())).thenReturn(false);

        loginRequest.setPassword("WrongPassword");

        assertThrows(BadCredentialsException.class, () -> authService.login(loginRequest));
    }
}
