package com.aiinterview.repository;

import com.aiinterview.entity.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select r from Resume r where r.id = :id")
    Optional<Resume> findForAnalysisById(@org.springframework.data.repository.query.Param("id") Long id);
    List<Resume> findByUserIdOrderByUploadedAtDesc(Long userId);
    Optional<Resume> findByUserIdAndUploadRequestKey(Long userId, String uploadRequestKey);
    Optional<Resume> findByIdAndUserId(Long id, Long userId);
}
