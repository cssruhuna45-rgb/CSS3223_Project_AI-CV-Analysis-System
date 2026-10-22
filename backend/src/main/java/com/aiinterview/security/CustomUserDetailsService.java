package com.aiinterview.security;

import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import com.aiinterview.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        // Granting ROLE_<name> lets endpoints be locked down with
        // @PreAuthorize("hasRole('RECRUITER')") instead of trusting a
        // role the browser sends.
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(new SimpleGrantedAuthority(authorityFor(user)))
                .disabled(!user.isActive())
                .build();
    }

    /**
     * A recruiter only gets ROLE_RECRUITER once an administrator has
     * approved the account.
     *
     * <p>The check lives here, where the authority is granted, rather
     * than in each recruiter controller. Every endpoint guarded by
     * hasRole('RECRUITER') - today's and any added later - is then
     * closed to an unapproved recruiter without anyone having to
     * remember to check. ROLE_PENDING_RECRUITER matches no rule, so
     * such an account can use the shared endpoints (its own profile)
     * and nothing recruiter-only.
     */
    static String authorityFor(User user) {

        if (user.getRole() == Role.RECRUITER && !user.isApprovedRecruiter()) {
            return "ROLE_PENDING_RECRUITER";
        }

        return "ROLE_" + user.getRole().name();
    }
}
