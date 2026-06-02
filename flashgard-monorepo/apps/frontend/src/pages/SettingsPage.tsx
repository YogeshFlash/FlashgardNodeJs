import React, { useEffect, useState } from 'react';
import {
  Bell, ShieldCheck, Database, Globe,
  Plus, Edit2, Trash2, Loader2, Users, Search, Key, Check, List, X, Shield, RotateCcw, Building, ScrollText,
  ChevronLeft, ChevronRight, ChevronDown
} from 'lucide-react';
import { rolesApi, usersApi, permissionsApi, auditLogsApi, orgsApi, organizationTypesApi, filmTypesApi } from '../lib/api';
import { HasPermission, usePermissions } from '../components/HasPermission';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { UserPermissionsModal } from '../components/UserPermissionsModal';

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

// ─── Shared TabBar ──────────────────────────────────
const TabBar = ({ tabs, active, onChange }: { tabs: { id: string; label: string; icon: any }[]; active: string; onChange: (t: string) => void }) => (
  <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
    <div className="flex overflow-x-auto no-scrollbar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap border-b-2 
            ${active === tab.id 
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
        >
          <tab.icon className={`w-4 h-4 ${active === tab.id ? 'text-[var(--color-accent)]' : 'text-slate-400'}`} />
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);

// ─── General Settings Tab ───────────────────────────
const Toggle = ({ checked, onChange, label, desc }: any) => (
  <div className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-0">
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-[var(--color-accent)]' : 'bg-slate-200'}`}
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
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="card bg-white p-6">
        <div className="flex items-center gap-2 mb-5">
          <Bell className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-800">Notifications</h3>
        </div>
        <Toggle checked={emailNotif} onChange={setEmailNotif} label="Email Notifications" desc="Receive summaries and alerts via email" />
        <Toggle checked={loginAlert} onChange={setLoginAlert} label="Login Alerts" desc="Get notified when a new login is detected" />
      </div>

      <div className="card bg-white p-6">
        <div className="flex items-center gap-2 mb-5">
          <Key className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-800">Security</h3>
        </div>
        <Toggle checked={twoFA} onChange={setTwoFA} label="Two-Factor Authentication" desc="Require a second factor at login" />
        <div className="py-3.5 border-b border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-slate-700">Session Timeout</p>
            <p className="text-xs text-slate-400 mt-0.5">Automatically sign out after inactivity</p>
          </div>
          <select className="input-field w-auto text-sm">
            <option>8 hours</option>
            <option>4 hours</option>
            <option>1 hour</option>
          </select>
        </div>
      </div>

      <div className="card bg-white p-6">
        <div className="flex items-center gap-2 mb-5">
          <Globe className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-800">System</h3>
        </div>
        <div className="py-3 border-b border-slate-100 flex justify-between items-center">
          <p className="text-sm font-medium text-slate-700">Default Language</p>
          <select className="input-field w-auto text-sm"><option>English</option><option>Tamil</option><option>Hindi</option></select>
        </div>
        <div className="py-3 flex justify-between items-center">
          <p className="text-sm font-medium text-slate-700">Timezone</p>
          <select className="input-field w-auto text-sm"><option>Asia/Kolkata (IST)</option><option>UTC</option></select>
        </div>
      </div>

      <div className="card bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-800">About</h3>
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: 'Application', value: 'Flashgard CRM' },
            { label: 'Version', value: '2.0.0' },
            //{ label: 'Backend', value: 'NestJS + Prisma 5 + PostgreSQL' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
              <span className="text-slate-500">{label}</span>
              <span className="text-slate-700 font-medium">{value}</span>
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
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
                            <HasPermission permission="roles:delete">
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
                      <select 
                        className="input-field text-sm py-1.5" 
                        value={assign.roleId} 
                        onChange={e => {
                          const newOrgs = [...userOrgs];
                          newOrgs[index].roleId = e.target.value;
                          setUserOrgs(newOrgs);
                        }}
                        disabled={form.isSuperAdmin}
                        required
                      >
                        <option value="" disabled>Select Role</option>
                        {roles.map((r: any) => (
                          <option key={r.id} value={r.id}>
                            {r.name} {r.isSystemRole ? '(System)' : ''}
                          </option>
                        ))}
                      </select>
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
                            <button onClick={() => setPermissionsModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Permission Overrides">
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          <HasPermission permission="users:delete">
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

// ─── Materials (Film Types) Tab ───────────────────
const FilmTypeModal = ({ item, onClose, onSave }: any) => {
  const [form, setForm] = useState({ 
    name: '', 
    description: '', 
    parentId: '', 
    isActive: true, 
    thickness: '', 
    layers: 1, 
    minForce: '', 
    minSpeed: '', 
    ...(item || {}) 
  });
  const [allTypes, setAllTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    filmTypesApi.getAll(undefined, false).then((d: any) => setAllTypes(Array.isArray(d) ? d.filter((t: any) => t.id !== item?.id) : [])).catch(() => setAllTypes([]));
  }, [item?.id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    try {
      const payload = { 
        name: form.name, 
        description: form.description, 
        parentId: form.parentId || null, 
        isActive: form.isActive,
        thickness: form.thickness ? parseFloat(form.thickness) : null,
        layers: parseInt(String(form.layers)) || 1,
        minForce: form.minForce ? parseFloat(form.minForce) : null,
        minSpeed: form.minSpeed ? parseFloat(form.minSpeed) : null
      };
      if (item?.id) await filmTypesApi.update(item.id, payload);
      else await filmTypesApi.create(payload);
      onSave();
    } catch (err: any) { 
      setError(err?.response?.data?.message || err.message || 'Failed to save material');
    } finally { setLoading(false); }
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
            <label className="text-sm font-medium text-slate-700 block mb-1">Material Name <span className="text-red-500">*</span></label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Eco Clear GT" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Parent Material</label>
            <select className="input-field" value={form.parentId || ''} onChange={e => setForm({ ...form, parentId: e.target.value })}>
              <option value="">— None (Top-level) —</option>
              {allTypes.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
            <textarea className="input-field" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional notes about this material" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Thickness (mm)</label>
              <input type="number" step="0.001" className="input-field" value={form.thickness} onChange={e => setForm({ ...form, thickness: e.target.value })} placeholder="0.000" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Number of Layers</label>
              <input type="number" className="input-field" value={form.layers} onChange={e => setForm({ ...form, layers: e.target.value })} placeholder="1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Min Force</label>
              <input type="number" step="0.1" className="input-field" value={form.minForce} onChange={e => setForm({ ...form, minForce: e.target.value })} placeholder="0.0" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Min Speed</label>
              <input type="number" step="0.1" className="input-field" value={form.minSpeed} onChange={e => setForm({ ...form, minSpeed: e.target.value })} placeholder="0.0" />
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


const MaterialsTab = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const { user } = useAuth();
  
  const [confirm, setConfirm] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: async () => {}, isLoading: false });
  const closeConfirm = () => setConfirm((p: any) => ({ ...p, isOpen: false }));

  const load = async () => {
    setLoading(true);
    try { setItems(await filmTypesApi.getAll(undefined, true)); } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const del = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Delete Material',
      message: `Delete "${item.name}"? This will soft-delete the film type.`,
      onConfirm: async () => { await filmTypesApi.remove(item.id); load(); closeConfirm(); },
    });
  };

  const restore = (id: string) => {
    setConfirm({
      isOpen: true,
      title: 'Restore Material',
      message: 'Restore this film type material?',
      onConfirm: async () => { await filmTypesApi.restore(id); load(); closeConfirm(); },
    });
  };

  const purge = (item: any) => {
    setConfirm({
      isOpen: true,
      title: 'Permanently Delete',
      message: `PERMANENTLY delete "${item.name}"? Warning: Actions on batches and inventory may be affected.`,
      onConfirm: async () => { await filmTypesApi.purge(item.id); load(); closeConfirm(); },
    });
  };

  return (
    <div className="p-6">
      {modal && <FilmTypeModal item={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-slate-700">Manage Materials</h3>
          <p className="text-xs text-slate-400">Configure film types and tracking requirements</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
          <Plus className="w-3.5 h-3.5" /> New Material
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="card bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Name', 'Parent', 'Thickness', 'Layers', 'Force/Speed', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {items.map(t => (
                <tr key={t.id} className={`hover:bg-slate-50/70 group transition-colors ${t.isDeleted ? 'bg-red-50/50' : ''}`}>
                  <td className="px-5 py-4">
                    <p className={`font-semibold ${t.isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.name}</p>
                    {t.description && <p className="text-xs text-slate-400 mt-0.5">{t.description}</p>}
                    {t.isDeleted && <span className="text-[10px] font-bold text-red-500">DELETED</span>}
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-sm">
                    {t.parent?.name ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{t.parent.name}</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-xs font-mono">
                    {t.thickness ? `${t.thickness}mm` : '—'}
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-xs">
                    {t.layers || 1}
                  </td>
                  <td className="px-5 py-4 text-slate-600 text-xs font-mono">
                    {t.minForce || '—'} / {t.minSpeed || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!t.isDeleted ? (
                        <>
                          <button onClick={() => setModal(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => del(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </>
                      ) : user?.isSuperAdmin && (
                        <>
                          <button onClick={() => restore(t.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"><RotateCcw className="w-4 h-4" /></button>
                          <button onClick={() => purge(t)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      )}
      <ConfirmDialog isOpen={confirm.isOpen} title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm} onClose={closeConfirm} isLoading={confirm.isLoading} />
    </div>
  );
};

// ─── Audit Logs Tab ───────────────────────────────
const AuditLogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">Audit Logs</h3>
          <p className="text-xs text-slate-400 mt-0.5">Track system actions and modifications</p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input-field pl-9 py-1.5 text-sm" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="card bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <List className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No audit logs found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Timestamp', 'User', 'Action', 'Entity', 'Details'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(log => (
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
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Settings Page ──────────────────────────────

const SettingsPage = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'users', label: 'Users', icon: Users }
  ];
  if (user?.isSuperAdmin || hasPermission('roles:read')) {
    tabs.push(
      { id: 'roles', label: 'Roles', icon: ShieldCheck }
    );
  }
  if (user?.isSuperAdmin || (user as any)?.role?.isSystemRole) {
    tabs.push(
      { id: 'permissions', label: 'Role Permissions', icon: Key }
    );
  }
  if (user?.isSuperAdmin) {
    tabs.push(
      { id: 'orgTypes', label: 'Org Type', icon: Building },
      { id: 'materials', label: 'Materials', icon: ScrollText }
    );
  }
  tabs.push({ id: 'Audit Logs', label: 'Audit Logs', icon: List });

  return (
    <div className="space-y-0 -mx-6 -mt-6">
      {/* Header */}
      <div className="px-8 pt-6 pb-0 bg-white border-b border-slate-200">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system preferences, roles, and system users</p>
        </div>
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="bg-slate-50 min-h-[calc(100vh-16rem)]">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'roles' && <RolesTabSettings />}
        {activeTab === 'permissions' && <RolePermissionsTab />}
        {activeTab === 'orgTypes' && <OrganizationTypesTab />}
        {activeTab === 'materials' && <MaterialsTab />}
        {activeTab === 'Audit Logs' && (
          <HasPermission permission="audit:read" fallback={<div className="p-12 text-center text-slate-500 font-medium">You don't have permission to view audit logs.</div>}>
            <AuditLogsTab />
          </HasPermission>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
