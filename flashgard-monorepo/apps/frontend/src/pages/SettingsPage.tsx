import React, { useEffect, useState } from 'react';
import {
  Bell, ShieldCheck, Database, Globe,
  Plus, Edit2, Trash2, Loader2, Users, Search, Key, Check, List
} from 'lucide-react';
import { rolesApi, usersApi, permissionsApi, auditLogsApi, orgsApi } from '../lib/api';
import { HasPermission } from '../components/HasPermission';

// ─── Shared TabBar ──────────────────────────────────
const TabBar = ({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) => (
  <div className="flex border-b border-slate-200">
    {tabs.map(tab => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
          ${active === tab
            ? 'border-blue-600 text-blue-600 bg-white'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
      >
        {tab}
      </button>
    ))}
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
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
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
            { label: 'Backend', value: 'NestJS + Prisma 5 + PostgreSQL' },
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
  const [form, setForm] = useState(role || { name: '', description: '', isSystemRole: true, permissionIds: [] });
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
              <div className="flex items-center justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
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
                          ${(form.permissionIds || []).includes(p.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
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

          <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <p className="text-xs text-purple-700 font-medium leading-snug">System roles are shared across all organizations and cannot be deleted by org users.</p>
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

const SystemRolesTab = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const all = await rolesApi.getAll();
      setRoles(all.filter((r: any) => r.isSystemRole));
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) { alert('System roles are protected and cannot be deleted.'); return; }
    if (!confirm('Delete this role?')) return;
    await rolesApi.delete(id);
    load();
  };

  return (
    <div className="p-6 space-y-4">
      {modal && <RoleModal role={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">System Roles</h3>
          <p className="text-xs text-slate-400 mt-0.5">Global roles shared across all organizations</p>
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
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : (
        <div className="card bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShieldCheck className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No system roles found</p>
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
                  <tr key={role.id} className="hover:bg-slate-50/70 group transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                        </div>
                        <span className="font-semibold text-slate-800">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 max-w-sm truncate">{role.description || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <HasPermission permission="roles:write">
                          <button onClick={() => setModal(role)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        </HasPermission>
                        <HasPermission permission="roles:delete">
                          <button onClick={() => handleDelete(role.id, true)} className="p-1.5 rounded-lg text-slate-200 cursor-not-allowed" title="System roles are protected"><Trash2 className="w-4 h-4" /></button>
                        </HasPermission>
                      </div>
                    </td>
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

// ─── Internal Users Tab ─────────────────────────────
const UserModal = ({ user: u, roles, orgs, currentOrgId, onClose, onSave }: any) => {
  const [form, setForm] = useState<any>(u || { firstName: '', lastName: '', email: '', password: '', isActive: true, organizationId: currentOrgId || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (u?.id) await usersApi.update(u.id, form);
      else await usersApi.create(form);
      onSave();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
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
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Organization</label>
            <select className="input-field" value={form.organizationId || ''} onChange={e => f('organizationId', e.target.value)}>
              <option value="">— No Organization —</option>
              {orgs?.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
            <select className="input-field" value={form.roleId || ''} onChange={e => f('roleId', e.target.value)}>
              <option value="">— No Role —</option>
              {roles.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isSystemRole ? '(System)' : `(${r.organization?.name || 'Unknown Org'})`}
                </option>
              ))}
            </select>
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
  const [modal, setModal] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [allUsers, allRoles, allOrgs] = await Promise.all([
        usersApi.getAll(), 
        rolesApi.getAll(),
        orgsApi.getAll()
      ]);
      
      setOrgs(allOrgs);

      // Show all users the current admin has access to
      setUsers(allUsers);
      
      // Show all roles the current admin has access to
      setRoles(allRoles);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    await usersApi.delete(id);
    load();
  };

  return (
    <div className="p-6 space-y-4">
      {modal && <UserModal user={modal === 'new' ? null : modal} roles={roles} orgs={orgs} currentOrgId={user?.organizationId} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}

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
        <input className="input-field pl-9 py-1.5 text-sm" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : (
        <div className="card bg-white overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No users found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['User', 'Role', 'Super Admin', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 group transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500">{u.role?.name || '—'}</td>
                    <td className="px-5 py-4">
                      {u.isSuperAdmin && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">⚡ Yes</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <HasPermission permission="users:write">
                          <button onClick={() => setModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        </HasPermission>
                        <HasPermission permission="users:delete">
                          <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </HasPermission>
                      </div>
                    </td>
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
          <h2 className="text-lg font-semibold">{perm ? 'Edit Permission' : 'New System Permission'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Action Code</label>
            <input className="input-field" value={form.action} onChange={e => setForm({ ...form, action: e.target.value.toLowerCase() })} placeholder="e.g. reports:view" required disabled={!!perm} />
            {!perm && <p className="text-xs text-slate-400 mt-1">Format should be domain:action.</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
            <textarea className="input-field resize-none" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what this allows..." required />
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-700 font-medium leading-snug">Permissions control what API endpoints and features roles can access universally.</p>
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
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const all = await permissionsApi.getAll();
      setPermissions(all);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = permissions.filter(p =>
    p.action.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc: any, p: any) => {
    const group = p.action.split(':')[0];
    if (!acc[group]) acc[group] = [];
    acc[group].push(p);
    return acc;
  }, {});

  const handleDelete = async (id: string) => {
    if (!confirm('CAUTION: Deleting a permission will immediately revoke access to any features depending on it across all roles. Are you absolutely sure?')) return;
    await permissionsApi.delete(id);
    load();
  };

  return (
    <div className="p-6 space-y-4">
      {modal && <PermissionModal perm={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-700">System Permissions</h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage the granular capability blocks assigned to roles.</p>
        </div>
        <HasPermission permission="roles:write">
          <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> New Permission
          </button>
        </HasPermission>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input-field pl-9 py-1.5 text-sm" placeholder="Search permissions..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center card bg-white">
              <ShieldCheck className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No permissions found</p>
            </div>
          ) : (
            Object.entries(grouped).sort().map(([group, perms]: any) => (
              <div key={group} className="card bg-white overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                  <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{group}</h4>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-50">
                    {perms.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 group transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-blue-600 w-1/3">{p.action}</td>
                        <td className="px-5 py-3 text-slate-600 truncate">{p.description}</td>
                        <td className="px-5 py-3 w-24 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <HasPermission permission="roles:write">
                              <button onClick={() => setModal(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                            </HasPermission>
                            <HasPermission permission="roles:delete">
                              <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </HasPermission>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))
          )}
        </div>
      )}
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
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
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
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 
                          'bg-red-100 text-red-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-slate-600">{log.entity} <br/><span className="text-slate-400 text-[10px] break-all">{log.entityId}</span></td>
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
import { useAuth } from '../contexts/AuthContext';

const SettingsPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('General');

  const tabs = ['General', 'Users'];
  if (user?.isSuperAdmin) {
    tabs.push('Role Permissions', 'System Roles');
  }
  tabs.push('Audit Logs');

  return (
    <div className="space-y-0 -mx-6 -mt-6">
      {/* Header */}
      <div className="px-8 pt-6 pb-0 bg-white border-b border-slate-200">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system preferences, roles, and internal users</p>
        </div>
        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab Content */}
      <div className="bg-slate-50 min-h-[calc(100vh-16rem)]">
        {activeTab === 'General' && <GeneralTab />}
        {activeTab === 'Users' && <UsersTab />}
        {activeTab === 'Role Permissions' && <RolePermissionsTab />}
        {activeTab === 'System Roles' && <SystemRolesTab />}
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
