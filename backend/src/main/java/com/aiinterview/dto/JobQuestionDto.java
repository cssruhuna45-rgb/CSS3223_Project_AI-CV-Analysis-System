package com.aiinterview.dto;

import com.aiinterview.entity.JobQuestion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * One question of a job's interview, as its recruiter sees it in the
 * editor - key points included. Never sent to a candidate.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobQuestionDto {

    private Long id;
    private int position;
    private String question;
    private String difficulty;
    private String topic;
    private List<String> keyPoints;

    /** AI or RECRUITER. */
    private String source;

    public static JobQuestionDto from(JobQuestion question) {
        return JobQuestionDto.builder()
                .id(question.getId())
                .position(question.getPosition())
                .question(question.getQuestionText())
                .difficulty(question.getDifficulty())
                .topic(question.getTopic())
                .keyPoints(List.copyOf(question.getKeyPoints()))
                .source(question.getSource())
                .build();
    }
}
