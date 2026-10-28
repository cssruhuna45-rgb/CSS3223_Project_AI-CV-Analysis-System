package com.aiinterview.dto;

import jakarta.validation.constraints.*;

public record ForgotPasswordRequest(@NotBlank @Email @Size(max = 254) String email) {}
