package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.OrderStatus;
import com.valkyrias.agency.model.ProjectOrder;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectOrderRepository extends JpaRepository<ProjectOrder, UUID> {
    @EntityGraph(attributePaths = {"client", "assignedEditor", "service", "servicePackage"})
    List<ProjectOrder> findByClientIdOrderByUpdatedAtDesc(UUID clientId);

    @EntityGraph(attributePaths = {"client", "assignedEditor", "service", "servicePackage"})
    List<ProjectOrder> findByAssignedEditorIdOrderByUpdatedAtDesc(UUID editorId);

    @EntityGraph(attributePaths = {"client", "assignedEditor", "service", "servicePackage"})
    List<ProjectOrder> findAllByOrderByUpdatedAtDesc();

    @EntityGraph(attributePaths = {"client", "assignedEditor", "service", "servicePackage"})
    List<ProjectOrder> findTop10ByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"client", "assignedEditor", "service", "servicePackage"})
    @Query("select o from ProjectOrder o where o.id=:id")
    Optional<ProjectOrder> findDetailedById(@Param("id") UUID id);

    long countByStatusIn(Collection<OrderStatus> statuses);
    long countByStatus(OrderStatus status);
    long countByClientId(UUID clientId);
    long countByAssignedEditorId(UUID editorId);
    long countByAssignedEditorIdAndStatusIn(UUID editorId, Collection<OrderStatus> statuses);
}
