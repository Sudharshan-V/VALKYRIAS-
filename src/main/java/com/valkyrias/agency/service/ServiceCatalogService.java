package com.valkyrias.agency.service;

import com.valkyrias.agency.dto.domain.DomainDtos;
import com.valkyrias.agency.exception.ResourceNotFoundException;
import com.valkyrias.agency.model.ServiceOffering;
import com.valkyrias.agency.model.ServicePackage;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.ServiceOfferingRepository;
import com.valkyrias.agency.repository.ServicePackageRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class ServiceCatalogService {
    private final ServiceOfferingRepository serviceRepository;
    private final ServicePackageRepository packageRepository;
    private final CurrentUserService currentUserService;
    private final DomainMapper mapper;

    public ServiceCatalogService(
            ServiceOfferingRepository serviceRepository,
            ServicePackageRepository packageRepository,
            CurrentUserService currentUserService,
            DomainMapper mapper
    ) {
        this.serviceRepository = serviceRepository;
        this.packageRepository = packageRepository;
        this.currentUserService = currentUserService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<DomainDtos.ServiceResponse> listActive() {
        return serviceRepository.findByActiveTrueOrderByCategoryAscNameAsc().stream().map(mapper::service).toList();
    }

    @Transactional
    public DomainDtos.ServiceResponse create(SupabaseUserPrincipal principal, DomainDtos.ServiceRequest request) {
        User admin = currentUserService.requireRole(principal, UserRole.ADMIN);
        ServiceOffering service = new ServiceOffering();
        apply(service, request);
        service.setCreatedBy(admin);
        return mapper.service(serviceRepository.saveAndFlush(service));
    }

    @Transactional
    public DomainDtos.ServiceResponse update(
            SupabaseUserPrincipal principal,
            UUID serviceId,
            DomainDtos.ServiceRequest request
    ) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        ServiceOffering service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found"));
        apply(service, request);
        return mapper.service(serviceRepository.saveAndFlush(service));
    }

    @Transactional
    public DomainDtos.ServicePackageResponse addPackage(
            SupabaseUserPrincipal principal,
            UUID serviceId,
            DomainDtos.ServicePackageRequest request
    ) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        ServiceOffering service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found"));
        ServicePackage item = new ServicePackage();
        item.setService(service);
        item.setName(request.name().trim());
        item.setDescription(normalize(request.description()));
        item.setPrice(request.price());
        item.setCurrency(normalizeCurrency(request.currency()));
        item.setDeliveryDays(request.deliveryDays());
        item.setFeatures(mapper.writeStringList(request.features()));
        item.setActive(request.active());
        item.setDisplayOrder(request.displayOrder());
        return mapper.servicePackage(packageRepository.save(item));
    }

    @Transactional
    public DomainDtos.ServicePackageResponse updatePackage(
            SupabaseUserPrincipal principal,
            UUID packageId,
            DomainDtos.ServicePackageRequest request
    ) {
        currentUserService.requireRole(principal, UserRole.ADMIN);
        ServicePackage item = packageRepository.findById(packageId)
                .orElseThrow(() -> new ResourceNotFoundException("Service package not found"));
        item.setName(request.name().trim());
        item.setDescription(normalize(request.description()));
        item.setPrice(request.price());
        item.setCurrency(normalizeCurrency(request.currency()));
        item.setDeliveryDays(request.deliveryDays());
        item.setFeatures(mapper.writeStringList(request.features()));
        item.setActive(request.active());
        item.setDisplayOrder(request.displayOrder());
        return mapper.servicePackage(packageRepository.save(item));
    }

    private void apply(ServiceOffering service, DomainDtos.ServiceRequest request) {
        service.setName(request.name().trim());
        service.setDescription(normalize(request.description()));
        service.setCategory(request.category().trim());
        service.setBasePrice(request.basePrice());
        service.setCurrency(normalizeCurrency(request.currency()));
        service.setDeliveryEstimate(normalize(request.deliveryEstimate()));
        service.setRequiredClientInformation(mapper.writeStringList(request.requiredClientInformation()));
        service.setActive(request.active());
    }

    private static String normalize(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private static String normalizeCurrency(String value) {
        return value == null || value.isBlank() ? "INR" : value.trim().toUpperCase(Locale.ROOT);
    }
}
