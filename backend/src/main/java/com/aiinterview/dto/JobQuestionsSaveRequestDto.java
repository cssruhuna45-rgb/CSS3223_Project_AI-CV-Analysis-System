package com.aiinterview.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * The whole draft question set, in the order it should be asked. Saved
 * as one replacement so a reorder, an edit and a removal cannot leave
 * the set half-changed.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobQuestionsSaveRequestDto {

    @NotNull(message = "Send the list of questions")
    @Size(max = 10, message = "A job can have at most 10 questions")
    private List<@Valid JobQuestionRequestDto> questions;
}
