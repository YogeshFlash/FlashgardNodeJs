import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Loader2, AlertCircle, X, Shield, ChevronLeft, ChevronRight, ChevronDown, Key } from 'lucide-react';
import { usersApi, rolesApi, orgsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResetPasswordModal } from '../components/ResetPasswordModal';

const OrgComboBox = ({ value, onChange, disabled, orgs }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOrgs = React.useMemo(() => {
    if (!search) return orgs.slice(0, 100);
    return orgs.filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase())).slice(0, 100);
  }, [orgs, search]);

  const selected = orgs.find((o: any) => o.id === value);

  return (
    <div className="relative">
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-sm ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-slate-300'}`}
      >
        <span className="truncate">{selected ? selected.name : 'Select Organization'}</span>
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
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
              {filteredOrgs.length === 0 ? (
                <div className="p-3 text-sm text-slate-400 text-center">No results</div>
              ) : filteredOrgs.map((o: any) => (
                <div
                  key={o.id}
                  onClick={() => { onChange(o.id); setIsOpen(false); setSearch(''); }}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${value === o.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
                >
                  {o.name}
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
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
              {filteredRoles.length === 0 ? (
                <div className="p-3 text-sm text-slate-400 text-center">No results</div>
              ) : filteredRoles.map((r: any) => (
                <div
                  key={r.id}
                  onClick={() => { onChange(r.id); setIsOpen(false); setSearch(''); }}
                  className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${value === r.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
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

export function UserModal({ user: u, defaultOrgId, onClose, onSave }: { user: any; defaultOrgId?: string; onClose: () => void; onSave: () => void }) {
  const { user: currentUser } = useAuth();
  
  const initialOrgs = u?.organizations?.length > 0 
    ? u.organizations.map((org: any) => ({
        organizationId: org.organizationId,
        roleId: org.roleId,
        isPrimary: org.isPrimary
      }))
    : [{ organizationId: defaultOrgId || currentUser?.organizationId || '', roleId: '', isPrimary: true }];

  const [form, setForm] = useState<any>(u ? { ...u } : { firstName: '', lastName: '', email: '', password: '', isActive: true });
  const [userOrgs, setUserOrgs] = useState<any[]>(initialOrgs);
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
      if (userOrgs.length === 0) throw new Error('You must assign at least one organization.');
      if (!userOrgs.some(o => o.isPrimary)) userOrgs[0].isPrimary = true; // Ensure at least one primary

      const payload = { ...form, organizations: userOrgs };
      if (u?.id) await usersApi.update(u.id, payload);
      else await usersApi.create(payload);
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
              <input className="input-field" value={form.firstName || ''} onChange={e => f('firstName', e.target.value)} placeholder="Enter first name" required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Last Name</label>
              <input className="input-field" value={form.lastName || ''} onChange={e => f('lastName', e.target.value)} placeholder="Enter last name" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
            <input type="email" className="input-field" value={form.email || ''} onChange={e => f('email', e.target.value)} required placeholder="user@example.com" />
          </div>
          {!u && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Password</label>
              <input type="password" className="input-field" value={form.password || ''} onChange={e => f('password', e.target.value)} required placeholder="Enter password" />
            </div>
          )}
          {/* Multi-Org Assignment Block */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-800">Organization & Role Assignments</label>
              {!defaultOrgId && (
                <button 
                  type="button" 
                  onClick={() => setUserOrgs([...userOrgs, { organizationId: '', roleId: '', isPrimary: userOrgs.length === 0 }])}
                  className="text-xs flex items-center gap-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 px-2 py-1 rounded-md transition-colors"
                 >
                  <Plus className="w-3 h-3" /> Add Assignment
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              {userOrgs.map((assign, index) => (
                <div key={index} className={`p-3 rounded-lg border relative ${assign.isPrimary ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5' : 'border-slate-200 bg-slate-50'}`}>
                  {userOrgs.length > 1 && !defaultOrgId && (
                    <button type="button" onClick={() => setUserOrgs(userOrgs.filter((_, i) => i !== index))} className="absolute right-2 top-2 p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-3 pr-6">
                    <div>
                      <OrgComboBox 
                        value={assign.organizationId}
                        orgs={orgs}
                        disabled={form.isSuperAdmin || !!defaultOrgId}
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
                          name="primaryOrg" 
                          checked={assign.isPrimary} 
                          onChange={() => {
                            const newOrgs = userOrgs.map((o, i) => ({ ...o, isPrimary: i === index }));
                            setUserOrgs(newOrgs);
                          }}
                          className="text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer" 
                        />
                        <span className={`transition-colors ${assign.isPrimary ? 'text-[var(--color-primary)] font-medium' : 'text-slate-500 group-hover:text-slate-700'}`}>
                          Primary Context
                        </span>
                     </label>
                  </div>
                </div>
              ))}
            </div>
            {form.isSuperAdmin && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-3 bg-amber-50 p-2 rounded-md">
                <Shield className="w-3 h-3" /> Platform Admins implicitly possess all roles.
              </p>
            )}
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
import { UserPermissionsModal } from '../components/UserPermissionsModal';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 50;

  const [modal, setModal] = useState<any>(null);
  const [permissionsModal, setPermissionsModal] = useState<any>(null); // For the new shield modal
  const [resetModal, setResetModal] = useState<any>(null);
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

  const fetchUsers = async () => {
    setLoading(true); setError('');
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const res = await usersApi.getAll(search || undefined, undefined, skip, itemsPerPage);
      if (res && typeof res === 'object' && 'items' in res) {
        setUsers(res.items);
        setTotalUsers(res.total);
      } else {
        setUsers(Array.isArray(res) ? res : []);
        setTotalUsers(Array.isArray(res) ? res.length : 0);
      }
    }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [currentPage, search]);

  const handleDelete = async (id: string) => {
    showConfirm(
      'Delete User',
      'Are you sure you want to delete this user? Access for this user will be revoked immediately.',
      async () => {
        await usersApi.delete(id);
        fetchUsers();
      }
    );
  };

  return (
    <div className="space-y-6">
      {modal && <UserModal user={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchUsers(); }} />}
      {permissionsModal && <UserPermissionsModal user={permissionsModal} onClose={() => setPermissionsModal(null)} onSave={() => { setPermissionsModal(null); }} />}
      
      <ResetPasswordModal 
        isOpen={!!resetModal}
        onClose={() => setResetModal(null)}
        userName={resetModal ? [resetModal.firstName, resetModal.lastName].filter(Boolean).join(' ') || resetModal.email : undefined}
        onConfirm={async (newPassword) => {
          await usersApi.resetPassword(resetModal.id, newPassword);
          // Optional: Add a success toast here if you have a toast system
        }}
      />

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
            <input 
              className="input-field pl-9 py-1.5 text-sm" 
              placeholder="Search users..." 
              value={search} 
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} 
            />
          </div>
          <span className="text-sm text-slate-500">{totalUsers} users</span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48"><Loader2 className="w-7 h-7 text-[var(--color-primary)] animate-spin" /></div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-600 p-8"><AlertCircle className="w-5 h-5" />{error}</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Users className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No users found</p>
            <button onClick={() => setModal('new')} className="text-[var(--color-primary)] text-sm mt-2 hover:underline">Create the first user</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Name', 'Email', 'Organizations & Roles', 'Status', 'Actions'].map(h => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/70 group transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-xs flex items-center justify-center">
                            {(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {u.organizations?.map((o: any) => (
                             <span key={o.organizationId} className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs whitespace-nowrap border ${o.isPrimary ? 'bg-[var(--color-primary)]/5 text-[var(--color-primary)] border-[var(--color-primary)]/20 font-medium' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                {o.organization?.name || 'Unknown'} <span className="mx-1 opacity-50">•</span> {o.role?.name || 'No Role'}
                             </span>
                          )) || <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors" title="Edit User"><Edit2 className="w-4 h-4" /></button>
                          {currentUser?.isSuperAdmin && (
                             <>
                               <button onClick={() => setPermissionsModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" title="Permission Overrides"><Shield className="w-4 h-4" /></button>
                               <button onClick={() => setResetModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Reset Password"><Key className="w-4 h-4" /></button>
                             </>
                          )}
                          <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete User"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalUsers > itemsPerPage && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100">
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

export default UsersPage;
