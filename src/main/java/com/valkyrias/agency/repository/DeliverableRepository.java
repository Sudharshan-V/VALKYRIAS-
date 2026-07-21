package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.Deliverable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface DeliverableRepository extends JpaRepository<Deliverable, String> {
    List<Deliverable> findByUserId(UUID userId);
}
