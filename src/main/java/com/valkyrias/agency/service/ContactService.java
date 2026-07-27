package com.valkyrias.agency.service;

import com.valkyrias.agency.model.ContactMessage;
import com.valkyrias.agency.repository.ContactMessageRepository;
import org.springframework.stereotype.Service;

@Service
public class ContactService {

    private final ContactMessageRepository contactMessageRepository;

    public ContactService(ContactMessageRepository contactMessageRepository) {
        this.contactMessageRepository = contactMessageRepository;
    }

    public ContactMessage saveContactMessage(ContactMessage message) {
        return contactMessageRepository.save(message);
    }
}
