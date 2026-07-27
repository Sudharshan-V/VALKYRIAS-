package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.User;
import com.valkyrias.agency.model.AccountStatus;
import com.valkyrias.agency.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findBySupabaseUserId(UUID supabaseUserId);
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);
    long countByRole(UserRole role);
    long countByRoleAndAccountStatus(UserRole role, AccountStatus accountStatus);
    List<User> findTop10ByOrderByCreatedAtDesc();
    List<User> findByRoleAndAccountStatusOrderByNameAsc(UserRole role, AccountStatus accountStatus);
}
