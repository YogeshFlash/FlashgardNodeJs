import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plus, Send, X, AlertCircle, Activity,
  Laptop, RotateCcw, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { licensesApi, cutCreditsApi, orgsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const Badge = ({ children, variant = 'gray' }: any) => {
  const styles: any = {
    gray: 'bg-slate-100 text-slate-600 border-slate-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]}`}>
      {children}
    </span>
  );
};

const buildHierarchy = (orgsInput: any[]): any[] => {
  const orgs = Array.isArray(orgsInput) ? orgsInput : (orgsInput as any).data || (orgsInput as any).items || [];
  const byParent = new Map<string, any[]>();
  const byId = new Map<string, any>();

  for (const org of orgs) {
    if (!org?.id) continue;
    byId.set(org.id, org);
    const parentKey = org.parentId || '__root__';
    const arr = byParent.get(parentKey) || [];
    arr.push(org);
    byParent.set(parentKey, arr);
  }

  // Find actual roots for the current user's view (if parent isn't in the list)
  const roots = (byParent.get('__root__') || []).slice();
  for (const org of orgs) {
    if (org?.parentId && !byId.has(org.parentId)) {
      roots.push(org);
    }
  }

  const rows: any[] = [];
  const visiting = new Set<string>();

  const walk = (node: any, depth: number) => {
    if (!node?.id || visiting.has(node.id)) return;
    visiting.add(node.id);
    rows.push({ ...node, depth });
    const kids = byParent.get(node.id) || [];
    // Sort kids alphabetically
    kids.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    for (const child of kids) walk(child, depth + 1);
    visiting.delete(node.id);
  };

  roots.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
       .forEach((r) => walk(r, 0));

  return rows;
};

const IssueOrgLicenseModal = ({ onClose, onSave, orgs }: any) => {
  const hierarchicalOrgs = buildHierarchy(orgs);
  const [form, setForm] = useState({
    targetOrgId: '',
    licenseType: 'BASIC',
    totalCount: 1,
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await licensesApi.issue(form);
      onSave();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-ellipsis whitespace-nowrap overflow-hidden">Issue Org License</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Select Organization</label>
            <select value={form.targetOrgId} onChange={e => setForm({...form, targetOrgId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" required>
              <option value="">Choose partner...</option>
              {hierarchicalOrgs.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {'\u00A0'.repeat(o.depth * 4)}{o.depth > 0 ? 'â†³ ' : ''}{o.name} ({o.organizationType?.name})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 overflow-hidden">
              <label className="text-sm font-semibold text-slate-700">Service Level</label>
              <select value={form.licenseType} onChange={e => setForm({...form, licenseType: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <option value="BASIC">Basic</option>
                <option value="ADVANCED">Advanced</option>
                <option value="PRO">Pro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Quantity</label>
              <input type="number" min="1" value={form.totalCount} onChange={e => setForm({...form, totalCount: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" required />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-2.5 border border-slate-200 font-bold rounded-xl whitespace-nowrap">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 whitespace-nowrap">
               {loading ? 'Issuing...' : 'Issue License'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const IssueCreditsModal = ({ onClose, onSave, orgs, licenses }: any) => {
  const hierarchicalOrgs = buildHierarchy(orgs);
  const [form, setForm] = useState({
    targetOrgId: '',
    planType: 'USAGE',
    totalCount: 1,
    creditsPerKey: 100,
    validityDays: 365,
    licenseId: '',
  });

  const availableLicenses = licenses?.filter((l: any) => l.ownerId === form.targetOrgId) || [];
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await cutCreditsApi.issue(form);
      onSave();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Assign Cut Credits</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-sm flex gap-3">
             <AlertCircle className="w-5 h-5 flex-shrink-0" />
             <p>Select the organization to receive these machine Cut Credits.</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Target Organization</label>
            <select value={form.targetOrgId} onChange={e => setForm({...form, targetOrgId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" required>
              <option value="">Select recipient...</option>
              {hierarchicalOrgs.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {'\u00A0'.repeat(o.depth * 4)}{o.depth > 0 ? 'â†³ ' : ''}{o.name} ({o.organizationType?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Link to License <span className="text-red-500">*</span></label>
            <select value={form.licenseId} onChange={e => setForm({...form, licenseId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50" disabled={!form.targetOrgId} required>
              <option value="">{!form.targetOrgId ? 'Select organization first' : 'Select a license...'}</option>
              {availableLicenses.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.key} ({l.batch.licenseType})
                </option>
              ))}
            </select>
            {form.targetOrgId && availableLicenses.length === 0 && (
              <p className="text-[10px] text-red-400 italic">No available licenses found! Credits MUST be linked to a license.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Plan Type</label>
              <select value={form.planType} onChange={e => setForm({...form, planType: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                <option value="USAGE">Usage (Credits)</option>
                <option value="UNLIMITED">Unlimited (Time)</option>
                <option value="LIFETIME">Lifetime</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Key Qty</label>
              <input type="number" min="1" value={form.totalCount} onChange={e => setForm({...form, totalCount: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {form.planType === 'USAGE' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Credits / Key</label>
                <input type="number" value={form.creditsPerKey} onChange={e => setForm({...form, creditsPerKey: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" required />
              </div>
            )}
            {form.planType === 'UNLIMITED' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Days / Key</label>
                <input type="number" value={form.validityDays} onChange={e => setForm({...form, validityDays: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" required />
              </div>
            )}
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-2.5 border border-slate-200 font-bold rounded-xl whitespace-nowrap">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 whitespace-nowrap">
                {loading ? 'Assigning...' : 'Assign Credits'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DispatchModal = ({ onClose, onSave, orgs, type, selectedIds }: any) => {
  const { user } = useAuth();
  const hierarchicalOrgs = buildHierarchy(orgs);
  // Strictly downwards: exclude the current user's organization so they can only dispatch to children/descendants.
  const validOrgs = hierarchicalOrgs.filter((o: any) => o.id !== user?.organizationId);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOrgs = validOrgs.filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrgId) {
      alert('Please select a target recipient.');
      return;
    }
    setLoading(true);
    try {
      if (type === 'licenses') {
        await licensesApi.dispatch({ licenseIds: selectedIds, toOrgId: targetOrgId });
      } else {
        await cutCreditsApi.dispatch({ creditIds: selectedIds, toOrgId: targetOrgId });
      }
      onSave();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Dispatch {selectedIds.length} {type === 'licenses' ? 'Licenses' : 'Credits'}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-sm flex gap-3">
             <Send className="w-5 h-5 flex-shrink-0" />
             <p>Transfer ownership of the selected items to a child organization.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Target Recipient</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all"
              />
            </div>
            <div className="border border-slate-200 rounded-xl overflow-y-auto bg-slate-50 max-h-48">
              {filteredOrgs.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 text-center">No organizations match your search.</div>
              ) : filteredOrgs.map((o: any) => (
                <div
                  key={o.id}
                  onClick={() => setTargetOrgId(o.id)}
                  className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-white border-b border-slate-100 last:border-0 transition-colors ${targetOrgId === o.id ? 'bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-50' : 'text-slate-700'}`}
                >
                  {'\u00A0'.repeat(search ? 0 : o.depth * 4)}{!search && o.depth > 0 ? '↳ ' : ''}{o.name} <span className="ml-1 text-xs text-slate-400">({o.organizationType?.name})</span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-2.5 border border-slate-200 font-bold rounded-xl whitespace-nowrap">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">
               {loading ? 'Dispatching...' : 'Confirm Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LicensesPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'licenses' | 'credits' | 'history' | 'pending'>('licenses');
  const [orgLicenses, setOrgLicenses] = useState<any[]>([]);
  const [cutCredits, setCutCredits] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== searchQuery) {
        setDebouncedSearch(searchQuery);
        setPage(1); // Reset to page 1 on new search
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  // Fetch orgs once on mount
  useEffect(() => {
    orgsApi.getAll().then(res => {
      setOrgs(Array.isArray(res) ? res : (res.data || res.items || []));
    }).catch(console.error);
  }, []);

  // Refetch when tab, page, or search changes
  useEffect(() => {
    fetchData();
  }, [tab, page, debouncedSearch]);

  const fetchData = async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const take = ITEMS_PER_PAGE;

      if (tab === 'licenses') {
        const licRes: any = await licensesApi.getInventory(undefined, skip, take, debouncedSearch).catch(() => ({ data: [], total: 0 }));
        if (Array.isArray(licRes)) {
           setOrgLicenses(licRes); setTotalItems(licRes.length);
        } else {
           setOrgLicenses(licRes.data || []); setTotalItems(licRes.total || 0);
        }
      } else if (tab === 'credits') {
        const credRes: any = await cutCreditsApi.getInventory(undefined, skip, take, debouncedSearch).catch(() => ({ data: [], total: 0 }));
        if (Array.isArray(credRes)) {
           setCutCredits(credRes); setTotalItems(credRes.length);
        } else {
           setCutCredits(credRes.data || []); setTotalItems(credRes.total || 0);
        }
      } else if (tab === 'history' || tab === 'pending') {
        const [transferLicRes, transferCredRes] = await Promise.all([
          licensesApi.getTransfers().catch(() => []),
          cutCreditsApi.getTransfers().catch(() => [])
        ]);
        const transferMap = new Map();
        (transferLicRes || []).forEach((t: any) => transferMap.set(t.id, { ...t, itemType: 'License' }));
        (transferCredRes || []).forEach((t: any) => {
          if (!transferMap.has(t.id)) transferMap.set(t.id, { ...t, itemType: 'Credits' });
        });
        const allTransfers = Array.from(transferMap.values())
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setTransfers(allTransfers);
        setTotalItems(allTransfers.length);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectFullBatch = (items: any[], batchId: string) => {
    const batchItems = items.filter(item => item.batchId === batchId && item.status === 'AVAILABLE');
    const batchItemIds = batchItems.map(item => item.id);
    const allInBatchSelected = batchItemIds.every(id => selectedIds.includes(id));

    if (allInBatchSelected) {
      setSelectedIds(prev => prev.filter(id => !batchItemIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...batchItemIds])]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="green">Available</Badge>;
      case 'IN_TRANSIT': return <Badge variant="amber">In Transit</Badge>;
      case 'ACTIVE': return <Badge variant="indigo">Active</Badge>;
      case 'SUSPENDED': return <Badge variant="amber">Suspended</Badge>;
      case 'CONSUMED': return <Badge variant="gray">Consumed</Badge>;
      case 'REVOKED': return <Badge variant="red">Revoked</Badge>;
      case 'EXPIRED': return <Badge variant="red">Expired</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const groupedLicenses = orgLicenses.reduce((acc: any, item) => {
    const batchId = item.batchId || 'unbatched';
    if (!acc[batchId]) acc[batchId] = { info: item.batch || { batchCode: 'Unbatched', createdAt: item.createdAt }, items: [] };
    acc[batchId].items.push(item);
    return acc;
  }, {});

  const groupedCredits = cutCredits.reduce((acc: any, item) => {
    const batchId = item.batchId || 'unbatched';
    if (!acc[batchId]) acc[batchId] = { info: item.batch || { batchCode: 'Unbatched', createdAt: item.createdAt }, items: [] };
    acc[batchId].items.push(item);
    return acc;
  }, {});

  const pendingInbound = transfers.filter(t => {
    const isReceiver = String(t.toOrgId).toLowerCase() === String(user?.organizationId).toLowerCase();
    return t.status === 'PENDING' && (user?.isSuperAdmin ? true : isReceiver);
  });

  const pendingOutbound = transfers.filter(t => {
    const isSender = String(t.fromOrgId).toLowerCase() === String(user?.organizationId).toLowerCase();
    return t.status === 'PENDING' && (user?.isSuperAdmin ? true : isSender);
  });

  const handleTransferAction = async (id: string, action: 'accept' | 'reject' | 'recall', type: 'License' | 'Credits') => {
    try {
      if (type === 'License') {
        if (action === 'accept') await licensesApi.acceptTransfer(id);
        else if (action === 'reject') await licensesApi.rejectTransfer(id);
        else await licensesApi.recallTransfer(id);
      } else {
        if (action === 'accept') await cutCreditsApi.acceptTransfer(id);
        else if (action === 'reject') await cutCreditsApi.rejectTransfer(id);
        else await cutCreditsApi.recallTransfer(id);
      }
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
        <div className="text-sm text-slate-500 font-medium">
          Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, totalItems)} of {totalItems} items
        </div>
        <div className="flex gap-1">
          <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pages.map(p => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-bold ${page === p ? 'bg-[var(--color-accent)] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {p}
            </button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 disabled:opacity-50">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header remain same */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Licenses & Credits</h1>
            <p className="text-slate-500 text-sm">Manage organizational software access and machine cut credits.</p>
          </div>
        </div>
        
        {user?.isSuperAdmin && (
          <div className="flex gap-2">
            <button onClick={fetchData} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" title="Refresh Inventory">
              <RotateCcw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setModal('org-license')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg transition-all text-sm">
              <Plus className="w-4 h-4" /> Issue License
            </button>
            <button onClick={() => setModal('cut-credits')} className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 shadow-lg transition-all text-sm">
              <Plus className="w-4 h-4" /> Assign Credits
            </button>
          </div>
        )}
        {!user?.isSuperAdmin && (
           <button onClick={fetchData} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-2" title="Refresh Inventory">
             <RotateCcw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
             <span className="text-sm font-medium text-slate-500">Refresh</span>
           </button>
        )}

        {selectedIds.length > 0 && (
          <button onClick={() => setModal('dispatch')} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-xl animate-in slide-in-from-right-4 transition-all">
            <Send className="w-4 h-4" /> Dispatch Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => { setTab('licenses'); setPage(1); setSelectedIds([]); setSearchQuery(''); }} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${tab === 'licenses' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Org Licenses</button>
        <button onClick={() => { setTab('credits'); setPage(1); setSelectedIds([]); setSearchQuery(''); }} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${tab === 'credits' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Cut Credits</button>
        <button onClick={() => { setTab('history'); setPage(1); setSelectedIds([]); setSearchQuery(''); }} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${tab === 'history' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>History</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 animate-pulse text-slate-400">Loading entitlements...</div>
      ) : tab === 'licenses' ? (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search licenses by key, batch code, service level, status or owner..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                    <th className="px-6 py-4 w-10"></th>
                    <th className="px-6 py-4">Serial / Key</th>
                    <th className="px-6 py-4">Service Level</th>
                    <th className="px-6 py-4">Status</th>
                    {user?.isSuperAdmin && <th className="px-6 py-4">Current Owner</th>}
                    <th className="px-6 py-4">Activated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {orgLicenses.length === 0 ? (
                    <tr>
                      <td colSpan={user?.isSuperAdmin ? 6 : 5} className="px-6 py-12 text-center text-slate-400 italic">
                        {orgLicenses.length === 0 ? 'No org licenses found.' : 'No licenses match your search.'}
                      </td>
                    </tr>
                  ) : Object.entries(groupedLicenses).map(([batchId, group]: [string, any]) => (
                    <React.Fragment key={batchId}>
                      <tr className="bg-slate-50/50 border-y border-slate-100">
                        <td className="px-6 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={group.items.filter((i: any) => i.status === 'AVAILABLE').every((i: any) => selectedIds.includes(i.id)) && group.items.filter((i: any) => i.status === 'AVAILABLE').length > 0}
                            onChange={() => selectFullBatch(orgLicenses, batchId)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td colSpan={user?.isSuperAdmin ? 5 : 4} className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Batch: {group.info.batchCode}</span>
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-slate-500 text-xs">{group.items.length} units</span>
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-slate-500 text-xs">Issued {new Date(group.info.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                      </tr>
                      {group.items.map((item: any) => (
                        <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-indigo-50/50' : ''}`}>
                          <td className="px-6 py-4 text-center">
                            {item.status === 'AVAILABLE' && (
                              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">{item.key}</td>
                          <td className="px-6 py-4"><span className="font-semibold text-slate-700">{item.batch.licenseType}</span></td>
                          <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                          {user?.isSuperAdmin && (
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{item.owner?.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{item.owner?.organizationType?.name}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-6 py-4 text-slate-500">{item.activatedAt ? new Date(item.activatedAt).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </div>
        </div>
      ) : tab === 'credits' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                  <th className="px-6 py-4 w-10"></th>
                  <th className="px-6 py-4">Credit Serial</th>
                  <th className="px-6 py-4">Plan Type</th>
                  <th className="px-6 py-4">Status</th>
                  {user?.isSuperAdmin && <th className="px-6 py-4">Current Owner</th>}
                  <th className="px-6 py-4">Machine Lock</th>
                  <th className="px-6 py-4">Balance / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {cutCredits.length === 0 ? (
                  <tr><td colSpan={user?.isSuperAdmin ? 7 : 6} className="px-6 py-12 text-center text-slate-400 italic">No cut credits present.</td></tr>
                ) : Object.entries(groupedCredits).map(([batchId, group]: [string, any]) => (
                  <React.Fragment key={batchId}>
                    <tr className="bg-slate-50/50 border-y border-slate-100">
                      <td className="px-6 py-3 text-center">
                        <input 
                          type="checkbox" 
                          checked={group.items.filter((i: any) => i.status === 'AVAILABLE').every((i: any) => selectedIds.includes(i.id)) && group.items.filter((i: any) => i.status === 'AVAILABLE').length > 0}
                          onChange={() => selectFullBatch(cutCredits, batchId)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td colSpan={user?.isSuperAdmin ? 6 : 5} className="px-6 py-3">
                         <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Batch: {group.info.batchCode}</span>
                          <span className="text-slate-400 text-xs">â€¢</span>
                          <span className="text-slate-500 text-xs">{group.items.length} units</span>
                          <span className="text-slate-400 text-xs">â€¢</span>
                          <span className="text-slate-500 text-xs">Assigned {new Date(group.info.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                    </tr>
                    {group.items.map((item: any) => (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-6 py-4 text-center">
                          {item.status === 'AVAILABLE' && (
                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer" />
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{item.key}</td>
                        <td className="px-6 py-4 font-semibold text-slate-700">{item.batch.planType}</td>
                        <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                        {user?.isSuperAdmin && (
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{item.owner?.name}</span>
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{item.owner?.organizationType?.name}</span>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-slate-500">{item.machineId ? <span className="flex items-center gap-1"><Laptop className="w-4 h-4" /> {item.machineId}</span> : 'â€”'}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {item.batch.planType === 'USAGE' ? `${item.remainingCredits} Cuts` : item.batch.planType === 'UNLIMITED' ? (item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : `${item.batch.validityDays} Days`) : 'Lifetime'}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                  <th className="px-6 py-4">Item Type</th>
                  <th className="px-6 py-4">Key / Serial</th>
                  <th className="px-6 py-4">From</th>
                  <th className="px-6 py-4">To</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Transferred At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {transfers.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No transfer history found.</td></tr>
                ) : transfers.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${t.itemType === 'License' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                        {t.itemType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {t.items.length === 1 ? (t.items[0].license?.key || t.items[0].credit?.key) : `${t.items.length} Multiple Items`}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{t.fromOrg?.name}</td>
                    <td className="px-6 py-4 text-slate-900 font-semibold">{t.toOrg?.name}</td>
                    <td className="px-6 py-4 font-bold">{t.status}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </div>
      )}


      {modal === 'org-license' && <IssueOrgLicenseModal orgs={orgs} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchData(); }} />}
      {modal === 'cut-credits' && <IssueCreditsModal orgs={orgs} licenses={orgLicenses} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchData(); }} />}
      {modal === 'dispatch' && <DispatchModal type={tab === 'history' ? 'licenses' : tab} selectedIds={selectedIds} orgs={orgs} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchData(); }} />}
    </div>
  );
};

export default LicensesPage;
