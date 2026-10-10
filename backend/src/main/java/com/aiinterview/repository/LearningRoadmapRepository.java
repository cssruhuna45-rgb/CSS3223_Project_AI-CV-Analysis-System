package com.aiinterview.repository;

import com.aiinterview.entity.LearningRoadmap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LearningRoadmapRepository extends JpaRepository<LearningRoadmap, Long> {

    @Query("SELECT r FROM LearningRoadmap r WHERE r.user.email = :email ORDER BY r.createdAt DESC")
    List<LearningRoadmap> findByUserEmailOrderByCreatedAtDesc(@Param("email") String email);

    @Query("SELECT r FROM LearningRoadmap r WHERE r.user.id = :userId ORDER BY r.createdAt DESC")
    List<LearningRoadmap> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);

    @Query("SELECT r FROM LearningRoadmap r WHERE r.user.email = :email ORDER BY r.createdAt DESC LIMIT 1")
    Optional<LearningRoadmap> findFirstByUserEmailOrderByCreatedAtDesc(@Param("email") String email);

    Optional<LearningRoadmap> findFirstBySessionIdOrderByCreatedAtDesc(String sessionId);

    @Query("SELECT r FROM LearningRoadmap r WHERE r.sessionId = :sessionId AND r.user.email = :email ORDER BY r.createdAt DESC LIMIT 1")
    Optional<LearningRoadmap> findBySessionIdAndUserEmail(@Param("sessionId") String sessionId, @Param("email") String email);

    @Query("SELECT r FROM LearningRoadmap r WHERE r.id = :id AND r.user.email = :email")
    Optional<LearningRoadmap> findByIdAndUserEmail(@Param("id") Long id, @Param("email") String email);
}
