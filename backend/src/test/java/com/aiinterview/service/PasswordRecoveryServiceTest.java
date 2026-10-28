package com.aiinterview.service;

import com.aiinterview.entity.User;
import com.aiinterview.exception.BadRequestException;
import com.aiinterview.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.ArgumentCaptor;
import java.time.Instant;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PasswordRecoveryServiceTest {
    UserRepository users = mock(UserRepository.class);
    PasswordEncoder encoder = mock(PasswordEncoder.class);
    JavaMailSender mail = mock(JavaMailSender.class);
    PasswordRecoveryService service = new PasswordRecoveryService(users, encoder, mail);
    User user;

    @BeforeEach void setup() {
        user = User.builder().email("person@example.com").password("old-hash").build();
        ReflectionTestUtils.setField(service, "frontendUrl", "https://example.com/");
        ReflectionTestUtils.setField(service, "from", "no-reply@example.com");
    }

    @Test void sendsRandomTokenButStoresOnlyHashAndThrottlesResend() {
        when(users.lockByEmail(user.getEmail())).thenReturn(Optional.of(user));
        service.requestReset(" Person@Example.com ");
        var captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(captor.capture());
        String token = captor.getValue().getText().split("#token=")[1].split("\n")[0];
        assertTrue(token.matches("[A-Za-z0-9_-]{43}"));
        assertEquals(PasswordRecoveryService.hash(token), user.getPasswordResetHash());
        assertTrue(user.getPasswordResetExpiresAt().isAfter(Instant.now().plusSeconds(1700)));
        service.requestReset(user.getEmail());
        verifyNoMoreInteractions(mail);
    }

    @Test void unknownAndDisabledAccountsDoNotSendMail() {
        when(users.lockByEmail("unknown@example.com")).thenReturn(Optional.empty());
        service.requestReset("unknown@example.com");
        user.setActive(false);
        when(users.lockByEmail(user.getEmail())).thenReturn(Optional.of(user));
        service.requestReset(user.getEmail());
        verifyNoInteractions(mail, encoder);
    }

    @Test void deliveryFailureKeepsExistingLink() {
        user.setPasswordResetHash("existing");
        when(users.lockByEmail(user.getEmail())).thenReturn(Optional.of(user));
        doThrow(new MailSendException("offline")).when(mail).send(any(SimpleMailMessage.class));
        assertDoesNotThrow(() -> service.requestReset(user.getEmail()));
        assertEquals("existing", user.getPasswordResetHash());
    }

    @Test void resetsPasswordAndConsumesToken() {
        user.setPasswordResetHash(PasswordRecoveryService.hash("token"));
        user.setPasswordResetExpiresAt(Instant.now().plusSeconds(300));
        when(users.lockByPasswordResetHash(anyString())).thenAnswer(invocation ->
                Optional.ofNullable(user.getPasswordResetHash() == null ? null : user));
        when(encoder.encode("new-password")).thenReturn("new-hash");
        service.reset("token", "new-password");
        assertEquals("new-hash", user.getPassword());
        assertNotNull(user.getPasswordChangedAt());
        assertNull(user.getPasswordResetHash());
        assertNull(user.getPasswordResetExpiresAt());
        assertThrows(BadRequestException.class, () -> service.reset("token", "another-password"));
    }

    @Test void expiredAndDisabledTokensCannotChangePassword() {
        when(users.lockByPasswordResetHash(anyString())).thenReturn(Optional.of(user));
        user.setPasswordResetExpiresAt(Instant.now().minusSeconds(1));
        assertThrows(BadRequestException.class, () -> service.reset("token", "new-password"));
        user.setPasswordResetExpiresAt(Instant.now().plusSeconds(300));
        user.setActive(false);
        assertThrows(BadRequestException.class, () -> service.reset("token", "new-password"));
        verifyNoInteractions(encoder);
    }

    @Test void rejectsPasswordsExceedingBcryptByteLimit() {
        assertThrows(BadRequestException.class, () -> service.reset("token", "é".repeat(40)));
        verifyNoInteractions(users, encoder);
    }
}
