package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.model.FileCategory;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.OrderFileService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
public class OrderFileController {
    private final OrderFileService service;

    public OrderFileController(OrderFileService service) { this.service = service; }

    @GetMapping("/api/orders/{orderId}/files")
    public List<DomainDtos.FileResponse> list(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId
    ) { return service.list(principal, orderId); }

    @PostMapping(value = "/api/orders/{orderId}/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public DomainDtos.FileResponse upload(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID orderId,
            @RequestParam FileCategory category,
            @RequestPart("file") MultipartFile file
    ) { return service.upload(principal, orderId, category, file); }

    @GetMapping("/api/files/{fileId}/download")
    public DomainDtos.FileDownloadResponse download(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID fileId
    ) { return service.download(principal, fileId); }

    @DeleteMapping("/api/files/{fileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID fileId
    ) { service.delete(principal, fileId); }
}
