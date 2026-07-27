package com.valkyrias.agency.controller;

import com.valkyrias.agency.model.Note;
import com.valkyrias.agency.repository.NoteRepository;
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
@RequestMapping("/api/notes")
public class NoteController {

    private final NoteRepository noteRepository;
    private final CurrentUserService currentUserService;

    public NoteController(NoteRepository noteRepository, CurrentUserService currentUserService) {
        this.noteRepository = noteRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<Note>> getNotesByUser(@AuthenticationPrincipal SupabaseUserPrincipal principal) {
        return ResponseEntity.ok(noteRepository.findByUserId(currentUserService.require(principal).getId()));
    }

    @PostMapping
    public ResponseEntity<Note> saveNote(@AuthenticationPrincipal SupabaseUserPrincipal principal, @RequestBody Note note) {
        note.setId(UUID.randomUUID().toString());
        note.setUserId(currentUserService.require(principal).getId());
        return ResponseEntity.ok(noteRepository.save(note));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@AuthenticationPrincipal SupabaseUserPrincipal principal, @PathVariable String id) {
        Note item = noteRepository.findById(id).orElse(null);
        if (item == null) return ResponseEntity.notFound().build();
        if (!currentUserService.require(principal).getId().equals(item.getUserId())) throw new AccessDeniedException("You do not own this note");
        noteRepository.delete(item);
        return ResponseEntity.noContent().build();
    }
}
