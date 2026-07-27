package com.valkyrias.agency.service;

import com.valkyrias.agency.exception.ResourceNotFoundException;
import com.valkyrias.agency.model.AccountStatus;
import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.UserRole;
import com.valkyrias.agency.repository.UserRepository;
import com.valkyrias.agency.security.SupabaseUserPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CurrentUserService {
    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public User require(SupabaseUserPrincipal principal) {
        if (principal == null) {
            throw new AccessDeniedException("An authenticated Supabase user is required");
        }
        User user = userRepository.findBySupabaseUserId(principal.userId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No application profile exists for this Supabase account. Load /api/profile/me first."
                ));
        if (user.getAccountStatus() != AccountStatus.ACTIVE) {
            throw new AccessDeniedException("This account is not active");
        }
        return user;
    }

    public User requireRole(SupabaseUserPrincipal principal, UserRole... allowed) {
        User user = require(principal);
        for (UserRole role : allowed) {
            if (user.getRole() == role) {
                return user;
            }
        }
        throw new AccessDeniedException("This operation is not permitted for your role");
    }
}
