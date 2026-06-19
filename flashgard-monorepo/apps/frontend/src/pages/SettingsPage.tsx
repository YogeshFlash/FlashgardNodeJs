import React, { useEffect, useState } from 'react';
import {
  Bell, ShieldCheck, Database, Globe,
  Plus, Edit2, Trash2, Loader2, Users, Search, Key, Check, List, X, Shield, RotateCcw, Building, ScrollText,
  ChevronLeft, ChevronRight, ChevronDown, Cpu
} from 'lucide-react';
import { rolesApi, usersApi, permissionsApi, auditLogsApi, orgsApi, organizationTypesApi, productTypesApi, materialCategoriesApi, filmCategoriesApi, materialsApi, plottersApi, plotterDevicesApi } from '../lib/api';
import { HasPermission, usePermissions } from '../components/HasPermission';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { UserPermissionsModal } from '../components/UserPermissionsModal';
import { ResetPasswordModal } from '../components/ResetPasswordModal';

function buildOrgRows(orgs: any[], rootOrgId?: number) {
  const byParent = new Map<string, any[]>();
  const byId = new Map<number, any>();

  for (const org of orgs || []) {
    if (!org?.id) continue;
    byId.set(org.id, org);
    const parentKey = org.parentId || '__root__';
    const arr = byParent.get(String(parentKey)) || [];
    arr.push(org);
    byParent.set(String(parentKey), arr);
  }

  for (const arr of byParent.values()) {
    arr.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }

  let roots: any[] = [];
  if (rootOrgId) {
    const rootOrg = byId.get(rootOrgId);
    if (rootOrg) roots = [rootOrg];
  } else {
    roots = (byParent.get('__root__') || []).slice();
    for (const org of orgs || []) {
      if (org?.parentId && !byId.has(org.parentId)) roots.push(org);
    }
  }

  const seenRootIds = new Set<number>();
  const dedupedRoots = roots.filter((o) =>
    o?.id && !seenRootIds.has(o.id) ? (seenRootIds.add(o.id), true) : false
  );

  const rows: { org: any; depth: number; hasChildren: boolean; isVisible: boolean }[] = [];
  const visiting = new Set<number>();

  const walk = (node: any, depth: number, parentVisible: boolean) => {
    if (!node?.id) return;
    if (visiting.has(node.id)) return;
    visiting.add(node.id);

    const kids = byParent.get(String(node.id)) || [];
    const hasChildren = kids.length > 0;
    
    rows.push({ org: node, depth, hasChildren, isVisible: parentVisible });
    
    for (const child of kids) {
      walk(child, depth + 1, true);
    }

    visiting.delete(node.id);
  };

  dedupedRoots
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
    .forEach((r) => walk(r, 0, true));

  return rows;
}


