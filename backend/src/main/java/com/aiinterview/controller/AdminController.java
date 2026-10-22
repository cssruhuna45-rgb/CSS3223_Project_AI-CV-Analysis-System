package com.aiinterview.controller;

import com.aiinterview.dto.RecruiterAccountDto;
import com.aiinterview.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Administrator-only actions.
 *
 * <p>The guard is on the class, so every method added here later is
 * administrator-only without needing its own annotation. There is no
 * way to become an administrator through the API: registration never
 * grants ADMIN (Role.fromWireValue), and the first one is promoted from
 * ADMIN_EMAIL at startup by AdminAccountInitializer.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @Operation(summary = "Every recruiter account with its approval status")
    @GetMapping("/recruiters")
    public ResponseEntity<List<RecruiterAccountDto>> listRecruiters() {
        return ResponseEntity.ok(adminService.listRecruiters());
    }

    @Operation(summary = "Give a recruiter access to the recruiter dashboard")
    @PostMapping("/recruiters/{id}/approve")
    public ResponseEntity<RecruiterAccountDto> approve(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.approveRecruiter(id));
    }

    @Operation(summary = "Refuse, or take away, a recruiter's access")
    @PostMapping("/recruiters/{id}/reject")
    public ResponseEntity<RecruiterAccountDto> reject(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.rejectRecruiter(id));
    }
}
