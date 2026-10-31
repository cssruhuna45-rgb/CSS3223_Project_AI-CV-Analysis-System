package com.aiinterview.service;

import com.aiinterview.exception.BadRequestException;
import com.aiinterview.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordRecoveryService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JavaMailSender mail;
    private final SecureRandom random = new SecureRandom();

    @Value("${password-recovery.frontend-url}")
    private String frontendUrl;
    @Value("${password-recovery.from}")
    private String from;

    @Transactional
    public void requestReset(String email) {
        var user = users.lockByEmail(email.trim().toLowerCase(Locale.ROOT)).orElse(null);
        if (user == null || !user.isActive()) return;
        var now = Instant.now();
        // A shared database cooldown also applies across backend instances.
        if (user.getPasswordResetRequestedAt() != null
                && user.getPasswordResetRequestedAt().plusSeconds(60).isAfter(now)) return;
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(user.getEmail());
        message.setSubject("Reset your AI Interview password");
        // Fragment keeps the secret out of web server access logs and referrers.
        message.setText("Open this link to set a new password:\n"
                + frontendUrl.replaceAll("/+$", "") + "/reset-password#token=" + token
                + "\n\nThis link expires in 30 minutes and can be used once."
                + "\nIf you did not request this, you can ignore this email.");
        user.setPasswordResetRequestedAt(now);
        try {
            mail.send(message);
            user.setPasswordResetHash(hash(token));
            user.setPasswordResetExpiresAt(now.plusSeconds(1800));
        } catch (MailException ex) {
            // Do not expose account existence, recipient addresses or reset links.
            log.error("Password recovery email delivery failed; check SMTP configuration.");
        }
        users.save(user);
    }

    @Transactional
    public void reset(String token, String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new BadRequestException("Password must be at most 72 UTF-8 bytes.");
        var user = users.lockByPasswordResetHash(hash(token))
                .orElseThrow(PasswordRecoveryService::invalidLink);
        var now = Instant.now();
        if (!user.isActive() || user.getPasswordResetExpiresAt() == null
                || !user.getPasswordResetExpiresAt().isAfter(now)) throw invalidLink();
        user.setPassword(encoder.encode(password));
        user.setPasswordChangedAt(now);
        user.setPasswordResetHash(null);
        user.setPasswordResetExpiresAt(null);
        users.save(user);
    }

    private static BadRequestException invalidLink() {
        return new BadRequestException("This reset link is invalid or expired. Request a new link.");
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
