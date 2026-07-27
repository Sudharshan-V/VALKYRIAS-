package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.Project;
import com.valkyrias.agency.repository.ProjectRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.CurrentUserService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectRepository projectRepository;
    private final CurrentUserService currentUserService;

    public ProjectController(ProjectRepository projectRepository, CurrentUserService currentUserService) {
        this.projectRepository = projectRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<Project>> getProjectsByUser(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return ResponseEntity.ok(projectRepository.findByUserId(currentUserService.require(principal).getId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable String id) {
        return projectRepository.findById(id)
                .filter(item -> currentUserService.require(principal).getId().equals(item.getUserId()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Project> saveProject(@AuthenticationPrincipal SupabaseUserPrincipal principal, @RequestBody Project project) {
        project.setId(UUID.randomUUID().toString());
        project.setUserId(currentUserService.require(principal).getId());
        return ResponseEntity.ok(projectRepository.save(project));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable String id) {
        Project item = projectRepository.findById(id).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        if (!currentUserService.require(principal).getId().equals(item.getUserId())) throw new AccessDeniedException("You do not own this legacy project");
        projectRepository.delete(item);
        return ResponseEntity.noContent().build();
    }
}
