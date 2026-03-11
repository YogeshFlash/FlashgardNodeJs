const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('access_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');

    // For the login request itself, don't hard-navigate (it would wipe form/error state).
    // For everything else, bounce the user back to the login page.
    let message = 'Unauthorized';
    try {
      const err = await res.json();
      if (typeof err?.message === 'string') message = err.message;
      else if (Array.isArray(err?.message) && typeof err.message[0] === 'string') message = err.message[0];
    } catch {
      // ignore
    }

    if (path !== '/auth/login' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }

    throw new Error(message);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Request failed');
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

// ─── Organizations ───────────────────────────────────
export const orgsApi = {
  getAll: (search?: string) =>
    request<any[]>(`/organizations${search ? `?search=${search}` : ''}`),
  getOne: (id: string) => request<any>(`/organizations/${id}`),
  create: (data: any) =>
    request<any>('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/organizations/${id}`, { method: 'DELETE' }),
};

// ─── Users ──────────────────────────────────────────
export const usersApi = {
  getAll: (search?: string) =>
    request<any[]>(`/users${search ? `?search=${search}` : ''}`),
  getOne: (id: string) => request<any>(`/users/${id}`),
  create: (data: any) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
};

// ─── Roles ──────────────────────────────────────────
export const rolesApi = {
  getAll: () => request<any[]>('/roles'),
  getOne: (id: string) => request<any>(`/roles/${id}`),
  create: (data: any) =>
    request<any>('/roles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/roles/${id}`, { method: 'DELETE' }),
};

// ─── Contacts ───────────────────────────────────────
export const contactsApi = {
  getAll: (orgId?: string) =>
    request<any[]>(`/contacts${orgId ? `?organizationId=${orgId}` : ''}`),
  create: (data: any) =>
    request<any>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/contacts/${id}`, { method: 'DELETE' }),
};

// ─── Addresses ──────────────────────────────────────
export const addressesApi = {
  getAll: (orgId?: string) =>
    request<any[]>(`/addresses${orgId ? `?organizationId=${orgId}` : ''}`),
  create: (data: any) =>
    request<any>('/addresses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/addresses/${id}`, { method: 'DELETE' }),
};

// ─── Permissions ────────────────────────────────────
export const permissionsApi = {
  getAll: () => request<any[]>('/permissions'),
  create: (data: any) =>
    request<any>('/permissions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/permissions/${id}`, { method: 'DELETE' }),
};

// ─── Audit Logs ─────────────────────────────────────
export const auditLogsApi = {
  getAll: () => request<any[]>('/audit-logs'),
};
