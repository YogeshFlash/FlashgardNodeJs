import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2, Plus, Search, Edit2, Trash2, Loader2,
  Users, MapPin, Phone, Ticket, Key,
  ChevronRight, Star, Check, ChevronDown
} from 'lucide-react';
import { orgsApi, contactsApi, usersApi, addressesApi, licensesApi, cutCreditsApi } from '../lib/api';
import { HasPermission } from '../components/HasPermission';
import { useAuth } from '../contexts/AuthContext';

function buildOrgRows(orgs: any[]) {
  const byParent = new Map<string, any[]>();
  const byId = new Map<string, any>();

  for (const org of orgs || []) {
    if (!org?.id) continue;
    byId.set(org.id, org);
    const parentKey = org.parentId || '__root__';
    const arr = byParent.get(parentKey) || [];
    arr.push(org);
    byParent.set(parentKey, arr);
  }

  for (const arr of byParent.values()) {
    arr.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }

  const roots = (byParent.get('__root__') || []).slice();
  // If API is already filtered by access, treat "missing parent" as root for display.
  for (const org of orgs || []) {
    if (org?.parentId && !byId.has(org.parentId)) roots.push(org);
  }

  const seenRootIds = new Set<string>();
  const dedupedRoots = roots.filter((o) =>
    o?.id && !seenRootIds.has(o.id) ? (seenRootIds.add(o.id), true) : false
  );

  const rows: { org: any; depth: number; hasChildren: boolean }[] = [];
  const visiting = new Set<string>();

  const walk = (node: any, depth: number) => {
    if (!node?.id) return;
    if (visiting.has(node.id)) return; // cycle guard
    visiting.add(node.id);

    const kids = byParent.get(node.id) || [];
    rows.push({ org: node, depth, hasChildren: kids.length > 0 });
    for (const child of kids) walk(child, depth + 1);

    visiting.delete(node.id);
  };

  dedupedRoots
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
    .forEach((r) => walk(r, 0));

  return rows;
}

