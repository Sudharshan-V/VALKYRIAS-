package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.OrderReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrderReviewRepository extends JpaRepository<OrderReview, UUID> {
    Optional<OrderReview> findByOrderId(UUID orderId);
}