// ─── General Settings Tab ───────────────────────────
const Toggle = ({ checked, onChange, label, desc }: any) => (
  <div className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/20 px-2 rounded-xl transition-colors">
    <div className="space-y-0.5">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      {desc && <p className="text-xs text-slate-400 font-medium">{desc}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

const GeneralTab = () => {
  const [emailNotif, setEmailNotif] = React.useState(true);
  const [loginAlert, setLoginAlert] = React.useState(true);
  const [twoFA, setTwoFA] = React.useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Notifications</h3>
            <p className="text-[10px] text-slate-400 font-semibold">Configure how you receive system alerts</p>
          </div>
        </div>
        <div className="space-y-2">
          <Toggle checked={emailNotif} onChange={setEmailNotif} label="Email Notifications" desc="Receive summaries and alerts via email" />
          <Toggle checked={loginAlert} onChange={setLoginAlert} label="Login Alerts" desc="Get notified when a new login is detected" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Security Settings</h3>
            <p className="text-[10px] text-slate-400 font-semibold">Secure your profile credentials</p>
          </div>
        </div>
        <div className="space-y-2">
          <Toggle checked={twoFA} onChange={setTwoFA} label="Two-Factor Authentication" desc="Require a second factor at login" />
          <div className="py-3.5 border-b border-slate-100 flex justify-between items-center px-2 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-700">Session Timeout</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">Automatically sign out after inactivity</p>
            </div>
            <select className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>8 hours</option>
              <option>4 hours</option>
              <option>1 hour</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Localization</h3>
            <p className="text-[10px] text-slate-400 font-semibold">Select language & timezone preference</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="py-2 border-b border-slate-100 flex justify-between items-center px-2 rounded-xl">
            <p className="text-sm font-semibold text-slate-700">Default Language</p>
            <select className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"><option>English</option><option>Tamil</option><option>Hindi</option></select>
          </div>
          <div className="py-2 flex justify-between items-center px-2 rounded-xl">
            <p className="text-sm font-semibold text-slate-700">Timezone</p>
            <select className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"><option>Asia/Kolkata (IST)</option><option>UTC</option></select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">System Details</h3>
            <p className="text-[10px] text-slate-400 font-semibold">General platform versions and metadata</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Application', value: 'Flashgard CRM' },
            { label: 'Version', value: '2.0.0' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2.5 border-b border-slate-50 last:border-0 px-2 rounded-xl hover:bg-slate-50/30">
              <span className="text-slate-500 font-medium">{label}</span>
              <span className="text-slate-700 font-bold">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// ─── System Roles Tab ───────────────────────────────
const RoleModal = ({ role, onClose, onSave }: any) => {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState(role || { name: '', description: '', isSystemRole: true, isRestricted: false, permissionIds: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Permissions State
  const [allPerms, setAllPerms] = useState<any[]>([]);
  const [permsLoading, setPermsLoading] = useState(true);

  useEffect(() => {
    // If editing, map existing relations to an array of IDs
    if (role && role.permissions) {
      setForm((prev: any) => ({ ...prev, permissionIds: role.permissions.map((p: any) => p.permissionId) }));
    }

    // Fetch available permissions
    permissionsApi.getAll()
      .then(setAllPerms)
      .catch((e) => setError('Failed to load permissions: ' + e.message))
      .finally(() => setPermsLoading(false));
  }, [role]);

  const togglePerm = (id: string) => {
    setForm((prev: any) => {
      const ids = prev.permissionIds || [];
      return { ...prev, permissionIds: ids.includes(id) ? ids.filter((i: string) => i !== id) : [...ids, id] };
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (role?.id) await rolesApi.update(role.id, form);
      else await rolesApi.create(form);
      onSave();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">{role ? 'Edit Role' : 'New System Role'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Role Name</label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Warehouse Manager" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
            <textarea className="input-field resize-none" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what this role does..." />
          </div>

          {/* Permissions Grid */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2 border-b border-slate-100 pb-2">Role Permissions</label>
            {permsLoading ? (
              <div className="flex items-center justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" /></div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                {Object.entries(
                  allPerms.reduce((acc: any, p: any) => {
                    const group = p.action.split(':')[0];
                    if (!acc[group]) acc[group] = [];
                    acc[group].push(p);
                    return acc;
                  }, {})
                ).map(([group, perms]: any) => (
                  <div key={group} className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{group}</h4>
                    {perms.map((p: any) => (
                      <label key={p.id} className="flex items-start gap-2.5 group cursor-pointer">
                        <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors
                          ${(form.permissionIds || []).includes(p.id) ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-slate-300 group-hover:border-[var(--color-accent)]'}`}>
                          {(form.permissionIds || []).includes(p.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input type="checkbox" className="sr-only" checked={(form.permissionIds || []).includes(p.id)} onChange={() => togglePerm(p.id)} />
                        <span className="text-xs text-slate-600 group-hover:text-slate-900 select-none leading-tight pt-0.5">{p.description}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentUser?.isSuperAdmin && (
            <div className="flex items-center gap-2 px-1">
              <input type="checkbox" id="roleRestricted" checked={form.isRestricted} onChange={e => setForm({ ...form, isRestricted: e.target.checked })} className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]" />
              <label htmlFor="roleRestricted" className="text-sm font-medium text-slate-700">Restricted Access</label>
              <p className="text-[10px] text-slate-400 font-normal leading-none">(Catalog/Platform Admins only)</p>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-[var(--color-gold-light)] rounded-lg">
            <ShieldCheck className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
            <p className="text-xs text-[var(--color-accent)] font-medium leading-snug">System roles are shared across all organizations and cannot be deleted by org users.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {role ? 'Save' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RolesTabSettings = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
    confirmLabel?: string;
    variant?: any;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    isLoading: false,
  });

  const closeConfirm = () => setConfirm(prev => ({ ...prev, isOpen: false }));

  const handleDeleteDialog = (title: string, message: string, onConfirm: () => Promise<void>, confirmLabel?: string, variant?: any) => {
    setConfirm({
      isOpen: true,
      title,
      message,
      isLoading: false,
      onConfirm: async () => {
        setConfirm(prev => ({ ...prev, isLoading: true }));
        try {
          await onConfirm();
          closeConfirm();
        } catch (err) {
          console.error(err);
          setConfirm(prev => ({ ...prev, isLoading: false }));
        }
      },
      confirmLabel,
      variant
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const all = await rolesApi.getAll(true);
      setRoles(all);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, name: string, isSystem: boolean) => {
    if (isSystem) { 
      handleDeleteDialog('Protected Role', 'System roles are protected and cannot be deleted.', async () => {});
      return; 
    }
    handleDeleteDialog(
      'Delete Role',
      `Are you sure you want to delete the role "${name}"?`,
      async () => {
        await rolesApi.delete(id);
        load();
      },
      'Delete',
      'danger'
    );
  };

  const handleRestore = async (id: string, name: string) => {
    handleDeleteDialog(
      'Restore Role',
      `Are you sure you want to restore the role "${name}"?`,
      async () => {
        await rolesApi.restore(id);
        load();
      },
      'Restore',
      'primary'
    );
  };

  const handlePurge = async (id: string, name: string) => {
    handleDeleteDialog(
      'Permanently Delete Role',
      `Are you ABSOLUTELY sure you want to permanently delete "${name}"? This action is irreversible and will remove all associated permission data!`,
      async () => {
        await rolesApi.purge(id);
        load();
      },
      'Permanently Delete',
      'danger'
    );
  };

  const { user } = useAuth();

  return (
    <div className="p-6 space-y-4">
      {modal && <RoleModal role={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">Roles</h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage roles for your organization</p>
        </div>
        <HasPermission permission="roles:write">
          <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> New Role
          </button>
        </HasPermission>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input-field pl-9 py-1.5 text-sm" placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="card bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldCheck className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No roles found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Role Name', 'Description', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(role => (
                  <tr key={role.id} className={`hover:bg-slate-50/70 group transition-colors ${role.isDeleted ? 'bg-red-50/50' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${role.isDeleted ? 'bg-red-100 text-red-500' : 'bg-[var(--color-gold-muted)] text-[var(--color-accent)]'}`}>
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <span className={`font-semibold ${role.isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{role.name}</span>
                        {role.isSystemRole && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 leading-none">SYSTEM</span>}
                        {role.isRestricted && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 leading-none">RESTRICTED</span>}
                        {role.isDeleted && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 leading-none uppercase tracking-tighter">DELETED</span>}
                      </div>
                    </td>
                    <td className={`px-5 py-4 max-w-sm truncate ${role.isDeleted ? 'text-slate-400 italic' : 'text-slate-500'}`}>{role.description || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!role.isDeleted ? (
                          <>
                            <HasPermission permission="roles:write">
                              <button onClick={() => setModal(role)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                            </HasPermission>
                            <HasPermission permission="roles:write">
                              <button 
                                onClick={() => handleDelete(role.id, role.name, role.isSystemRole)} 
                                className={`p-1.5 rounded-lg transition-colors ${role.isSystemRole ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`} 
                                title={role.isSystemRole ? "System roles are protected" : "Delete role"}
                                disabled={role.isSystemRole}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </HasPermission>
                          </>
                        ) : (
                          user?.isSuperAdmin && (
                            <>
                              <button onClick={() => handleRestore(role.id, role.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Restore role">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button onClick={() => handlePurge(role.id, role.name)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-100 transition-colors" title="Permanently delete role">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConfirmDialog 
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        isLoading={confirm.isLoading}
        onConfirm={confirm.onConfirm}
        onClose={closeConfirm}
        confirmLabel={confirm.confirmLabel}
        variant={confirm.variant}
      />
    </div>
  );
};

// ─── Internal Users Tab ─────────────────────────────

const TreeComboBox = ({ value, onChange, disabled, items, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredItems = React.useMemo(() => {
    if (!search) return items.slice(0, 100);
    return items.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 100);
  }, [items, search]);

  const selected = items.find((i: any) => i.id === value);

  return (
    <div className="relative">
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-sm ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-slate-300'}`}
      >
        <span className="truncate">{selected ? selected.name : placeholder || 'Select...'}</span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </div>
      
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-2 border-b border-slate-100 bg-white">
              <input 
                autoFocus
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="p-3 text-sm text-slate-400 text-center">No results</div>
              ) : filteredItems.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => { onChange(item.id); setIsOpen(false); setSearch(''); }}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${value === item.id ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold' : 'text-slate-700'}`}
                >
                  {!search ? (
                    <span className="whitespace-pre">{'\u00A0'.repeat(item.depth * 3)}{item.depth > 0 ? '└ ' : ''}{item.name}</span>
                  ) : (
                    <span>{item.name}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const RoleComboBox = ({ value, onChange, disabled, roles, placeholder }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredRoles = React.useMemo(() => {
    const sorted = [...(roles || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    if (!search) return sorted;
    return sorted.filter((r: any) => r.name.toLowerCase().includes(search.toLowerCase()));
  }, [roles, search]);

  const selected = roles.find((r: any) => r.id === value);

  return (
    <div className="relative">
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-sm ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-slate-300'}`}
      >
        <span className="truncate">{selected ? `${selected.name}${selected.isSystemRole ? ' (System)' : ''}` : placeholder || 'Select Role'}</span>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </div>
      
      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-2 border-b border-slate-100 bg-white">
              <input 
                autoFocus
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              />
            </div>
            <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
              {filteredRoles.length === 0 ? (
                <div className="p-3 text-sm text-slate-400 text-center">No results</div>
              ) : filteredRoles.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => { onChange(r.id); setIsOpen(false); setSearch(''); }}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${value === r.id ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold' : 'text-slate-700'}`}
                >
                  {r.name} {r.isSystemRole ? '(System)' : ''}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const UserModal = ({ user: u, roles, orgs, currentOrgId, onClose, onSave }: any) => {
  const { user: currentUser } = useAuth();
  
  const initialOrgs = u?.organizations?.length > 0 
    ? u.organizations.map((org: any) => ({
        organizationId: org.organizationId,
        roleId: org.roleId,
        isPrimary: org.isPrimary
      }))
    : [{ organizationId: currentOrgId || '', roleId: '', isPrimary: true }];

  const [form, setForm] = useState<any>(u ? { ...u } : { firstName: '', lastName: '', email: '', password: '', isActive: true });
  const [userOrgs, setUserOrgs] = useState<any[]>(initialOrgs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const treeItems = React.useMemo(() => {
    return buildOrgRows(orgs, currentUser?.isSuperAdmin ? undefined : (currentUser?.organizationId as any)).map(({ org: o, depth }: any) => ({
      id: o.id,
      name: o.name,
      depth
    }));
  }, [orgs, currentUser]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (userOrgs.length === 0) throw new Error('You must assign at least one organization.');
      if (!userOrgs.some(o => o.isPrimary)) userOrgs[0].isPrimary = true;

      const payload = { ...form, organizations: userOrgs };
      if (u?.id) await usersApi.update(u.id, payload);
      else await usersApi.create(payload);
      onSave();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{u ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">First Name</label>
              <input className="input-field" value={form.firstName || ''} onChange={e => f('firstName', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Last Name</label>
              <input className="input-field" value={form.lastName || ''} onChange={e => f('lastName', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
            <input type="email" className="input-field" value={form.email || ''} onChange={e => f('email', e.target.value)} required />
          </div>
          {!u && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
              <input type="password" className="input-field" value={form.password || ''} onChange={e => f('password', e.target.value)} required />
            </div>
          )}
          {/* Multi-Org Assignment Block */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-800">Organization & Role Assignments</label>
              <button 
                type="button" 
                onClick={() => setUserOrgs([...userOrgs, { organizationId: '', roleId: '', isPrimary: userOrgs.length === 0 }])}
                className="text-xs flex items-center gap-1 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 px-2 py-1 rounded-md transition-colors"
               >
                <Plus className="w-3 h-3" /> Add Assignment
              </button>
            </div>
            
            <div className="space-y-3">
              {userOrgs.map((assign, index) => (
                <div key={index} className={`p-3 rounded-lg border relative ${assign.isPrimary ? 'border-[var(--color-accent)]/40 bg-[var(--color-accent)]/5' : 'border-slate-200 bg-slate-50'}`}>
                  {userOrgs.length > 1 && (
                    <button type="button" onClick={() => setUserOrgs(userOrgs.filter((_, i) => i !== index))} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3 pr-6">
                    <div>
                      <TreeComboBox 
                        value={assign.organizationId}
                        items={treeItems}
                        placeholder="Select Organization"
                        disabled={form.isSuperAdmin}
                        onChange={(val: string) => {
                          const newOrgs = [...userOrgs];
                          newOrgs[index].organizationId = val;
                          setUserOrgs(newOrgs);
                        }}
                      />
                    </div>
                    <div>
                      <RoleComboBox 
                        value={assign.roleId}
                        roles={roles}
                        disabled={form.isSuperAdmin}
                        onChange={(val: string) => {
                          const newOrgs = [...userOrgs];
                          newOrgs[index].roleId = val;
                          setUserOrgs(newOrgs);
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                     <label className="flex items-center gap-2 cursor-pointer text-xs group">
                        <input 
                          type="radio" 
                          name="primaryOrgSettings" 
                          checked={assign.isPrimary} 
                          onChange={() => {
                            const newOrgs = userOrgs.map((o, i) => ({ ...o, isPrimary: i === index }));
                            setUserOrgs(newOrgs);
                          }}
                          className="text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer" 
                        />
                        <span className={`transition-colors ${assign.isPrimary ? 'text-[var(--color-accent)] font-medium' : 'text-slate-500 group-hover:text-slate-700'}`}>
                          Primary Context
                        </span>
                     </label>
                  </div>
                </div>
              ))}
            </div>
            {form.isSuperAdmin && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-3 bg-amber-50 p-2 rounded-md">
                <Shield className="w-3 h-3 flex-shrink-0" /> Platform Admins possess all roles.
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="iuActive" checked={form.isActive} onChange={e => f('isActive', e.target.checked)} className="rounded border-slate-300" />
            <label htmlFor="iuActive" className="text-sm text-slate-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {u ? 'Save' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UsersTab = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 50;

  const [modal, setModal] = useState<any>(null);
  const [permissionsModal, setPermissionsModal] = useState<any>(null);
  const [resetPasswordModal, setResetPasswordModal] = useState<any>(null);
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isLoading: boolean;
    onConfirm: () => Promise<void>;
    confirmLabel?: string;
    variant?: any;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isLoading: false,
    onConfirm: async () => { },
  });

  const closeConfirm = () => setConfirm(prev => ({ ...prev, isOpen: false }));

  const load = async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const res = await usersApi.getAll(search || undefined, true, skip, itemsPerPage);
      if (res && typeof res === 'object' && 'items' in res) {
        setUsers(res.items);
        setTotalUsers(res.total);
      } else {
        setUsers(Array.isArray(res) ? res : []);
        setTotalUsers(Array.isArray(res) ? res.length : 0);
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const loadStatic = async () => {
      try {
        const [allRoles, allOrgs] = await Promise.all([
          rolesApi.getAll(true),
          orgsApi.getAll(undefined, true)
        ]);
        setRoles(allRoles);
        setOrgs(allOrgs);
      } catch { }
    };
    loadStatic();
  }, []);

  useEffect(() => {
    load();
  }, [currentPage, search]);

  const filtered = users;

  const handleDelete = async (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? They will lose access to the system until restored.',
      isLoading: false,
      onConfirm: async () => {
        setConfirm(prev => ({ ...prev, isLoading: true }));
        try {
          await usersApi.delete(id);
          load();
          closeConfirm();
        } catch {
          setConfirm(prev => ({ ...prev, isLoading: false }));
        }
      },
      confirmLabel: 'Delete',
      variant: 'danger'
    } as any);
  };

  const handleRestore = async (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Restore User',
      message: 'Are you sure you want to restore this user?',
      isLoading: false,
      onConfirm: async () => {
        setConfirm(prev => ({ ...prev, isLoading: true }));
        try {
          await usersApi.restore(id);
          load();
          closeConfirm();
        } catch {
          setConfirm(prev => ({ ...prev, isLoading: false }));
        }
      },
      confirmLabel: 'Restore',
      variant: 'primary'
    } as any);
  };

  const handlePurge = async (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Permanently Delete User',
      message: 'Are you sure? This action is IRREVERSIBLE and will permanently delete the user from the system.',
      isLoading: false,
      onConfirm: async () => {
        setConfirm(prev => ({ ...prev, isLoading: true }));
        try {
          await usersApi.purge(id);
          load();
          closeConfirm();
        } catch {
          setConfirm(prev => ({ ...prev, isLoading: false }));
        }
      },
      confirmLabel: 'Permanently Delete',
      variant: 'danger'
    } as any);
  };

  return (
    <div className="p-6 space-y-4">
      {modal && <UserModal user={modal === 'new' ? null : modal} roles={roles} orgs={orgs} currentOrgId={user?.organizationId} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}
      {permissionsModal && <UserPermissionsModal user={permissionsModal} onClose={() => setPermissionsModal(null)} onSave={() => setPermissionsModal(null)} />}
      <ResetPasswordModal 
        isOpen={!!resetPasswordModal} 
        userName={resetPasswordModal?.firstName ? `${resetPasswordModal.firstName} ${resetPasswordModal.lastName}` : resetPasswordModal?.email}
        onClose={() => setResetPasswordModal(null)} 
        onConfirm={async (newPassword) => {
          if (!resetPasswordModal?.id) return;
          await usersApi.resetPassword(resetPasswordModal.id, newPassword);
        }}
      />
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">Users</h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage user accounts and organization access</p>
        </div>
        <HasPermission permission="users:write">
          <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> New User
          </button>
        </HasPermission>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input 
          className="input-field pl-9 py-1.5 text-sm" 
          placeholder="Search users..." 
          value={search} 
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-slate-100">
              <Users className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No users found</p>
            </div>
          ) : (
            <>
              {filtered.map(u => (
                <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border group transition-colors ${u.isDeleted ? 'bg-red-50 border-red-100 opacity-70' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm hover:shadow-md'}`}>
                  <div className={`w-10 h-10 rounded-lg font-bold text-sm flex items-center justify-center shrink-0 ${u.isDeleted ? 'bg-red-100 text-red-500' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'}`}>
                    {(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${u.isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                      </p>
                      {u.isSuperAdmin && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-tighter leading-none">⚡ Super</span>
                      )}
                      {u.isDeleted && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase tracking-tighter leading-none">Deleted</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      <span className="text-slate-300">•</span>
                      <p className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 rounded uppercase">{u.role?.name || 'No Role'}</p>
                    </div>
                    
                    {u.organizations?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {u.organizations.map((uo: any, idx: number) => (
                          <span key={idx} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${uo.isPrimary ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                            {uo.organization?.name || '...'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {!u.isDeleted && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!u.isDeleted ? (
                        <>
                          <HasPermission permission="users:write">
                            <button onClick={() => setModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit user">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </HasPermission>
                          {user?.isSuperAdmin && (
                            <>
                              <button onClick={() => setPermissionsModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Permission Overrides">
                                <Shield className="w-4 h-4" />
                              </button>
                              <button onClick={() => setResetPasswordModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Reset Password">
                                <Key className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <HasPermission permission="users:write">
                            <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete user">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </HasPermission>
                        </>
                      ) : user?.isSuperAdmin && (
                        <>
                          <button onClick={() => handleRestore(u.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Restore user">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button onClick={() => handlePurge(u.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-100 transition-colors" title="Permanently delete user">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalUsers > itemsPerPage && (
                <div className="px-6 py-4 flex items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm mt-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Page {currentPage} of {Math.ceil(totalUsers / itemsPerPage)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all text-slate-600"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalUsers / itemsPerPage), p + 1))}
                      disabled={currentPage * itemsPerPage >= totalUsers}
                      className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all text-slate-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmDialog 
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        isLoading={confirm.isLoading}
        onConfirm={confirm.onConfirm}
        onClose={closeConfirm}
        confirmLabel={confirm.confirmLabel}
        variant={confirm.variant}
      />
    </div>
  );
};

// ─── Role Permissions Tab ───────────────────────────
const PermissionModal = ({ perm, onClose, onSave }: any) => {
  const [form, setForm] = useState(perm || { action: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (perm?.id) await permissionsApi.update(perm.id, form);
      else await permissionsApi.create(form);
      onSave();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">{perm ? 'Edit Permission' : 'New Permission'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Action</label>
            <input className="input-field" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} placeholder="e.g. users:read" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
            <textarea className="input-field resize-none" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe this permission..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {perm ? 'Save' : 'Create Permission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const RolePermissionsTab = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
    confirmLabel?: string;
    variant?: any;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    isLoading: false,
  });

  const closeConfirm = () => setConfirm(prev => ({ ...prev, isOpen: false }));

  const handleDeleteDialog = (title: string, message: string, onConfirm: () => Promise<void>, confirmLabel?: string, variant?: any) => {
    setConfirm({
      isOpen: true,
      title,
      message,
      isLoading: false,
      onConfirm: async () => {
        setConfirm(prev => ({ ...prev, isLoading: true }));
        try {
          await onConfirm();
          closeConfirm();
        } catch (err) {
          console.error(err);
          setConfirm(prev => ({ ...prev, isLoading: false }));
        }
      },
      confirmLabel,
      variant
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const all = await permissionsApi.getAll(true);
      setPermissions(all);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = permissions.filter(p =>
    p.action.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, action: string) => {
    handleDeleteDialog(
      'Delete Permission',
      `Are you sure you want to delete the permission "${action}"?`,
      async () => {
        await permissionsApi.delete(id);
        load();
      },
      'Delete',
      'danger'
    );
  };

  const handleRestore = async (id: string, action: string) => {
    handleDeleteDialog(
      'Restore Permission',
      `Are you sure you want to restore the permission "${action}"?`,
      async () => {
        await permissionsApi.restore(id);
        load();
      },
      'Restore',
      'primary'
    );
  };

  const handlePurge = async (id: string, action: string) => {
    handleDeleteDialog(
      'Permanently Delete Permission',
      `Are you ABSOLUTELY sure you want to permanently delete "${action}"? This action is irreversible!`,
      async () => {
        await permissionsApi.purge(id);
        load();
      },
      'Permanently Delete',
      'danger'
    );
  };

  return (
    <div className="p-6 space-y-4">
      {modal && <PermissionModal perm={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">Role Permissions</h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage system permissions available for roles</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
          <Plus className="w-3.5 h-3.5" /> New Permission
        </button>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input-field pl-9 py-1.5 text-sm" placeholder="Search permissions..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="card bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldCheck className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No permissions found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Action', 'Description', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(perm => (
                  <tr key={perm.id} className={`hover:bg-slate-50/70 group transition-colors ${perm.isDeleted ? 'bg-red-50/50' : ''}`}>
                    <td className="px-5 py-4 font-mono text-xs font-semibold">
                      <span className={perm.isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}>{perm.action}</span>
                      {perm.isDeleted && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 leading-none uppercase tracking-tighter">DELETED</span>}
                    </td>
                    <td className={`px-5 py-4 ${perm.isDeleted ? 'text-slate-400 italic' : 'text-slate-500'}`}>{perm.description || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!perm.isDeleted ? (
                          <>
                            <button onClick={() => setModal(perm)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(perm.id, perm.action)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </>
                        ) : (
                          user?.isSuperAdmin && (
                            <>
                              <button onClick={() => handleRestore(perm.id, perm.action)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Restore permission">
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button onClick={() => handlePurge(perm.id, perm.action)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-100 transition-colors" title="Permanently delete permission">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConfirmDialog 
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        isLoading={confirm.isLoading}
        onConfirm={confirm.onConfirm}
        onClose={closeConfirm}
        confirmLabel={confirm.confirmLabel}
        variant={confirm.variant}
      />
    </div>
  );
};

// ─── Organization Types Tab ───────────────────────
const OrgTypeModal = ({ type, onClose, onSave }: any) => {
  const [form, setForm] = useState(type || { name: '', description: '' });
  const [loading, setLoading] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      if (type?.id) await organizationTypesApi.update(type.id, form);
      else await organizationTypesApi.create(form);
      onSave();
    } catch { } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">{type ? 'Edit Org Type' : 'New Org Type'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Type Name</label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Distributor" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
            <textarea className="input-field" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the role of this organization type" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} {type ? 'Save Changes' : 'Create Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OrganizationTypesTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const { user } = useAuth();
  
  const [confirm, setConfirm] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: async () => {}, isLoading: false });
  const closeConfirm = () => setConfirm((p: any) => ({ ...p, isOpen: false }));

  const load = async () => {
    setLoading(true);
    try { setItems(await organizationTypesApi.getAll(true)); } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const del = (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Org Type',
      message: 'Are you sure? This will soft-delete the org type.',
      onConfirm: async () => { await organizationTypesApi.delete(id); load(); closeConfirm(); },
    });
  };

  const restore = (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Restore Org Type',
      message: 'Restore this organization type?',
      onConfirm: async () => { await organizationTypesApi.restore(id); load(); closeConfirm(); },
    });
  };

  const purge = (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Permanently Delete',
      message: 'THIS IS IRREVERSIBLE. Proceed?',
      onConfirm: async () => { await organizationTypesApi.purge(id); load(); closeConfirm(); },
    });
  };

  return (
    <div className="p-6">
      {modal && <OrgTypeModal type={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Organization Types</h3>
        <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
          <Plus className="w-3.5 h-3.5" /> New Type
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {items.map(t => (
            <div key={t.id} className={`flex items-center justify-between p-4 rounded-xl border group transition-colors ${t.isDeleted ? 'bg-red-50 border-red-100 opacity-70' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold uppercase tracking-wide font-mono ${t.isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.name}</p>
                  {t.isDeleted && <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-100 text-red-600 rounded-full">Deleted</span>}
                </div>
                <p className="text-xs text-slate-500">{t.description || 'No description'}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!t.isDeleted ? (
                  <>
                    <button onClick={() => setModal(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => del(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </>
                ) : user?.isSuperAdmin && (
                  <>
                    <button onClick={() => restore(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                    <button onClick={() => purge(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog isOpen={confirm.isOpen} title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onClose={closeConfirm} isLoading={confirm.isLoading} />
    </div>
  );
};


// ─── Materials Management Sub-Tabs & Relational CRUD ─────────────────

const ProductTypeModal = ({ item, onClose, onSave }: any) => {
  const [form, setForm] = useState(item || { name: '', slug: '', isActive: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (item?.id) {
        await productTypesApi.update(item.id, form);
      } else {
        await productTypesApi.create(form);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save product type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">{item ? 'Edit Product Type' : 'New Product Type'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Name <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Screen Protector" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Slug</label>
            <input className="input-field" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="e.g. screen-protector (auto-generated if empty)" />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
            </label>
            <span className="text-sm text-slate-700">Active</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} {item ? 'Save Changes' : 'Create Product Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MaterialCategoryModal = ({ item, productTypes, onClose, onSave }: any) => {
  const [form, setForm] = useState(item || { name: '', description: '', productTypeId: '', isActive: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item && productTypes.length > 0) {
      setForm((prev: any) => ({ ...prev, productTypeId: productTypes[0].id }));
    }
  }, [item, productTypes]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productTypeId) {
      setError('Product Type is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (item?.id) {
        await materialCategoriesApi.update(item.id, form);
      } else {
        await materialCategoriesApi.create(form);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">{item ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Product Type <span className="text-red-500">*</span></label>
            <select className="input-field" value={form.productTypeId} onChange={e => setForm({ ...form, productTypeId: e.target.value })} required>
              <option value="" disabled>Select Product Type</option>
              {productTypes.map((pt: any) => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Category Name <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. TPU Film" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
            <textarea className="input-field" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
            </label>
            <span className="text-sm text-slate-700">Active</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} {item ? 'Save Changes' : 'Create Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FilmCategoryModal = ({ item, materialCategories, onClose, onSave }: any) => {
  const [form, setForm] = useState(item || { name: '', materialCategoryId: '', isActive: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item && materialCategories.length > 0) {
      setForm((prev: any) => ({ ...prev, materialCategoryId: materialCategories[0].id }));
    }
  }, [item, materialCategories]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.materialCategoryId) {
      setError('Material Category is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (item?.id) {
        await filmCategoriesApi.update(item.id, form);
      } else {
        await filmCategoriesApi.create(form);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save film category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">{item ? 'Edit Film Category' : 'New Film Category'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Material Category <span className="text-red-500">*</span></label>
            <select className="input-field" value={form.materialCategoryId} onChange={e => setForm({ ...form, materialCategoryId: e.target.value })} required>
              <option value="" disabled>Select Material Category</option>
              {materialCategories.map((mc: any) => (
                <option key={mc.id} value={mc.id}>{mc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Film Category Name <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ultra Clear" required />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
            </label>
            <span className="text-sm text-slate-700">Active</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} {item ? 'Save Changes' : 'Create Film Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MaterialModal = ({ item, productTypes, materialCategories, filmCategories, onClose, onSave }: any) => {
  const [form, setForm] = useState(item || { name: '', filmCategoryId: '', thickness: '', layers: 1, minSpeed: '', minForce: '', isActive: true });
  
  const initialFilmCategoryId = item?.filmCategoryId || '';
  const initialMaterialCategoryId = item?.filmCategory?.materialCategoryId || '';
  const initialProductTypeId = item?.filmCategory?.materialCategory?.productTypeId || '';

  const [selectedProductTypeId, setSelectedProductTypeId] = useState(initialProductTypeId);
  const [selectedMaterialCategoryId, setSelectedMaterialCategoryId] = useState(initialMaterialCategoryId);
  const [selectedFilmCategoryId, setSelectedFilmCategoryId] = useState(initialFilmCategoryId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter categories by selected product type
  const filteredCategories = materialCategories.filter((mc: any) => mc.productTypeId === selectedProductTypeId);
  // Film category is not dependent on category
  const filteredFilmCategories = filmCategories;

  // Cascading selections
  useEffect(() => {
    // If we have product types, pre-select the first one if none selected
    if (!selectedProductTypeId && productTypes.length > 0) {
      setSelectedProductTypeId(productTypes[0].id);
    }
  }, [productTypes, selectedProductTypeId]);

  useEffect(() => {
    if (selectedProductTypeId) {
      const match = filteredCategories.find((c: any) => c.id === selectedMaterialCategoryId);
      if (!match) {
        setSelectedMaterialCategoryId(filteredCategories[0]?.id || '');
      }
    }
  }, [selectedProductTypeId, filteredCategories, selectedMaterialCategoryId]);

  useEffect(() => {
    if (!selectedFilmCategoryId && filmCategories.length > 0) {
      setSelectedFilmCategoryId(filmCategories[0].id);
    }
  }, [filmCategories, selectedFilmCategoryId]);

  // Sync filmCategoryId into form state when selectedFilmCategoryId changes
  useEffect(() => {
    setForm((prev: any) => ({ ...prev, filmCategoryId: selectedFilmCategoryId }));
  }, [selectedFilmCategoryId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.filmCategoryId) {
      setError('Film Category is required');
      return;
    }
    setLoading(true);
    setError('');
    
    // Parse numeric fields properly
    const payload = {
      ...form,
      thickness: form.thickness ? parseFloat(form.thickness) : null,
      layers: form.layers ? parseInt(form.layers, 10) : 1,
      minSpeed: form.minSpeed ? parseInt(form.minSpeed, 10) : null,
      minForce: form.minForce ? parseInt(form.minForce, 10) : null,
    };

    try {
      if (item?.id) {
        await materialsApi.update(item.id, payload);
      } else {
        await materialsApi.create(payload);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">{item ? 'Edit Material' : 'New Material'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Product Type <span className="text-red-500">*</span></label>
            <select className="input-field" value={selectedProductTypeId} onChange={e => setSelectedProductTypeId(e.target.value)} required>
              <option value="" disabled>Select Product Type</option>
              {productTypes.map((pt: any) => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Category <span className="text-red-500">*</span></label>
            <select className="input-field" value={selectedMaterialCategoryId} onChange={e => setSelectedMaterialCategoryId(e.target.value)} required>
              <option value="" disabled>Select Category</option>
              {filteredCategories.map((mc: any) => (
                <option key={mc.id} value={mc.id}>{mc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Film Category <span className="text-red-500">*</span></label>
            <select className="input-field" value={selectedFilmCategoryId} onChange={e => setSelectedFilmCategoryId(e.target.value)} required>
              <option value="" disabled>Select Film Category</option>
              {filteredFilmCategories.map((fc: any) => (
                <option key={fc.id} value={fc.id}>{fc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Material Name <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Matte HD Skin" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Thickness (mm)</label>
              <input type="number" step="0.0001" className="input-field" value={form.thickness || ''} onChange={e => setForm({ ...form, thickness: e.target.value })} placeholder="0.000" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Layers</label>
              <input type="number" className="input-field" value={form.layers} onChange={e => setForm({ ...form, layers: e.target.value })} placeholder="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Min Speed</label>
              <input type="number" className="input-field" value={form.minSpeed || ''} onChange={e => setForm({ ...form, minSpeed: e.target.value })} placeholder="e.g. 10" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Min Force</label>
              <input type="number" className="input-field" value={form.minForce || ''} onChange={e => setForm({ ...form, minForce: e.target.value })} placeholder="e.g. 30" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
              <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-accent)]"></div>
            </label>
            <span className="text-sm text-slate-700">Active</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} {item ? 'Save Changes' : 'Create Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// MaterialCutConfigModal removed

const MaterialsTab = () => {
  const [subTab, setSubTab] = useState('product-types');
  const [search, setSearch] = useState('');
  const [includeDeleted, setIncludeDeleted] = useState(false);
  
  // Data lists
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [materialCategories, setMaterialCategories] = useState<any[]>([]);
  const [filmCategories, setFilmCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  // Pagination state for materials sub-tab
  const [currentPage, setCurrentPage] = useState(1);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const itemsPerPage = 50;

  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const { user } = useAuth();

  const [confirm, setConfirm] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: async () => {}, isLoading: false });
  const closeConfirm = () => setConfirm((p: any) => ({ ...p, isOpen: false }));

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'product-types') {
        setProductTypes(await productTypesApi.getAll(search || undefined, includeDeleted));
      } else if (subTab === 'material-categories') {
        const [categoriesList, ptList] = await Promise.all([
          materialCategoriesApi.getAll(search || undefined, includeDeleted),
          productTypesApi.getAll()
        ]);
        setMaterialCategories(categoriesList);
        setProductTypes(ptList);
      } else if (subTab === 'film-categories') {
        const [fcList, mcList] = await Promise.all([
          filmCategoriesApi.getAll(search || undefined),
          materialCategoriesApi.getAll()
        ]);
        setFilmCategories(fcList);
        setMaterialCategories(mcList);
      } else if (subTab === 'materials') {
        const skip = (currentPage - 1) * itemsPerPage;
        const [res, ptList, mcList, fcList] = await Promise.all([
          materialsApi.getAll(search || undefined, includeDeleted, skip, itemsPerPage),
          productTypesApi.getAll(),
          materialCategoriesApi.getAll(),
          filmCategoriesApi.getAll()
        ]);
        if (res && typeof res === 'object' && 'items' in res) {
          setMaterials(res.items);
          setTotalMaterials(res.total);
        } else {
          setMaterials(Array.isArray(res) ? res : []);
          setTotalMaterials(Array.isArray(res) ? res.length : 0);
        }
        setProductTypes(ptList);
        setMaterialCategories(mcList);
        setFilmCategories(fcList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subTab, search, includeDeleted, currentPage]);

  // Actions for ProductTypes
  const deleteProductType = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Product Type',
      message: `Delete product type "${item.name}"? This will soft-delete the product type.`,
      onConfirm: async () => { await productTypesApi.remove(item.id); loadData(); closeConfirm(); },
    });
  };
  const restoreProductType = (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Restore Product Type',
      message: 'Restore this product type?',
      onConfirm: async () => { await productTypesApi.restore(id); loadData(); closeConfirm(); },
    });
  };
  const purgeProductType = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Permanently Delete Product Type',
      message: `PERMANENTLY delete product type "${item.name}"? Warning: This action is irreversible.`,
      onConfirm: async () => { await productTypesApi.purge(item.id); loadData(); closeConfirm(); },
    });
  };

  // Actions for MaterialCategories
  const deleteMaterialCategory = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Category',
      message: `Delete category "${item.name}"? This will soft-delete the category.`,
      onConfirm: async () => { await materialCategoriesApi.remove(item.id); loadData(); closeConfirm(); },
    });
  };
  const restoreMaterialCategory = (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Restore Category',
      message: 'Restore this material category?',
      onConfirm: async () => { await materialCategoriesApi.restore(id); loadData(); closeConfirm(); },
    });
  };
  const purgeMaterialCategory = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Permanently Delete Category',
      message: `PERMANENTLY delete category "${item.name}"? Warning: This action is irreversible.`,
      onConfirm: async () => { await materialCategoriesApi.purge(item.id); loadData(); closeConfirm(); },
    });
  };

  // Actions for FilmCategories
  const deleteFilmCategory = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Film Category',
      message: `Delete film category "${item.name}"?`,
      onConfirm: async () => { await filmCategoriesApi.remove(item.id); loadData(); closeConfirm(); },
    });
  };
  const purgeFilmCategory = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Permanently Delete Film Category',
      message: `PERMANENTLY delete film category "${item.name}"? Warning: This action is irreversible.`,
      onConfirm: async () => { await filmCategoriesApi.purge(item.id); loadData(); closeConfirm(); },
    });
  };

  // Actions for Materials
  const deleteMaterial = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Material',
      message: `Delete material "${item.name}"? This will soft-delete the material.`,
      onConfirm: async () => { await materialsApi.remove(item.id); loadData(); closeConfirm(); },
    });
  };
  const restoreMaterial = (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Restore Material',
      message: 'Restore this material?',
      onConfirm: async () => { await materialsApi.restore(id); loadData(); closeConfirm(); },
    });
  };
  const purgeMaterial = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Permanently Delete Material',
      message: `PERMANENTLY delete material "${item.name}"? Warning: This action is irreversible.`,
      onConfirm: async () => { await materialsApi.purge(item.id); loadData(); closeConfirm(); },
    });
  };

  // Actions for Cut Configs removed

  const subTabsList = [
    { id: 'product-types', label: 'Product Types' },
    { id: 'material-categories', label: 'Categories' },
    { id: 'film-categories', label: 'Film Categories' },
    { id: 'materials', label: 'Materials' }
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Sub Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-lg shadow-sm">
        {subTabsList.map(t => (
          <button
            key={t.id}
            onClick={() => { setSubTab(t.id); setSearch(''); setCurrentPage(1); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
              subTab === t.id
                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">
            {subTabsList.find(t => t.id === subTab)?.label}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage physical film material types, groupings and cutting parameters.
          </p>
        </div>
        <HasPermission permission="catalog:write">
          <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> New Item
          </button>
        </HasPermission>
      </div>

      {subTab !== 'cut-configs' && (
        <div className="flex items-center gap-4">
          <div className="relative max-w-xs flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="input-field pl-9 py-1.5 text-sm"
              placeholder="Search..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {subTab !== 'film-categories' && (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600 select-none">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={e => setIncludeDeleted(e.target.checked)}
                className="rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
              />
              Show Deleted
            </label>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="card bg-white overflow-hidden shadow-sm border border-slate-100 rounded-xl">
          <table className="w-full text-sm">
            {subTab === 'product-types' && (
              <>
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Name', 'Slug', 'Legacy ID', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {productTypes.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">No product types found</td></tr>
                  ) : productTypes.map(t => (
                    <tr key={t.id} className={`hover:bg-slate-50/70 group transition-colors ${t.isDeleted ? 'bg-red-50/50' : ''}`}>
                      <td className="px-5 py-4 font-semibold text-slate-800">{t.name}</td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-xs">{t.slug}</td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-xs">{t.legacyId}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {t.isDeleted && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase">DELETED</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!t.isDeleted ? (
                            <>
                              <button onClick={() => setModal(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => deleteProductType(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </>
                          ) : user?.isSuperAdmin && (
                            <>
                              <button onClick={() => restoreProductType(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                              <button onClick={() => purgeProductType(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {subTab === 'material-categories' && (
              <>
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Name', 'Product Type', 'Description', 'Legacy ID', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {materialCategories.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">No categories found</td></tr>
                  ) : materialCategories.map(t => (
                    <tr key={t.id} className={`hover:bg-slate-50/70 group transition-colors ${t.isDeleted ? 'bg-red-50/50' : ''}`}>
                      <td className="px-5 py-4 font-semibold text-slate-800">{t.name}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">{t.productType?.name || '—'}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs max-w-xs truncate">{t.description || '—'}</td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-xs">{t.legacyId}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {t.isDeleted && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase">DELETED</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!t.isDeleted ? (
                            <>
                              <button onClick={() => setModal(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => deleteMaterialCategory(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </>
                          ) : user?.isSuperAdmin && (
                            <>
                              <button onClick={() => restoreMaterialCategory(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                              <button onClick={() => purgeMaterialCategory(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {subTab === 'film-categories' && (
              <>
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Name', 'Material Category', 'Legacy ID', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filmCategories.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">No film categories found</td></tr>
                  ) : filmCategories.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/70 group transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-800">{t.name}</td>
                      <td className="px-5 py-4 text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">{t.materialCategory?.name || '—'}</span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 font-mono text-xs">{t.legacyId}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setModal(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => deleteFilmCategory(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          {user?.isSuperAdmin && (
                            <button onClick={() => purgeFilmCategory(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-100 transition-colors" title="Purge permanently"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {subTab === 'materials' && (
              <>
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Name', 'Film Category', 'Thickness', 'Layers', 'Force/Speed', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {materials.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400">No materials found</td></tr>
                  ) : materials.map(t => (
                    <tr key={t.id} className={`hover:bg-slate-50/70 group transition-colors ${t.isDeleted ? 'bg-red-50/50' : ''}`}>
                      <td className="px-5 py-4">
                        <p className={`font-semibold ${t.isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">Legacy ID: {t.legacyId}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-slate-700">{t.filmCategory?.name || '—'}</p>
                          {t.filmCategory?.materialCategory && (
                            <p className="text-[10px] text-slate-400">
                              {t.filmCategory.materialCategory.productType?.name || '—'} / {t.filmCategory.materialCategory.name || '—'}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 text-xs font-mono">{t.thickness ? `${t.thickness}mm` : '—'}</td>
                      <td className="px-5 py-4 text-slate-600 text-xs">{t.layers}</td>
                      <td className="px-5 py-4 text-slate-600 text-xs font-mono">{t.minForce || '—'} / {t.minSpeed || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {t.isDeleted && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase">DELETED</span>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!t.isDeleted ? (
                            <>
                              <button onClick={() => setModal(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => deleteMaterial(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </>
                          ) : user?.isSuperAdmin && (
                            <>
                              <button onClick={() => restoreMaterial(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                              <button onClick={() => purgeMaterial(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </>
            )}

            {/* Cut Configs Table Removed */}
          </table>
          {subTab === 'materials' && totalMaterials > itemsPerPage && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Page {currentPage} of {Math.ceil(totalMaterials / itemsPerPage)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all text-slate-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalMaterials / itemsPerPage), p + 1))}
                  disabled={currentPage * itemsPerPage >= totalMaterials}
                  className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all text-slate-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals trigger */}
      {modal && (
        <>
          {subTab === 'product-types' && (
            <ProductTypeModal
              item={modal === 'new' ? null : modal}
              onClose={() => setModal(null)}
              onSave={() => { setModal(null); loadData(); }}
            />
          )}
          {subTab === 'material-categories' && (
            <MaterialCategoryModal
              item={modal === 'new' ? null : modal}
              productTypes={productTypes.filter(p => p.isActive && !p.isDeleted)}
              onClose={() => setModal(null)}
              onSave={() => { setModal(null); loadData(); }}
            />
          )}
          {subTab === 'film-categories' && (
            <FilmCategoryModal
              item={modal === 'new' ? null : modal}
              materialCategories={materialCategories.filter(m => m.isActive && !m.isDeleted)}
              onClose={() => setModal(null)}
              onSave={() => { setModal(null); loadData(); }}
            />
          )}
          {subTab === 'materials' && (
            <MaterialModal
              item={modal === 'new' ? null : modal}
              productTypes={productTypes.filter(p => p.isActive && !p.isDeleted)}
              materialCategories={materialCategories.filter(m => m.isActive && !m.isDeleted)}
              filmCategories={filmCategories}
              onClose={() => setModal(null)}
              onSave={() => { setModal(null); loadData(); }}
            />
          )}
          {/* MaterialCutConfigModal trigger removed */}
        </>
      )}

      <ConfirmDialog isOpen={confirm.isOpen} title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onClose={closeConfirm} isLoading={confirm.isLoading} />
    </div>
  );
};

const AuditLogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const load = async () => {
    setLoading(true);
    try {
      const all = await auditLogsApi.getAll();
      setLogs(all);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l =>
    (l.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.entity.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedLogs = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-100">
        <p className="text-[10px] font-bold text-slate-400 uppercase">
          Page {currentPage} of {totalPages} (Total {filtered.length} entries)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all text-slate-600 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all text-slate-600 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">Audit Logs</h3>
          <p className="text-xs text-slate-400 mt-0.5">Track system actions and modifications</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-9 py-1.5 text-sm"
            placeholder="Search logs..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        {/* Top Pagination Controls */}
        <div className="flex-shrink-0">
          {renderPagination()}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="card bg-white overflow-hidden shadow-sm border border-slate-100 rounded-xl">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <List className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No audit logs found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Timestamp', 'User', 'Action', 'Entity', 'Details'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          {log.user ? (
                            <div>
                              <p className="font-semibold text-slate-800">{[log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || '—'}</p>
                              <p className="text-xs text-slate-500">{log.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">System Activity</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                            ${log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                              log.action === 'UPDATE' ? 'bg-[var(--color-gold-muted)] text-[var(--color-accent)]' :
                                'bg-red-100 text-red-700'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-600">{log.entity} <br /><span className="text-slate-400 text-[10px] break-all">{log.entityId}</span></td>
                        <td className="px-5 py-4 text-xs text-slate-500 max-w-xs truncate" title={JSON.stringify(log.details)}>{JSON.stringify(log.details)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Bottom Pagination Controls */}
              {renderPagination()}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Plotter Master Tab ─────────────────────────────
const PlotterModal = ({ plotter, onClose, onSave }: any) => {
  const defaultLegacySettings = {
    scaleX: '', scaleY: '', displayX: '', displayY: '',
    scale90X: '', scale90Y: '', display90X: '', display90Y: '',
    supportGpgl: false, isRegistrationMarkSupport: false, isMovable: false, isLpgl: false,
    isActive: true, isDelete: false, plotterType: '', searchKeyword: '',
    languageType: '', driverType: '', endPoint: '',
    basePenUp: '', basePenDown: '', targetPenUp: '', targetPenDown: '',
    baseXYSeparator: '', xySeparator: '', startString: '', endString: '',
    isAndroid: false
  };

  const [form, setForm] = useState<any>({
    plotterName: '',
    manufacturer: '',
    connectionType: 'USB',
    description: '',
    maxSpeed: '',
    maxForce: '',
    status: 'ACTIVE',
    legacySettings: defaultLegacySettings
  });

  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plotter) {
      setForm({
        plotterName: plotter.plotterName || '',
        manufacturer: plotter.manufacturer || '',
        connectionType: plotter.connectionType || '',
        description: plotter.description || '',
        maxSpeed: plotter.maxSpeed ?? '',
        maxForce: plotter.maxForce ?? '',
        status: plotter.status || 'ACTIVE',
        legacySettings: {
          ...defaultLegacySettings,
          ...(plotter.legacySettings || {})
        }
      });
    }
  }, [plotter]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (plotter?.id) {
        await plottersApi.update(plotter.id, form);
      } else {
        await plottersApi.create(form);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save plotter settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLegacyChange = (key: string, val: any) => {
    setForm((prev: any) => ({
      ...prev,
      legacySettings: {
        ...prev.legacySettings,
        [key]: val
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">{plotter ? 'Edit Plotter Configuration' : 'New Plotter Configuration'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none font-bold">×</button>
        </div>

        <div className="flex border-b border-slate-100 bg-slate-50 px-4 py-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'general' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
          >
            General Parameters
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('legacy')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'legacy' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
          >
            Legacy & Execution Settings
          </button>
        </div>

        <form onSubmit={save} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          {activeTab === 'general' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Plotter Name *</label>
                <input className="input-field" value={form.plotterName} onChange={e => setForm({ ...form, plotterName: e.target.value })} placeholder="e.g. Graphtec FC9000-75" required />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Manufacturer</label>
                <input className="input-field" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Graphtec, Roland" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Connection Type</label>
                <select className="input-field" value={form.connectionType} onChange={e => setForm({ ...form, connectionType: e.target.value })}>
                  <option value="USB">USB</option>
                  <option value="Network">Network</option>
                  <option value="Serial">Serial / COM</option>
                  <option value="Bluetooth">Bluetooth</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Max Speed (mm/s)</label>
                <input type="number" className="input-field" value={form.maxSpeed} onChange={e => setForm({ ...form, maxSpeed: e.target.value })} placeholder="e.g. 1000" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Max Force (g)</label>
                <input type="number" className="input-field" value={form.maxForce} onChange={e => setForm({ ...form, maxForce: e.target.value })} placeholder="e.g. 450" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Description</label>
                <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Provide context about this plotter unit..." />
              </div>
            </div>
          )}

          {activeTab === 'legacy' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Feature Support Flags</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.legacySettings.supportGpgl} onChange={e => handleLegacyChange('supportGpgl', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700">GPGL Command Support</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.legacySettings.isLpgl} onChange={e => handleLegacyChange('isLpgl', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700">LPGL Command Support</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.legacySettings.isRegistrationMarkSupport} onChange={e => handleLegacyChange('isRegistrationMarkSupport', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700">Registration Marks</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.legacySettings.isMovable} onChange={e => handleLegacyChange('isMovable', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700">Is Movable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.legacySettings.isAndroid} onChange={e => handleLegacyChange('isAndroid', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700">Is Android App Compatible</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.legacySettings.isActive} onChange={e => handleLegacyChange('isActive', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700">Is Legacy Active</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2 sm:col-span-4 border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Calibration & Scale (0 / 90 Degree Rotation)</h4>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Scale X</label>
                  <input type="number" step="any" className="input-field" value={form.legacySettings.scaleX} onChange={e => handleLegacyChange('scaleX', e.target.value)} placeholder="1.0" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Scale Y</label>
                  <input type="number" step="any" className="input-field" value={form.legacySettings.scaleY} onChange={e => handleLegacyChange('scaleY', e.target.value)} placeholder="1.0" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Display Width</label>
                  <input type="number" step="any" className="input-field" value={form.legacySettings.displayX} onChange={e => handleLegacyChange('displayX', e.target.value)} placeholder="mm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Display Height</label>
                  <input type="number" step="any" className="input-field" value={form.legacySettings.displayY} onChange={e => handleLegacyChange('displayY', e.target.value)} placeholder="mm" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Scale 90 X</label>
                  <input type="number" step="any" className="input-field" value={form.legacySettings.scale90X} onChange={e => handleLegacyChange('scale90X', e.target.value)} placeholder="1.0" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Scale 90 Y</label>
                  <input type="number" step="any" className="input-field" value={form.legacySettings.scale90Y} onChange={e => handleLegacyChange('scale90Y', e.target.value)} placeholder="1.0" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Display 90 W</label>
                  <input type="number" step="any" className="input-field" value={form.legacySettings.display90X} onChange={e => handleLegacyChange('display90X', e.target.value)} placeholder="mm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Display 90 H</label>
                  <input type="number" step="any" className="input-field" value={form.legacySettings.display90Y} onChange={e => handleLegacyChange('display90Y', e.target.value)} placeholder="mm" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="col-span-2 sm:col-span-4 border-b border-slate-100 pb-1">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Pen Heights & Command Strings</h4>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Base Pen Up</label>
                  <input type="number" className="input-field" value={form.legacySettings.basePenUp} onChange={e => handleLegacyChange('basePenUp', e.target.value)} placeholder="height" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Base Pen Down</label>
                  <input type="number" className="input-field" value={form.legacySettings.basePenDown} onChange={e => handleLegacyChange('basePenDown', e.target.value)} placeholder="height" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Pen Up</label>
                  <input type="number" className="input-field" value={form.legacySettings.targetPenUp} onChange={e => handleLegacyChange('targetPenUp', e.target.value)} placeholder="height" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Target Pen Down</label>
                  <input type="number" className="input-field" value={form.legacySettings.targetPenDown} onChange={e => handleLegacyChange('targetPenDown', e.target.value)} placeholder="height" />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Base XY Sep</label>
                  <input className="input-field" value={form.legacySettings.baseXYSeparator} onChange={e => handleLegacyChange('baseXYSeparator', e.target.value)} placeholder="e.g. ," />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">XY Sep</label>
                  <input className="input-field" value={form.legacySettings.xySeparator} onChange={e => handleLegacyChange('xySeparator', e.target.value)} placeholder="e.g. ," />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Start Command</label>
                  <input className="input-field" value={form.legacySettings.startString} onChange={e => handleLegacyChange('startString', e.target.value)} placeholder="e.g. IN;" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">End Command</label>
                  <input className="input-field" value={form.legacySettings.endString} onChange={e => handleLegacyChange('endString', e.target.value)} placeholder="e.g. PU0,0;" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Plotter Type (Legacy)</label>
                  <input className="input-field" value={form.legacySettings.plotterType} onChange={e => handleLegacyChange('plotterType', e.target.value)} placeholder="e.g. GRAPHTEC_GPGL" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Search Keywords</label>
                  <input className="input-field" value={form.legacySettings.searchKeyword} onChange={e => handleLegacyChange('searchKeyword', e.target.value)} placeholder="Space separated list..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Language Type</label>
                  <input className="input-field" value={form.legacySettings.languageType} onChange={e => handleLegacyChange('languageType', e.target.value)} placeholder="e.g. GP-GL, HP-GL" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Driver Type</label>
                  <input className="input-field" value={form.legacySettings.driverType} onChange={e => handleLegacyChange('driverType', e.target.value)} placeholder="e.g. Graphtec" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Endpoint Path / IP</label>
                  <input className="input-field font-mono" value={form.legacySettings.endPoint} onChange={e => handleLegacyChange('endPoint', e.target.value)} placeholder="/dev/usb/lp0 or Network address" />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {plotter ? 'Save Configuration' : 'Create Plotter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PlotterDeviceModal = ({ device, plotterMasters, organizations, onClose, onSave }: any) => {
  const [form, setForm] = useState<any>({
    name: '',
    serialNumber: '',
    licenseKey: '',
    macAddress: '',
    plotterMasterId: '',
    organizationId: '',
    status: 'ACTIVE',
    ipAddress: '',
    comPort: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (device) {
      setForm({
        name: device.name || '',
        serialNumber: device.serialNumber || '',
        licenseKey: device.licenseKey || '',
        macAddress: device.macAddress || '',
        plotterMasterId: device.plotterMasterId || '',
        organizationId: device.organizationId || '',
        status: device.status || 'ACTIVE',
        ipAddress: device.ipAddress || '',
        comPort: device.comPort || '',
        description: device.description || ''
      });
    } else if (plotterMasters && plotterMasters.length > 0) {
      setForm((prev: any) => ({ ...prev, plotterMasterId: plotterMasters[0].id }));
    }
  }, [device, plotterMasters]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!form.plotterMasterId) throw new Error('Plotter Type is required');
      if (device?.id) {
        await plotterDevicesApi.update(device.id, form);
      } else {
        await plotterDevicesApi.create(form);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save physical plotter device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-black text-slate-800 tracking-tight">{device ? 'Edit Physical Plotter' : 'New Physical Plotter'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none font-bold">×</button>
        </div>

        <form onSubmit={save} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Plotter Name *</label>
              <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Workshop Unit A" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Plotter Type (Master) *</label>
              <select className="input-field" value={form.plotterMasterId} onChange={e => setForm({ ...form, plotterMasterId: e.target.value })} required>
                <option value="">-- Select Type --</option>
                {plotterMasters.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.plotterName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Assigned Organization</label>
              <select className="input-field" value={form.organizationId} onChange={e => setForm({ ...form, organizationId: e.target.value })}>
                <option value="">-- None / System Stock --</option>
                {organizations.map((org: any) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Serial Number</label>
              <input className="input-field" value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} placeholder="e.g. SN-983172A" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">MAC Address</label>
              <input className="input-field font-mono" value={form.macAddress} onChange={e => setForm({ ...form, macAddress: e.target.value })} placeholder="e.g. 00:1A:2B:3C:4D:5E" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">License Key</label>
              <input className="input-field font-mono" value={form.licenseKey} onChange={e => setForm({ ...form, licenseKey: e.target.value })} placeholder="e.g. FG-PLT-XXXX-XXXX" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">IP Address / Host</label>
              <input className="input-field font-mono" value={form.ipAddress} onChange={e => setForm({ ...form, ipAddress: e.target.value })} placeholder="e.g. 192.168.1.100" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">COM Port Name</label>
              <input className="input-field" value={form.comPort} onChange={e => setForm({ ...form, comPort: e.target.value })} placeholder="e.g. COM3" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Description / Notes</label>
              <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Add extra setup notes..." />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {device ? 'Save Changes' : 'Add Plotter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PlottersTabSettings = () => {
  const [subTab, setSubTab] = useState('plotter-types'); // 'plotter-types' | 'physical-plotters'
  const [plotters, setPlotters] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [plotterMasters, setPlotterMasters] = useState<any[]>([]); // for dropdown
  const [organizations, setOrganizations] = useState<any[]>([]); // for dropdown

  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [modal, setModal] = useState<any>(null);
  
  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
    isLoading: false,
  });

  const closeConfirm = () => setConfirm(prev => ({ ...prev, isOpen: false }));

  // Load dropdown resources once
  const loadDropdowns = async () => {
    try {
      const [allMasters, allOrgs] = await Promise.all([
        plottersApi.getAll(),
        orgsApi.getAll()
      ]);
      setPlotterMasters(allMasters || []);
      setOrganizations(allOrgs || []);
    } catch (err) {
      console.error('Failed to load dropdown resources', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (subTab === 'plotter-types') {
        const result = await plottersApi.getAll(search, currentPage, itemsPerPage);
        setPlotters(result.items || []);
        setTotal(result.total || 0);
      } else {
        const result = await plotterDevicesApi.getAll(search, undefined, undefined, currentPage, itemsPerPage);
        setDevices(result.items || []);
        setTotal(result.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    loadData();
  }, [subTab, search, currentPage]);

  const handleDelete = (item: any) => {
    if (subTab === 'plotter-types') {
      setConfirm({
        isOpen: true,
        title: 'Delete Plotter Type',
        message: `Are you sure you want to delete the plotter type "${item.plotterName}"? This will permanently remove it, its legacy settings, and any physical plotters associated with it.`,
        isLoading: false,
        onConfirm: async () => {
          setConfirm(prev => ({ ...prev, isLoading: true }));
          try {
            await plottersApi.delete(item.id);
            loadData();
            closeConfirm();
          } catch (err) {
            console.error(err);
            setConfirm(prev => ({ ...prev, isLoading: false }));
          }
        }
      });
    } else {
      setConfirm({
        isOpen: true,
        title: 'Delete Physical Plotter',
        message: `Are you sure you want to delete the physical plotter machine "${item.name}"?`,
        isLoading: false,
        onConfirm: async () => {
          setConfirm(prev => ({ ...prev, isLoading: true }));
          try {
            await plotterDevicesApi.delete(item.id);
            loadData();
            closeConfirm();
          } catch (err) {
            console.error(err);
            setConfirm(prev => ({ ...prev, isLoading: false }));
          }
        }
      });
    }
  };

  const totalPages = Math.ceil(total / itemsPerPage);

  const subTabsList = [
    { id: 'plotter-types', label: 'Plotter Types' },
    { id: 'physical-plotters', label: 'Physical Plotters' }
  ];

  return (
    <div className="p-6 space-y-4">
      {/* Sub Tabs Bar */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-lg shadow-sm max-w-sm">
        {subTabsList.map(t => (
          <button
            key={t.id}
            onClick={() => { setSubTab(t.id); setSearch(''); setCurrentPage(1); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              subTab === t.id
                ? 'bg-indigo-600 text-white shadow-sm font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {modal && (
        subTab === 'plotter-types' ? (
          <PlotterModal
            plotter={modal === 'new' ? null : modal}
            onClose={() => setModal(null)}
            onSave={() => { setModal(null); loadData(); }}
          />
        ) : (
          <PlotterDeviceModal
            device={modal === 'new' ? null : modal}
            plotterMasters={plotterMasters}
            organizations={organizations}
            onClose={() => setModal(null)}
            onSave={() => { setModal(null); loadData(); }}
          />
        )
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">
            {subTab === 'plotter-types' ? 'Plotter Type Directory' : 'Physical Plotter Inventory'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {subTab === 'plotter-types' 
              ? 'View and manage plotter manufacturer templates and low-level driver parameters.'
              : 'Track active physical plotter hardware assets, connection ports, serials, and branch assignments.'}
          </p>
        </div>
        <HasPermission permission="settings:write">
          <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> New {subTab === 'plotter-types' ? 'Plotter Type' : 'Plotter Device'}
          </button>
        </HasPermission>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          className="input-field pl-9 py-1.5 text-sm"
          placeholder={subTab === 'plotter-types' ? 'Search types...' : 'Search hardware serial/MAC/name...'}
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="card bg-white overflow-hidden shadow-sm border border-slate-100 rounded-xl">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm">
              {subTab === 'plotter-types' ? (
                <>
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Plotter Name', 'Manufacturer', 'Connection', 'Max Speed/Force', 'Legacy Type', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {plotters.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">No plotter templates found</td>
                      </tr>
                    ) : plotters.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/70 group transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600">
                              <Cpu className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{item.plotterName || '—'}</p>
                              {item.description && <p className="text-[10px] text-slate-400 max-w-[200px] truncate">{item.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium">{item.manufacturer || '—'}</td>
                        <td className="px-5 py-4">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">{item.connectionType || '—'}</span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-mono text-xs">
                          {item.maxSpeed ? `${item.maxSpeed} mm/s` : '—'} / {item.maxForce ? `${item.maxForce} g` : '—'}
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-xs font-semibold">
                          {item.legacySettings?.plotterType || '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <HasPermission permission="settings:write">
                              <button onClick={() => setModal(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit Plotter"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Plotter"><Trash2 className="w-4 h-4" /></button>
                            </HasPermission>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      {['Name / Serial / MAC', 'Type (Template)', 'Assigned Organization', 'Connection Parameters', 'License Key', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {devices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400 font-medium">No physical plotters registered</td>
                      </tr>
                    ) : devices.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/70 group transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                              <Cpu className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{item.name}</p>
                              <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                                {item.serialNumber && <span>S/N: <span className="font-mono">{item.serialNumber}</span></span>}
                                {item.macAddress && <span>MAC: <span className="font-mono">{item.macAddress}</span></span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-slate-700">{item.plotterMaster?.plotterName || '—'}</span>
                        </td>
                        <td className="px-5 py-4">
                          {item.organization ? (
                            <span className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100/60 text-indigo-700 text-xs font-bold">{item.organization.name}</span>
                          ) : (
                            <span className="text-slate-400 italic text-xs font-medium">System Stock</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <div className="flex flex-col gap-0.5 font-mono text-slate-600">
                            {item.ipAddress && <span>IP: {item.ipAddress}</span>}
                            {item.comPort && <span>Port: {item.comPort}</span>}
                            {!item.ipAddress && !item.comPort && <span className="text-slate-400 italic font-sans">—</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-700">{item.licenseKey || '—'}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold 
                            ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                              item.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-500'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <HasPermission permission="settings:write">
                              <button onClick={() => setModal(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit Plotter Device"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(item)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete Plotter Device"><Trash2 className="w-4 h-4" /></button>
                            </HasPermission>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-white">
              <p className="text-[10px] font-bold text-slate-400 uppercase">
                Page {currentPage} of {totalPages} ({total} total items)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all text-slate-600 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all text-slate-600 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        isLoading={confirm.isLoading}
        onConfirm={confirm.onConfirm}
        onClose={closeConfirm}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

// ─── Main Settings Page ──────────────────────────────

const SettingsPage = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General Settings', icon: Globe },
    { id: 'users', label: 'Users Directory', icon: Users }
  ];
  if (user?.isSuperAdmin || hasPermission('roles:read')) {
    tabs.push(
      { id: 'roles', label: 'Access Roles', icon: ShieldCheck }
    );
  }
  if (user?.isSuperAdmin || (user as any)?.role?.isSystemRole) {
    tabs.push(
      { id: 'permissions', label: 'Role Permissions', icon: Key }
    );
  }
  if (user?.isSuperAdmin || hasPermission('settings:read')) {
    tabs.push(
      { id: 'plotters', label: 'Plotters Directory', icon: Cpu }
    );
  }
  if (user?.isSuperAdmin) {
    tabs.push(
      { id: 'orgTypes', label: 'Organization Types', icon: Building },
      { id: 'materials', label: 'Materials Settings', icon: ScrollText }
    );
  }
  tabs.push({ id: 'Audit Logs', label: 'System Audit Logs', icon: List });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-900 rounded-2xl shadow-lg shadow-indigo-950/20 text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Settings</h1>
            <p className="text-slate-500 text-sm mt-0.5">Configure system parameters, role controls, organizations, and user directories.</p>
          </div>
        </div>
      </div>

      {/* Side-by-side modern split container */}
      <div className="bg-slate-50/50 border border-slate-200/80 rounded-3xl overflow-hidden flex flex-col lg:flex-row min-h-[650px] shadow-sm">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-white p-4 flex flex-col gap-1.5 shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-3 mb-2">Control Categories</p>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all text-left cursor-pointer border
                  ${isActive 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10 font-black' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Settings Content Panel */}
        <div className="flex-1 bg-white min-w-0">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'roles' && <RolesTabSettings />}
          {activeTab === 'permissions' && <RolePermissionsTab />}
          {activeTab === 'plotters' && (
            <HasPermission permission="settings:read" fallback={<div className="p-12 text-center text-slate-500 font-medium">You don't have permission to view plotters.</div>}>
              <PlottersTabSettings />
            </HasPermission>
          )}
          {activeTab === 'orgTypes' && <OrganizationTypesTab />}
          {activeTab === 'materials' && <MaterialsTab />}
          {activeTab === 'Audit Logs' && (
            <HasPermission permission="audit_logs:read" fallback={<div className="p-12 text-center text-slate-500 font-medium">You don't have permission to view audit logs.</div>}>
              <AuditLogsTab />
            </HasPermission>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
