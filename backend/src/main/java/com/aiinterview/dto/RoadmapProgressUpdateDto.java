package com.aiinterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapProgressUpdateDto {

    @NotNull
    @Min(1)
    @Max(60)
    @JsonProperty("day_number")
    private Integer dayNumber;

    @NotNull
    private Boolean completed;
}
