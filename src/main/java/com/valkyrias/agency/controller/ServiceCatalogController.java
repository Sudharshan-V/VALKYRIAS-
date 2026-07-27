package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.service.ServiceCatalogService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/services")
public class ServiceCatalogController {
    private final ServiceCatalogService service;

    public ServiceCatalogController(ServiceCatalogService service) { this.service = service; }

    @GetMapping
    public List<DomainDtos.ServiceResponse> list() { return service.listActive(); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DomainDtos.ServiceResponse create(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @Valid @RequestBody DomainDtos.ServiceRequest request
    ) { return service.create(principal, request); }

    @PutMapping("/{serviceId}")
    public DomainDtos.ServiceResponse update(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID serviceId,
            @Valid @RequestBody DomainDtos.ServiceRequest request
    ) { return service.update(principal, serviceId, request); }

    @PostMapping("/{serviceId}/packages")
    @ResponseStatus(HttpStatus.CREATED)
    public DomainDtos.ServicePackageResponse addPackage(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID serviceId,
            @Valid @RequestBody DomainDtos.ServicePackageRequest request
    ) { return service.addPackage(principal, serviceId, request); }

    @PutMapping("/packages/{packageId}")
    public DomainDtos.ServicePackageResponse updatePackage(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @PathVariable UUID packageId,
            @Valid @RequestBody DomainDtos.ServicePackageRequest request
    ) { return service.updatePackage(principal, packageId, request); }
}
