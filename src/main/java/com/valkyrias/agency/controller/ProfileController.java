package com.valkyrias.agency.controller;

import com.valkyrias.agency.dto.profile.ProfileResponse;
import com.valkyrias.agency.dto.profile.ProfileUpdateRequest;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.service.ProfileService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/me")
    public ProfileResponse getMyProfile(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestHeader(value = "X-Requested-Role", required = false) UserRole selectedRole
    ) {
        return profileService.getMyProfile(principal, selectedRole);
    }

    @PutMapping("/me")
    public ProfileResponse updateMyProfile(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @Valid @org.springframework.web.bind.annotation.RequestBody ProfileUpdateRequest request
    ) {
        return profileService.updateMyProfile(principal, request);
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProfileResponse uploadMyAvatar(
            @AuthenticationPrincipal SupabaseUserPrincipal principal,
            @RequestPart("file") MultipartFile file
    ) {
        return profileService.uploadMyAvatar(principal, file);
    }

    @DeleteMapping("/me/avatar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMyAvatar(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        profileService.deleteMyAvatar(principal);
    }
}
