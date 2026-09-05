package com.aiinterview.service.impl;

import com.aiinterview.dto.ResumeAnalysisResponse;
import com.aiinterview.entity.EducationItem;
import com.aiinterview.entity.ExperienceItem;
import com.aiinterview.entity.RecommendedJobFieldItem;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.ResumeAnalysis;
import com.aiinterview.entity.ResumeAnalysisProject;
import com.aiinterview.repository.ResumeAnalysisRepository;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.service.AiServiceClient;
import com.aiinterview.service.ResumeAnalysisService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Runs the AI resume analysis and stores it.
 *
 * <p>Deliberately a separate bean with its own transaction. When this
 * lived inside the upload transaction, a failed analysis insert marked
 * that transaction rollback-only; the caller caught the exception and
 * carried on, and the commit then blew up with "Transaction silently
 * rolled back", losing the upload as well. Analysis is best effort and
 * must never be able to do that.
 */
@Service
@RequiredArgsConstructor
public class ResumeAnalysisServiceImpl implements ResumeAnalysisService {

    private static final Logger log =
            LoggerFactory.getLogger(ResumeAnalysisServiceImpl.class);

    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final AiServiceClient aiServiceClient;

    @Override
    @Transactional
    public boolean analyzeAndStore(Long resumeId) {

        Resume resume = resumeRepository.findById(resumeId).orElse(null);

        if (resume == null) {
            log.warn("Resume {} disappeared before analysis", resumeId);
            return false;
        }

        if (!"COMPLETED".equals(resume.getProcessingStatus())) {
            log.debug(
                    "Resume {} is {}, skipping analysis",
                    resumeId,
                    resume.getProcessingStatus()
            );
            return false;
        }

        // resume_id is unique; re-analyzing would violate it.
        if (resumeAnalysisRepository.findByResumeId(resumeId).isPresent()) {
            log.debug("Resume {} is already analyzed", resumeId);
            return false;
        }

        ResumeAnalysisResponse analysis = aiServiceClient.analyzeResume(
                resumeId,
                resume.getExtractedText()
        );

        resumeAnalysisRepository.save(toEntity(resume, analysis));

        log.info("Stored AI analysis for resume {}", resumeId);

        return true;
    }

    // ========================================================
    // Mapping
    // ========================================================

    private ResumeAnalysis toEntity(
            Resume resume,
            ResumeAnalysisResponse dto
    ) {

        ResumeAnalysis entity = ResumeAnalysis.builder()
                .resume(resume)
                .summary(dto.getSummary())
                .skills(copy(dto.getSkills()))
                .certifications(copy(dto.getCertifications()))
                .build();

        for (ResumeAnalysisResponse.ExperienceItem item : safe(dto.getExperience())) {
            entity.getExperience().add(ExperienceItem.builder()
                    .company(item.getCompany())
                    .role(item.getRole())
                    .duration(item.getDuration())
                    .description(item.getDescription())
                    .build());
        }

        for (ResumeAnalysisResponse.EducationItem item : safe(dto.getEducation())) {
            entity.getEducation().add(EducationItem.builder()
                    .institution(item.getInstitution())
                    .degree(item.getDegree())
                    .field(item.getField())
                    .year(item.getYear())
                    .build());
        }

        for (ResumeAnalysisResponse.RecommendedJobField item
                : safe(dto.getRecommendedJobFields())) {
            entity.getRecommendedJobFields().add(RecommendedJobFieldItem.builder()
                    .field(item.getField())
                    .name(item.getName())
                    .matchPercentage(item.getMatchPercentage())
                    .build());
        }

        for (ResumeAnalysisResponse.ProjectItem item : safe(dto.getProjects())) {
            entity.addProject(ResumeAnalysisProject.builder()
                    .name(item.getName())
                    .description(item.getDescription())
                    .technologies(copy(item.getTechnologies()))
                    .build());
        }

        return entity;
    }

    private static <T> List<T> safe(List<T> values) {
        return values == null ? List.of() : values;
    }

    private static <T> List<T> copy(List<T> values) {
        return values == null ? new ArrayList<>() : new ArrayList<>(values);
    }
}