// ─── Helper Components ───────────────────────────────
const TabBar = ({ tabs, active, onChange }: { tabs: any[]; active: string; onChange: (t: string) => void }) => (
  <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
    <div className="flex overflow-x-auto no-scrollbar px-2">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all whitespace-nowrap border-b-2 
              ${active === tab.id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            <Icon className={`w-3.5 h-3.5 ${active === tab.id ? 'text-[var(--color-accent)]' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold 
                ${active === tab.id ? 'bg-[var(--color-accent)] text-white' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const EmptyState = ({ icon: Icon, message, onAdd, addLabel }: any) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
      <Icon className="w-6 h-6 text-slate-400" />
    </div>
    <p className="text-slate-500 font-medium">{message}</p>
    {onAdd && (
      <button onClick={onAdd} className="mt-3 text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> {addLabel || 'Add one now'}
      </button>
    )}
  </div>
);

// ─── Org Form Modal ───────────────────────────────────
const OrgModal = ({ org, allOrgs, onClose, onSave }: any) => {
  const { user } = useAuth();
  const [form, setForm] = useState(org || { name: '', type: 'distributor', isActive: true, parentId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      // parentId is a UUID string (or null), not a number.
      const submitData = { ...form, parentId: form.parentId ? form.parentId : null };
      if (org?.id) await orgsApi.update(org.id, submitData);
      else await orgsApi.create(submitData);
      onSave();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">{org ? 'Edit Organization' : 'New Organization'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Organization Name</label>
            <input className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. ABC Distributors" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Type</label>
            <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {[(user?.isSuperAdmin ? 'internal' : null), 'distributor', 'dealer', 'retailer', 'supplier']
                .filter(Boolean)
                .map((t: any) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Parent Organization</label>
            <select className="input-field" value={form.parentId || ''} onChange={e => setForm({ ...form, parentId: e.target.value })}>
              {user?.isSuperAdmin && <option value="">None (Top-level)</option>}
              {allOrgs?.filter((o: any) => o.id !== org?.id).map((o: any) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="orgActive" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded border-slate-300" />
            <label htmlFor="orgActive" className="text-sm text-slate-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {org ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Contact Form Modal ───────────────────────────────
const ContactModal = ({ contact, orgId, onClose, onSave }: any) => {
  const [form, setForm] = useState(contact || { firstName: '', lastName: '', email: '', phone: '', jobTitle: '', isPrimary: false, organizationId: orgId });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (contact?.id) await contactsApi.update(contact.id, form);
      else await contactsApi.create({ ...form, organizationId: orgId });
      onSave();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">{contact ? 'Edit Contact' : 'New Contact'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">First Name</label>
              <input className="input-field" value={form.firstName} onChange={e => f('firstName', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Last Name</label>
              <input className="input-field" value={form.lastName} onChange={e => f('lastName', e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Email</label>
            <input type="email" className="input-field" value={form.email || ''} onChange={e => f('email', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Phone</label>
            <input className="input-field" value={form.phone || ''} onChange={e => f('phone', e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Job Title</label>
            <input className="input-field" value={form.jobTitle || ''} onChange={e => f('jobTitle', e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cPrimary" checked={form.isPrimary} onChange={e => f('isPrimary', e.target.checked)} className="rounded border-slate-300" />
            <label htmlFor="cPrimary" className="text-sm text-slate-700">Primary Contact</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Address Form Modal ──────────────────────────────
const AddressModal = ({ address, orgId, onClose, onSave }: any) => {
  const [form, setForm] = useState(address || { type: 'office', streetLine1: '', streetLine2: '', city: '', state: '', postalCode: '', country: 'India', isPrimary: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      if (address?.id) await addressesApi.update(address.id, form);
      else await addressesApi.create({ ...form, organizationId: orgId });
      onSave();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">{address ? 'Edit Address' : 'New Address'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Address Type</label>
            <select className="input-field" value={form.type} onChange={e => f('type', e.target.value)}>
              {['billing', 'shipping', 'office', 'warehouse', 'other'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Street Line 1</label>
            <input className="input-field" value={form.streetLine1} onChange={e => f('streetLine1', e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Street Line 2</label>
            <input className="input-field" value={form.streetLine2 || ''} onChange={e => f('streetLine2', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">City</label>
              <input className="input-field" value={form.city} onChange={e => f('city', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">State</label>
              <input className="input-field" value={form.state} onChange={e => f('state', e.target.value)} required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Postal Code</label>
              <input className="input-field" value={form.postalCode} onChange={e => f('postalCode', e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Country</label>
              <input className="input-field" value={form.country} onChange={e => f('country', e.target.value)} required />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="aPrimary" checked={form.isPrimary} onChange={e => f('isPrimary', e.target.checked)} className="rounded border-slate-300" />
            <label htmlFor="aPrimary" className="text-sm text-slate-700">Primary Address</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Org Role Form Modal ──────────────────────────────
const OrgRoleModal = ({ role, orgId, onClose, onSave }: any) => {
  const [form, setForm] = useState(role || { name: '', description: '', isSystemRole: false, permissionIds: [] });
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
      else await rolesApi.create({ ...form, organizationId: orgId });
      onSave();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">{role ? 'Edit Role' : 'New Role'}</h2>
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

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Tab Contents ─────────────────────────────────────
const DetailsTab = ({ org, onEdit }: { org: any; onEdit: () => void }) => {
  const typeColors: Record<string, string> = {
    internal: 'bg-purple-100 text-purple-700',
    distributor: 'bg-blue-100 text-blue-700',
    dealer: 'bg-green-100 text-green-700',
    retailer: 'bg-amber-100 text-amber-700',
    supplier: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Organization Details</h3>
        <HasPermission permission="organizations:write">
          <button onClick={onEdit} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
        </HasPermission>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Name', value: org.name },
          { label: 'Type', value: <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeColors[org.type] || 'bg-slate-100 text-slate-600'}`}>{org.type}</span> },
          { label: 'Status', value: <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${org.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{org.isActive ? 'Active' : 'Inactive'}</span> },
          { label: 'Organization ID', value: `#${org.id}` },
        ].map(({ label, value }) => (
          <div key={label} className="p-4 bg-slate-50 rounded-lg">
            <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
            <div className="text-sm font-medium text-slate-800">{value}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[
          { label: 'Contacts', count: org.contacts?.length ?? 0, icon: Phone, color: 'text-blue-600 bg-blue-50' },
          { label: 'Users', count: org.users?.length ?? 0, icon: Users, color: 'text-purple-600 bg-purple-50' },
          { label: 'Addresses', count: org.addresses?.length ?? 0, icon: MapPin, color: 'text-emerald-600 bg-emerald-50' },
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="p-4 bg-white border border-slate-100 rounded-xl text-center">
            <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mx-auto mb-2`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{count}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ContactsTab = ({ orgId }: { orgId: number }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await contactsApi.getAll(String(orgId))); }
    catch { } finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    await contactsApi.delete(id);
    load();
  };

  return (
    <div className="p-6">
      {modal && <ContactModal contact={modal === 'new' ? null : modal} orgId={orgId} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Contacts</h3>
        <HasPermission permission="contacts:write">
          <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </button>
        </HasPermission>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Phone} message="No contacts yet" onAdd={() => setModal('new')} addLabel="Add a contact" />
      ) : (
        <div className="space-y-3">
          {items.map(c => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                  {c.firstName?.[0]}{c.lastName?.[0]}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-800">{c.firstName} {c.lastName}</p>
                    {c.isPrimary && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                  </div>
                  <p className="text-xs text-slate-500">{c.jobTitle || ''}{c.jobTitle && c.email ? ' · ' : ''}{c.email || ''}</p>
                  {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <HasPermission permission="contacts:write">
                  <button onClick={() => setModal(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                </HasPermission>
                <HasPermission permission="contacts:delete">
                  <button onClick={() => del(c.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </HasPermission>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const UsersTab = ({ orgId }: { orgId: number }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    usersApi.getAll().then((all: any[]) => {
      // Exclude global super admins from the specific organization view
      setItems(all.filter(u => u.organizationId === orgId && !u.isSuperAdmin));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Users</h3>
        <p className="text-xs text-slate-400">Manage all users via the <a href="/users" className="text-blue-600 hover:underline">Users section</a></p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} message="No users in this organization" addLabel="Go to Users section" onAdd={() => window.location.href = '/users'} />
      ) : (
        <div className="space-y-2">
          {items.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center">
                {(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}</p>
                <p className="text-xs text-slate-500 truncate">{u.email} · {u.role?.name || 'No role'}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {u.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AddressesTab = ({ orgId }: { orgId: number }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await addressesApi.getAll(String(orgId))); }
    catch { } finally { setLoading(false); }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    await addressesApi.delete(id);
    load();
  };

  const typeColors: Record<string, string> = {
    billing: 'bg-rose-100 text-rose-700',
    shipping: 'bg-blue-100 text-blue-700',
    office: 'bg-slate-100 text-slate-700',
    warehouse: 'bg-amber-100 text-amber-700',
    other: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="p-6">
      {modal && <AddressModal address={modal === 'new' ? null : modal} orgId={orgId} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Addresses</h3>
        <HasPermission permission="addresses:write">
          <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Address
          </button>
        </HasPermission>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={MapPin} message="No addresses yet" onAdd={() => setModal('new')} addLabel="Add an address" />
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-200 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mt-0.5">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[a.type] || 'bg-slate-100 text-slate-600'}`}>{a.type}</span>
                    {a.isPrimary && <span className="text-xs text-amber-600 font-medium">· Primary</span>}
                  </div>
                  <p className="text-sm text-slate-800">{a.streetLine1}{a.streetLine2 ? `, ${a.streetLine2}` : ''}</p>
                  <p className="text-xs text-slate-500">{a.city}, {a.state} {a.postalCode}, {a.country}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <HasPermission permission="addresses:write">
                  <button onClick={() => setModal(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                </HasPermission>
                <HasPermission permission="addresses:delete">
                  <button onClick={() => del(a.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </HasPermission>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LicensesTab = ({ orgId }: { orgId: string }) => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    licensesApi.getInventory(orgId).then((res: any) => {
      setLicenses(Array.isArray(res) ? res : (res.data || []));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);
  
  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  if (licenses.length === 0) return <EmptyState icon={Key} message="No licenses found for this organization." />;
  return (
    <div className="p-6 space-y-4">
      <h3 className="font-semibold text-slate-700">Organization Licenses</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr><th className="p-3">Key</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {licenses.map(l => (
              <tr key={l.id}>
                <td className="p-3 font-mono font-bold text-slate-800">{l.key}</td>
                <td className="p-3">{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CreditsTab = ({ orgId }: { orgId: string }) => {
  const [credits, setCredits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    cutCreditsApi.getInventory(orgId).then((res: any) => {
      setCredits(Array.isArray(res) ? res : (res.data || []));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  if (credits.length === 0) return <EmptyState icon={Ticket} message="No credits found for this organization." />;
  return (
    <div className="p-6 space-y-4">
      <h3 className="font-semibold text-slate-700">Machine Cut Credits</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr><th className="p-3">Key</th><th className="p-3">Type</th><th className="p-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {credits.map(c => (
              <tr key={c.id}>
                <td className="p-3 font-mono font-bold text-slate-800">{c.key}</td>
                <td className="p-3">{c.batch?.planType}</td>
                <td className="p-3">{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Organizations Page ──────────────────────────
const TABS = [
  { id: 'Details', label: 'Details', icon: Building2 },
  { id: 'Contacts', label: 'Contacts', icon: Phone },
  { id: 'Users', label: 'Users', icon: Users },
  { id: 'Addresses', label: 'Addresses', icon: MapPin },
  { id: 'Licenses', label: 'Licenses', icon: Key },
  { id: 'Credits', label: 'Credits', icon: Ticket },
];

const Organizations = () => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('Details');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [orgModal, setOrgModal] = useState<any>(null);

  // New state for collapsible left sidebar and tree expansions
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchOrgs = async (keepSelected?: boolean) => {
    setLoading(true);
    try {
      const data = await orgsApi.getAll(search);
      setOrgs(data);
      // After save, re-fetch selected org detail
      if (keepSelected && selected) {
        const fresh = await orgsApi.getOne(selected.id);
        setSelected(fresh);
      } else if (!selected && data.length > 0) {
        const detail = await orgsApi.getOne(data[0].id);
        setSelected(detail);
      }
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(); }, [search]);

  const selectOrg = async (org: any) => {
    setActiveTab('Details');
    const detail = await orgsApi.getOne(org.id);
    setSelected(detail);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this organization? All contacts, addresses, and users will be affected.')) return;
    await orgsApi.delete(id);
    setSelected(null);
    fetchOrgs();
  };

  const typeColors: Record<string, string> = {
    internal: 'bg-purple-100 text-purple-700',
    distributor: 'bg-blue-100 text-blue-700',
    dealer: 'bg-green-100 text-green-700',
    retailer: 'bg-amber-100 text-amber-700',
    supplier: 'bg-rose-100 text-rose-700',
  };

  const orgRows = buildOrgRows(orgs).filter((row: any) => {
    let p = orgs.find((o: any) => o.id === row.org.parentId);
    while (p) {
      if (!expandedIds.has(p.id)) return false;
      p = orgs.find((o: any) => o.id === p.parentId);
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-6 -mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {orgModal && (
        <OrgModal
          org={orgModal === 'new' ? null : orgModal}
          allOrgs={orgs}
          onClose={() => setOrgModal(null)}
          onSave={() => { setOrgModal(null); fetchOrgs(true); }}
        />
      )}

      {/* ── Left Panel: Org List ── */}
      <div className="w-72 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Organizations</h2>
            <HasPermission permission="organizations:write">
              <button onClick={() => setOrgModal('new')} className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm" title="New Organization">
                <Plus className="w-4 h-4" />
              </button>
            </HasPermission>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>
          ) : orgs.length === 0 ? (
            <div className="p-6 text-center">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              {!isSidebarCollapsed && <p className="text-sm text-slate-400">No organizations found</p>}
            </div>
          ) : (
            <div className="space-y-1">
              {orgRows.map(({ org, depth, hasChildren }: any) => (
                <div
                  key={org.id}
                  style={{ paddingLeft: `${depth * 1}rem` }}
                  onClick={() => selectOrg(org)}
                  className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    selected?.id === org.id 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'hover:bg-slate-100/50 text-slate-600'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                  title={isSidebarCollapsed ? org.name : ''}
                >
                  <div className="relative flex items-center justify-center w-4 h-4 shrink-0" onClick={(e) => hasChildren ? toggleExpand(org.id, e) : undefined}>
                    {hasChildren ? (
                      <ChevronRight className={`w-3 h-3 transition-transform ${expandedIds.has(org.id) ? 'rotate-90' : ''}`} />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    )}
                    {isSidebarCollapsed && selected?.id === org.id && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-600 rounded-full border-2 border-slate-50" />
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <span className={`text-[11px] font-medium truncate ${selected?.id === org.id ? 'font-bold text-blue-700' : 'text-slate-700'}`}>
                        {org.name}
                      </span>
                      {org.type && (
                         <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${typeColors[org.type] || 'bg-slate-100 text-slate-500'}`}>
                           {org.type}
                         </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-white">
          <p className="text-xs text-slate-400 text-center">{orgs.length} organization{orgs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Right Panel: Org Detail ── */}
      {!selected ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-slate-600 font-semibold mb-1">Select an Organization</h3>
          <p className="text-sm text-slate-400">Click an organization from the list to view its details.</p>
          <HasPermission permission="organizations:write">
            <button onClick={() => setOrgModal('new')} className="mt-4 btn-primary flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> New Organization
            </button>
          </HasPermission>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-start justify-between flex-shrink-0">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Organizations</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-700 font-medium">{selected.name}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
              <span className={`mt-1 inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${typeColors[selected.type] || 'bg-slate-100 text-slate-600'}`}>
                {selected.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <HasPermission permission="organizations:write">
                <button onClick={() => setOrgModal(selected)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              </HasPermission>
              <HasPermission permission="organizations:delete">
                <button onClick={() => handleDelete(selected.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-100 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </HasPermission>
            </div>
          </div>

          {/* Tabs */}
          <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'Details' && <DetailsTab org={selected} onEdit={() => setOrgModal(selected)} />}
            {activeTab === 'Contacts' && <ContactsTab orgId={selected.id} />}
            {activeTab === 'Users' && <UsersTab orgId={selected.id} />}
            {activeTab === 'Addresses' && <AddressesTab orgId={selected.id} />}
            {activeTab === 'Licenses' && <LicensesTab orgId={selected.id} />}
            {activeTab === 'Credits' && <CreditsTab orgId={selected.id} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;
