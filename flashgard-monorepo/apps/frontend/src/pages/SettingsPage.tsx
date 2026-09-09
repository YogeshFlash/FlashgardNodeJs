import React, { useEffect, useState } from 'react';
import {
  Bell, ShieldCheck, Database, Globe,
  Plus, Edit2, Trash2, Loader2, Users, Search, Key, Check, List, X, Shield, RotateCcw, Building,
  ChevronLeft, ChevronRight, ChevronDown, Cpu, CreditCard, Calendar, Clock, Play, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { rolesApi, usersApi, permissionsApi, auditLogsApi, orgsApi, organizationTypesApi, productTypesApi, materialCategoriesApi, filmCategoriesApi, materialsApi, plottersApi, plotterDevicesApi, paymentGatewayApi, migrationScheduleApi } from '../lib/api';
import { HasPermission, usePermissions } from '../components/HasPermission';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { UserPermissionsModal } from '../components/UserPermissionsModal';
import { ResetPasswordModal } from '../components/ResetPasswordModal';
import { formatISTDateTime } from '../lib/dateUtils';
import { useTranslation } from '../contexts/LanguageContext';

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


const PaginationBar = ({ meta, page, setPage, pageSize, setPageSize }: { meta: any; page: number; setPage: (fn: any) => void; pageSize?: number; setPageSize?: (sz: number) => void }) => {
  if (!meta || !meta.totalPages || meta.totalPages <= 0) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs gap-3 shadow-sm my-3">
      <div className="flex items-center gap-2 text-slate-600 font-medium">
        <span>Showing Page <strong className="text-slate-900 font-bold">{meta.page || page}</strong> of <strong className="text-slate-900 font-bold">{meta.totalPages}</strong></span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 font-mono"><strong className="text-slate-800">{meta.total}</strong> total records</span>
      </div>
      <div className="flex items-center gap-2">
        {setPageSize && pageSize && (
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-slate-500 font-medium">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {[10, 20, 50, 100].map(sz => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={() => setPage((p: any) => typeof p === 'function' ? p(page) : Math.max(1, page - 1))}
          disabled={page <= 1}
          className="px-3 py-1.5 font-semibold text-xs border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition bg-white text-slate-700 shadow-sm flex items-center gap-1 cursor-pointer"
        >
          ← Previous
        </button>
        <div className="flex items-center gap-1 px-1">
          <span className="text-slate-500 font-medium">Page</span>
          <select
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(pNum => (
              <option key={pNum} value={pNum}>Page {pNum}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setPage((p: any) => typeof p === 'function' ? p(page) : Math.min(meta.totalPages, page + 1))}
          disabled={page >= meta.totalPages}
          className="px-3 py-1.5 font-semibold text-xs border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white transition bg-white text-slate-700 shadow-sm flex items-center gap-1 cursor-pointer"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

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
  const { language, setLanguage, t } = useTranslation();
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
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{t('notifications')}</h3>
            <p className="text-[10px] text-slate-400 font-semibold">{t('notifDesc')}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Toggle checked={emailNotif} onChange={setEmailNotif} label={t('emailNotif')} desc={t('emailNotifDesc')} />
          <Toggle checked={loginAlert} onChange={setLoginAlert} label={t('loginAlerts')} desc={t('loginAlertsDesc')} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{t('securitySettings')}</h3>
            <p className="text-[10px] text-slate-400 font-semibold">{t('securityDesc')}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Toggle checked={twoFA} onChange={setTwoFA} label={t('twoFA')} desc={t('twoFADesc')} />
          <div className="py-3.5 border-b border-slate-100 flex justify-between items-center px-2 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-700">{t('sessionTimeout')}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{t('sessionTimeoutDesc')}</p>
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
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{t('localization')}</h3>
            <p className="text-[10px] text-slate-400 font-semibold">{t('localDesc')}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="py-2 border-b border-slate-100 flex justify-between items-center px-2 rounded-xl">
            <p className="text-sm font-semibold text-slate-700">{t('defaultLanguage')}</p>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="en">English</option>
              <option value="ta">Tamil (தமிழ்)</option>
              <option value="hi">Hindi (हिन्दी)</option>
            </select>
          </div>
          <div className="py-2 flex justify-between items-center px-2 rounded-xl">
            <p className="text-sm font-semibold text-slate-700">{t('timezone')}</p>
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
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{t('systemDetails')}</h3>
            <p className="text-[10px] text-slate-400 font-semibold">{t('systemDetailsDesc')}</p>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          {[
            { label: t('application'), value: 'Flashgard CRM' },
            { label: t('version'), value: '2.0.0' },
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


// ─── Payment Gateway Tab ───────────────────────────
const PaymentGatewayTab = () => {
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [distributorId, setDistributorId] = useState('');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setError('');
        const [settings, allOrgs] = await Promise.all([
          paymentGatewayApi.getSettings(),
          orgsApi.getAll()
        ]);
        setRazorpayKeyId(settings.razorpayKeyId);
        setRazorpayKeySecret(settings.razorpayKeySecret);
        setDistributorId(settings.rechargeDistributorId);
        setOrgs(allOrgs || []);
      } catch (err: any) {
        console.error(err);
        setError('Failed to load settings: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razorpayKeyId || !razorpayKeySecret || !distributorId) {
      setError('All fields are required');
      return;
    }

    try {
      setError('');
      setSuccess(false);
      setSaving(true);
      await paymentGatewayApi.saveSettings({
        razorpayKeyId,
        razorpayKeySecret,
        rechargeDistributorId: distributorId
      });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-bold text-slate-800">Payment Gateway & Distributor Settings</h3>
        <p className="text-xs text-slate-400 mt-1">
          Configure API credentials for Razorpay payments and define the default parent organization from which customer recharge credits are assigned.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl font-medium">
          Settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Razorpay Key ID</label>
          <input
            type="text"
            className="input-field w-full px-4 py-2.5 text-sm"
            placeholder="rzp_test_..."
            value={razorpayKeyId}
            onChange={(e) => setRazorpayKeyId(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Razorpay Key Secret</label>
          <input
            type="password"
            className="input-field w-full px-4 py-2.5 text-sm font-mono"
            placeholder="••••••••••••••••"
            value={razorpayKeySecret}
            onChange={(e) => setRazorpayKeySecret(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Assigned From Organization</label>
          <select
            className="input-field w-full px-4 py-2.5 text-sm bg-white"
            value={distributorId}
            onChange={(e) => setDistributorId(e.target.value)}
          >
            <option value="">Select Organization</option>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 mt-1">
            This organization acts as the primary source when generating "CutCredit" history logs on user wallet balance top-ups.
          </p>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary px-6 py-2 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};


// ─── System Roles Tab ───────────────────────────────
const RoleModal = ({ role, onClose, onSave }: any) => {
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState(role || { name: '', description: '', isSystemRole: true, isRestricted: false, permissionIds: [] });
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

    // Map defined modules first
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

    // Capture uncategorized groups
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
            <div className="w-10 h-10 rounded-xl bg-[var(--color-gold-muted)] text-[var(--color-accent)] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">{role ? `Edit Role: ${role.name}` : 'Create New System Role'}</h2>
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
                placeholder="e.g. Regional Operations Manager" 
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

          {currentUser?.isSuperAdmin && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/70">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="roleRestricted" 
                  checked={form.isRestricted} 
                  onChange={e => setForm({ ...form, isRestricted: e.target.checked })} 
                  className="w-4 h-4 rounded border-slate-300 text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer" 
                />
                <label htmlFor="roleRestricted" className="text-xs font-semibold text-slate-700 cursor-pointer">Restricted Admin Access</label>
              </div>
              <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium border border-amber-200/60">Platform Admins Only</span>
            </div>
          )}

          {/* Permissions Suite */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Module Permissions</h3>
                <p className="text-[11px] text-slate-400">Permissions grouped by application modules</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-gold-muted)] px-2.5 py-1 rounded-lg">
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
                        ? 'bg-[var(--color-accent)] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <span>{m.icon} {m.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeModuleTab === m.id ? 'bg-white/20 text-white' : mSelected > 0 ? 'bg-[var(--color-gold-muted)] text-[var(--color-accent)]' : 'bg-slate-200 text-slate-500'
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
                className="w-full pl-9 pr-8 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20 focus:bg-white transition-all"
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
              <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[var(--color-accent)]" /></div>
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
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${selectedCount > 0 ? 'bg-[var(--color-gold-muted)] text-[var(--color-accent)]' : 'bg-slate-200/70 text-slate-500'}`}>
                                  {selectedCount}/{perms.length}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleAllInGroup(perms)}
                                className="text-[10px] font-bold text-[var(--color-accent)] hover:underline shrink-0 ml-2"
                              >
                                {allSelected ? 'Deselect' : 'Select all'}
                              </button>
                            </div>

                            <div className="space-y-2">
                              {perms.map((p: any) => {
                                const isChecked = (form.permissionIds || []).includes(p.id);
                                return (
                                  <label key={p.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${isChecked ? 'bg-white border-[var(--color-accent)]/40 shadow-2xs' : 'bg-white/60 border-slate-200/60 hover:border-slate-300'}`}>
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isChecked ? 'bg-[var(--color-accent)] border-[var(--color-accent)]' : 'border-slate-300'}`}>
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

          <div className="flex items-center gap-2 p-3 bg-[var(--color-gold-light)] rounded-xl border border-[var(--color-gold-muted)]">
            <ShieldCheck className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
            <p className="text-xs text-[var(--color-accent)] font-medium leading-snug">System roles automatically sync permissions across all associated organizations.</p>
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

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

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
        <input className="input-field pl-9 py-1.5 text-sm" placeholder="Search roles..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <PaginationBar
        meta={{ totalPages, total: filtered.length, page }}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />

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
            <table className="w-full text-sm table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[8%]">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[36%]">Role Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[36%]">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((role, idx) => (
                  <tr key={role.id} className={`hover:bg-slate-50 group transition-colors ${role.isDeleted ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">{(page - 1) * pageSize + idx + 1}</td>
                    <td className="px-4 py-3 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${role.isDeleted ? 'bg-red-100 text-red-500' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className={`font-semibold text-xs truncate ${role.isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{role.name}</span>
                        {role.isSystemRole && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider shrink-0">SYSTEM</span>}
                        {role.isRestricted && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wider shrink-0">RESTRICTED</span>}
                        {role.isDeleted && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider shrink-0">DELETED</span>}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-xs min-w-0 truncate ${role.isDeleted ? 'text-slate-400 italic' : 'text-slate-500'}`}>{role.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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

      <PaginationBar
        meta={{ totalPages, total: filtered.length, page }}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />

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

      <PaginationBar
        meta={{ totalPages: Math.ceil(totalUsers / itemsPerPage), total: totalUsers, page: currentPage }}
        page={currentPage}
        setPage={setCurrentPage}
      />

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

              <PaginationBar
                meta={{ totalPages: Math.ceil(totalUsers / itemsPerPage), total: totalUsers, page: currentPage }}
                page={currentPage}
                setPage={setCurrentPage}
              />
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
            <table className="w-full text-sm table-fixed">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[8%]">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[36%]">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[36%]">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((perm, idx) => (
                  <tr key={perm.id} className={`hover:bg-slate-50 group transition-colors ${perm.isDeleted ? 'bg-red-50/50' : ''}`}>
                    <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 min-w-0 truncate">
                      <span className={`font-mono text-xs font-bold ${perm.isDeleted ? 'line-through text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md inline-block shadow-2xs' : 'text-slate-800 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md inline-block shadow-2xs'}`}>
                        {perm.action}
                      </span>
                      {perm.isDeleted && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider shrink-0">DELETED</span>}
                    </td>
                    <td className={`px-4 py-3 text-xs min-w-0 truncate ${perm.isDeleted ? 'text-slate-400 italic' : 'text-slate-500 font-medium'}`}>{perm.description || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  
  const [confirm, setConfirm] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: async () => {}, isLoading: false });
  const closeConfirm = () => setConfirm((p: any) => ({ ...p, isOpen: false }));

  const load = async () => {
    setLoading(true);
    try { setItems(await organizationTypesApi.getAll(true)); } catch { } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(items.length / pageSize);

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

      <PaginationBar
        meta={{ totalPages, total: items.length, page }}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-[var(--color-accent)] animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((t, idx) => (
                <tr key={t.id} className={`group hover:bg-slate-50 transition-colors ${t.isDeleted ? 'bg-red-50/50' : ''}`}>
                  <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-bold ${t.isDeleted ? 'line-through text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md inline-block shadow-2xs' : 'text-slate-800 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-md inline-block shadow-2xs'}`}>
                        {t.name}
                      </span>
                      {t.isDeleted && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">DELETED</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-medium">{t.description || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaginationBar
        meta={{ totalPages, total: items.length, page }}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />

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
  // Film category hierarchical options
  const buildFilmCatOptions = (parentId: string | null = null, level = 0): { id: string; name: string; level: number }[] => {
    const nodes = filmCategories.filter((fc: any) => (parentId ? fc.parentId === parentId : (!fc.parentId || !filmCategories.some((p: any) => p.id === fc.parentId))));
    let result: { id: string; name: string; level: number }[] = [];
    nodes.forEach((node: any) => {
      result.push({ id: node.id, name: node.name, level });
      const children = buildFilmCatOptions(node.id, level + 1);
      result = result.concat(children);
    });
    return result;
  };
  const hierarchicalFilmCategories = buildFilmCatOptions();

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
              {hierarchicalFilmCategories.map((fc: any) => (
                <option key={fc.id} value={fc.id}>
                  {'\u00A0'.repeat(fc.level * 4)}{fc.level > 0 ? '└─ ' : ''}{fc.name}
                </option>
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

export const MaterialsTab = () => {
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
          materialCategoriesApi.getAll(undefined, search || undefined, includeDeleted),
          productTypesApi.getAll()
        ]);
        setMaterialCategories(categoriesList);
        setProductTypes(ptList);
      } else if (subTab === 'film-categories') {
        const [fcList, mcList] = await Promise.all([
          filmCategoriesApi.getAll(undefined, search || undefined),
          materialCategoriesApi.getAll()
        ]);
        setFilmCategories(fcList);
        setMaterialCategories(mcList);
      } else if (subTab === 'materials') {
        const [res, ptList, mcList, fcList] = await Promise.all([
          materialsApi.getAll(undefined, search || undefined, includeDeleted),
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
    { id: 'product-types', label: 'Product Lines' },
    { id: 'material-categories', label: 'Material Categories' },
    { id: 'film-categories', label: 'Film Series' },
    { id: 'materials', label: 'Catalog Materials' }
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
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['#', 'Name', 'Slug', 'Legacy ID', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productTypes.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">No product types found</td></tr>
                  ) : productTypes.map((t, idx) => (
                    <tr key={t.id} className={`group hover:bg-slate-50 transition-colors ${t.isDeleted ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{t.name}</td>
                      <td className="px-4 py-3 text-xs">
                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md inline-block shadow-2xs">
                          {t.slug}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{t.legacyId || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {t.isDeleted && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">DELETED</span>}
                      </td>
                      <td className="px-4 py-3">
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
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['#', 'Name', 'Product Type', 'Description', 'Legacy ID', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materialCategories.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400">No categories found</td></tr>
                  ) : materialCategories.map((t, idx) => (
                    <tr key={t.id} className={`group hover:bg-slate-50 transition-colors ${t.isDeleted ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{t.name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">{t.productType?.name || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{t.description || '—'}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{t.legacyId || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {t.isDeleted && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">DELETED</span>}
                      </td>
                      <td className="px-4 py-3">
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
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['#', 'Name', 'Material Category', 'Legacy ID', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filmCategories.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">No film categories found</td></tr>
                  ) : filmCategories.map((t, idx) => (
                    <tr key={t.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{t.name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">{t.materialCategory?.name || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-500">{t.legacyId || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['#', 'Name', 'Film Category', 'Thickness', 'Layers', 'Force/Speed', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {materials.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-400">No materials found</td></tr>
                  ) : materials.map((t, idx) => (
                    <tr key={t.id} className={`group hover:bg-slate-50 transition-colors ${t.isDeleted ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className={`font-semibold text-xs ${t.isDeleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.name}</p>
                        {t.legacyId && <p className="text-[10px] text-slate-400 font-mono">Legacy ID: {t.legacyId}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-slate-700">{t.filmCategory?.name || '—'}</p>
                          {t.filmCategory?.materialCategory && (
                            <p className="text-[10px] text-slate-400">
                              {t.filmCategory.materialCategory.productType?.name || '—'} / {t.filmCategory.materialCategory.name || '—'}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{t.thickness ? `${t.thickness}mm` : '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{t.layers}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">{t.minForce || '—'} / {t.minSpeed || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${t.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {t.isDeleted && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">DELETED</span>}
                      </td>
                      <td className="px-4 py-3">
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
  const [pageSize, setPageSize] = useState(25);

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
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);

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
      </div>

      <PaginationBar
        meta={{ totalPages, total: filtered.length, page: currentPage }}
        page={currentPage}
        setPage={setCurrentPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />

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
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['#', 'Timestamp', 'User', 'Action', 'Entity', 'Details'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLogs.map((log, idx) => (
                      <tr key={log.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{formatISTDateTime(log.createdAt)}</td>
                        <td className="px-4 py-3">
                          {log.user ? (
                            <div>
                              <p className="font-semibold text-slate-800 text-xs">{[log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || '—'}</p>
                              <p className="text-xs text-slate-500">{log.user.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">System Activity</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            log.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md inline-block shadow-2xs">
                            {log.entity}
                          </span>
                          {log.entityId && <p className="text-slate-400 text-[10px] font-mono mt-0.5 break-all">{log.entityId}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={JSON.stringify(log.details)}>{JSON.stringify(log.details)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar
                meta={{ totalPages, total: filtered.length, page: currentPage }}
                page={currentPage}
                setPage={setCurrentPage}
                pageSize={pageSize}
                setPageSize={setPageSize}
              />
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
    baseXYSeparator: '',
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
    splitCommands: false,
    startString: '',
    endString: '',
    xySeparator: '',
    mirrorX: false,
    mirrorY: false,
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
        splitCommands: !!plotter.splitCommands,
        startString: plotter.startString || '',
        endString: plotter.endString || '',
        xySeparator: plotter.xySeparator || '',
        mirrorX: !!plotter.mirrorX,
        mirrorY: !!plotter.mirrorY,
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
                    <input type="checkbox" checked={form.splitCommands} onChange={e => setForm({ ...form, splitCommands: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700">Split PU/PD Commands</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.mirrorX} onChange={e => setForm({ ...form, mirrorX: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700">Mirror Coordinates (X-Axis)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={form.mirrorY} onChange={e => setForm({ ...form, mirrorY: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700">Mirror Coordinates (Y-Axis)</span>
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
                  <input className="input-field" value={form.xySeparator} onChange={e => setForm({ ...form, xySeparator: e.target.value })} placeholder="e.g. ," />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Start Command</label>
                  <input className="input-field" value={form.startString} onChange={e => setForm({ ...form, startString: e.target.value })} placeholder="e.g. IN;" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">End Command</label>
                  <input className="input-field" value={form.endString} onChange={e => setForm({ ...form, endString: e.target.value })} placeholder="e.g. PU0,0;" />
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
  const [pageSize, setPageSize] = useState(15);
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
        const result = await plottersApi.getAll(search, currentPage, pageSize);
        setPlotters(result.items || []);
        setTotal(result.total || 0);
      } else {
        const result = await plotterDevicesApi.getAll(search, undefined, undefined, currentPage, pageSize);
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
  }, [subTab, search, currentPage, pageSize]);

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

  const totalPages = Math.ceil(total / pageSize);

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-xs flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input-field pl-9 py-1.5 text-sm w-full"
            placeholder={subTab === 'plotter-types' ? 'Search types...' : 'Search hardware serial/MAC/name...'}
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
        </div>
        <PaginationBar
          meta={{ totalPages, total, page: currentPage }}
          page={currentPage}
          setPage={setCurrentPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
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
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['#', 'Plotter Name', 'Manufacturer', 'Connection', 'Max Speed/Force', 'Legacy Type', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plotters.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">No plotter templates found</td>
                      </tr>
                    ) : plotters.map((item, idx) => (
                      <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-600 border border-indigo-100">
                              <Cpu className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{item.plotterName || '—'}</p>
                              {item.description && <p className="text-[10px] text-slate-400 max-w-[200px] truncate">{item.description}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 text-xs font-medium">{item.manufacturer || '—'}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">{item.connectionType || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                          {item.maxSpeed ? `${item.maxSpeed} mm/s` : '—'} / {item.maxForce ? `${item.maxForce} g` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs font-semibold">
                          {item.legacySettings?.plotterType || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
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
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['#', 'Name / Serial / MAC', 'Type (Template)', 'Assigned Organization', 'Connection Parameters', 'License Key', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {devices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-400 font-medium">No physical plotters registered</td>
                      </tr>
                    ) : devices.map((item, idx) => (
                      <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs">{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${item.status === 'ACTIVE' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400'}`}>
                              <Cpu className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{item.name}</p>
                              <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                                {item.serialNumber && <span>S/N: <span className="font-mono">{item.serialNumber}</span></span>}
                                {item.macAddress && <span>MAC: <span className="font-mono">{item.macAddress}</span></span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="font-semibold text-slate-700">{item.plotterMaster?.plotterName || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.organization ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">{item.organization.name}</span>
                          ) : (
                            <span className="text-slate-400 italic text-xs font-medium">System Stock</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="flex flex-col gap-0.5 font-mono text-slate-600">
                            {item.ipAddress && <span>IP: {item.ipAddress}</span>}
                            {item.comPort && <span>Port: {item.comPort}</span>}
                            {!item.ipAddress && !item.comPort && <span className="text-slate-400 italic font-sans">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {item.licenseKey ? (
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md inline-block shadow-2xs">
                              {item.licenseKey}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            item.status === 'MAINTENANCE' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
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

          <PaginationBar
            meta={{ totalPages, total, page: currentPage }}
            page={currentPage}
            setPage={setCurrentPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
          />
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

// ─── Migration Schedule Settings Tab ─────────────────────
const MigrationScheduleTab = () => {
  const [settings, setSettings] = useState<any>({
    enabled: false,
    frequency: '12h',
    lookbackDays: 3,
    entities: {
      stock: true,
      cutCredits: true,
      orders: false,
      users: false,
    },
    lastRunAt: null,
    nextRunAt: null,
    lastStatus: 'IDLE',
    lastError: null,
  });

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stg, lgList] = await Promise.all([
        migrationScheduleApi.getSettings(),
        migrationScheduleApi.getLogs()
      ]);
      if (stg) setSettings(stg);
      if (Array.isArray(lgList)) setLogs(lgList);
    } catch (err: any) {
      console.error('Failed to load migration schedule settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const updated = await migrationScheduleApi.saveSettings(settings);
      setSettings(updated);
      setSuccessMsg('Migration schedule settings saved successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerNow = async () => {
    setTriggering(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await migrationScheduleApi.triggerSync();
      setSuccessMsg(res.message || 'Incremental migration triggered successfully in background.');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to trigger sync.');
    } finally {
      setTriggering(false);
    }
  };

  const paginatedLogs = logs.slice((logPage - 1) * logPageSize, logPage * logPageSize);
  const totalLogPages = Math.ceil(logs.length / logPageSize);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 text-[var(--color-accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Scheduled Data Migration Sync
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automated incremental legacy database sync jobs and lookback windows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerNow}
            disabled={triggering || settings.lastStatus === 'RUNNING'}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100 transition-all flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            {triggering || settings.lastStatus === 'RUNNING' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            ) : (
              <Play className="w-3.5 h-3.5 text-amber-600" />
            )}
            Sync Now (Incremental)
          </button>
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-4 cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Settings
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Live Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3.5">
          <div className={`p-3 rounded-xl ${settings.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scheduler State</p>
            <p className="text-sm font-extrabold text-slate-800">{settings.enabled ? 'Enabled (Active)' : 'Disabled'}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3.5">
          <div className={`p-3 rounded-xl ${settings.lastStatus === 'RUNNING' ? 'bg-amber-100 text-amber-700 animate-pulse' : settings.lastStatus === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : settings.lastStatus === 'FAILED' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'}`}>
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Status</p>
            <p className="text-sm font-extrabold text-slate-800">{settings.lastStatus}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-700">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Last Run</p>
            <p className="text-xs font-bold text-slate-800">
              {settings.lastRunAt ? new Date(settings.lastRunAt).toLocaleString() : 'Never'}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Next Scheduled</p>
            <p className="text-xs font-bold text-slate-800">
              {settings.nextRunAt ? new Date(settings.nextRunAt).toLocaleString() : 'Disabled'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-6 shadow-xs">
        <h4 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center justify-between">
          <span>Sync Schedule & Connection Configuration</span>
          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">SQL Server Direct Connection</span>
        </h4>

        {/* Master Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/60 rounded-xl">
          <div>
            <p className="text-xs font-extrabold text-slate-800">Enable Automated Scheduled Sync</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Automatically trigger background incremental data sync at specified intervals.</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${settings.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settings.enabled ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        {/* Legacy Database Connection Settings */}
        <div className="space-y-4 pt-1">
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-600" /> Primary Legacy SQL Server Connection Details
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Server IP / Host *</label>
                <input
                  type="text"
                  className="input-field text-xs font-mono py-1.5"
                  placeholder="e.g. 192.168.1.50 or Yogesh"
                  value={settings.connection?.server || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    connection: { ...settings.connection, server: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Database Name *</label>
                <input
                  type="text"
                  className="input-field text-xs font-mono py-1.5"
                  placeholder="e.g. scratchgard"
                  value={settings.connection?.database || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    connection: { ...settings.connection, database: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Database User ID *</label>
                <input
                  type="text"
                  className="input-field text-xs font-mono py-1.5"
                  placeholder="e.g. sa"
                  value={settings.connection?.user || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    connection: { ...settings.connection, user: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Database Password *</label>
                <input
                  type="password"
                  className="input-field text-xs font-mono py-1.5"
                  placeholder="••••••••"
                  value={settings.connection?.password || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    connection: { ...settings.connection, password: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Port</label>
                <input
                  type="number"
                  className="input-field text-xs font-mono py-1.5"
                  placeholder="1433"
                  value={settings.connection?.port || 1433}
                  onChange={(e) => setSettings({
                    ...settings,
                    connection: { ...settings.connection, port: Number(e.target.value) }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Separate Connection for Models & Designs */}
          <div className="bg-purple-50/50 border border-purple-200/70 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-purple-600" /> Additional Connection: 3. Models & Designs Database
                </p>
                <p className="text-[11px] text-purple-700 mt-0.5">Enable if Models & Designs data resides in a separate dedicated legacy database instance.</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, useCustomDesignsConnection: !settings.useCustomDesignsConnection })}
                className={`w-11 h-5.5 rounded-full transition-colors relative flex-shrink-0 cursor-pointer ${settings.useCustomDesignsConnection ? 'bg-purple-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform ${settings.useCustomDesignsConnection ? 'translate-x-5.5' : ''}`} />
              </button>
            </div>

            {settings.useCustomDesignsConnection && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-purple-200/50 animate-in fade-in">
                <div>
                  <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-1">Designs Server IP *</label>
                  <input
                    type="text"
                    className="input-field text-xs font-mono py-1.5 bg-white border-purple-200"
                    placeholder="e.g. 192.168.1.55"
                    value={settings.designsConnection?.server || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      designsConnection: { ...settings.designsConnection, server: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-1">Designs DB Name *</label>
                  <input
                    type="text"
                    className="input-field text-xs font-mono py-1.5 bg-white border-purple-200"
                    placeholder="e.g. scratchgard_designs"
                    value={settings.designsConnection?.database || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      designsConnection: { ...settings.designsConnection, database: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-1">Designs User ID *</label>
                  <input
                    type="text"
                    className="input-field text-xs font-mono py-1.5 bg-white border-purple-200"
                    placeholder="e.g. sa"
                    value={settings.designsConnection?.user || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      designsConnection: { ...settings.designsConnection, user: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-1">Designs Password *</label>
                  <input
                    type="password"
                    className="input-field text-xs font-mono py-1.5 bg-white border-purple-200"
                    placeholder="••••••••"
                    value={settings.designsConnection?.password || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      designsConnection: { ...settings.designsConnection, password: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-purple-800 uppercase tracking-wider block mb-1">Port</label>
                  <input
                    type="number"
                    className="input-field text-xs font-mono py-1.5 bg-white border-purple-200"
                    placeholder="1433"
                    value={settings.designsConnection?.port || 1433}
                    onChange={(e) => setSettings({
                      ...settings,
                      designsConnection: { ...settings.designsConnection, port: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Lookback Window Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Lookback Window (Date Cutoff) *
            </label>
            <select
              value={settings.lookbackDays}
              onChange={(e) => setSettings({ ...settings, lookbackDays: Number(e.target.value) })}
              className="input-field py-2 text-xs font-semibold"
            >
              <option value={1}>Last 24 Hours (1 Day)</option>
              <option value={2}>Last 48 Hours (2 Days)</option>
              <option value={3}>Last 72 Hours (3 Days) — Recommended</option>
              <option value={7}>Last 1 Week (7 Days)</option>
              <option value={14}>Last 2 Weeks (14 Days)</option>
              <option value={30}>Last 1 Month (30 Days)</option>
            </select>
            <div className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 font-medium leading-relaxed">
              ⚡ <strong>Incremental Sync:</strong> Only records created or updated within the last <strong>{settings.lookbackDays} day(s)</strong> will be fetched from legacy SQL Server, avoiding full re-processing.
            </div>
          </div>

          {/* Frequency Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Sync Frequency Schedule *
            </label>
            <select
              value={settings.frequency}
              onChange={(e) => setSettings({ ...settings, frequency: e.target.value })}
              className="input-field py-2 text-xs font-semibold"
            >
              <option value="1h">Every 1 Hour</option>
              <option value="3h">Every 3 Hours</option>
              <option value="6h">Every 6 Hours</option>
              <option value="12h">Every 12 Hours (Recommended)</option>
              <option value="24h">Every 24 Hours (Daily)</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Interval between automated background sync triggers.
            </p>
          </div>
        </div>

        {/* Entity Selection (Categorized 14 Data Migration Tabs) */}
        <div className="space-y-5 pt-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Select Data Migration Modules to Sync (14 Hub Tabs)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allOn = { catalog: true, skins: true, designs: true, roles: true, users: true, licenses: true, mobileUsers: true, cutCredits: true, mobileAppCuts: true, dealerMasterQrs: true, plotterMasters: true, materials: true, stock: true, orders: true };
                  setSettings({ ...settings, entities: allOn });
                }}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Select All
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => {
                  const allOff = { catalog: false, skins: false, designs: false, roles: false, users: false, licenses: false, mobileUsers: false, cutCredits: false, mobileAppCuts: false, dealerMasterQrs: false, plotterMasters: false, materials: false, stock: false, orders: false };
                  setSettings({ ...settings, entities: allOff });
                }}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {[
            {
              category: 'Models & Catalog Management',
              items: [
                { key: 'catalog', label: '1. Categories & Brands', desc: 'Setup organizational structure & catalogue.' },
                { key: 'skins', label: '2. Cut Patterns', desc: 'Types of skins and cut settings.' },
                { key: 'designs', label: '3. Models & Designs', desc: 'Models, 17k+ design cut files & images.' },
                { key: 'materials', label: '12. Materials System', desc: 'ProductType, Material, Categories & config.' },
              ]
            },
            {
              category: 'System & Core',
              items: [
                { key: 'roles', label: '4. User Roles', desc: 'Legacy system roles & permissions.' },
                { key: 'users', label: '5. Org & Users', desc: 'Legacy user credentials & org links.' },
                { key: 'mobileUsers', label: '7. Mobile Users', desc: 'Registered mobile app users.' },
                { key: 'plotterMasters', label: '11. Plotter Masters', desc: 'Plotter hardware specifications.' },
              ]
            },
            {
              category: 'Inventory & Operations',
              items: [
                { key: 'cutCredits', label: '8. Cut Credits', desc: 'Cut credit wallets & dealer balances.' },
                { key: 'mobileAppCuts', label: '9. Mobile App Cuts', desc: 'Mobile app cut history to machine cut logs.' },
                { key: 'dealerMasterQrs', label: '10. Dealer Master QRs', desc: 'Dealer bulk QR code master table.' },
                { key: 'stock', label: '13. Stock & Dispatches', desc: 'Stock headers, QR codes, & dispatch orders.' },
              ]
            },
            {
              category: 'Transactions & Licensing',
              items: [
                { key: 'licenses', label: '6. Licenses', desc: 'Legacy licenses & dealer assignments.' },
                { key: 'orders', label: '14. Order History', desc: 'Recharge packages & past payment txns.' },
              ]
            }
          ].map(group => (
            <div key={group.category} className="space-y-2">
              <h5 className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                {group.category}
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.items.map(m => (
                  <label
                    key={m.key}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${settings.entities?.[m.key] ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-500/20' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-800">{m.label}</span>
                      <input
                        type="checkbox"
                        checked={!!settings.entities?.[m.key]}
                        onChange={(e) => setSettings({
                          ...settings,
                          entities: { ...settings.entities, [m.key]: e.target.checked }
                        })}
                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">{m.desc}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Logs Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>Recent Sync Execution Logs</span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{logs.length} Runs Logged</span>
          </h4>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to clear all scheduled migration logs?')) {
                    try {
                      await migrationScheduleApi.clearLogs();
                      setLogs([]);
                    } catch (e) {
                      console.error('Failed to clear logs', e);
                    }
                  }
                }}
                className="px-3 py-1.5 text-xs font-bold text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Logs
              </button>
            )}
          </div>
        </div>

        <PaginationBar
          meta={{ totalPages: totalLogPages, total: logs.length, page: logPage }}
          page={logPage}
          setPage={setLogPage}
          pageSize={logPageSize}
          setPageSize={setLogPageSize}
        />

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic font-medium">
              No scheduled migration runs logged yet.
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Trigger Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Lookback Range</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Entities Synced</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((log: any, idx: number) => (
                  <tr key={log.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-400 text-xs whitespace-nowrap">
                      {(logPage - 1) * logPageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatISTDateTime(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.triggerType === 'MANUAL' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                        {log.triggerType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-xs text-slate-700">
                      Last {log.lookbackDays} Day(s)
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate" title={log.entitiesSynced?.join(', ')}>
                      {log.entitiesSynced?.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {(log.durationMs / 1000).toFixed(1)}s
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-100 cursor-pointer transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <PaginationBar
          meta={{ totalPages: totalLogPages, total: logs.length, page: logPage }}
          page={logPage}
          setPage={setLogPage}
          pageSize={logPageSize}
          setPageSize={setLogPageSize}
        />
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${selectedLog.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Sync Execution Log Details ({selectedLog.id})
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {formatISTDateTime(selectedLog.timestamp)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trigger</span>
                  <span className="font-extrabold text-slate-800">{selectedLog.triggerType}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                  <span className={`font-extrabold ${selectedLog.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {selectedLog.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lookback</span>
                  <span className="font-extrabold text-slate-800">Last {selectedLog.lookbackDays} Day(s)</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                  <span className="font-mono font-extrabold text-slate-800">{(selectedLog.durationMs / 1000).toFixed(1)}s</span>
                </div>
              </div>

              {selectedLog.recordsSummary && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/70 text-emerald-800 rounded-xl font-medium">
                  {selectedLog.recordsSummary}
                </div>
              )}

              {selectedLog.error && (
                <div className="p-3 bg-rose-50 border border-rose-200/70 text-rose-800 rounded-xl font-medium font-mono text-[11px]">
                  <strong>Error:</strong> {selectedLog.error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Modules Synced ({selectedLog.entitiesSynced?.length || 0})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedLog.entitiesSynced?.map((ent: string) => (
                    <span key={ent} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[11px] border border-indigo-100">
                      {ent}
                    </span>
                  ))}
                </div>
              </div>

              {selectedLog.details && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Execution Result Breakdown
                  </label>
                  <pre className="p-3.5 bg-slate-900 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="btn-secondary text-xs px-4 py-2 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Settings Page ──────────────────────────────

const SettingsPage = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const tabs = [
    { id: 'general', label: t('generalSettings'), icon: Globe },
    { id: 'users', label: t('usersDirectory'), icon: Users }
  ];
  if (user?.isSuperAdmin || hasPermission('roles:read')) {
    tabs.push(
      { id: 'roles', label: t('accessRoles'), icon: ShieldCheck }
    );
  }
  if (user?.isSuperAdmin || (user as any)?.role?.isSystemRole) {
    tabs.push(
      { id: 'permissions', label: t('rolePermissions'), icon: Key }
    );
  }
  if (user?.isSuperAdmin || hasPermission('settings:read')) {
    tabs.push(
      { id: 'plotters', label: t('plottersDirectory'), icon: Cpu },
      { id: 'migrationSchedule', label: 'Migration Schedule', icon: Calendar }
    );
  }
  if (user?.isSuperAdmin) {
    tabs.push(
      { id: 'orgTypes', label: t('orgTypes'), icon: Building },
      { id: 'paymentGateway', label: 'Payment Gateway', icon: CreditCard }
    );
  }
  tabs.push({ id: 'Audit Logs', label: t('systemAuditLogs'), icon: List });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-900 rounded-2xl shadow-lg shadow-indigo-950/20 text-white">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t('systemSettings')}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{t('settingsDesc')}</p>
          </div>
        </div>
        <button onClick={() => setRefreshTrigger(p => p + 1)} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center bg-white shadow-sm self-end sm:self-center" title="Refresh">
          <RotateCcw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Side-by-side modern split container */}
      <div className="bg-slate-50/50 border border-slate-200/80 rounded-3xl overflow-hidden flex flex-col lg:flex-row min-h-[650px] shadow-sm">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-white p-4 flex flex-col gap-1.5 shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-3 mb-2">{t('controlCategories')}</p>
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
          {activeTab === 'general' && <GeneralTab key={'general_' + refreshTrigger} />}
          {activeTab === 'users' && <UsersTab key={'users_' + refreshTrigger} />}
          {activeTab === 'roles' && <RolesTabSettings key={'roles_' + refreshTrigger} />}
          {activeTab === 'permissions' && <RolePermissionsTab key={'permissions_' + refreshTrigger} />}
          {activeTab === 'plotters' && (
            <HasPermission permission="settings:read" fallback={<div className="p-12 text-center text-slate-500 font-medium">You don't have permission to view plotters.</div>}>
              <PlottersTabSettings key={'plotters_' + refreshTrigger} />
            </HasPermission>
          )}
          {activeTab === 'migrationSchedule' && (
            <HasPermission permission="settings:read" fallback={<div className="p-12 text-center text-slate-500 font-medium">You don't have permission to view migration schedule settings.</div>}>
              <MigrationScheduleTab key={'migSchedule_' + refreshTrigger} />
            </HasPermission>
          )}
          {activeTab === 'orgTypes' && <OrganizationTypesTab key={'orgTypes_' + refreshTrigger} />}
          {activeTab === 'paymentGateway' && (
            <HasPermission permission="settings:read" fallback={<div className="p-12 text-center text-slate-500 font-medium">You don't have permission to view gateway settings.</div>}>
              <PaymentGatewayTab key={'paymentGateway_' + refreshTrigger} />
            </HasPermission>
          )}
          {activeTab === 'Audit Logs' && (
            <HasPermission permission="audit_logs:read" fallback={<div className="p-12 text-center text-slate-500 font-medium">You don't have permission to view audit logs.</div>}>
              <AuditLogsTab key={'audit_' + refreshTrigger} />
            </HasPermission>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
