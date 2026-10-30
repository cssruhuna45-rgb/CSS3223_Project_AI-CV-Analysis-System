package com.aiinterview.dto;

import com.aiinterview.entity.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One in-app notification, as its recipient sees it.
 *
 * <p>Says that something happened and what it concerns; it never
 * carries the outcome itself. A candidate reads their result from the
 * application endpoint, where ownership is checked again - so a
 * notification leaking into the wrong list still would not reveal a
 * decision.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {

    private Long id;
    private String type;
    private String title;
    private String message;

    /** What to open. Null for notifications about nothing in particular. */
    private Long applicationId;

    private boolean read;
    private LocalDateTime createdAt;

    public static NotificationDto from(Notification notification) {
        return NotificationDto.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .applicationId(
                        notification.getJobApplication() == null
                                ? null
                                : notification.getJobApplication().getId()
                )
                .read(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
