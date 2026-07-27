package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.Payment;
import com.valkyrias.agency.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findByOrderIdOrderByCreatedAtDesc(UUID orderId);
    Optional<Payment> findFirstByOrderIdAndStatusOrderByCreatedAtDesc(UUID orderId, PaymentStatus status);
    long countByStatus(PaymentStatus status);

    @Query("select coalesce(sum(p.amount),0) from Payment p where p.status=:status")
    BigDecimal sumAmountByStatus(@Param("status") PaymentStatus status);

    @Query("select coalesce(sum(p.amount),0) from Payment p where p.client.id=:clientId and p.status=:status")
    BigDecimal sumAmountByClientAndStatus(@Param("clientId") UUID clientId, @Param("status") PaymentStatus status);

    @Query("select coalesce(sum(coalesce(p.depositAmount,p.amount)),0) from Payment p where p.client.id=:clientId and p.status=:status")
    BigDecimal sumDepositPrincipalByClientAndStatus(@Param("clientId") UUID clientId, @Param("status") PaymentStatus status);
}
