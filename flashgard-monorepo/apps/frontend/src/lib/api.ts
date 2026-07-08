import { CONFIG } from '@config';

export const API_BASE = CONFIG.FRONTEND.API_BASE_URL;

function getToken() {
  return localStorage.getItem('access_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
  switchOrg: (organizationId: string) =>
    request<{ access_token: string; user: any }>('/auth/switch-org', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    }),
};

// ─── Organizations ───────────────────────────────────
export const orgsApi = {
  getAll: (search?: string, includeDeleted?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    return request<any[]>(`/organizations${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/organizations/${id}`),
  create: (data: any) =>
    request<any>('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/organizations/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    request<any>(`/organizations/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) =>
    request<void>(`/organizations/${id}/purge`, { method: 'DELETE' }),
};

// ─── Organization Types ──────────────────────────────
export const organizationTypesApi = {
  getAll: (includeDeleted?: boolean) => request<any[]>(`/organization-types${includeDeleted ? '?includeDeleted=true' : ''}`),
  create: (data: any) =>
    request<any>('/organization-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/organization-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/organization-types/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    request<any>(`/organization-types/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) =>
    request<void>(`/organization-types/${id}/purge`, { method: 'DELETE' }),
};

// ─── Users ──────────────────────────────────────────
export const usersApi = {
  getAll: (search?: string, includeDeleted?: boolean, skip?: number, take?: number, orgId?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    if (skip !== undefined) params.append('skip', skip.toString());
    if (take !== undefined) params.append('take', take.toString());
    if (orgId) params.append('orgId', orgId);
    return request<any>(`/users${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/users/${id}`),
  create: (data: any) =>
    request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    request<any>(`/users/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) =>
    request<void>(`/users/${id}/purge`, { method: 'DELETE' }),
  getUserPermissions: (id: string) =>
    request<any[]>(`/users/${id}/permissions`),
  updateUserPermissions: (id: string, payload: { permissions: any[] }) =>
    request<void>(`/users/${id}/permissions`, { method: 'PUT', body: JSON.stringify(payload) }),
  resetPassword: (id: string, newPassword: string) =>
    request<any>(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
};

// ─── Roles ──────────────────────────────────────────
export const rolesApi = {
  getAll: (includeDeleted?: boolean) => request<any[]>(`/roles${includeDeleted ? '?includeDeleted=true' : ''}`),
  getOne: (id: string) => request<any>(`/roles/${id}`),
  create: (data: any) =>
    request<any>('/roles', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/roles/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    request<any>(`/roles/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) =>
    request<void>(`/roles/${id}/purge`, { method: 'DELETE' }),
};

// ─── Contacts ───────────────────────────────────────
export const contactsApi = {
  getAll: (orgId?: string, includeDeleted?: boolean) => {
    const params = new URLSearchParams();
    if (orgId) params.append('organizationId', orgId);
    if (includeDeleted) params.append('includeDeleted', 'true');
    return request<any[]>(`/contacts${params.toString() ? `?${params.toString()}` : ''}`);
  },
  create: (data: any) =>
    request<any>('/contacts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/contacts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/contacts/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    request<any>(`/contacts/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) =>
    request<void>(`/contacts/${id}/purge`, { method: 'DELETE' }),
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
  restore: (id: string) =>
    request<any>(`/addresses/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) =>
    request<void>(`/addresses/${id}/purge`, { method: 'DELETE' }),
};

// ─── Permissions ────────────────────────────────────
export const permissionsApi = {
  getAll: (includeDeleted?: boolean) => request<any[]>(`/permissions${includeDeleted ? '?includeDeleted=true' : ''}`),
  create: (data: any) =>
    request<any>('/permissions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/permissions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/permissions/${id}`, { method: 'DELETE' }),
  restore: (id: string) =>
    request<any>(`/permissions/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) =>
    request<void>(`/permissions/${id}/purge`, { method: 'DELETE' }),
};

// ─── Audit Logs ─────────────────────────────────────
export const auditLogsApi = {
  getAll: () => request<any[]>('/audit-logs'),
};

// ─── Product Management ──────────────────────────────
export const filmTypesApi = {
  getAll: (search?: string, includeDeleted?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    return request<any[]>(`/film-types${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/film-types/${id}`),
  create: (data: any) => request<any>('/film-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/film-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/film-types/${id}`, { method: 'DELETE' }),
  restore: (id: string) => request<any>(`/film-types/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) => request<void>(`/film-types/${id}/purge`, { method: 'DELETE' }),
};

export const modelCategoriesApi = {
  getAll: (search?: string, includeDeleted?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    return request<any[]>(`/model-categories${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/model-categories/${id}`),
  create: (data: any) => request<any>('/model-categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/model-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/model-categories/${id}`, { method: 'DELETE' }),
  restore: (id: string) => request<any>(`/model-categories/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) => request<void>(`/model-categories/${id}/purge`, { method: 'DELETE' }),
};

export const brandsApi = {
  getAll: (categoryId?: string, search?: string, includeDeleted?: boolean) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    return request<any[]>(`/brands${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/brands/${id}`),
  create: (data: any) => request<any>('/brands', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/brands/${id}`, { method: 'DELETE' }),
  restore: (id: string) => request<any>(`/brands/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) => request<void>(`/brands/${id}/purge`, { method: 'DELETE' }),
};

export const modelsApi = {
  getAll: async (brandId?: string, categoryId?: string, search?: string, skip?: number, take?: number) => {
    let url = '/models?';
    if (brandId) url += `brandId=${brandId}&`;
    if (categoryId) url += `categoryId=${categoryId}&`;
    if (search) url += `search=${search}&`;
    if (skip !== undefined) url += `skip=${skip}&`;
    if (take !== undefined) url += `take=${take}&`;
    return request<{ items: any[], total: number }>(url);
  },
  getActiveCombinations: () => request<{categoryId: string, brandId: string}[]>('/models/active-combinations'),
  getOne: (id: string) => request<any>(`/models/${id}`),
  create: (data: any) => request<any>('/models', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/models/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/models/${id}`, { method: 'DELETE' }),
  restore: (id: string) => request<any>(`/models/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) => request<void>(`/models/${id}/purge`, { method: 'DELETE' }),
};

export const cutPatternsApi = {
  getAll: (search?: string, includeDeleted?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    return request<any[]>(`/cut-patterns${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/cut-patterns/${id}`),
  create: (data: any) => request<any>('/cut-patterns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/cut-patterns/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/cut-patterns/${id}`, { method: 'DELETE' }),
  restore: (id: string) => request<any>(`/cut-patterns/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) => request<void>(`/cut-patterns/${id}/purge`, { method: 'DELETE' }),
};

export const modelCutFilesApi = {
  getAll: (modelId?: string, search?: string, skip?: number, take?: number) => {
    const params = new URLSearchParams();
    if (modelId) params.append('modelId', modelId);
    if (search) params.append('search', search);
    if (skip !== undefined) params.append('skip', skip.toString());
    if (take !== undefined) params.append('take', take.toString());
    return request<{ items: any[], total: number }>(`/model-cut-files?${params}`);
  },
  getOne: (id: string) => request<any>(`/model-cut-files/${id}`),
  create: (data: any) => request<any>('/model-cut-files', { method: 'POST', body: JSON.stringify(data) }),
  upload: (formData: FormData) => request<any>('/model-cut-files/upload', { method: 'POST', body: formData }),
  normalize: (id: string) => request<any>(`/model-cut-files/${id}/normalize`, { method: 'PATCH' }),
  remove: (id: string) => request<void>(`/model-cut-files/${id}`, { method: 'DELETE' }),
};

// ─── Inventory ───────────────────────────────────────
export const inventoryApi = {
  // Inward Receipts
  getInwardReceipts: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v != null && q.append(k, String(v)));
    return request<any>(`/inventory/inward-receipts${q.toString() ? `?${q}` : ''}`);
  },
  createInwardReceipt: (data: any) => request<any>('/inventory/inward-receipts', { method: 'POST', body: JSON.stringify(data) }),
  deleteInwardReceipt: (id: string) => request<any>(`/inventory/inward-receipts/${id}/delete`, { method: 'PATCH' }),

  // Batches
  getBatches: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v != null && q.append(k, String(v)));
    return request<any>(`/inventory/batches${q.toString() ? `?${q}` : ''}`);
  },
  getBatch: (id: string) => request<any>(`/inventory/batches/${id}`),
  createBulkInward: (data: any) => request<any>('/inventory/inward/bulk', { method: 'POST', body: JSON.stringify(data) }),
  createRawInward: (data: any) => request<any>('/inventory/inward/raw', { method: 'POST', body: JSON.stringify(data) }),
  createInwardProcurement: (data: any) => request<any>('/inventory/inward/procurement', { method: 'POST', body: JSON.stringify(data) }),
  generateQR: (batchId: string, data: any) =>
    request<any>(`/inventory/batches/${batchId}/qr-generate`, { method: 'POST', body: JSON.stringify(data) }),
  getBatchQRCodes: (batchId: string) =>
    request<any[]>(`/inventory/batches/${batchId}/qrs`),

  // Work Orders
  getWorkOrders: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v != null && q.append(k, String(v)));
    return request<any>(`/inventory/work-orders${q.toString() ? `?${q}` : ''}`);
  },
  getWorkOrder: (id: string) => request<any>(`/inventory/work-orders/${id}`),
  closeWorkOrder: (id: string, data: any) =>
    request<any>(`/inventory/work-orders/${id}/close`, { method: 'PATCH', body: JSON.stringify(data) }),
  addWorkOrderOutput: (id: string, data: any) =>
    request<any>(`/inventory/work-orders/${id}/output`, { method: 'POST', body: JSON.stringify(data) }),
  finalizeWorkOrder: (id: string) =>
    request<any>(`/inventory/work-orders/${id}/finalize`, { method: 'POST' }),

  // Dispatch
  getDispatches: (params?: Record<string, any>) => {
    const q = new URLSearchParams();
    if (params) Object.entries(params).forEach(([k, v]) => v != null && q.append(k, String(v)));
    return request<any>(`/inventory/dispatch${q.toString() ? `?${q}` : ''}`);
  },
  createDispatch: (data: any) => request<any>('/inventory/dispatch', { method: 'POST', body: JSON.stringify(data) }),
  receiveDispatch: (id: string, data: any) =>
    request<any>(`/inventory/dispatch/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),
  updateBatch: (id: string, data: any) =>
    request<any>(`/inventory/batches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBatch: (id: string) =>
    request<any>(`/inventory/batches/${id}/delete`, { method: 'PATCH' }),
  restoreBatch: (id: string) =>
    request<any>(`/inventory/batches/${id}/restore`, { method: 'PATCH' }),
  purgeBatch: (id: string) =>
    request<any>(`/inventory/batches/${id}`, { method: 'DELETE' }),
};

// ─── Org Licenses ──────────────────────────────────────
export const licensesApi = {
  getBatches: () => request<any[]>('/licenses/batches'),
  getBatchDetails: (id: string) => request<any>(`/licenses/batches/${id}`),
  issue: (data: any) => request<any>('/licenses/issue', { method: 'POST', body: JSON.stringify(data) }),
  dispatch: (data: { licenseIds: string[]; toOrgId: string }) => 
    request<any>('/licenses/dispatch', { method: 'POST', body: JSON.stringify(data) }),
  acceptTransfer: (id: string) => request<any>(`/licenses/accept-transfer/${id}`, { method: 'POST' }),
  rejectTransfer: (id: string) => request<any>(`/licenses/reject-transfer/${id}`, { method: 'POST' }),
  recallTransfer: (id: string) => request<any>(`/licenses/recall-transfer/${id}`, { method: 'POST' }),
  activate: (data: { key: string; fingerprint: any; geo: any }) => 
    request<any>('/licenses/activate', { method: 'POST', body: JSON.stringify(data) }),
  getInventory: (orgId?: string, skip?: number, take?: number, search?: string, batchId?: string, status?: string, hideUnavailable?: boolean) => {
    const p = new URLSearchParams();
    if (orgId) p.append('orgId', orgId);
    if (skip !== undefined) p.append('skip', skip.toString());
    if (take !== undefined) p.append('take', take.toString());
    if (search) p.append('search', search);
    if (batchId) p.append('batchId', batchId);
    if (status) p.append('status', status);
    if (hideUnavailable) p.append('hideUnavailable', 'true');
    return request<any>(`/licenses/inventory${p.toString() ? `?${p.toString()}` : ''}`);
  },
  getTransfers: (orgId?: string) => request<any[]>(`/licenses/transfers${orgId ? `?orgId=${orgId}` : ''}`),
  updateStatus: (id: string, status: string) => request<any>(`/licenses/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getCutLogs: (licenseId?: string, orgId?: string, skip?: number, take?: number, search?: string, isPositiveCut?: boolean, categoryName?: string) => {
    const p = new URLSearchParams();
    if (licenseId) p.append('licenseId', licenseId);
    if (orgId) p.append('orgId', orgId);
    if (skip !== undefined) p.append('skip', skip.toString());
    if (take !== undefined) p.append('take', take.toString());
    if (search) p.append('search', search);
    if (isPositiveCut !== undefined) p.append('isPositiveCut', isPositiveCut.toString());
    if (categoryName) p.append('categoryName', categoryName);
    return request<any>(`/cuts/logs${p.toString() ? `?${p.toString()}` : ''}`);
  },
  getReportsStats: (orgId?: string, range?: number) => {
    const p = new URLSearchParams();
    if (orgId) p.append('orgId', orgId);
    if (range !== undefined) p.append('range', range.toString());
    return request<any>(`/cuts/stats${p.toString() ? `?${p.toString()}` : ''}`);
  },
  getReportsCutReport: (params: { orgId?: string; startDate?: string; endDate?: string; search?: string; skip?: number; take?: number }) => {
    const p = new URLSearchParams();
    if (params.orgId) p.append('orgId', params.orgId);
    if (params.startDate) p.append('startDate', params.startDate);
    if (params.endDate) p.append('endDate', params.endDate);
    if (params.search) p.append('search', params.search);
    if (params.skip !== undefined) p.append('skip', params.skip.toString());
    if (params.take !== undefined) p.append('take', params.take.toString());
    return request<any>(`/cuts/report${p.toString() ? `?${p.toString()}` : ''}`);
  },
  getMasterQRs: (skip?: number, take?: number, search?: string, orgId?: string) => {
    const p = new URLSearchParams();
    if (skip !== undefined) p.append('skip', skip.toString());
    if (take !== undefined) p.append('take', take.toString());
    if (search) p.append('search', search);
    if (orgId) p.append('orgId', orgId);
    return request<any>(`/licenses/master-qrs${p.toString() ? `?${p.toString()}` : ''}`);
  },
};



// ─── Cut Credits ─────────────────────────────────────
export const cutCreditsApi = {
  issue: (data: any) => request<any>('/cut-credits/issue', { method: 'POST', body: JSON.stringify(data) }),
  dispatch: (data: { amount: number; toOrgId: string; fromOrgId?: string; targetLicenseId?: string }) => 
    request<any>('/cut-credits/dispatch', { method: 'POST', body: JSON.stringify(data) }),
  getInventory: (orgId?: string, skip?: number, take?: number, search?: string, planType?: string, receivingOrgId?: string) => {
    const p = new URLSearchParams();
    if (orgId) p.append('orgId', orgId);
    if (receivingOrgId) p.append('receivingOrgId', receivingOrgId);
    if (skip !== undefined) p.append('skip', skip.toString());
    if (take !== undefined) p.append('take', take.toString());
    if (search) p.append('search', search);
    if (planType) p.append('planType', planType);
    return request<any>(`/cut-credits/inventory${p.toString() ? `?${p.toString()}` : ''}`);
  },
  getTransfers: (orgId?: string) => request<any[]>(`/cut-credits/transfers${orgId ? `?orgId=${orgId}` : ''}`),
  getWallet: (machineId: string) => request<any>(`/cut-credits/wallet/${machineId}`),
};

// ─── Recharge ──────────────────────────────────────────
export const rechargeApi = {
  // Public/user
  getPackages: () => request<any[]>('/recharge/packages'),
  // Admin
  getAllPackages: () => request<any[]>('/recharge/packages/all'),
  createPackage: (data: { name: string; description?: string; credits: number; price: number; currency?: string }) =>
    request<any>('/recharge/packages', { method: 'POST', body: JSON.stringify(data) }),
  updatePackage: (id: string, data: any) =>
    request<any>(`/recharge/packages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePackage: (id: string) =>
    request<any>(`/recharge/packages/${id}`, { method: 'DELETE' }),
  getTransactions: (skip?: number, take?: number, search?: string) => {
    const p = new URLSearchParams();
    if (skip !== undefined) p.append('skip', skip.toString());
    if (take !== undefined) p.append('take', take.toString());
    if (search) p.append('search', search);
    return request<any>(`/recharge/transactions${p.toString() ? `?${p.toString()}` : ''}`);
  },
};

// ─── Files ──────────────────────────────────────────
export const filesApi = {
  uploadAsset: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<{ url: string }>('/files/upload-asset', {
      method: 'POST',
      body: formData,
      headers: {
        // fetch handles Content-Type for FormData
      },
    });
  },
  uploadCatalog: (formData: FormData) => request<{ filename: string; url: string }>('/files/upload-catalog', { method: 'POST', body: formData }),
};

// ─── Migration ──────────────────────────────────────
export const migrationApi = {
  migrateCatalog: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/migration/legacy/catalog', { method: 'POST', body: formData });
  },
  migrateSkins: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/migration/legacy/skins', { method: 'POST', body: formData });
  },
  migrateRoles: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/migration/legacy/roles', { method: 'POST', body: formData });
  },
  migrateUsers: (users?: File, userRoles?: File) => {
    const formData = new FormData();
    if (users) formData.append('users', users);
    if (userRoles) formData.append('userRoles', userRoles);
    return request<any>('/migration/legacy/users', { method: 'POST', body: formData });
  },
  migrateLicenses: (licenses: File, licenseDealers?: File) => {
    const formData = new FormData();
    formData.append('licenses', licenses);
    if (licenseDealers) formData.append('licenseDealers', licenseDealers);
    return request<any>('/migration/legacy/licenses', { method: 'POST', body: formData });
  },
  migrateMobileUsers: (mobileUsers: File) => {
    const formData = new FormData();
    formData.append('mobileUsers', mobileUsers);
    return request<any>('/migration/legacy/mobile-users', { method: 'POST', body: formData });
  },
  migrateMobileAppCuts: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/migration/legacy/mobile-app-cuts', { method: 'POST', body: formData });
  },
  dbConnect: (config: any) => 
    request<any>('/migration/db/connect', { method: 'POST', body: JSON.stringify(config) }),
  dbRun: (data: any) =>
    request<any>('/migration/db/run', { method: 'POST', body: JSON.stringify(data) }),
  migrateDesigns: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/migration/legacy/designs', { method: 'POST', body: formData });
  },
  migrateDesignsLocal: () => {
    return request<any>('/migration/legacy/designs/local', { method: 'POST' });
  },
  generateDesignImages: () => {
    return request<any>('/migration/legacy/designs/generate-images', { method: 'POST' });
  },
  generateDesignImagesForModel: (modelId: string) => {
    return request<any>(`/migration/legacy/designs/generate-images/model/${modelId}`, { method: 'POST' });
  },
  generateDesignImagesForCategory: (categoryId: string) => {
    return request<any>(`/migration/legacy/designs/generate-images/category/${categoryId}`, { method: 'POST' });
  },
  generateDesignImagesForBrand: (brandId: string) => {
    return request<any>(`/migration/legacy/designs/generate-images/brand/${brandId}`, { method: 'POST' });
  },
  normalizeCategory: (categoryId: string) => {
    return request<any>(`/migration/legacy/designs/normalize/category/${categoryId}`, { method: 'POST' });
  },
  normalizeBrand: (brandId: string) => {
    return request<any>(`/migration/legacy/designs/normalize/brand/${brandId}`, { method: 'POST' });
  },
  normalizeModel: (modelId: string) => {
    return request<any>(`/migration/legacy/designs/normalize/model/${modelId}`, { method: 'POST' });
  },
  generateDesignImageForCutFile: (cutFileId: string) => {
    return request<any>(`/migration/legacy/designs/generate-images/cut-file/${cutFileId}`, { method: 'POST' });
  },
  getLogs: () => {
    return request<any[]>('/migration/logs');
  },
  cleanData: (module: string) => {
    return request<any>('/migration/clean', {
      method: 'POST',
      body: JSON.stringify({ module })
    });
  },
  migrateDealerMasterQRs: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/migration/legacy/dealer-master-qrs', { method: 'POST', body: formData });
  },
  migratePlotters: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<any>('/migration/legacy/plotter-masters', { method: 'POST', body: formData });
  },
  migrateMaterials: (
    productTypes: File,
    categories: File,
    filmCategories: File,
    products: File,
    displayMaster: File
  ) => {
    const formData = new FormData();
    formData.append('productTypes', productTypes);
    formData.append('categories', categories);
    formData.append('filmCategories', filmCategories);
    formData.append('products', products);
    formData.append('displayMaster', displayMaster);
    return request<any>('/migration/legacy/materials', { method: 'POST', body: formData });
  },
};

// ─── Plotters ─────────────────────────────────────────
export const plottersApi = {
  getAll: (search?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    return request<any>(`/plotters${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/plotters/${id}`),
  create: (data: any) =>
    request<any>('/plotters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/plotters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/plotters/${id}`, { method: 'DELETE' }),
};

export const plotterDevicesApi = {
  getAll: (search?: string, plotterMasterId?: string, organizationId?: string, page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (plotterMasterId) params.append('plotterMasterId', plotterMasterId);
    if (organizationId) params.append('organizationId', organizationId);
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    return request<any>(`/plotter-devices${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/plotter-devices/${id}`),
  create: (data: any) =>
    request<any>('/plotter-devices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/plotter-devices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/plotter-devices/${id}`, { method: 'DELETE' }),
};

export const dashboardApi = {
  getStats: () => request<any>('/dashboard/stats'),
};

// ─── Materials Management Relational Schema CRUD ───
export const productTypesApi = {
  getAll: (search?: string, includeDeleted?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    return request<any[]>(`/product-types${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/product-types/${id}`),
  create: (data: any) => request<any>('/product-types', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/product-types/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/product-types/${id}`, { method: 'DELETE' }),
  restore: (id: string) => request<any>(`/product-types/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) => request<void>(`/product-types/${id}/purge`, { method: 'DELETE' }),
};

export const materialCategoriesApi = {
  getAll: (search?: string, includeDeleted?: boolean) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    return request<any[]>(`/material-categories${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/material-categories/${id}`),
  create: (data: any) => request<any>('/material-categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/material-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/material-categories/${id}`, { method: 'DELETE' }),
  restore: (id: string) => request<any>(`/material-categories/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) => request<void>(`/material-categories/${id}/purge`, { method: 'DELETE' }),
};

export const filmCategoriesApi = {
  getAll: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return request<any[]>(`/film-categories${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/film-categories/${id}`),
  create: (data: any) => request<any>('/film-categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/film-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/film-categories/${id}`, { method: 'DELETE' }),
  purge: (id: string) => request<void>(`/film-categories/${id}/purge`, { method: 'DELETE' }),
};

export const materialsApi = {
  getAll: (search?: string, includeDeleted?: boolean, skip?: number, take?: number) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (includeDeleted) params.append('includeDeleted', 'true');
    if (skip !== undefined) params.append('skip', skip.toString());
    if (take !== undefined) params.append('take', take.toString());
    return request<any>(`/materials${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getOne: (id: string) => request<any>(`/materials/${id}`),
  create: (data: any) => request<any>('/materials', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/materials/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<void>(`/materials/${id}`, { method: 'DELETE' }),
  restore: (id: string) => request<any>(`/materials/${id}/restore`, { method: 'PATCH' }),
  purge: (id: string) => request<void>(`/materials/${id}/purge`, { method: 'DELETE' }),
};

export const mobileHomeApi = {
  getContent: () => request<any>('/mobile-home/content'),
  
  // Promotions
  getPromotions: () => request<any[]>('/mobile-home/promotions'),
  createPromotion: (data: any) => request<any>('/mobile-home/promotions', { method: 'POST', body: JSON.stringify(data) }),
  updatePromotion: (id: string, data: any) => request<any>(`/mobile-home/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePromotion: (id: string) => request<void>(`/mobile-home/promotions/${id}`, { method: 'DELETE' }),

  // Actions
  getActions: () => request<any[]>('/mobile-home/actions'),
  createAction: (data: any) => request<any>('/mobile-home/actions', { method: 'POST', body: JSON.stringify(data) }),
  updateAction: (id: string, data: any) => request<any>(`/mobile-home/actions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAction: (id: string) => request<void>(`/mobile-home/actions/${id}`, { method: 'DELETE' }),

  // Info Cards
  getInfoCards: () => request<any[]>('/mobile-home/infocards'),
  createInfoCard: (data: any) => request<any>('/mobile-home/infocards', { method: 'POST', body: JSON.stringify(data) }),
  updateInfoCard: (id: string, data: any) => request<any>(`/mobile-home/infocards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInfoCard: (id: string) => request<void>(`/mobile-home/infocards/${id}`, { method: 'DELETE' }),
};

export const paymentGatewayApi = {
  getSettings: () => request<{ razorpayKeyId: string; razorpayKeySecret: string; rechargeDistributorId: string }>('/recharge/gateway-settings'),
  saveSettings: (data: { razorpayKeyId: string; razorpayKeySecret: string; rechargeDistributorId: string }) =>
    request<any>('/recharge/gateway-settings', { method: 'POST', body: JSON.stringify(data) }),
};




