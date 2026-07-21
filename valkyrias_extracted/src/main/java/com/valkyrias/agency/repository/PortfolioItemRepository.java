package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.PortfolioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface PortfolioItemRepository extends JpaRepository<PortfolioItem, String> {
    List<PortfolioItem> findByUserId(UUID userId);
}
