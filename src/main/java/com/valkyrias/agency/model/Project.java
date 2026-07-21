package com.valkyrias.agency.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String title;

    private String client;
    private String editor;
    private BigDecimal budget = BigDecimal.ZERO;
    private BigDecimal progress = BigDecimal.ZERO;

    @Column(name = "status")
    private String status = "Active";

    @Column(name = "version")
    private String version = "v1.0";

    private String deadline;
    private String storage;
    private String category;
    private String thumbnail;

    @Column(columnDefinition = "jsonb")
    private String contributors = "[]";

    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public Project() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getClient() { return client; }
    public void setClient(String client) { this.client = client; }

    public String getEditor() { return editor; }
    public void setEditor(String editor) { this.editor = editor; }

    public BigDecimal getBudget() { return budget; }
    public void setBudget(BigDecimal budget) { this.budget = budget; }

    public BigDecimal getProgress() { return progress; }
    public void setProgress(BigDecimal progress) { this.progress = progress; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public String getDeadline() { return deadline; }
    public void setDeadline(String deadline) { this.deadline = deadline; }

    public String getStorage() { return storage; }
    public void setStorage(String storage) { this.storage = storage; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getThumbnail() { return thumbnail; }
    public void setThumbnail(String thumbnail) { this.thumbnail = thumbnail; }

    public String getContributors() { return contributors; }
    public void setContributors(String contributors) { this.contributors = contributors; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
