package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.ContactMessage;
import com.valkyrias.agency.service.ContactService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
public class ContactController {

    private final ContactService contactService;

    public ContactController(ContactService contactService) {
        this.contactService = contactService;
    }

    /**
     * Handles GET request to display the contact form page.
     * Passes a new ContactMessage backing object for Thymeleaf form binding.
     */
    @GetMapping("/contact")
    public String showContactForm(Model model) {
        model.addAttribute("contactMessage", new ContactMessage());
        return "contact"; // renders src/main/resources/templates/contact.html
    }

    /**
     * Handles POST request to process the submitted form data.
     * Saves the contact message entity to the database and redirects to show success.
     */
    @PostMapping("/contact")
    public String submitContactForm(@ModelAttribute("contactMessage") ContactMessage contactMessage, Model model) {
        // Save the entity using the service layer
        contactService.saveContactMessage(contactMessage);
        
        // Add a success message flag to display on the template
        model.addAttribute("success", true);
        
        // Re-inject a clean backing object for future submits
        model.addAttribute("contactMessage", new ContactMessage());
        
        return "contact";
    }
}
