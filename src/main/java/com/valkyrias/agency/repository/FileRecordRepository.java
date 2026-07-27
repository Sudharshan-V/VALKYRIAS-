package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.FileRecord;
import com.valkyrias.agency.model.FileCategory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FileRecordRepository extends JpaRepository<FileRecord, UUID> {
    @EntityGraph(attributePaths = {"uploadedBy", "order"})
    List<FileRecord> findByOrderIdAndDeletedAtIsNullOrderByCreatedAtDesc(UUID orderId);

    @EntityGraph(attributePaths = {"uploadedBy", "order", "order.client", "order.assignedEditor"})
    @Query("select f from FileRecord f where f.id=:id")
    Optional<FileRecord> findDetailedById(@Param("id") UUID id);

    boolean existsByOrderIdAndCategoryAndDeletedAtIsNull(UUID orderId, FileCategory category);
}
