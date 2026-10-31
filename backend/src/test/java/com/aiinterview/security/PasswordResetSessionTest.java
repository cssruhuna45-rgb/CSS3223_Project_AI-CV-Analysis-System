package com.aiinterview.security;

import com.aiinterview.entity.User;
import com.aiinterview.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.Instant;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordResetSessionTest {
    @Test void oldSessionIsRejectedAndNewLoginTokenWorks() throws Exception {
        var jwt = new JwtService();
        ReflectionTestUtils.setField(jwt, "secretKey", "test-secret-for-password-recovery-at-least-32-bytes");
        ReflectionTestUtils.setField(jwt, "jwtExpirationMs", 60000L);
        var details = mock(CustomUserDetailsService.class);
        var users = mock(UserRepository.class);
        var account = User.builder().email("person@example.com").password("hash").build();
        when(users.findByEmail(account.getEmail())).thenReturn(Optional.of(account));
        when(details.loadUserByUsername(account.getEmail())).thenReturn(
                org.springframework.security.core.userdetails.User.withUsername(account.getEmail())
                        .password("hash").roles("CANDIDATE").build());
        var filter = new JwtAuthenticationFilter(jwt, details, users);
        String oldToken = jwt.generateToken(account.getEmail(), 1L);
        account.setPasswordChangedAt(Instant.now().plusSeconds(1));
        try {
            var request = new MockHttpServletRequest();
            request.addHeader("Authorization", "Bearer " + oldToken);
            filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {});
            assertNull(SecurityContextHolder.getContext().getAuthentication());
            account.setPasswordChangedAt(Instant.now().minusSeconds(1));
            request = new MockHttpServletRequest();
            request.addHeader("Authorization", "Bearer " + jwt.generateToken(account.getEmail(), 1L));
            filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {});
            assertNotNull(SecurityContextHolder.getContext().getAuthentication());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
