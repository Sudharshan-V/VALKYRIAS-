const API_BASE_URL = '/api'; // Uses the same port/origin or proxied path, works perfectly!

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('valkyrias_jwt_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * AUTH APIs
 */
export async function login(payload: any) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Login failed');
  }
  return await res.json();
}

export async function register(payload: any) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Registration failed');
  }
  return await res.json();
}

export async function forgotPassword(payload: any) {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Forgot password request failed');
  }
  return await res.json();
}

export async function resetPassword(payload: any) {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Reset password request failed');
  }
  return await res.json();
}

/**
 * PROJECTS APIs
 */
export async function fetchProjects(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/projects/user/${userId}`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Backend projects fetch unavailable:', err);
    return null;
  }
}

export async function saveProject(project: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(project),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Error saving project:', err);
    return null;
  }
}

export async function deleteProject(id: string) {
  try {
    await fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (err) {
    console.error('Error deleting project:', err);
  }
}

/**
 * ACTION ITEMS APIs
 */
export async function fetchActionItems(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/action-items/user/${userId}`, {
      headers: getHeaders()
    });
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
      headers: getHeaders(),
      body: JSON.stringify(item),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function deleteActionItem(id: string) {
  try {
    await fetch(`${API_BASE_URL}/action-items/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (err) {
    console.error('Error deleting action item:', err);
  }
}

/**
 * CHAT MESSAGES APIs
 */
export async function fetchChatMessages(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/chat-messages/user/${userId}`, {
      headers: getHeaders()
    });
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
      headers: getHeaders(),
      body: JSON.stringify(msg),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function deleteChatMessage(id: string) {
  try {
    await fetch(`${API_BASE_URL}/chat-messages/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (err) {
    console.error('Error deleting chat message:', err);
  }
}

/**
 * NOTES APIs
 */
export async function fetchNotes(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/notes/user/${userId}`, {
      headers: getHeaders()
    });
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
      headers: getHeaders(),
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
    await fetch(`${API_BASE_URL}/notes/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (err) {
    console.error('Error deleting note:', err);
  }
}

/**
 * APP SETTINGS APIs
 */
export async function fetchSettings(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/settings/${userId}`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveSettings(settings: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/settings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

/**
 * DELIVERABLES APIs
 */
export async function fetchDeliverables(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/deliverables/user/${userId}`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function saveDeliverable(deliverable: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/deliverables`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(deliverable),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function deleteDeliverable(id: string) {
  try {
    await fetch(`${API_BASE_URL}/deliverables/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (err) {
    console.error('Error deleting deliverable:', err);
  }
}

/**
 * PORTFOLIO ITEMS APIs
 */
export async function fetchPortfolioItems(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/portfolio-items/user/${userId}`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function savePortfolioItem(item: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/portfolio-items`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(item),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function deletePortfolioItem(id: string) {
  try {
    await fetch(`${API_BASE_URL}/portfolio-items/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (err) {
    console.error('Error deleting portfolio item:', err);
  }
}

/**
 * PLANS APIs
 */
export async function fetchPlans(userId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/plans/user/${userId}`, {
      headers: getHeaders()
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function savePlan(plan: any) {
  try {
    const res = await fetch(`${API_BASE_URL}/plans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(plan),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function deletePlan(id: string) {
  try {
    await fetch(`${API_BASE_URL}/plans/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  } catch (err) {
    console.error('Error deleting plan:', err);
  }
}
