const API_BASE_URL = 'http://localhost:8080/api';

/**
 * Spring Boot REST API client service
 */
export async function fetchProjects(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/projects/user/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, falling back to local state:', err);
    return null;
  }
}

export async function saveProject(project: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error saving project to Spring Boot backend:', err);
    return null;
  }
}

export async function fetchActionItems(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/action-items/user/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveActionItem(item: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/action-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function fetchChatMessages(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat-messages/user/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveChatMessage(msg: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat-messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function fetchNotes(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/notes/user/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveNote(note: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function deleteNoteFromApi(id: string) {
  try {
    await fetch(`${API_BASE_URL}/notes/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Error deleting note:', err);
  }
}
