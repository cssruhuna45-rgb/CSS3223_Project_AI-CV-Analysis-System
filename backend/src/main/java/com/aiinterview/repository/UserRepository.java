package com.aiinterview.repository;

import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /** Newest first, for the admin's recruiter review list. */
    List<User> findByRoleOrderByCreatedAtDesc(Role role);
}
