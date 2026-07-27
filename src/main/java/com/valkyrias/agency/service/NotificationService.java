package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.ResourceNotFoundException;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserNotification;
import com.valkyrias.agency.repository.UserNotificationRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class NotificationService {
    private final UserNotificationRepository repository;
    private final CurrentUserService currentUserService;
    private final DomainMapper mapper;

    public NotificationService(UserNotificationRepository repository, CurrentUserService currentUserService, DomainMapper mapper) {
        this.repository = repository;
        this.currentUserService = currentUserService;
        this.mapper = mapper;
    }

    @Transactional
    public UserNotification create(User user, String type, String title, String body, String entityType, UUID entityId) {
        UserNotification notification = new UserNotification();
        notification.setUser(user);
        notification.setType(type);
        notification.setTitle(title);
        notification.setBody(body);
        notification.setRelatedEntityType(entityType);
        notification.setRelatedEntityId(entityId);
        return repository.save(notification);
    }

    @Transactional(readOnly = true)
    public DomainDtos.PageResponse<DomainDtos.NotificationResponse> list(SupabaseUserPrincipal principal, int page, int size) {
        User user = currentUserService.require(principal);
        int safeSize = Math.min(Math.max(size, 1), 100);
        var result = repository.findByUserIdOrderByCreatedAtDesc(
                user.getId(), PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return new DomainDtos.PageResponse<>(result.map(mapper::notification).getContent(), result.getNumber(),
                result.getSize(), result.getTotalElements(), result.getTotalPages(), result.isLast());
    }

    @Transactional
    public DomainDtos.NotificationResponse markRead(SupabaseUserPrincipal principal, UUID notificationId) {
        User user = currentUserService.require(principal);
        UserNotification notification = repository.findByIdAndUserId(notificationId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (notification.getReadAt() == null) {
            notification.setReadAt(OffsetDateTime.now());
        }
        return mapper.notification(repository.save(notification));
    }

    @Transactional(readOnly = true)
    public long unreadCount(User user) { return repository.countByUserIdAndReadAtIsNull(user.getId()); }
}
