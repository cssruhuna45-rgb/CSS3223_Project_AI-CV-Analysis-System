package com.aiinterview.repository;

import com.aiinterview.entity.Role;
import com.aiinterview.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.email = :email")
    Optional<User> findForUpdateByEmail(@org.springframework.data.repository.query.Param("email") String email);
    boolean existsByEmail(String email);

    /** Newest first, for the admin's recruiter review list. */
    List<User> findByRoleOrderByCreatedAtDesc(Role role);
}
