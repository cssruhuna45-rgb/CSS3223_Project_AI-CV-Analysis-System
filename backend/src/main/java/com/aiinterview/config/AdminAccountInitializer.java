package com.aiinterview.config;

import com.aiinterview.entity.ApprovalStatus;
import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Makes the account named by ADMIN_EMAIL an administrator at startup.
 *
 * <p>Somebody has to approve the first recruiter, and nobody can
 * register as an administrator (Role.fromWireValue refuses ADMIN). The
 * administrator therefore registers like anyone else, and whoever runs
 * the server names that account in ADMIN_EMAIL. No password is ever
 * put in configuration: the account keeps the one its owner chose.
 *
 * <p>An ADMIN_EMAIL with no matching account is logged and left alone
 * rather than created, so a typo cannot conjure an administrator
 * nobody holds the password for.
 */
@Component
@RequiredArgsConstructor
public class AdminAccountInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private final UserRepository userRepository;

    @Value("${admin.email:}")
    private String adminEmail;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {

        String email = adminEmail == null ? "" : adminEmail.trim().toLowerCase();

        if (email.isEmpty()) {
            log.info("ADMIN_EMAIL is not set; no account was promoted to administrator");
            return;
        }

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            log.warn(
                    "ADMIN_EMAIL is {} but no account uses it. Register that account, then restart.",
                    email
            );
            return;
        }

        if (user.getRole() == Role.ADMIN) {
            return;
        }

        user.setRole(Role.ADMIN);
        user.setApprovalStatus(ApprovalStatus.APPROVED);
        userRepository.save(user);

        log.info("Account {} promoted to administrator from ADMIN_EMAIL", email);
    }
}
