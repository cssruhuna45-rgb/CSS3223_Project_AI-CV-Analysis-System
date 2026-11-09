package com.aiinterview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Asks for one new AI question to be added to the end of a draft set.
 *
 * <p>{@code draftQuestions} is the question text currently in the
 * recruiter's editor, saved or not, so the new question repeats none of
 * them. It only steers what is written: the saved set is what counts,
 * and nothing in this list is stored.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobQuestionAddRequestDto {

    @NotBlank(message = "Choose a difficulty for the new question")
    @Pattern(regexp = "(?i)easy|medium|hard", message = "Difficulty must be easy, medium or hard")
    private String difficulty;

    @Size(max = 120, message = "Keep the topic under 120 characters")
    private String topic;

    @Size(max = 10, message = "A job can have at most 10 questions")
    private List<@Size(max = 600, message = "Keep each question under 600 characters") String> draftQuestions;
}
