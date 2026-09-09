import React, { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Search, Edit2, Trash2, Loader2, AlertCircle, Check, RotateCcw, X } from 'lucide-react';
import { rolesApi, permissionsApi } from '../lib/api';
import { HasPermission } from '../components/HasPermission';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

function RoleModal({ role, onClose, onSave }: { role: any; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState<any>(role || { name: '', description: '', isSystemRole: false, permissionIds: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permFilter, setPermFilter] = useState('');
  const [activeModuleTab, setActiveModuleTab] = useState<string>('all');

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

  const MODULE_CONFIG = [
    {
      id: 'org_module',
      label: 'Organizations & Contacts',
      icon: '🏢',
      groups: ['orgs', 'contacts', 'addresses']
    },
    {
      id: 'access_module',
      label: 'Users & Access Control',
      icon: '👥',
      groups: ['users', 'roles']
    },
    {
      id: 'catalog_module',
      label: 'Catalog & Hardware',
      icon: '📦',
      groups: ['catalog', 'plotters']
    },
    {
      id: 'inventory_module',
      label: 'Inventory & Warehouse',
      icon: '🏬',
      groups: [
        'inventory',
        'inventory_inward',
        'inventory_batches',
        'inventory_workorders',
        'inventory_packaged',
        'inventory_dispatch',
        'inventory_filmtypes',
        'inward',
        'dispatch',
        'production',
        'qr'
      ]
    },
    {
      id: 'nav_module',
      label: 'Sidebar Navigation & Pages',
      icon: '🧭',
      groups: ['nav']
    },
    {
      id: 'system_module',
      label: 'Licenses & System',
      icon: '⚡',
      groups: ['licenses', 'audit_logs']
    }
  ];

  const groupLabels: Record<string, { label: string; icon: string }> = {
    orgs: { label: 'Organizations Main', icon: '🏢' },
    contacts: { label: "Organization's Contacts", icon: '📇' },
    addresses: { label: "Organization's Addresses", icon: '📍' },
    users: { label: 'Users & Staff', icon: '👥' },
    roles: { label: 'Access Roles & Permissions', icon: '🛡️' },
    catalog: { label: 'Catalog & Cut Patterns', icon: '📦' },
    nav: { label: 'Sidebar Navigation Controls', icon: '🧭' },
    inventory: { label: 'Inventory (Full Access)', icon: '🏬' },
    inventory_inward: { label: 'Tab: Inward Receipts', icon: '📥' },
    inventory_batches: { label: 'Tab: Stock Batches', icon: '📦' },
    inventory_workorders: { label: 'Tab: Work Orders', icon: '⚙️' },
    inventory_packaged: { label: 'Tab: Packaged Stock', icon: '🎁' },
    inventory_dispatch: { label: 'Tab: Dispatch Orders', icon: '🚚' },
    inventory_filmtypes: { label: 'Tab: Flash Products & Categories', icon: '🏷️' },
    inward: { label: 'Inward Receipts & Stock Entry', icon: '📥' },
    dispatch: { label: 'Dispatch Orders & Logistics', icon: '🚚' },
    production: { label: 'Production & Work Orders', icon: '⚙️' },
    qr: { label: 'QR Code Generation & Auditing', icon: '🔳' },
    audit_logs: { label: 'Audit Logs', icon: '📋' },
    licenses: { label: 'Licenses & Transfers', icon: '🔑' },
    plotters: { label: 'Plotters & Hardware', icon: '🖥️' },
  };

  const getActionBadge = (action: string) => {
    const act = action.split(':')[1] || action;
    if (act === 'read' || act === 'view') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider shrink-0">READ</span>;
    if (act === 'write' || act === 'create' || act === 'edit') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider shrink-0">WRITE</span>;
    if (act === 'delete' || act === 'purge') return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider shrink-0">DELETE</span>;
    return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wider shrink-0">{act.toUpperCase()}</span>;
  };

  const filteredPerms = React.useMemo(() => {
    if (!permFilter.trim()) return allPerms;
    const q = permFilter.toLowerCase().trim();
    return allPerms.filter(p =>
      p.action.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }, [allPerms, permFilter]);

  // Group by Modules for display
  const modulesWithPerms = React.useMemo(() => {
    const rawGroups: Record<string, any[]> = filteredPerms.reduce((acc: any, p: any) => {
      const g = p.action.split(':')[0];
      if (!acc[g]) acc[g] = [];
      acc[g].push(p);
      return acc;
    }, {});

    const modules: Array<{ id: string; label: string; icon: string; groups: Array<{ groupKey: string; perms: any[] }> }> = [];

    MODULE_CONFIG.forEach(m => {
      if (activeModuleTab !== 'all' && activeModuleTab !== m.id) return;

      const mGroupItems: Array<{ groupKey: string; perms: any[] }> = [];
      m.groups.forEach(gKey => {
        if (rawGroups[gKey] && rawGroups[gKey].length > 0) {
          mGroupItems.push({ groupKey: gKey, perms: rawGroups[gKey] });
        }
      });

      if (mGroupItems.length > 0) {
        modules.push({
          id: m.id,
          label: m.label,
          icon: m.icon,
          groups: mGroupItems
        });
      }
    });

    if (activeModuleTab === 'all') {
      const knownGroupKeys = MODULE_CONFIG.flatMap(m => m.groups);
      const uncategorized = Object.keys(rawGroups).filter(gKey => !knownGroupKeys.includes(gKey));
      if (uncategorized.length > 0) {
        modules.push({
          id: 'other_module',
          label: 'Other Modules',
          icon: '⚡',
          groups: uncategorized.map(gKey => ({ groupKey: gKey, perms: rawGroups[gKey] }))
        });
      }
    }

    return modules;
  }, [filteredPerms, activeModuleTab]);

  const toggleAllInGroup = (perms: any[]) => {
    const permIds = perms.map((p: any) => p.id);
    const current = form.permissionIds || [];
    const allSelected = permIds.every((id: string) => current.includes(id));

    setForm((prev: any) => ({
      ...prev,
      permissionIds: allSelected
        ? current.filter((id: string) => !permIds.includes(id))
        : Array.from(new Set([...current, ...permIds]))
    }));
  };

  const toggleSelectAllGlobal = () => {
    const allIds = allPerms.map((p: any) => p.id);
    const current = form.permissionIds || [];
    const isAllSelected = allIds.length > 0 && allIds.every((id: string) => current.includes(id));

    setForm((prev: any) => ({
      ...prev,
      permissionIds: isAllSelected ? [] : allIds
    }));
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{role ? `Edit Role: ${role.name}` : 'Create New Role'}</h2>
              <p className="text-xs text-slate-500">Configure role details and specific permissions access scope.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={save} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
          
          {/* General Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Role Name</label>
              <input 
                className="input-field py-2 text-sm font-medium" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                placeholder="e.g. Sales Manager" 
                required 
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-1.5">Description</label>
              <input 
                className="input-field py-2 text-sm" 
                value={form.description || ''} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                placeholder="Brief summary of what this role can do..." 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
            <input
              type="checkbox" 
              id="sysRole"
              checked={form.isSystemRole}
              onChange={e => setForm({ ...form, isSystemRole: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
              disabled={role?.isSystemRole}
            />
            <label htmlFor="sysRole" className="text-xs font-semibold text-slate-700 cursor-pointer">System Role (Global across organizations)</label>
          </div>

          {/* Permissions Suite */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Module Permissions</h3>
                <p className="text-[11px] text-slate-400">Permissions grouped by application modules</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-lg">
                  {(form.permissionIds || []).length} / {allPerms.length} Selected
                </span>
                <button
                  type="button"
                  onClick={toggleSelectAllGlobal}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {(form.permissionIds || []).length === allPerms.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Module Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 custom-scrollbar">
              <button
                type="button"
                onClick={() => setActiveModuleTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeModuleTab === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span>⚡ All Modules</span>
              </button>
              {MODULE_CONFIG.map(m => {
                const mGroups = m.groups;
                const mPerms = allPerms.filter((p: any) => mGroups.includes(p.action.split(':')[0]));
                const mSelected = mPerms.filter((p: any) => (form.permissionIds || []).includes(p.id)).length;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveModuleTab(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      activeModuleTab === m.id
                        ? 'bg-[var(--color-primary)] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <span>{m.icon} {m.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeModuleTab === m.id ? 'bg-white/20 text-white' : mSelected > 0 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {mSelected}/{mPerms.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                className="w-full pl-9 pr-8 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:bg-white transition-all"
                placeholder="Filter module permissions (e.g. contacts, address, view, edit)..."
                value={permFilter}
                onChange={e => setPermFilter(e.target.value)}
              />
              {permFilter && (
                <button 
                  onClick={() => setPermFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Permissions Grid Grouped by Modules */}
            {permsLoading ? (
              <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" /></div>
            ) : modulesWithPerms.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-medium">No matching permissions found for filter "{permFilter}"</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1.5 custom-scrollbar">
                {modulesWithPerms.map(mod => (
                  <div key={mod.id} className="space-y-2.5">
                    {/* Module Section Banner Header */}
                    <div className="flex items-center justify-between bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{mod.icon}</span>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{mod.label}</h4>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">{mod.groups.length} Section{mod.groups.length > 1 ? 's' : ''}</span>
                    </div>

                    {/* Module Group Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {mod.groups.map(({ groupKey, perms }) => {
                        const permIds = perms.map((p: any) => p.id);
                        const selectedCount = permIds.filter((id: string) => (form.permissionIds || []).includes(id)).length;
                        const allSelected = selectedCount === perms.length && perms.length > 0;
                        const groupInfo = groupLabels[groupKey] || { label: groupKey, icon: '⚡' };

                        return (
                          <div key={groupKey} className={`p-3.5 rounded-xl border transition-all ${selectedCount > 0 ? 'bg-slate-50/90 border-slate-300/80 shadow-2xs' : 'bg-slate-50/40 border-slate-200/60'}`}>
                            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-2.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs">{groupInfo.icon}</span>
                                <h4 className="text-xs font-bold text-slate-800 truncate">
                                  {groupInfo.label}
                                </h4>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${selectedCount > 0 ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'bg-slate-200/70 text-slate-500'}`}>
                                  {selectedCount}/{perms.length}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleAllInGroup(perms)}
                                className="text-[10px] font-bold text-[var(--color-primary)] hover:underline shrink-0 ml-2"
                              >
                                {allSelected ? 'Deselect' : 'Select all'}
                              </button>
                            </div>

                            <div className="space-y-2">
                              {perms.map((p: any) => {
                                const isChecked = (form.permissionIds || []).includes(p.id);
                                return (
                                  <label key={p.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${isChecked ? 'bg-white border-[var(--color-primary)]/40 shadow-2xs' : 'bg-white/60 border-slate-200/60 hover:border-slate-300'}`}>
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-slate-300'}`}>
                                        {isChecked && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <input type="checkbox" className="sr-only" checked={isChecked} onChange={() => togglePerm(p.id)} />
                                      <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-semibold leading-tight truncate ${isChecked ? 'text-slate-900' : 'text-slate-600'}`}>{p.description || p.action}</p>
                                        <p className="text-[10px] font-mono text-slate-400 truncate">{p.action}</p>
                                      </div>
                                    </div>
                                    {getActionBadge(p.action)}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">{(form.permissionIds || []).length} permissions active</span>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-white hover:border-slate-300 transition-colors">Cancel</button>
            <button type="button" onClick={save} disabled={loading} className="btn-primary py-2 text-xs flex items-center gap-2 disabled:opacity-60 shadow-xs">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {role ? 'Save Changes' : 'Create Role'}
            </button>
          </div>
        </div>
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
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((role, idx) => (
                  <tr key={role.id} className="hover:bg-slate-50/70 group transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-400">
                      {idx + 1}
                    </td>
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
