package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.model.*;
import com.valkyrias.agency.repository.*;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.EnumSet;
import java.util.List;

@Service
public class DashboardService {

    private final ProjectOrderRepository orderRepository;
    private final OrderAssignmentRepository assignmentRepository;
    private final UserNotificationRepository notificationRepository;
    private final PaymentRepository paymentRepository;
    private final OrderEventRepository eventRepository;
    private final UserRepository userRepository;
    private final ContactMessageRepository contactMessageRepository;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;
    private final DomainMapper mapper;

    public DashboardService(
            ProjectOrderRepository orderRepository,
            OrderAssignmentRepository assignmentRepository,
            UserNotificationRepository notificationRepository,
            PaymentRepository paymentRepository,
            OrderEventRepository eventRepository,
            UserRepository userRepository,
            ContactMessageRepository contactMessageRepository,
            CurrentUserService currentUserService,
            NotificationService notificationService,
            DomainMapper mapper
    ) {
        this.orderRepository = orderRepository;
        this.assignmentRepository = assignmentRepository;
        this.notificationRepository = notificationRepository;
        this.paymentRepository = paymentRepository;
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.contactMessageRepository = contactMessageRepository;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public DomainDtos.PortalDashboardResponse client(
            SupabaseUserPrincipal principal
    ) {
        User user = currentUserService.requireRole(
                principal,
                UserRole.CLIENT
        );

        List<ProjectOrder> orders =
                orderRepository.findByClientIdOrderByUpdatedAtDesc(
                        user.getId()
                );

        return portal(
                user,
                orders,
                List.of(),
                true
        );
    }

    @Transactional(readOnly = true)
    public DomainDtos.PortalDashboardResponse editor(
            SupabaseUserPrincipal principal
    ) {
        User user = currentUserService.requireRole(
                principal,
                UserRole.EDITOR
        );

        List<ProjectOrder> orders =
                orderRepository.findByAssignedEditorIdOrderByUpdatedAtDesc(
                        user.getId()
                );

        List<OrderAssignment> invitations =
                assignmentRepository
                        .findByEditorIdAndStatusOrderByAssignedAtDesc(
                                user.getId(),
                                AssignmentStatus.PENDING
                        );

        return portal(
                user,
                orders,
                invitations,
                false
        );
    }

    @Transactional(readOnly = true)
    public DomainDtos.AdminDashboardResponse admin(
            SupabaseUserPrincipal principal
    ) {
        currentUserService.requireRole(
                principal,
                UserRole.ADMIN
        );

        EnumSet<OrderStatus> active =
                EnumSet.copyOf(
                        OrderService.activeStatuses()
                );

        long pending =
                orderRepository.countByStatusIn(
                        EnumSet.of(
                                OrderStatus.SUBMITTED,
                                OrderStatus.UNDER_REVIEW,
                                OrderStatus.EDITOR_ASSIGNED
                        )
                );

        return new DomainDtos.AdminDashboardResponse(
                userRepository.count(),

                userRepository.countByRole(
                        UserRole.CLIENT
                ),

                userRepository.countByRole(
                        UserRole.EDITOR
                ),

                userRepository.countByRoleAndAccountStatus(
                        UserRole.EDITOR,
                        AccountStatus.PENDING_APPROVAL
                ),

                orderRepository.count(),

                orderRepository.countByStatusIn(
                        active
                ),

                pending,

                orderRepository.countByStatus(
                        OrderStatus.COMPLETED
                ),

                orderRepository.countByStatus(
                        OrderStatus.CANCELLED
                ),

                paymentRepository.sumAmountByStatus(
                        PaymentStatus.PAID
                ),

                orderRepository
                        .findTop10ByOrderByCreatedAtDesc()
                        .stream()
                        .map(mapper::order)
                        .toList(),

                userRepository
                        .findTop10ByOrderByCreatedAtDesc()
                        .stream()
                        .map(DashboardService::adminUser)
                        .toList(),

                eventRepository
                        .findTop50ByOrderByCreatedAtDesc()
                        .stream()
                        .map(mapper::event)
                        .toList(),

                contactMessageRepository
                        .findTop10ByOrderBySubmittedAtDesc()
                        .stream()
                        .map(message ->
                                new DomainDtos.AdminContactMessageResponse(
                                        message.getId(),
                                        message.getName(),
                                        message.getEmail(),
                                        message.getSubject(),
                                        message.getMessage(),
                                        message.getSubmittedAt()
                                )
                        )
                        .toList(),

                new DomainDtos.PaymentStatusSummary(
                        paymentRepository.countByStatus(
                                PaymentStatus.PENDING
                        ),

                        paymentRepository.countByStatus(
                                PaymentStatus.REQUIRES_ACTION
                        ),

                        paymentRepository.countByStatus(
                                PaymentStatus.PAID
                        ),

                        paymentRepository.countByStatus(
                                PaymentStatus.FAILED
                        ),

                        paymentRepository.countByStatus(
                                PaymentStatus.REFUNDED
                        ),

                        paymentRepository.countByStatus(
                                PaymentStatus.CANCELLED
                        )
                )
        );
    }

    private DomainDtos.PortalDashboardResponse portal(
            User user,
            List<ProjectOrder> orders,
            List<OrderAssignment> assignments,
            boolean includePayments
    ) {
        var recentNotifications =
                notificationRepository
                        .findByUserIdOrderByCreatedAtDesc(
                                user.getId(),
                                PageRequest.of(0, 20)
                        )
                        .getContent()
                        .stream()
                        .map(mapper::notification)
                        .toList();

        long active =
                orders.stream()
                        .filter(order ->
                                OrderService
                                        .activeStatuses()
                                        .contains(order.getStatus())
                        )
                        .count();

        long completed =
                orders.stream()
                        .filter(order ->
                                order.getStatus()
                                        == OrderStatus.COMPLETED
                        )
                        .count();

        BigDecimal paid =
                includePayments
                        ? paymentRepository
                                .sumAmountByClientAndStatus(
                                        user.getId(),
                                        PaymentStatus.PAID
                                )
                        : BigDecimal.ZERO;

        BigDecimal paidPrincipal =
                includePayments
                        ? paymentRepository
                                .sumDepositPrincipalByClientAndStatus(
                                        user.getId(),
                                        PaymentStatus.PAID
                                )
                        : BigDecimal.ZERO;

        /*
         * Calculate the contract value directly from all
         * non-cancelled client orders.
         *
         * This works even before a checkout/payment record exists.
         */
        BigDecimal contractTotal =
                includePayments
                        ? orders.stream()
                                .filter(order ->
                                        order.getStatus()
                                                != OrderStatus.CANCELLED
                                )
                                .map(order ->
                                        order.getBudget() == null
                                                ? BigDecimal.ZERO
                                                : order.getBudget()
                                )
                                .reduce(
                                        BigDecimal.ZERO,
                                        BigDecimal::add
                                )
                        : BigDecimal.ZERO;

        /*
         * Outstanding amount:
         *
         * total order value minus the settled deposit principal. GST is a tax
         * receipt and coupon value settles part of the deposit obligation, so
         * neither may distort the remaining contract principal.
         *
         * The result cannot be below zero.
         */
        BigDecimal outstanding =
                includePayments
                        ? contractTotal
                                .subtract(paidPrincipal)
                                .max(BigDecimal.ZERO)
                        : BigDecimal.ZERO;

        return new DomainDtos.PortalDashboardResponse(
                orders.stream()
                        .map(mapper::order)
                        .toList(),

                assignments.stream()
                        .map(mapper::assignment)
                        .toList(),

                recentNotifications,

                notificationService.unreadCount(
                        user
                ),

                paid,

                outstanding,

                active,

                completed
        );
    }

    static DomainDtos.AdminUserResponse adminUser(
            User user
    ) {
        return new DomainDtos.AdminUserResponse(
                user.getId(),
                user.getSupabaseUserId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getAccountStatus(),
                user.getCreatedAt()
        );
    }
}
