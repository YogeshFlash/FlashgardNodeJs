import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Search, Edit2, Trash2, Loader2, AlertCircle, Check, RotateCcw } from 'lucide-react';
import { rolesApi, permissionsApi } from '../lib/api';
import { HasPermission } from '../components/HasPermission';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

function RoleModal({ role, onClose, onSave }: { role: any; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState<any>(role || { name: '', description: '', isSystemRole: false, permissionIds: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Permissions State
  const [allPerms, setAllPerms] = useState<any[]>([]);
  const [permsLoading, setPermsLoading] = useState(true);

  useEffect(() => {
    if (role && role.permissions) {
      setForm((prev: any) => ({ ...prev, permissionIds: role.permissions.map((p: any) => p.permissionId) }));
    }
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
          <h2 className="text-lg font-semibold text-slate-800">{role ? 'Edit Role' : 'New Role'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Role Name</label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sales Manager" required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Description</label>
            <textarea className="input-field resize-none" rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe what this role can do..." />
          </div>

          {/* Permissions Grid */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-2 border-b border-slate-100 pb-2">Role Permissions</label>
            {permsLoading ? (
              <div className="flex items-center justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-[var(--color-primary)]" /></div>
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
                          ${(form.permissionIds || []).includes(p.id) ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-slate-300 group-hover:border-[var(--color-primary)]'}`}>
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="sysRole"
              checked={form.isSystemRole}
              onChange={e => setForm({ ...form, isSystemRole: e.target.checked })}
              className="rounded border-slate-300"
              disabled={role?.isSystemRole} // can't un-system a system role
            />
            <label htmlFor="sysRole" className="text-sm text-slate-700">System Role (not org-specific)</label>
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
}

const RolesPage = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
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

  const showConfirm = (title: string, message: string, onConfirm: () => Promise<void>) => {
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
        } catch (err: any) {
          console.error(err);
          setConfirm(prev => ({ ...prev, isLoading: false }));
          alert(err.message);
        }
      }
    });
  };

  const { user } = useAuth();

  const fetchRoles = async () => {
    setLoading(true); setError('');
    try { setRoles(await rolesApi.getAll()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRoles(); }, []);

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem && !user?.isSuperAdmin) return alert('Only Super Admins can delete system roles.');
    showConfirm(
      'Delete Role',
      'Are you sure you want to delete this role? This will affect all users assigned to this role.',
      async () => {
        await rolesApi.delete(id);
        fetchRoles();
      }
    );
  };

  return (
    <div className="space-y-6">
      {modal && <RoleModal role={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchRoles(); }} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles & Access</h1>
          <p className="text-slate-500 text-sm mt-1">Manage system roles and organization-level permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRoles} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center bg-white shadow-sm" title="Refresh">
            <RotateCcw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <HasPermission permission="roles:write">
            <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Role
            </button>
          </HasPermission>
        </div>
      </div>

      <div className="card bg-white">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input-field pl-9 py-1.5 text-sm" placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-slate-500">{filtered.length} roles</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="w-7 h-7 text-[var(--color-accent)] animate-spin" /></div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 p-8"><AlertCircle className="w-5 h-5" />{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <ShieldCheck className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No roles found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Role Name', 'Description', 'Type', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(role => (
                  <tr key={role.id} className="hover:bg-slate-50/70 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
                        </div>
                        <span className="font-medium text-slate-800">{role.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{role.description || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${role.isSystemRole ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-slate-100 text-slate-600'}`}>
                        {role.isSystemRole ? 'System' : 'Custom'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <HasPermission permission="roles:write">
                          <button 
                            onClick={() => setModal(role)} 
                            disabled={role.isSystemRole && !user?.isSuperAdmin}
                            className={`p-1.5 rounded-lg transition-colors ${role.isSystemRole && !user?.isSuperAdmin ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </HasPermission>
                        <HasPermission permission="roles:write">
                          <button 
                            onClick={() => handleDelete(role.id, role.isSystemRole)} 
                            className={`p-1.5 rounded-lg transition-colors ${role.isSystemRole && !user?.isSuperAdmin ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </HasPermission>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        isLoading={confirm.isLoading}
        onConfirm={confirm.onConfirm}
        onClose={closeConfirm}
      />
    </div>
  );
};

export default RolesPage;
