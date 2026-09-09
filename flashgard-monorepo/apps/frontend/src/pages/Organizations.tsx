import React, { useEffect, useState, useCallback } from 'react';
import { orgsApi, contactsApi, usersApi, addressesApi, licensesApi, cutCreditsApi, rolesApi, permissionsApi } from '../lib/api';
import {
  Building2, Plus, Search, Edit2, Trash2, Loader2,
  Users, MapPin, Phone, Ticket, Key,
  ChevronRight, ChevronLeft, Star, Check, ChevronDown, X, Gift, RotateCcw, Download, ShieldCheck, QrCode
} from 'lucide-react';
import { HasPermission } from '../components/HasPermission';
import { useAuth } from '../contexts/AuthContext';
import { formatISTDate } from '../lib/dateUtils';
import { UserModal } from './UsersPage';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import { TransferCreditsModal } from './LicensesPage';
import { WelcomeKitModal } from '../components/WelcomeKitModal';

function buildOrgRows(orgs: any[]) {
  const byParent = new Map<string, any[]>();
  const byId = new Map<string, any>();

  for (const org of orgs || []) {
    if (!org?.id) continue;
    // Map type if missing
    if (!org.type && org.organizationType?.name) {
      org.type = org.organizationType.name.toLowerCase();
    }
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

const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!text) return null;
  if (!highlight || !highlight.trim()) return <span>{text}</span>;
  const escaped = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.trim().toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5 font-bold">{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

const OrgHoverCard = ({ org, orgs, position, typeColors }: { org: any; orgs: any[]; position: { top: number; left: number }; typeColors: Record<string, string> }) => {
  if (!org) return null;
  const parentOrg = org.parentId ? orgs.find((o: any) => o.id === org.parentId) : null;
  const topPos = Math.min(position.top, typeof window !== 'undefined' ? window.innerHeight - 180 : position.top);

  return (
    <div
      style={{ top: `${Math.max(10, topPos)}px`, left: `${position.left}px` }}
      className="fixed z-50 w-72 bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl border border-slate-700/80 transition-opacity duration-150 animate-in fade-in zoom-in-95 pointer-events-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
            <Building2 className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-xs text-white leading-snug break-words">{org.name}</h4>
        </div>
      </div>

      <div className="space-y-1.5 text-[11px] text-slate-300 border-t border-slate-800/80 pt-2.5 mt-1">
        {org.type && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Type:</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${typeColors[org.type] || 'bg-slate-800 text-slate-300'}`}>
              {org.type}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Status:</span>
          <span className={`inline-flex items-center gap-1 font-semibold ${org.isActive !== false ? 'text-emerald-400' : 'text-slate-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${org.isActive !== false ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {org.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>

        {parentOrg && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Parent Org:</span>
            <span className="font-medium text-slate-200 truncate max-w-[150px]" title={parentOrg.name}>
              {parentOrg.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Helper Components ───────────────────────────────
const PaginationBar = ({ meta, page, setPage, pageSize, setPageSize }: { meta: any; page: number; setPage: (fn: any) => void; pageSize?: number; setPageSize?: (sz: number) => void }) => {
  if (!meta || !meta.totalPages || meta.totalPages <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-3 shadow-sm my-2">
      <div className="flex items-center gap-2 text-slate-600 font-medium flex-wrap">
        <span>Showing Page <strong className="text-slate-900 font-bold">{meta.page || page}</strong> of <strong className="text-slate-900 font-bold">{meta.totalPages}</strong></span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 font-mono"><strong className="text-slate-800">{meta.total}</strong> total records</span>
        {pageSize && setPageSize && (
          <>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-medium">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-slate-800 cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((p: number) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-1.5 font-semibold text-xs border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition bg-white text-slate-700 shadow-sm flex items-center gap-1 cursor-pointer"
        >
          ← Previous
        </button>
        <div className="flex items-center gap-1 px-1">
          <span className="text-slate-500">Page</span>
          <select
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(pNum => (
              <option key={pNum} value={pNum}>Page {pNum}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setPage((p: number) => Math.min(meta.totalPages, p + 1))}
          disabled={page >= meta.totalPages}
          className="px-3 py-1.5 font-semibold text-xs border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition bg-white text-slate-700 shadow-sm flex items-center gap-1 cursor-pointer"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

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
const OrgModal = ({ org, allOrgs, defaultParentId, onClose, onSave }: any) => {
  const { user } = useAuth();
  const [form, setForm] = useState(() => {
    if (org) {
      return {
        ...org,
        type: org.type || org.organizationType?.name?.toLowerCase() || 'distributor',
      };
    }
    return { name: '', type: 'distributor', isActive: true, parentId: defaultParentId || '' };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchOrg, setSearchOrg] = useState('');
  const [isParentOpen, setIsParentOpen] = useState(false);

  const [expandedParents, setExpandedParents] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const effectiveParent = form.parentId || defaultParentId;
    if (effectiveParent) {
      initial.add(effectiveParent);
      let pId = effectiveParent;
      const orgMap = new Map<string, any>((allOrgs || []).map((o: any) => [o.id, o]));
      while (pId) {
        initial.add(pId);
        const parent = orgMap.get(pId);
        pId = parent ? parent.parentId : null;
      }
    }
    return initial;
  });

  const validParents = React.useMemo(() => {
    return (allOrgs || []).filter((o: any) => o.id !== org?.id);
  }, [allOrgs, org?.id]);

  const filteredParents = React.useMemo(() => {
    const rows = buildOrgRows(validParents);
    if (searchOrg) {
      return rows.filter((r: any) => r.org.name.toLowerCase().includes(searchOrg.toLowerCase())).slice(0, 150);
    }
    const orgMap = new Map<string, any>(validParents.map((o: any) => [o.id, o]));
    return rows.filter((row: any) => {
      let p = orgMap.get(row.org.parentId);
      while (p) {
        if (!expandedParents.has(p.id)) return false;
        p = orgMap.get(p.parentId);
      }
      return true;
    });
  }, [validParents, searchOrg, expandedParents]);

  const selectedParent = validParents.find((o: any) => o.id === form.parentId);

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
          <div className="relative">
            <label className="text-sm font-medium text-slate-700 block mb-1">Parent Organization</label>
            <div className="relative">
              <div 
                onClick={() => setIsParentOpen(!isParentOpen)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
              >
                <span className="text-sm truncate">
                  {form.parentId ? (selectedParent?.name || 'Unknown') : (user?.isSuperAdmin ? 'None (Top-level)' : 'Select parent...')}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
              {isParentOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsParentOpen(false)} />
                  <div className="absolute z-20 w-full bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-100 bg-white">
                      <input 
                        autoFocus
                        type="text"
                        placeholder="Search organizations..."
                        value={searchOrg}
                        onChange={e => setSearchOrg(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
                      {user?.isSuperAdmin && !searchOrg && (
                        <div
                          onClick={() => { setForm({ ...form, parentId: '' }); setIsParentOpen(false); setSearchOrg(''); }}
                          className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${!form.parentId ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
                        >
                          None (Top-level)
                        </div>
                      )}
                      {filteredParents.map((row: any) => {
                        const o = row.org;
                        const depth = row.depth;
                        const hasChildren = row.hasChildren;
                        const isExpanded = expandedParents.has(o.id);
                        return (
                          <div
                            key={o.id}
                            className={`flex items-center justify-between px-3 py-1 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${form.parentId === o.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
                          >
                            <div
                              onClick={() => { setForm({ ...form, parentId: o.id }); setIsParentOpen(false); setSearchOrg(''); }}
                              className="flex-1 flex items-center gap-2 min-w-0 py-1"
                            >
                              {!searchOrg ? (
                                <span className="whitespace-pre truncate">
                                  {'\u00A0'.repeat(depth * 3)}
                                  {depth > 0 ? '↳ ' : ''}
                                  {o.name}
                                </span>
                              ) : (
                                <span className="truncate">{o.name}</span>
                              )}
                              {o.type && (
                                <span className="text-[10px] text-slate-400 capitalize shrink-0 font-normal">
                                  ({o.type})
                                </span>
                              )}
                            </div>
                            {!searchOrg && hasChildren && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedParents(prev => {
                                    const next = new Set(prev);
                                    if (next.has(o.id)) next.delete(o.id);
                                    else next.add(o.id);
                                    return next;
                                  });
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 shrink-0"
                              >
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {filteredParents.length === 0 && <div className="p-3 text-sm text-slate-400 text-center">No results found</div>}
                    </div>
                  </div>
                </>
              )}
            </div>
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
export const OrgRoleModal = ({ role, orgId, onClose, onSave }: any) => {
  const [form, setForm] = useState(role || { name: '', description: '', isSystemRole: false, permissionIds: [] });
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
      .catch((e: any) => setError('Failed to load permissions: ' + e.message))
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
      else await rolesApi.create({ ...form, organizationId: orgId });
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
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
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
                placeholder="Brief summary of responsibilities..." 
              />
            </div>
          </div>

          {/* Permissions Suite */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Module Permissions</h3>
                <p className="text-[11px] text-slate-400">Permissions grouped by application modules</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
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
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <span>{m.icon} {m.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeModuleTab === m.id ? 'bg-white/20 text-white' : mSelected > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
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
                className="w-full pl-9 pr-8 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
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
              <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
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
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${selectedCount > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-500'}`}>
                                  {selectedCount}/{perms.length}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleAllInGroup(perms)}
                                className="text-[10px] font-bold text-blue-600 hover:underline shrink-0 ml-2"
                              >
                                {allSelected ? 'Deselect' : 'Select all'}
                              </button>
                            </div>

                            <div className="space-y-2">
                              {perms.map((p: any) => {
                                const isChecked = (form.permissionIds || []).includes(p.id);
                                return (
                                  <label key={p.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${isChecked ? 'bg-white border-blue-500/40 shadow-2xs' : 'bg-white/60 border-slate-200/60 hover:border-slate-300'}`}>
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
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
};

// ─── Tab Contents ─────────────────────────────────────
const DetailsTab = ({
  org,
  orgs,
  onEdit,
}: {
  org: any;
  orgs: any[];
  onEdit: () => void;
}) => {
  const typeColors: Record<string, string> = {
    internal: 'bg-purple-100 text-purple-700',
    distributor: 'bg-blue-100 text-blue-700',
    dealer: 'bg-green-100 text-green-700',
    retailer: 'bg-amber-100 text-amber-700',
    supplier: 'bg-rose-100 text-rose-700',
  };
  const wallet = org.tenantWallets?.[0];
  const parentOrg = (orgs || []).find((o: any) => o.id === org.parentId);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-700">Organization Details</h3>
        <HasPermission permission="orgs:write">
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
          { label: 'Parent Organization', value: parentOrg ? parentOrg.name : 'None (Top-level)' },
          { label: 'Available Credits', value: <span className="font-bold text-indigo-600">{wallet?.balance || 0}</span> },
          { label: 'Used Credits', value: <span className="text-slate-600">{wallet?.usedCredits || 0}</span> },
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
        <HasPermission permission={['contacts:write', 'orgs:write']} requireAll={false}>
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
          {items.map((c, idx) => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-slate-400 shrink-0 min-w-[20px]">{idx + 1}</span>
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
                <HasPermission permission={['contacts:write', 'orgs:write']} requireAll={false}>
                  <button onClick={() => setModal(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                </HasPermission>
                <HasPermission permission={['contacts:delete', 'contacts:write', 'orgs:write']} requireAll={false}>
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

const UsersTab = ({ orgId }: { orgId: string }) => {
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any>(null);
  const [resetModal, setResetModal] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    usersApi.getAll(undefined, false, undefined, undefined, orgId).then((res: any) => {
      const data = Array.isArray(res) ? res : (res.data || res.items || []);
      setItems(data.filter((u: any) => !u.isSuperAdmin));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6">
      {modal && <UserModal user={modal === 'new' ? null : modal} defaultOrgId={orgId} onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />}
      <ResetPasswordModal 
        isOpen={!!resetModal}
        onClose={() => setResetModal(null)}
        userName={resetModal ? [resetModal.firstName, resetModal.lastName].filter(Boolean).join(' ') || resetModal.email : undefined}
        onConfirm={async (newPassword) => {
          await usersApi.resetPassword(resetModal.id, newPassword);
        }}
      />
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Users</h3>
        <HasPermission permission="users:write">
          <button onClick={() => setModal('new')} className="btn-primary text-sm flex items-center gap-1.5 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add User
          </button>
        </HasPermission>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Users} message="No users in this organization" addLabel="Add a user" onAdd={() => setModal('new')} />
      ) : (
        <div className="space-y-2">
          {items.map((u, idx) => (
            <div key={u.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group">
              <span className="font-mono text-xs font-bold text-slate-400 shrink-0 min-w-[20px]">{idx + 1}</span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center">
                {(u.firstName?.[0] || u.email?.[0] || '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{[u.firstName, u.lastName].filter(Boolean).join(' ') || u.email}</p>
                <p className="text-xs text-slate-500 truncate">{u.email} · {u.organizations?.find((o: any) => String(o.organizationId) === String(orgId))?.role?.name || 'No role'}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                {u.isActive ? 'Active' : 'Inactive'}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <HasPermission permission="users:write">
                  <button onClick={() => setModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Edit User"><Edit2 className="w-4 h-4" /></button>
                </HasPermission>
                {currentUser?.isSuperAdmin && (
                  <button onClick={() => setResetModal(u)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" title="Reset Password"><Key className="w-4 h-4" /></button>
                )}
              </div>
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
        <HasPermission permission={['addresses:write', 'orgs:write']} requireAll={false}>
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
          {items.map((a, idx) => (
            <div key={a.id} className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-200 transition-colors">
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-bold text-slate-400 shrink-0 min-w-[20px] mt-1">{idx + 1}</span>
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
                <HasPermission permission={['addresses:write', 'orgs:write']} requireAll={false}>
                  <button onClick={() => setModal(a)} className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                </HasPermission>
                <HasPermission permission={['addresses:delete', 'addresses:write', 'orgs:write']} requireAll={false}>
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

const IssueLicenseModal = ({ orgId, onClose, onSave }: any) => {
  const [form, setForm] = useState({
    targetOrgId: orgId,
    licenseType: 'BASIC',
    totalCount: 1,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await licensesApi.issue(form);
      onSave();
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Issue New Licenses</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Service Level</label>
            <select value={form.licenseType} onChange={e=>setForm({...form, licenseType: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500">
              <option value="BASIC">Basic</option>
              <option value="ADVANCED">Advanced</option>
              <option value="PRO">Pro</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-1 block">Quantity</label>
            <input type="number" min="1" value={form.totalCount} onChange={e=>setForm({...form, totalCount: parseInt(e.target.value)})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">{loading ? 'Issuing...' : 'Issue'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LicensesTab = ({ orgId }: { orgId: string }) => {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmState, setConfirmState] = useState<{isOpen: boolean; license?: any; newStatus?: string; loading: boolean; error?: string}>({
    isOpen: false, loading: false
  });

  const load = useCallback(() => {
    setLoading(true);
    licensesApi.getInventory(orgId).then((res: any) => {
      setLicenses(Array.isArray(res) ? res : (res.data || []));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const toggleStatus = async () => {
    if (!confirmState.license || !confirmState.newStatus) return;
    setConfirmState(prev => ({ ...prev, loading: true, error: undefined }));
    try {
      await licensesApi.updateStatus(confirmState.license.id, confirmState.newStatus);
      load();
      setConfirmState({ isOpen: false, loading: false });
    } catch (err: any) { 
      setConfirmState(prev => ({ ...prev, loading: false, error: err.message || 'An error occurred' }));
    }
  };

  const handleToggleClick = (license: any) => {
    const newStatus = license.status === 'AVAILABLE' || license.status === 'ACTIVE' ? 'SUSPENDED' : 'AVAILABLE';
    setConfirmState({ isOpen: true, license, newStatus, loading: false, error: undefined });
  };

  const filteredLicenses = licenses.filter(l => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const lastTransfer = l.transferItems?.[0]?.transfer;
    const assignedBy = lastTransfer?.fromOrg?.name || 'Flashgard';
    const ownerName = l.owner?.name || '';
    const key = l.key || '';
    const status = l.status || '';
    const type = l.batch?.licenseType || '';

    return (
      key.toLowerCase().includes(term) ||
      ownerName.toLowerCase().includes(term) ||
      status.toLowerCase().includes(term) ||
      type.toLowerCase().includes(term) ||
      assignedBy.toLowerCase().includes(term)
    );
  });

  const handleExportLicensesExcel = async () => {
    const xlsxMod = await import('xlsx-js-style');
    const XLSX = xlsxMod.default || xlsxMod;

    const dataToExport = filteredLicenses.map((l, index) => {
      const lastTransfer = l.transferItems?.[0]?.transfer;
      const assignedBy = lastTransfer?.fromOrg?.name || 'Flashgard';
      return {
        '#': index + 1,
        'License Key': l.key || 'N/A',
        'Owner / Assigned To': l.owner?.name || 'N/A',
        'Assigned By': assignedBy,
        'Type': l.batch?.licenseType || 'STANDARD',
        'Status': l.status || 'AVAILABLE',
        'Expiry Date': l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : 'Never',
        'Created At': l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Licenses');
    XLSX.writeFile(workbook, `Organization_Licenses_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalPages = Math.ceil(filteredLicenses.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLicenses = filteredLicenses.slice(startIndex, startIndex + pageSize);

  const totalLicenses = licenses.length;
  const availableLicenses = licenses.filter(l => l.status === 'AVAILABLE' && (!l.ownerId || l.ownerId === orgId || l.ownerId === l.tenantId)).length;
  const assignedLicenses = totalLicenses - availableLicenses;

  return (
    <div className="p-6 space-y-4">
      {modal && <IssueLicenseModal orgId={orgId} onClose={() => setModal(false)} onSave={() => { setModal(false); load(); }} />}
      <ConfirmDialog 
        isOpen={confirmState.isOpen}
        title="Change License Status"
        message={`Are you sure you want to change the status of this license to ${confirmState.newStatus}?`}
        confirmLabel={confirmState.newStatus === 'SUSPENDED' ? 'Suspend' : 'Activate'}
        variant={confirmState.newStatus === 'SUSPENDED' ? 'danger' : 'success'}
        isLoading={confirmState.loading}
        errorMessage={confirmState.error}
        onConfirm={toggleStatus}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false, error: undefined }))}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-2">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
          <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">Total Licenses</p>
          <p className="text-2xl font-black text-indigo-700">{totalLicenses}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">Assigned / Active</p>
          <p className="text-2xl font-black text-emerald-700">{assignedLicenses}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-1">Remaining / Available</p>
          <p className="text-2xl font-black text-amber-700">{availableLicenses}</p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-700">Organization Licenses</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search licenses..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleExportLicensesExcel}
            disabled={filteredLicenses.length === 0}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 whitespace-nowrap border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50"
            title="Download Listed Licenses as Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" /> Export Excel
          </button>
          <HasPermission permission="licenses:write">
            <button onClick={() => setModal(true)} className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" /> Add Licenses
            </button>
          </HasPermission>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : filteredLicenses.length === 0 ? (
        <EmptyState icon={Key} message={searchTerm ? "No licenses match your search." : "No licenses found for this organization."} onAdd={() => setModal(true)} addLabel="Add Licenses" />
      ) : (
        <>
          {/* Top Pagination Controls */}
          <PaginationBar meta={{ totalPages, total: filteredLicenses.length, page: currentPage }} page={currentPage} setPage={setCurrentPage} pageSize={pageSize} setPageSize={setPageSize} />

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Org</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Key</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLicenses.map((l, idx) => {
                  const lastTransfer = l.transferItems?.[0]?.transfer;
                  const assignedDate = lastTransfer?.resolvedAt || lastTransfer?.createdAt || l.createdAt;
                  const assignedBy = lastTransfer?.fromOrg?.name || 'Flashgard';
                  return (
                    <tr key={l.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                         <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-xs">{l.owner?.name}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{l.owner?.organizationType?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md inline-block shadow-2xs">
                          {l.key}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{l.batch?.licenseType || 'BASIC'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{formatISTDate(assignedDate)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 text-xs">{assignedBy}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          l.status === 'ACTIVE' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : l.status === 'AVAILABLE' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : l.status === 'SUSPENDED' 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <HasPermission permission="licenses:write">
                          <button 
                            onClick={() => handleToggleClick(l)} 
                            className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${l.status === 'AVAILABLE' || l.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                          >
                            {l.status === 'AVAILABLE' || l.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        </HasPermission>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Controls */}
          <PaginationBar meta={{ totalPages, total: filteredLicenses.length, page: currentPage }} page={currentPage} setPage={setCurrentPage} pageSize={pageSize} setPageSize={setPageSize} />
        </>
      )}
    </div>
  );
};

const CreditsTab = ({ orgId, org, orgs, reload }: { orgId: string, org: any, orgs: any[], reload: () => void }) => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const wallet = org?.tenantWallets?.[0] || { balance: 0, usedCredits: 0, totalCredits: 0 };

  useEffect(() => {
    setLoading(true);
    cutCreditsApi.getInventory(undefined, undefined, undefined, undefined, undefined, orgId).then((res: any) => {
      const items = Array.isArray(res) ? res : (res.data ? res.data : []);
      setTransfers(items);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);

  const filteredTransfers = transfers.filter(t => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const assignedFrom = t.owner?.name || 'System';
    const planType = t.planType || '';
    const notes = t.notes || '';
    const credits = String(t.credits || '');

    return (
      assignedFrom.toLowerCase().includes(term) ||
      planType.toLowerCase().includes(term) ||
      notes.toLowerCase().includes(term) ||
      credits.toLowerCase().includes(term)
    );
  });

  const handleExportAssignmentsExcel = async () => {
    const xlsxMod = await import('xlsx-js-style');
    const XLSX = xlsxMod.default || xlsxMod;

    const dataToExport = filteredTransfers.map((t, index) => {
      return {
        '#': index + 1,
        'Assigned From': t.owner?.name || 'System',
        'Credits': t.credits || 0,
        'Plan Type': t.planType || 'REGULAR',
        'Date': t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A',
        'Notes': t.notes || 'N/A'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Credit_Assignments');
    XLSX.writeFile(workbook, `Organization_Credit_Assignments_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalPages = Math.ceil(filteredTransfers.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransfers = filteredTransfers.slice(startIndex, startIndex + pageSize);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>;
  
  return (
    <div className="p-6 space-y-6">
      {/* Wallet Summary Card */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
          <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">Available Balance</p>
          <p className="text-3xl font-black text-indigo-700">{wallet.balance}</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
          <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 truncate" title="Used / Transferred Credits">Used / Transferred Credits</p>
          <p className="text-3xl font-black text-slate-700">{(wallet.totalCredits || 0) - (wallet.balance || 0)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Lifetime Total</p>
          <p className="text-3xl font-black text-slate-700">{wallet.totalCredits}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-700">Assignment History</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search credit transfers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={handleExportAssignmentsExcel}
            disabled={filteredTransfers.length === 0}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 whitespace-nowrap border border-slate-200 hover:bg-slate-100 transition-all disabled:opacity-50"
            title="Download Listed Assignment History as Excel"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" /> Export Excel
          </button>
          <HasPermission permission="licenses:write">
            <button onClick={() => setModal(true)} className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 whitespace-nowrap">
              <Plus className="w-3.5 h-3.5" /> Assign Credit
            </button>
          </HasPermission>
        </div>
      </div>
      
      {modal && <TransferCreditsModal initialOrgId={orgId} orgs={orgs} isAssignMode={true} onClose={() => setModal(false)} onSave={() => { setModal(false); reload(); }} />}
      
      {filteredTransfers.length === 0 ? (
        <EmptyState icon={Ticket} message={searchTerm ? "No credit assignments match your search." : "No credit assignments found for this organization."} />
      ) : (
        <>
          {/* Top Pagination Controls */}
          <PaginationBar meta={{ totalPages, total: filteredTransfers.length, page: currentPage }} page={currentPage} setPage={setCurrentPage} pageSize={pageSize} setPageSize={setPageSize} />

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned From</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Credits / Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes / Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransfers.map((t, idx) => (
                  <tr key={t.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{t.owner?.name || 'System'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        {t.planType === 'USAGE' ? (
                          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-md inline-block shadow-2xs">
                            +{t.credits} Cuts
                          </span>
                        ) : t.planType === 'UNLIMITED' ? (
                          (() => {
                            const start = t.startDate ? new Date(t.startDate) : new Date(t.createdAt);
                            const end = t.endDate ? new Date(t.endDate) : (t.validityDays ? new Date(start.getTime() + t.validityDays * 24 * 60 * 60 * 1000) : null);
                            return (
                              <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200/80 px-2.5 py-1 rounded-md inline-block shadow-2xs">
                                {end ? `${formatISTDate(start)} - ${formatISTDate(end)}` : `${t.validityDays} Days`}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-md inline-block shadow-2xs">
                            Lifetime
                          </span>
                        )}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t.planType || 'USAGE'} Plan</span>
                          {t.isOffer && (
                            <span className="flex items-center gap-1 text-[9px] text-purple-600 bg-purple-50 border border-purple-100 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md">
                              <Gift className="w-3 h-3" /> Offer
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      {t.notes ? (
                        <span className="text-xs text-slate-600 break-words font-medium">{t.notes}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatISTDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Controls */}
          <PaginationBar meta={{ totalPages, total: filteredTransfers.length, page: currentPage }} page={currentPage} setPage={setCurrentPage} pageSize={pageSize} setPageSize={setPageSize} />
        </>
      )}
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [orgModal, setOrgModal] = useState<any>(null);
  const [welcomeKitOrgId, setWelcomeKitOrgId] = useState<string | null>(null);

  // New state for collapsible left sidebar and tree expansions
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [hoveredOrg, setHoveredOrg] = useState<{ org: any; pos: { top: number; left: number } } | null>(null);

  // Ref map for smooth scrolling selected org into view in left list
  const itemRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== search) setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, debouncedSearch]);

  // Smooth scroll selected organization into view in sidebar
  useEffect(() => {
    if (selected?.id) {
      const el = itemRefs.current.get(selected.id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selected?.id]);

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
      const res: any = await orgsApi.getAll();
      const data = Array.isArray(res) ? res : (res.data || res.items || []);
      setOrgs(data);
      
      // After save, re-fetch selected org detail
      if (keepSelected && selected) {
        const fresh = await orgsApi.getOne(selected.id).catch(() => selected);
        if (!fresh.type && fresh.organizationType?.name) {
          fresh.type = fresh.organizationType.name.toLowerCase();
        }
        setSelected(fresh);
      } else if (!selected && data.length > 0) {
        // Find the first visual row after hierarchy and sort
        const rows = buildOrgRows(data);
        const firstOrg = rows.length > 0 ? rows[0].org : data[0];
        if (firstOrg && firstOrg.id) {
          const detail = await orgsApi.getOne(firstOrg.id).catch(() => firstOrg);
          if (!detail.type && detail.organizationType?.name) {
            detail.type = detail.organizationType.name.toLowerCase();
          }
          setSelected(detail);
        }
      }
    } catch (err) { console.error('Failed to fetch orgs:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(); }, []);

  const selectOrg = async (org: any) => {
    setActiveTab('Details');
    const detail = await orgsApi.getOne(org.id);
    if (detail && !detail.type && detail.organizationType?.name) {
      detail.type = detail.organizationType.name.toLowerCase();
    }
    setSelected(detail);
  };

  // Client-side search: auto-expand parent paths and select matching organization
  useEffect(() => {
    if (!debouncedSearch.trim() || orgs.length === 0) return;

    const query = debouncedSearch.toLowerCase().trim();
    const matched = orgs.filter((org: any) => 
      String(org.name || '').toLowerCase().includes(query) ||
      (org.type && String(org.type).toLowerCase().includes(query))
    );
    
    if (matched.length > 0) {
      const idsToExpand = new Set<string>();
      const orgMap = new Map(orgs.map(o => [o.id, o]));

      for (const m of matched) {
        // Expand the matched org itself so its children are visible under it
        idsToExpand.add(m.id);

        let currentParentId = m.parentId;
        while (currentParentId) {
          idsToExpand.add(currentParentId);
          const parent = orgMap.get(currentParentId);
          currentParentId = parent ? parent.parentId : null;
        }
      }

      if (idsToExpand.size > 0) {
        setExpandedIds(prev => {
          const next = new Set(prev);
          idsToExpand.forEach(id => next.add(id));
          return next;
        });
      }

      // Auto-select first matching organization if current selection is not among results
      if (!selected || !matched.some((m: any) => m.id === selected.id)) {
        selectOrg(matched[0]);
      }
    }
  }, [debouncedSearch, orgs]);

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

  const orgRows = React.useMemo(() => {
    const allRows = buildOrgRows(orgs);
    const orgMap = new Map(orgs.map(o => [o.id, o]));
    const query = debouncedSearch.toLowerCase().trim();

    if (!query) {
      return allRows.filter((row: any) => {
        let p = orgMap.get(row.org.parentId);
        while (p) {
          if (!expandedIds.has(p.id)) return false;
          p = orgMap.get(p.parentId);
        }
        return true;
      });
    }

    const matchingIds = new Set<string>();
    const ancestorIds = new Set<string>();
    const descendantIds = new Set<string>();

    const childrenMap = new Map<string, any[]>();
    for (const org of orgs) {
      if (org.parentId) {
        const list = childrenMap.get(org.parentId) || [];
        list.push(org);
        childrenMap.set(org.parentId, list);
      }
    }

    const collectDescendants = (parentId: string) => {
      const children = childrenMap.get(parentId) || [];
      for (const child of children) {
        if (!descendantIds.has(child.id)) {
          descendantIds.add(child.id);
          collectDescendants(child.id);
        }
      }
    };

    for (const org of orgs) {
      const nameMatch = String(org.name || '').toLowerCase().includes(query);
      const typeMatch = String(org.type || '').toLowerCase().includes(query);
      if (nameMatch || typeMatch) {
        matchingIds.add(org.id);
        let curr = orgMap.get(org.parentId);
        while (curr) {
          ancestorIds.add(curr.id);
          curr = orgMap.get(curr.parentId);
        }
        collectDescendants(org.id);
      }
    }

    const visibleIds = new Set([...matchingIds, ...ancestorIds, ...descendantIds]);

    return allRows.filter((row: any) => {
      if (!visibleIds.has(row.org.id)) return false;
      let p = orgMap.get(row.org.parentId);
      while (p) {
        if (!expandedIds.has(p.id)) return false;
        p = orgMap.get(p.parentId);
      }
      return true;
    });
  }, [orgs, expandedIds, debouncedSearch]);

  const handleExportExcel = async () => {
    if (!orgs || orgs.length === 0) {
      alert('No organizations available to export.');
      return;
    }

    try {
      const xlsxMod = await import('xlsx-js-style');
      const XLSX = xlsxMod.default || xlsxMod;

      const rows = (debouncedSearch.trim() && orgRows.length > 0) ? orgRows : buildOrgRows(orgs);
      const orgMap = new Map(orgs.map((o: any) => [o.id, o]));

      const headers = [
        'Hierarchy Level',
        'Organization Name (Tree)',
        'Organization Name',
        'Type',
        'Status',
        'Parent Organization',
        'User Names',
        'Addresses',
        'Created At'
      ];

      const sheetData: any[][] = [headers];

      rows.forEach(({ org, depth }: any) => {
        const parent = org.parentId ? orgMap.get(org.parentId) : null;
        const indentedName = `${'  '.repeat(depth)}${org.name || ''}`;

        // Extract users (Names & Emails)
        const userList = org.users || [];
        const userNamesStr = userList.length > 0
          ? userList.map((u: any) => {
              const full = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || 'User';
              return u.email ? `${full} (${u.email})` : full;
            }).join('\n')
          : '';

        // Extract addresses
        const addressList = org.addresses || [];
        const addressesStr = addressList.length > 0
          ? addressList.map((a: any) => {
              const parts = [a.streetLine1, a.streetLine2, a.city, a.state, a.postalCode, a.country].filter(Boolean);
              return `${a.type ? `[${String(a.type).toUpperCase()}] ` : ''}${parts.join(', ')}`;
            }).join('\n')
          : '';

        sheetData.push([
          `Level ${depth}`,
          indentedName,
          org.name || '',
          org.type ? String(org.type).toUpperCase() : '',
          org.isActive !== false ? 'Active' : 'Inactive',
          parent ? parent.name : 'None (Top-level)',
          userNamesStr,
          addressesStr,
          org.createdAt ? new Date(org.createdAt).toLocaleDateString() : ''
        ]);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      const headerStyle = {
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '1E293B' } },
        alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: 'CBD5E1' } }
        }
      };

      const parentStyle = {
        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '1E1B4B' } },
        fill: { fgColor: { rgb: 'E0E7FF' } },
        alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
          left: { style: 'thin', color: { rgb: 'CBD5E1' } },
          right: { style: 'thin', color: { rgb: 'CBD5E1' } }
        }
      };

      const childStyle = {
        font: { name: 'Calibri', sz: 11, color: { rgb: '334155' } },
        fill: { fgColor: { rgb: 'FFFFFF' } },
        alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      };

      for (let R = range.s.r; R <= range.e.r; ++R) {
        const isHeader = R === 0;
        const rowItem = !isHeader ? rows[R - 1] : null;
        const isParent = rowItem ? (rowItem.hasChildren || rowItem.depth === 0 || orgs.some((o: any) => o.parentId === rowItem.org.id)) : false;

        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          if (!worksheet[cellRef]) continue;

          if (isHeader) {
            worksheet[cellRef].s = headerStyle;
          } else if (isParent) {
            worksheet[cellRef].s = parentStyle;
          } else {
            worksheet[cellRef].s = childStyle;
          }
        }
      }

      worksheet['!cols'] = [
        { wch: 15 }, // Hierarchy Level
        { wch: 32 }, // Organization Name (Tree)
        { wch: 25 }, // Organization Name
        { wch: 15 }, // Type
        { wch: 12 }, // Status
        { wch: 25 }, // Parent Organization
        { wch: 38 }, // User Names
        { wch: 45 }, // Addresses
        { wch: 15 }  // Created At
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Organizations Hierarchy');

      const dateStr = new Date().toISOString().substring(0, 10);
      XLSX.writeFile(workbook, `Organizations_Hierarchy_${dateStr}.xlsx`);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Failed to export organizations: ' + (err.message || err));
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-6 -mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {orgModal && (
        <OrgModal
          org={orgModal === 'new' ? null : orgModal}
          allOrgs={orgs}
          defaultParentId={selected?.id || ''}
          onClose={() => setOrgModal(null)}
          onSave={() => { setOrgModal(null); fetchOrgs(true); }}
        />
      )}

      {/* ── Left Panel: Org List ── */}
      <div className={`hidden lg:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} border-r border-slate-200 bg-slate-50 flex-col shrink-0`}>
        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
          {!isSidebarCollapsed && (
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate">
              <Building2 className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Organizations
            </h2>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors mx-auto lg:mx-0"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        
        {!isSidebarCollapsed && (
          <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:bg-white transition-all"
                placeholder="Search orgs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/50"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => fetchOrgs(true)} className="w-7 h-7 shrink-0 rounded-lg border border-slate-200 text-slate-500 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm" title="Refresh">
              <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={handleExportExcel} className="w-7 h-7 shrink-0 rounded-lg border border-slate-200 text-slate-500 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm" title="Export Excel (Parent-Child Hierarchy)">
              <Download className="w-3.5 h-3.5" />
            </button>
            <HasPermission permission="orgs:write">
              <button onClick={() => setOrgModal('new')} className="w-7 h-7 shrink-0 rounded-lg bg-[var(--color-accent)] text-white flex items-center justify-center hover:bg-[var(--color-accent-dark)] transition-colors shadow-sm" title="New Organization">
                <Plus className="w-4 h-4" />
              </button>
            </HasPermission>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>
          ) : orgs.length === 0 ? (
            <div className="p-6 text-center">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              {!isSidebarCollapsed && <p className="text-sm text-slate-400">No organizations found</p>}
            </div>
          ) : orgRows.length === 0 ? (
            <div className="p-6 text-center">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              {!isSidebarCollapsed && (
                <>
                  <p className="text-xs font-semibold text-slate-600 mb-1">No matching organizations</p>
                  <p className="text-[11px] text-slate-400">Try a different search term</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {orgRows.map(({ org, depth, hasChildren }: any) => (
                <div
                  key={org.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(org.id, el);
                    else itemRefs.current.delete(org.id);
                  }}
                  style={{ paddingLeft: `${depth * 1}rem` }}
                  onClick={() => selectOrg(org)}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredOrg({
                      org,
                      pos: {
                        top: rect.top,
                        left: rect.right + 10,
                      },
                    });
                  }}
                  onMouseLeave={() => setHoveredOrg(null)}
                  className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    selected?.id === org.id 
                      ? 'bg-indigo-50 text-[var(--color-accent)] font-bold ring-1 ring-indigo-200/80 shadow-sm' 
                      : 'hover:bg-white text-slate-600'
                  } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <div className="relative flex items-center justify-center w-4 h-4 shrink-0" onClick={(e) => hasChildren ? toggleExpand(org.id, e) : undefined}>
                    {hasChildren ? (
                      <ChevronRight className={`w-3 h-3 transition-transform ${expandedIds.has(org.id) ? 'rotate-90' : ''}`} />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    )}
                    {isSidebarCollapsed && selected?.id === org.id && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--color-accent)] rounded-full border-2 border-slate-50" />
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                      <span className={`text-[11px] font-medium truncate ${depth === 0 ? 'uppercase tracking-wider font-bold text-slate-900' : ''}`}>
                        <HighlightText text={org.name} highlight={debouncedSearch} />
                      </span>
                      {org.type && (
                         <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 ${typeColors[org.type] || 'bg-slate-100 text-slate-500'}`}>
                           <HighlightText text={org.type} highlight={debouncedSearch} />
                         </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {hoveredOrg && (
          <OrgHoverCard
            org={hoveredOrg.org}
            orgs={orgs}
            position={hoveredOrg.pos}
            typeColors={typeColors}
          />
        )}

        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium text-center w-full">
            {debouncedSearch.trim() ? (
              <span>{orgRows.length.toLocaleString()} organization{orgRows.length !== 1 ? 's' : ''} listed</span>
            ) : (
              <span>{orgs.length.toLocaleString()} organization{orgs.length !== 1 ? 's' : ''}</span>
            )}
          </p>
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
          <HasPermission permission="orgs:write">
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
              <button
                onClick={() => setWelcomeKitOrgId(selected.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors shadow-xs cursor-pointer"
                title="View Digital Onboarding Pass & Activation Certificate"
              >
                <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Welcome Pass</span>
              </button>
              <button onClick={() => setRefreshTrigger(p => p + 1)} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center bg-white shadow-sm" title="Refresh Tab">
                <RotateCcw className="w-4 h-4 text-slate-500" />
              </button>
              <HasPermission permission="orgs:write">
                <button onClick={() => setOrgModal(selected)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              </HasPermission>
              <HasPermission permission="orgs:write">
                <button onClick={() => handleDelete(selected.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-100 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </HasPermission>
            </div>
          </div>

          {/* Tabs */}
          <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto" key={activeTab + '_' + refreshTrigger}>
            {activeTab === 'Details' && (
              <DetailsTab
                org={selected}
                orgs={orgs}
                onEdit={() => setOrgModal(selected)}
              />
            )}
            {activeTab === 'Contacts' && <ContactsTab orgId={selected.id} />}
            {activeTab === 'Users' && <UsersTab orgId={selected.id} />}
            {activeTab === 'Addresses' && <AddressesTab orgId={selected.id} />}
            {activeTab === 'Licenses' && <LicensesTab orgId={selected.id} />}
            {activeTab === 'Credits' && <CreditsTab orgId={selected.id} org={selected} orgs={orgs} reload={() => fetchOrgs(true)} />}
          </div>
        </div>
      )}

      {welcomeKitOrgId && (
        <WelcomeKitModal
          isOpen={!!welcomeKitOrgId}
          orgId={welcomeKitOrgId}
          onClose={() => setWelcomeKitOrgId(null)}
        />
      )}
    </div>
  );
};

export default Organizations;
