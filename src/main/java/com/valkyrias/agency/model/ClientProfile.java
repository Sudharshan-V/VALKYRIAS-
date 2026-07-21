package com.valkyrias.agency.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "client_profiles")
public class ClientProfile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "company_name", length = 150)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "client_type", length = 30)
    private ClientType clientType;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_communication", length = 30)
    private PreferredCommunication preferredCommunication;

    @Column(name = "default_project_category", length = 100)
    private String defaultProjectCategory;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public ClientProfile() {
    }

    public ClientProfile(User user) {
        this.user = user;
    }

    public UUID getUserId() { return userId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public ClientType getClientType() { return clientType; }
    public void setClientType(ClientType clientType) { this.clientType = clientType; }
    public PreferredCommunication getPreferredCommunication() { return preferredCommunication; }
    public void setPreferredCommunication(PreferredCommunication preferredCommunication) { this.preferredCommunication = preferredCommunication; }
    public String getDefaultProjectCategory() { return defaultProjectCategory; }
    public void setDefaultProjectCategory(String defaultProjectCategory) { this.defaultProjectCategory = defaultProjectCategory; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
