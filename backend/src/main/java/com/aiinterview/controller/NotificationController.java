package com.aiinterview.controller;

import com.aiinterview.dto.NotificationDto;
import com.aiinterview.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * The signed-in user's own in-app notifications (V12).
 *
 * <p>No role guard: notifications belong to a person, not a role, and
 * a recruiter will have their own in time. What matters is that every
 * call is scoped by the authenticated principal - the service takes the
 * user from the token and never from the request - so one person's
 * notifications are unreachable from another's session.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Your own notifications, newest first")
    @GetMapping
    public ResponseEntity<List<NotificationDto>> listMine(Authentication authentication) {
        return ResponseEntity.ok(notificationService.listMine(authentication.getName()));
    }

    @Operation(summary = "How many of your notifications are unread")
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(Authentication authentication) {
        return ResponseEntity.ok(
                Map.of("unread", notificationService.unreadCount(authentication.getName()))
        );
    }

    @Operation(summary = "Mark one of your own notifications as read")
    @PostMapping("/{notificationId}/read")
    public ResponseEntity<NotificationDto> markRead(
            @PathVariable Long notificationId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                notificationService.markRead(authentication.getName(), notificationId)
        );
    }
}
