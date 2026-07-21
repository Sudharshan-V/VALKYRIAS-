package com.valkyrias.agency.repository;

import com.valkyrias.agency.model.ContactMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ContactMessageRepository extends JpaRepository<ContactMessage, Long> {

    // Custom query method to find messages sent by a specific email address
    List<ContactMessage> findByEmail(String email);
}
