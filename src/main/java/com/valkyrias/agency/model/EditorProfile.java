package com.valkyrias.agency.model;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
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

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "editor_profiles")
public class EditorProfile {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "professional_title", length = 120)
    private String professionalTitle;

    @Column(name = "experience_years")
    private Integer experienceYears;

    @ElementCollection
    @CollectionTable(name = "editor_profile_skills", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "skill", nullable = false, length = 80)
    private Set<String> skills = new LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "editor_profile_software", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "software", nullable = false, length = 80)
    private Set<String> softwareUsed = new LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "editor_profile_languages", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "language", nullable = false, length = 80)
    private Set<String> languages = new LinkedHashSet<>();

    @ElementCollection
    @CollectionTable(name = "editor_profile_certifications", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "certification", nullable = false, length = 150)
    private Set<String> certifications = new LinkedHashSet<>();

    @Column(name = "starting_price", precision = 14, scale = 2)
    private BigDecimal startingPrice;

    @Column(name = "hourly_rate", precision = 14, scale = 2)
    private BigDecimal hourlyRate;

    @Column(name = "delivery_time", length = 100)
    private String deliveryTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability_status", length = 30)
    private AvailabilityStatus availabilityStatus;

    @Column(name = "portfolio_summary", length = 3000)
    private String portfolioSummary;

    @Column(length = 150)
    private String location;

    @Column(name = "website_url", length = 2048)
    private String websiteUrl;

    @Column(name = "instagram_url", length = 2048)
    private String instagramUrl;

    @Column(name = "linkedin_url", length = 2048)
    private String linkedinUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public EditorProfile() {
    }

    public EditorProfile(User user) {
        this.user = user;
    }

    public UUID getUserId() { return userId; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getProfessionalTitle() { return professionalTitle; }
    public void setProfessionalTitle(String professionalTitle) { this.professionalTitle = professionalTitle; }
    public Integer getExperienceYears() { return experienceYears; }
    public void setExperienceYears(Integer experienceYears) { this.experienceYears = experienceYears; }
    public Set<String> getSkills() { return skills; }
    public void setSkills(Set<String> values) { replace(this.skills, values); }
    public Set<String> getSoftwareUsed() { return softwareUsed; }
    public void setSoftwareUsed(Set<String> values) { replace(this.softwareUsed, values); }
    public Set<String> getLanguages() { return languages; }
    public void setLanguages(Set<String> values) { replace(this.languages, values); }
    public Set<String> getCertifications() { return certifications; }
    public void setCertifications(Set<String> values) { replace(this.certifications, values); }
    public BigDecimal getStartingPrice() { return startingPrice; }
    public void setStartingPrice(BigDecimal startingPrice) { this.startingPrice = startingPrice; }
    public BigDecimal getHourlyRate() { return hourlyRate; }
    public void setHourlyRate(BigDecimal hourlyRate) { this.hourlyRate = hourlyRate; }
    public String getDeliveryTime() { return deliveryTime; }
    public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }
    public AvailabilityStatus getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(AvailabilityStatus availabilityStatus) { this.availabilityStatus = availabilityStatus; }
    public String getPortfolioSummary() { return portfolioSummary; }
    public void setPortfolioSummary(String portfolioSummary) { this.portfolioSummary = portfolioSummary; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String websiteUrl) { this.websiteUrl = websiteUrl; }
    public String getInstagramUrl() { return instagramUrl; }
    public void setInstagramUrl(String instagramUrl) { this.instagramUrl = instagramUrl; }
    public String getLinkedinUrl() { return linkedinUrl; }
    public void setLinkedinUrl(String linkedinUrl) { this.linkedinUrl = linkedinUrl; }
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

    private static void replace(Set<String> target, Set<String> values) {
        target.clear();
        if (values != null) {
            target.addAll(values);
        }
    }
}
