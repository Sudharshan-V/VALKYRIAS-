package com.valkyrias.agency.service;

import com.valkyrias.agency.model.Note;
import com.valkyrias.agency.repository.NoteRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class NoteService {

    private final NoteRepository noteRepository;

    public NoteService(NoteRepository noteRepository) {
        this.noteRepository = noteRepository;
    }

    public List<Note> getNotesByUserId(UUID userId) {
        return noteRepository.findByUserId(userId);
    }

    public Note saveNote(Note note) {
        return noteRepository.save(note);
    }

    public boolean deleteNote(String id) {
        if (noteRepository.existsById(id)) {
            noteRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
