package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String name;
    private String email;

    /**
     * Lowercase role ("candidate" / "recruiter"). The frontend routes on
     * this, so it must come from the server rather than from whatever
     * the user picked in the form.
     */
    private String role;
}
