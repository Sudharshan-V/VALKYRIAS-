package com.valkyrias.agency.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.model.*;
import com.valkyrias.agency.repository.ConversationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.List;

@Component
public class DomainMapper {
    private static final TypeReference<List<String>> STRING_LIST = new TypeReference<>() {};

    private final ObjectMapper objectMapper;
    private final ConversationRepository conversationRepository;
    private final String supabaseUrl;
    private final String profileBucket;

    public DomainMapper(
            ObjectMapper objectMapper,
            ConversationRepository conversationRepository,
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.storage.profile-bucket:profile-avatars}") String profileBucket
    ) {
        this.objectMapper = objectMapper;
        this.conversationRepository = conversationRepository;
        this.supabaseUrl = normalizeSupabaseUrl(supabaseUrl);
        this.profileBucket = profileBucket == null ? "profile-avatars" : profileBucket.trim();
    }

    public DomainDtos.ServiceResponse service(ServiceOffering service) {
        return new DomainDtos.ServiceResponse(
                service.getId(), service.getName(), service.getDescription(), service.getCategory(),
                service.getBasePrice(), service.getCurrency(), service.getDeliveryEstimate(),
                readStringList(service.getRequiredClientInformation()), service.isActive(),
                service.getPackages().stream().filter(ServicePackage::isActive).map(this::servicePackage).toList()
        );
    }

    public DomainDtos.ServicePackageResponse servicePackage(ServicePackage item) {
        return new DomainDtos.ServicePackageResponse(
                item.getId(), item.getName(), item.getDescription(), item.getPrice(), item.getCurrency(),
                item.getDeliveryDays(), readStringList(item.getFeatures())
        );
    }

    public DomainDtos.OrderResponse order(ProjectOrder order) {
        User editor = order.getAssignedEditor();
        ServiceOffering service = order.getService();
        ServicePackage servicePackage = order.getServicePackage();
        return new DomainDtos.OrderResponse(
                order.getId(), order.getClient().getId(), order.getClient().getName(),
                editor == null ? null : editor.getId(), editor == null ? null : editor.getName(),
                service == null ? null : service.getId(), service == null ? null : service.getName(),
                servicePackage == null ? null : servicePackage.getId(),
                servicePackage == null ? null : servicePackage.getName(),
                order.getTitle(), order.getRequirements(), order.getStatus(), order.getBudget(),
                order.getCurrency(), order.getProgress(), order.getDeadline(), order.getSubmittedAt(),
                order.getCompletedAt(), order.getCreatedAt(), order.getUpdatedAt(), order.getVersion(),
                conversationRepository.findByOrderId(order.getId()).map(Conversation::getId).orElse(null)
        );
    }

    public DomainDtos.AssignmentResponse assignment(OrderAssignment assignment) {
        return new DomainDtos.AssignmentResponse(
                assignment.getId(), assignment.getOrder().getId(), assignment.getOrder().getTitle(),
                assignment.getEditor().getId(), assignment.getEditor().getName(),
                assignment.getAssignedBy().getId(), assignment.getStatus(), assignment.getResponseNote(),
                assignment.getAssignedAt(), assignment.getRespondedAt()
        );
    }

    public DomainDtos.MessageResponse message(ConversationMessage message) {
        return new DomainDtos.MessageResponse(
                message.getId(), message.getConversation().getId(), message.getSender().getId(),
                message.getSender().getName(), avatarUrl(message.getSender()), message.getContent(), message.getMessageType(),
                message.getCreatedAt(), message.getEditedAt(), message.getClientRequestId()
        );
    }

    public DomainDtos.FileResponse file(FileRecord file) {
        return new DomainDtos.FileResponse(
                file.getId(), file.getOrder().getId(), file.getUploadedBy().getId(), file.getUploadedBy().getName(),
                file.getOriginalFilename(), file.getContentType(), file.getSizeBytes(), file.getCategory(), file.getCreatedAt()
        );
    }

    public DomainDtos.NotificationResponse notification(UserNotification notification) {
        return new DomainDtos.NotificationResponse(
                notification.getId(), notification.getType(), notification.getTitle(), notification.getBody(),
                notification.getRelatedEntityType(), notification.getRelatedEntityId(),
                notification.getReadAt(), notification.getCreatedAt()
        );
    }

    public DomainDtos.PaymentResponse payment(Payment payment) {
        return new DomainDtos.PaymentResponse(
                payment.getId(), payment.getOrder().getId(), payment.getAmount(),
                payment.getOrderAmount(), payment.getDepositAmount(), payment.getDiscountAmount(),
                payment.getGstAmount(), payment.getCouponCode(), payment.getCurrency(),
                payment.getProvider(), payment.getProviderOrderId(), payment.getProviderPaymentId(),
                payment.getStatus(), payment.getCreatedAt(), payment.getPaidAt(), null
        );
    }

    public DomainDtos.OrderEventResponse event(OrderEvent event) {
        return new DomainDtos.OrderEventResponse(
                event.getId(), event.getActor() == null ? null : event.getActor().getId(),
                event.getActor() == null ? "System" : event.getActor().getName(), event.getEventType(),
                event.getFromStatus(), event.getToStatus(), event.getDetails(), event.getCreatedAt()
        );
    }

    public String writeStringList(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values == null ? List.of() : values);
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("The list could not be serialized", exception);
        }
    }

    private String avatarUrl(User user) {
        if (user == null || !StringUtils.hasText(user.getProfileImagePath())
                || !StringUtils.hasText(supabaseUrl) || !StringUtils.hasText(profileBucket)) {
            return null;
        }

        UriComponentsBuilder builder = UriComponentsBuilder
                .fromUriString(supabaseUrl + "/storage/v1/object/public")
                .pathSegment(profileBucket);
        Arrays.stream(user.getProfileImagePath().split("/"))
                .filter(StringUtils::hasText)
                .forEach(builder::pathSegment);
        return builder.build().encode().toUriString();
    }

    private static String normalizeSupabaseUrl(String rawUrl) {
        if (!StringUtils.hasText(rawUrl)) {
            return "";
        }
        String value = rawUrl.trim();
        while (value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        if (value.endsWith("/rest/v1")) {
            value = value.substring(0, value.length() - "/rest/v1".length());
        }
        return value;
    }

    private List<String> readStringList(String json) {
        try {
            return json == null || json.isBlank() ? List.of() : objectMapper.readValue(json, STRING_LIST);
        } catch (JsonProcessingException exception) {
            return List.of();
        }
    }
}
