package com.valkyrias.agency.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "app_settings")
public class AppSetting {

    @Id
    private UUID id;

    @Column(name = "total_contract", nullable = false)
    private BigDecimal totalContract = BigDecimal.valueOf(1240000);

    @Column(name = "paid_to_date", nullable = false)
    private BigDecimal paidToDate = BigDecimal.valueOf(790000);

    @Column(name = "next_invoice", nullable = false)
    private BigDecimal nextInvoice = BigDecimal.valueOf(450000);

    @Column(name = "active_plan")
    private String activePlan;

    @Column(name = "storage_used", nullable = false)
    private BigDecimal storageUsed = BigDecimal.valueOf(1.2);

    @Column(name = "storage_total", nullable = false)
    private BigDecimal storageTotal = BigDecimal.valueOf(2.0);

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public AppSetting() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public BigDecimal getTotalContract() { return totalContract; }
    public void setTotalContract(BigDecimal totalContract) { this.totalContract = totalContract; }

    public BigDecimal getPaidToDate() { return paidToDate; }
    public void setPaidToDate(BigDecimal paidToDate) { this.paidToDate = paidToDate; }

    public BigDecimal getNextInvoice() { return nextInvoice; }
    public void setNextInvoice(BigDecimal nextInvoice) { this.nextInvoice = nextInvoice; }

    public String getActivePlan() { return activePlan; }
    public void setActivePlan(String activePlan) { this.activePlan = activePlan; }

    public BigDecimal getStorageUsed() { return storageUsed; }
    public void setStorageUsed(BigDecimal storageUsed) { this.storageUsed = storageUsed; }

    public BigDecimal getStorageTotal() { return storageTotal; }
    public void setStorageTotal(BigDecimal storageTotal) { this.storageTotal = storageTotal; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
