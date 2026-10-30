package com.aiinterview.repository;

import com.aiinterview.entity.JobQuestion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobQuestionRepository extends JpaRepository<JobQuestion, Long> {

    /** In the order they are asked. */
    List<JobQuestion> findByJobPostingIdOrderByPositionAsc(Long jobPostingId);
}
