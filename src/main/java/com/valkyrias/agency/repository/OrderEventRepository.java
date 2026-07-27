package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.OrderEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrderEventRepository extends JpaRepository<OrderEvent, UUID> {
    List<OrderEvent> findTop100ByOrderIdOrderByCreatedAtDesc(UUID orderId);
    List<OrderEvent> findTop50ByOrderByCreatedAtDesc();
}
