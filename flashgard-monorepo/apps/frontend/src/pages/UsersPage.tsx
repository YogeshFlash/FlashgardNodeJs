import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { usersApi, rolesApi, orgsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function UserModal({ user: u, onClose, onSave }: { user: any; onClose: () => void; onSave: () => void }) {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState<any>(u || { firstName: '', lastName: '', email: '', password: '', isActive: true, organizationId: currentUser?.organizationId || '' });
  const [roles, setRoles] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    rolesApi.getAll().then(setRoles).catch(() => {});
    orgsApi.getAll().then(setOrgs).catch(() => {});
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (u?.id) await usersApi.update(u.id, form);
      else await usersApi.create(form);
      onSave();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const f = (field: string, val: any) => setForm((p: any) => ({ ...p, [field]: val }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-800">{u ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">First Name</label>
              <input className="input-field" value={form.firstName || ''} onChange={e => f('firstName', e.target.value)} placeholder="John" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Last Name</label>
              <input className="input-field" value={form.lastName || ''} onChange={e => f('lastName', e.target.value)} placeholder="Doe" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
            <input type="email" className="input-field" value={form.email || ''} onChange={e => f('email', e.target.value)} required placeholder="john@example.com" />
          </div>
          {!u && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
              <input type="password" className="input-field" value={form.password || ''} onChange={e => f('password', e.target.value)} required placeholder="••••••••" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Organization</label>
            <select className="input-field" value={form.organizationId || ''} onChange={e => f('organizationId', e.target.value)}>
              <option value="">— None —</option>
              {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Role</label>
            <select className="input-field" value={form.roleId || ''} onChange={e => f('roleId', e.target.value)}>
              <option value="">— None —</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.isSystemRole ? '(System)' : `(${r.organization?.name || 'Unknown Org'})`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="userActive" checked={form.isActive} onChange={e => f('isActive', e.target.checked)} className="rounded border-slate-300" />
            <label htmlFor="userActive" className="text-sm text-slate-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {u ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const UsersPage = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true); setError('');
    try { setUsers(await usersApi.getAll(search)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [search]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try { await usersApi.delete(id); fetchUsers(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-6">
      {modal && <UserModal user={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchUsers(); }} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage all system and organization users</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      <div className="card bg-white">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="input-field pl-9 py-1.5 text-sm" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-sm text-slate-500">{users.length} users</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="w-7 h-7 text-blue-500 animate-spin" /></div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 p-8"><AlertCircle className="w-5 h-5" />{error}</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No users found</p>
            <button onClick={() => setModal('new')} className="text-blue-600 text-sm mt-2 hover:underline">Create the first user</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Name', 'Email', 'Organization', 'Role', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 group transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center">
                          {(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{u.email}</td>
                    <td className="px-6 py-4 text-slate-500">{u.organization?.name || '—'}</td>
                    <td className="px-6 py-4 text-slate-500">{u.role?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
