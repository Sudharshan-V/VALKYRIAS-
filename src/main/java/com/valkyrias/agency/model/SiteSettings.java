package com.valkyrias.agency.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.OffsetDateTime;

@Entity
@Table(name = "site_settings")
public class SiteSettings {
    @Id
    @Column(length = 32)
    private String id;

    @Column(name = "brand_description", columnDefinition = "TEXT")
    private String brandDescription;

    @Column(name = "website_url", length = 1000)
    private String websiteUrl;

    @Column(name = "instagram_url", length = 1000)
    private String instagramUrl;

    @Column(name = "youtube_url", length = 1000)
    private String youtubeUrl;

    @Column(name = "vimeo_url", length = 1000)
    private String vimeoUrl;

    @Column(name = "support_email", length = 320)
    private String supportEmail;

    @Column(name = "privacy_email", length = 320)
    private String privacyEmail;

    @Column(name = "contact_phone", length = 80)
    private String contactPhone;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "privacy_policy", columnDefinition = "TEXT")
    private String privacyPolicy;

    @Column(name = "terms_conditions", columnDefinition = "TEXT")
    private String termsConditions;

    @Column(name = "effective_date", length = 80)
    private String effectiveDate;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();

    public SiteSettings() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getBrandDescription() { return brandDescription; }
    public void setBrandDescription(String brandDescription) { this.brandDescription = brandDescription; }
    public String getWebsiteUrl() { return websiteUrl; }
    public void setWebsiteUrl(String websiteUrl) { this.websiteUrl = websiteUrl; }
    public String getInstagramUrl() { return instagramUrl; }
    public void setInstagramUrl(String instagramUrl) { this.instagramUrl = instagramUrl; }
    public String getYoutubeUrl() { return youtubeUrl; }
    public void setYoutubeUrl(String youtubeUrl) { this.youtubeUrl = youtubeUrl; }
    public String getVimeoUrl() { return vimeoUrl; }
    public void setVimeoUrl(String vimeoUrl) { this.vimeoUrl = vimeoUrl; }
    public String getSupportEmail() { return supportEmail; }
    public void setSupportEmail(String supportEmail) { this.supportEmail = supportEmail; }
    public String getPrivacyEmail() { return privacyEmail; }
    public void setPrivacyEmail(String privacyEmail) { this.privacyEmail = privacyEmail; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPrivacyPolicy() { return privacyPolicy; }
    public void setPrivacyPolicy(String privacyPolicy) { this.privacyPolicy = privacyPolicy; }
    public String getTermsConditions() { return termsConditions; }
    public void setTermsConditions(String termsConditions) { this.termsConditions = termsConditions; }
    public String getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(String effectiveDate) { this.effectiveDate = effectiveDate; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(OffsetDateTime updatedAt) { this.updatedAt = updatedAt; }
}
