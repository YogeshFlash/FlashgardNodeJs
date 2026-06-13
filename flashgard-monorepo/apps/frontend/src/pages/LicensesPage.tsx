import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Plus, Send, X, AlertCircle, RotateCcw, Search, ChevronLeft, ChevronRight, Gift
} from 'lucide-react';
import { licensesApi, cutCreditsApi, orgsApi, modelCategoriesApi } from '../lib/api';
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
  const [error, setError] = useState<string | null>(null);

  const [orgSearch, setOrgSearch] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.targetOrgId) {
      setError('Please select an organization');
      return;
    }
    setLoading(true);
    try {
      await licensesApi.issue(form);
      onSave();
    } catch (err: any) {
      setError(err.message || 'An error occurred while issuing the license.');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgs = hierarchicalOrgs.filter((o: any) => o.name.toLowerCase().includes(orgSearch.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-ellipsis whitespace-nowrap overflow-hidden">Issue Org License</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Select Organization</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-50 max-h-64">
              <div className="p-2 border-b border-slate-200 bg-white sticky top-0 z-10">
                <input 
                  type="text" 
                  placeholder="Search organization..." 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={orgSearch}
                  onChange={e => setOrgSearch(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredOrgs.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500 text-center">No organizations found</div>
                ) : (
                  filteredOrgs.map((o: any) => (
                    <div 
                      key={o.id}
                      className={`px-4 py-2.5 text-sm cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${form.targetOrgId === o.id ? 'bg-indigo-50 text-indigo-700 font-bold sticky bottom-0 top-0 z-20' : 'hover:bg-slate-100 text-slate-700 bg-white'}`}
                      onClick={() => setForm({...form, targetOrgId: o.id})}
                    >
                      {'\u00A0'.repeat(o.depth * 4)}{o.depth > 0 ? '↳ ' : ''}{o.name} <span className="text-xs opacity-70">({o.organizationType?.name})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
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

const IssueCreditsModal = ({ onClose, onSave, orgs }: any) => {
  const hierarchicalOrgs = buildHierarchy(orgs);
  const [form, setForm] = useState({
    targetOrgId: '',
    planType: 'USAGE',
    credits: 100,
    validityDays: 365,
    licenseId: '',
  });

  const [orgSearch, setOrgSearch] = useState('');
  const [availableLicenses, setAvailableLicenses] = useState<any[]>([]);
  const [licenseSearch, setLicenseSearch] = useState('');

  const [debouncedLicenseSearch, setDebouncedLicenseSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLicenseSearch(licenseSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [licenseSearch]);

  useEffect(() => {
    if (!form.targetOrgId) {
      setAvailableLicenses([]);
      setForm(prev => ({ ...prev, licenseId: '' }));
      return;
    }
    licensesApi.getInventory(form.targetOrgId, 0, 100, debouncedLicenseSearch || undefined, undefined, undefined, false)
      .then((res: any) => {
        const data = Array.isArray(res) ? res : (res.data || []);
        setAvailableLicenses(data.filter((l: any) => l.ownerId === form.targetOrgId));
      })
      .catch(console.error);
  }, [form.targetOrgId, debouncedLicenseSearch]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.targetOrgId) {
      setError('Please select an organization');
      return;
    }
    setLoading(true);
    try {
      await cutCreditsApi.issue(form);
      onSave();
    } catch (err: any) {
      setError(err.message || 'An error occurred while assigning credits.');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgs = hierarchicalOrgs
    .filter((o: any) => o.depth === 0)
    .filter((o: any) => o.name.toLowerCase().includes(orgSearch.toLowerCase()))
    .slice(0, 100);

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Assign Cut Credits</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error ? (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-700 text-sm flex gap-3">
               <AlertCircle className="w-5 h-5 flex-shrink-0" />
               <p>Select the organization to receive these machine Cut Credits.</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Target Organization</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-slate-50 max-h-64">
              <div className="p-2 border-b border-slate-200 bg-white sticky top-0 z-10">
                <input 
                  type="text" 
                  placeholder="Search organization..." 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  value={orgSearch}
                  onChange={e => setOrgSearch(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredOrgs.length === 0 ? (
                  <div className="p-4 text-sm text-slate-500 text-center">No organizations found</div>
                ) : (
                  filteredOrgs.map((o: any) => (
                    <div 
                      key={o.id}
                      className={`px-4 py-2.5 text-sm cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${form.targetOrgId === o.id ? 'bg-indigo-50 text-indigo-700 font-bold sticky bottom-0 top-0 z-20' : 'hover:bg-slate-100 text-slate-700 bg-white'}`}
                      onClick={() => setForm({...form, targetOrgId: o.id})}
                    >
                      {'\u00A0'.repeat(o.depth * 4)}{o.depth > 0 ? '↳ ' : ''}{o.name} <span className="text-xs opacity-70">({o.organizationType?.name})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Link to License <span className="text-slate-400 font-normal">(Optional)</span></label>
            {form.targetOrgId && (
              <input type="text" placeholder="Search licenses by key or type..." value={licenseSearch} onChange={e => setLicenseSearch(e.target.value)} className="w-full px-4 py-2 mb-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            )}
            <select value={form.licenseId} onChange={e => setForm({...form, licenseId: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50" disabled={!form.targetOrgId}>
              <option value="">{!form.targetOrgId ? 'Select organization first' : 'Unlinked (Direct to Org)'}</option>
              {availableLicenses.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.key} ({l.batch?.licenseType || 'N/A'})
                </option>
              ))}
            </select>
            {form.targetOrgId && availableLicenses.length === 0 && (
              <p className="text-[10px] text-slate-400 italic">No available licenses found. Credits can be assigned directly to the organization.</p>
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
            {form.planType === 'USAGE' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Number of Credits</label>
                <input type="number" min="1" value={form.credits || 0} onChange={e => setForm({...form, credits: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" required />
              </div>
            )}
            {form.planType === 'UNLIMITED' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Validity Days</label>
                <input type="number" min="1" value={form.validityDays || 0} onChange={e => setForm({...form, validityDays: parseInt(e.target.value)})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl" required />
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

export const TransferCreditsModal = ({ onClose, onSave, orgs, initialOrgId, isAssignMode }: any) => {
  const { user } = useAuth();
  const hierarchicalOrgs = buildHierarchy(orgs);
  
  const ownerIndex = hierarchicalOrgs.findIndex((o: any) => o.id === user?.organizationId);
  const ownerDepth = ownerIndex !== -1 ? hierarchicalOrgs[ownerIndex].depth : -1;
  
  const validOrgs = [];
  if (user?.isSuperAdmin) {
    hierarchicalOrgs.forEach((o: any) => {
      const typeStr = o.type || o.organizationType?.name;
      if (o.id !== user?.organizationId && typeStr?.toLowerCase() !== 'retailer') validOrgs.push(o);
    });
  } else if (ownerIndex !== -1) {
    for (let i = ownerIndex + 1; i < hierarchicalOrgs.length; i++) {
      if (hierarchicalOrgs[i].depth <= ownerDepth) break;
      const typeStr = hierarchicalOrgs[i].type || hierarchicalOrgs[i].organizationType?.name;
      if (typeStr?.toLowerCase() !== 'retailer') validOrgs.push(hierarchicalOrgs[i]);
    }
  }

  const [form, setForm] = useState({
    targetOrgId: initialOrgId || '',
    planType: 'USAGE',
    amount: 100,
    validityDays: 30,
    isOffer: false,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredOrgs = validOrgs.filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.targetOrgId) {
      setError('Please select an organization');
      return;
    }
    if (form.planType === 'USAGE' && form.amount <= 0) {
      setError('Amount must be positive');
      return;
    }
    if (form.planType === 'UNLIMITED' && form.validityDays <= 0) {
      setError('Validity days must be positive');
      return;
    }
    setLoading(true);
    try {
      const selectedOrg = hierarchicalOrgs.find((o: any) => o.id === form.targetOrgId);
      
      if (form.isOffer) {
        // Offer always mints directly
        await cutCreditsApi.issue({
          targetOrgId: form.targetOrgId,
          planType: form.planType,
          credits: form.planType === 'USAGE' ? form.amount : undefined,
          validityDays: form.planType === 'UNLIMITED' ? form.validityDays : undefined,
          isOffer: true,
          notes: form.notes || undefined
        });
      } else if (form.planType === 'USAGE') {
        if (!selectedOrg.parentId) {
          // Top Org, Mint USAGE directly
          await cutCreditsApi.issue({ targetOrgId: form.targetOrgId, planType: 'USAGE', credits: form.amount });
        } else {
          // Child Org, dispatch from parent
          const fromOrgId = (user?.isSuperAdmin) ? selectedOrg.parentId : user?.organizationId;
          await cutCreditsApi.dispatch({ amount: form.amount, toOrgId: form.targetOrgId, fromOrgId });
        }
      } else {
        // UNLIMITED or LIFETIME, mint directly
        await cutCreditsApi.issue({
          targetOrgId: form.targetOrgId,
          planType: form.planType,
          validityDays: form.planType === 'UNLIMITED' ? form.validityDays : undefined
        });
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'An error occurred while transferring credits.');
    } finally {
      setLoading(false);
    }
  };

  const selectedOrg = hierarchicalOrgs.find((o: any) => o.id === form.targetOrgId);
  const isTopLevelOrg = selectedOrg && !selectedOrg.parentId;

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{isTopLevelOrg ? 'Issue Credit' : (isAssignMode ? 'Assign Credit' : 'Transfer Credits')}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error ? (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm flex gap-3">
               {isTopLevelOrg ? <Plus className="w-5 h-5 flex-shrink-0" /> : <Send className="w-5 h-5 flex-shrink-0" />}
               <p>{isTopLevelOrg ? 'Issue credits directly to this parent organization.' : (isAssignMode ? 'Assign credits by transferring from the parent organization.' : 'Transfer available credits from your wallet to a child organization.')}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Target Recipient</label>
            {isAssignMode ? (
              <div className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium">
                {hierarchicalOrgs.find((o: any) => o.id === form.targetOrgId)?.name || 'Selected Organization'}
              </div>
            ) : (
              <>
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
                      onClick={() => setForm({...form, targetOrgId: o.id})}
                      className={`px-3 py-2.5 text-sm cursor-pointer hover:bg-white border-b border-slate-100 last:border-0 transition-colors ${form.targetOrgId === o.id ? 'bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-50' : 'text-slate-700'}`}
                    >
                      {'\u00A0'.repeat(search ? 0 : o.depth * 4)}{!search && o.depth > 0 ? '↳ ' : ''}{o.name} <span className="ml-1 text-xs text-slate-400">({o.organizationType?.name})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {user?.isSuperAdmin && isTopLevelOrg && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Plan Type</label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {['USAGE', 'UNLIMITED', 'LIFETIME'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({...form, planType: type})}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${form.planType === type ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {type === 'USAGE' ? 'No. of Credits' : type === 'UNLIMITED' ? 'Unlimited' : 'Lifetime'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.planType === 'USAGE' && (() => {
            const parentOrg = selectedOrg?.parentId ? hierarchicalOrgs.find((o: any) => o.id === selectedOrg.parentId) : null;
            
            return (
              <div className="space-y-3">
                {user?.isSuperAdmin && parentOrg && (
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Deducting From Parent Org</p>
                      <p className="text-sm font-bold text-blue-900">{parentOrg.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Available Balance</p>
                      <p className="text-lg font-black text-blue-700">{parentOrg.tenantWallets?.[0]?.balance || 0}</p>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Number of Credits to Transfer</label>
              <input
                type="number"
                min="1"
                value={form.amount}
                onChange={e => setForm({...form, amount: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all font-mono"
              />
            </div>
            </div>
            );
          })()}

          {form.planType === 'UNLIMITED' && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Validity (Days)</label>
              <input
                type="number"
                min="1"
                value={form.validityDays}
                onChange={e => setForm({...form, validityDays: parseInt(e.target.value) || 0})}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all font-mono"
              />
            </div>
          )}

          {user?.isSuperAdmin && isTopLevelOrg && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={form.isOffer}
                    onChange={e => setForm({...form, isOffer: e.target.checked})}
                    className="peer sr-only"
                  />
                  <div className="w-10 h-6 bg-slate-200 rounded-full peer-checked:bg-purple-500 transition-colors duration-300"></div>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 peer-checked:translate-x-4 shadow-sm"></div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Promotional Offer</span>
                  <div className="bg-purple-100 text-purple-600 p-1 rounded-full"><Gift className="w-3.5 h-3.5" /></div>
                </div>
              </label>

              {form.isOffer && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Offer Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Festive Bonus, Compensation"
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    className="w-full px-4 py-2 bg-purple-50/50 border border-purple-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white transition-all text-purple-900 placeholder:text-purple-300"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-2.5 border border-slate-200 font-bold rounded-xl whitespace-nowrap">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 whitespace-nowrap">
                {loading ? (isTopLevelOrg ? 'Issuing...' : (isAssignMode ? 'Assigning...' : 'Transferring...')) : (isTopLevelOrg ? 'Issue Credit' : (isAssignMode ? 'Assign Credit' : 'Transfer Credits'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DispatchModal = ({ onClose, onSave, orgs, type, selectedIds, items }: any) => {
  const { user } = useAuth();
  const hierarchicalOrgs = buildHierarchy(orgs);
  
  const selectedItems = items?.filter((i: any) => selectedIds.includes(i.id)) || [];
  const ownerId = selectedItems[0]?.ownerId || user?.organizationId;

  const ownerIndex = hierarchicalOrgs.findIndex((o: any) => o.id === ownerId);
  const ownerDepth = ownerIndex !== -1 ? hierarchicalOrgs[ownerIndex].depth : -1;
  
  const validOrgs = [];
  if (ownerIndex !== -1) {
    for (let i = ownerIndex + 1; i < hierarchicalOrgs.length; i++) {
      if (hierarchicalOrgs[i].depth <= ownerDepth) break;
      validOrgs.push(hierarchicalOrgs[i]);
    }
  } else {
    hierarchicalOrgs.forEach((o: any) => {
      if (o.id !== user?.organizationId) validOrgs.push(o);
    });
  }

  const [targetOrgId, setTargetOrgId] = useState('');
  const [targetLicenseId, setTargetLicenseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [availableLicenses, setAvailableLicenses] = useState<any[]>([]);
  const [licenseSearch, setLicenseSearch] = useState('');

  const filteredOrgs = validOrgs.filter((o: any) => o.name.toLowerCase().includes(search.toLowerCase()));

  const [debouncedLicenseSearch, setDebouncedLicenseSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedLicenseSearch(licenseSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [licenseSearch]);

  useEffect(() => {
    if (!targetOrgId || type !== 'credits') {
      setAvailableLicenses([]);
      setTargetLicenseId('');
      return;
    }
    licensesApi.getInventory(targetOrgId, 0, 100, debouncedLicenseSearch || undefined, undefined, undefined, false)
      .then((res: any) => {
        const data = Array.isArray(res) ? res : (res.data || []);
        setAvailableLicenses(data.filter((l: any) => l.ownerId === targetOrgId));
      })
      .catch(console.error);
  }, [targetOrgId, type, debouncedLicenseSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!targetOrgId) {
      setError('Please select a target recipient.');
      return;
    }
    setLoading(true);
    try {
      if (type === 'licenses') {
        await licensesApi.dispatch({ licenseIds: selectedIds, toOrgId: targetOrgId });
      } else {
        await cutCreditsApi.dispatch({ amount: selectedIds.length, toOrgId: targetOrgId, targetLicenseId: targetLicenseId || undefined });
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch items.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">Dispatch {selectedIds.length} {type === 'licenses' ? 'Licenses' : 'Credits'}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error ? (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 text-sm flex gap-3">
               <Send className="w-5 h-5 flex-shrink-0" />
               <p>Transfer ownership of the selected items to a child organization.</p>
            </div>
          )}
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
          {type === 'credits' && (
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-sm font-semibold text-slate-700">Link to License <span className="text-slate-400 font-normal">(Optional)</span></label>
              {targetOrgId && (
                <input type="text" placeholder="Search licenses by key or type..." value={licenseSearch} onChange={e => setLicenseSearch(e.target.value)} className="w-full px-4 py-2 mb-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
              )}
              <select value={targetLicenseId} onChange={e => setTargetLicenseId(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-50" disabled={!targetOrgId}>
                <option value="">{!targetOrgId ? 'Select organization first' : 'Unlinked (Direct to Org)'}</option>
                {availableLicenses.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.key} ({l.batch?.licenseType || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          )}
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
  const [tab, setTab] = useState<'licenses' | 'credits' | 'cut-logs' | 'master-qrs' | 'history'>('licenses');
  const [orgLicenses, setOrgLicenses] = useState<any[]>([]);
  const [cutCredits, setCutCredits] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [cutLogs, setCutLogs] = useState<any[]>([]);
  const [masterQRs, setMasterQRs] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [myOrg, setMyOrg] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPlanType, setSelectedPlanType] = useState<string>('');
  const [selectedIsPositiveCut, setSelectedIsPositiveCut] = useState<string>('');
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  useEffect(() => {
    orgsApi.getAll().then((res: any) => setOrgs(Array.isArray(res) ? res : (res.data || res.items || []))).catch(console.error);
    licensesApi.getBatches().then((res: any) => setBatches(Array.isArray(res) ? res : (res.data || res.items || []))).catch(console.error);
    modelCategoriesApi.getAll().then((res: any) => {
      const data = Array.isArray(res) ? res : (res.data || res.items || []);
      setCategories(data.filter((c: any) => c.name !== 'Main Model' && (!c.parentId || c.parent?.name === 'Main Model')));
    }).catch(console.error);
    if (user?.organizationId) {
      orgsApi.getOne(user.organizationId).then((res: any) => setMyOrg(res)).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchText);
      setPage(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchText]);

  useEffect(() => {
    fetchData();
  }, [tab, page, searchQuery, selectedBatch, selectedPlanType, selectedIsPositiveCut, selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      if (tab === 'licenses') {
        const res: any = await licensesApi.getInventory(undefined, skip, ITEMS_PER_PAGE, searchQuery, selectedBatch).catch(() => ({ data: [], total: 0 }));
        setOrgLicenses(res.data || []); setTotalItems(res.total || 0);
      } else if (tab === 'credits') {
        const res: any = await cutCreditsApi.getInventory(undefined, skip, ITEMS_PER_PAGE, searchQuery, selectedPlanType).catch(() => ({ data: [], total: 0 }));
        setCutCredits(res.data || []); setTotalItems(res.total || 0);
      } else if (tab === 'cut-logs') {
        const isPositive = selectedIsPositiveCut === 'true' ? true : (selectedIsPositiveCut === 'false' ? false : undefined);
        const res: any = await licensesApi.getCutLogs(undefined, undefined, skip, ITEMS_PER_PAGE, searchQuery, isPositive, selectedCategory || undefined).catch(() => ({ items: [], total: 0 }));
        setCutLogs(res.items || []); setTotalItems(res.total || 0);
      } else if (tab === 'master-qrs') {
        const res: any = await (licensesApi as any).getMasterQRs(skip, ITEMS_PER_PAGE, searchQuery || undefined).catch(() => ({ items: [], total: 0 }));
        setMasterQRs(res.items || []); setTotalItems(res.total || 0);
      } else if (tab === 'history') {
        const transferLicRes = await licensesApi.getTransfers().catch(() => []);
        const transferCredRes = await cutCreditsApi.getTransfers().catch(() => []);
        
        const transferMap = new Map();
        (transferLicRes || []).forEach((t: any) => transferMap.set(t.id, { ...t, itemType: 'License' }));
        (transferCredRes || []).filter((t: any) => t.type === 'CREDIT').forEach((t: any) => {
          // Determine relative direction
          let displayType = 'CREDIT';
          let displayAmount = t.amount;
          if (user && t.tenantId === user.organizationId && t.wallet?.tenantId !== user.organizationId) {
            displayType = 'DEBIT';
            displayAmount = -t.amount;
          }

          transferMap.set(t.id, {
            id: t.id,
            itemType: 'Credit',
            amount: displayAmount,
            type: displayType,
            status: 'COMPLETED',
            createdAt: t.createdAt,
            fromOrg: { name: t.tenant?.name || 'System' },
            toOrg: { name: t.wallet?.tenant?.name || 'Unknown' },
            isOffer: t.isOffer,
            notes: t.notes,
          });
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
    const batchItems = items.filter(item => item.batchId === batchId && item.status === 'AVAILABLE' && (user?.isSuperAdmin || item.ownerId === user?.organizationId));
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

        {tab === 'credits' && (user?.isSuperAdmin || user?.organization?.type?.toLowerCase() !== 'retailer') && (
          <button onClick={() => setModal('transfer-credits')} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-xl animate-in slide-in-from-right-4 transition-all">
            <Send className="w-4 h-4" /> Transfer Credits
          </button>
        )}
        {tab === 'licenses' && selectedIds.length > 0 && (
          <button onClick={() => setModal('dispatch')} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-xl animate-in slide-in-from-right-4 transition-all">
            <Send className="w-4 h-4" /> Dispatch Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button onClick={() => { setTab('licenses'); setPage(1); setSelectedIds([]); setSearchQuery(''); setSearchText(''); setSelectedPlanType(''); setSelectedIsPositiveCut(''); setSelectedCategory(''); }} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${tab === 'licenses' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Org Licenses</button>
        <button onClick={() => { setTab('credits'); setPage(1); setSelectedIds([]); setSearchQuery(''); setSearchText(''); setSelectedPlanType(''); setSelectedIsPositiveCut(''); setSelectedCategory(''); }} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${tab === 'credits' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Cut Credits</button>
        <button onClick={() => { setTab('cut-logs'); setPage(1); setSelectedIds([]); setSearchQuery(''); setSearchText(''); setSelectedPlanType(''); setSelectedIsPositiveCut(''); setSelectedCategory(''); }} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${tab === 'cut-logs' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Cut Logs</button>
        <button onClick={() => { setTab('master-qrs'); setPage(1); setSelectedIds([]); setSearchQuery(''); setSearchText(''); setSelectedPlanType(''); setSelectedIsPositiveCut(''); setSelectedCategory(''); }} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${tab === 'master-qrs' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Master QRs</button>
        <button onClick={() => { setTab('history'); setPage(1); setSelectedIds([]); setSearchQuery(''); setSearchText(''); setSelectedPlanType(''); setSelectedIsPositiveCut(''); setSelectedCategory(''); }} className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${tab === 'history' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>History</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 animate-pulse text-slate-400">Loading entitlements...</div>
      ) : tab === 'licenses' ? (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search licenses by key, batch code, service level, status or owner..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => { setSearchText(''); setSearchQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="relative md:w-64">
              <select
                value={selectedBatch}
                onChange={e => setSelectedBatch(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all appearance-none"
              >
                <option value="">All Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.batchCode} ({b.licenseType})</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
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
                    <th className="px-6 py-4">Owner</th>
                    <th className="px-6 py-4">Activated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {orgLicenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                        {orgLicenses.length === 0 ? 'No org licenses found.' : 'No licenses match your search.'}
                      </td>
                    </tr>
                  ) : Object.entries(groupedLicenses).map(([batchId, group]: [string, any]) => (
                    <React.Fragment key={batchId}>
                      <tr className="bg-slate-50/50 border-y border-slate-100">
                        <td className="px-6 py-3 text-center">
                          <input 
                            type="checkbox" 
                            checked={group.items.filter((i: any) => i.status === 'AVAILABLE' && (user?.isSuperAdmin || i.ownerId === user?.organizationId)).every((i: any) => selectedIds.includes(i.id)) && group.items.filter((i: any) => i.status === 'AVAILABLE' && (user?.isSuperAdmin || i.ownerId === user?.organizationId)).length > 0}
                            onChange={() => selectFullBatch(orgLicenses, batchId)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td colSpan={5} className="px-6 py-3">
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
                            {item.status === 'AVAILABLE' && (user?.isSuperAdmin || item.ownerId === user?.organizationId) && (
                              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">{item.key}</td>
                          <td className="px-6 py-4"><span className="font-semibold text-slate-700">{item.batch.licenseType}</span></td>
                          <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{item.owner?.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{item.owner?.organizationType?.name}</span>
                              </div>
                              {item.ownerId !== user?.organizationId && !user?.isSuperAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider">Distributed</span>
                              )}
                            </div>
                          </td>
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
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search credits by serial, batch, status or owner..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => { setSearchText(''); setSearchQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="relative md:w-48">
              <select
                value={selectedPlanType}
                onChange={e => setSelectedPlanType(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all appearance-none"
              >
                <option value="">All Plan Types</option>
                <option value="USAGE">Usage</option>
                <option value="UNLIMITED">Unlimited</option>
                <option value="LIFETIME">Lifetime</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            
          </div>
          
          {myOrg && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6">
                <p className="text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">Available Balance</p>
                <p className="text-4xl font-black text-indigo-700">{myOrg.tenantWallets?.[0]?.balance || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 truncate" title="Used / Transferred Credits">Used / Transferred Credits</p>
                <p className="text-4xl font-black text-slate-700">{(myOrg.tenantWallets?.[0]?.totalCredits || 0) - (myOrg.tenantWallets?.[0]?.balance || 0)}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Lifetime Total</p>
                <p className="text-4xl font-black text-slate-700">{myOrg.tenantWallets?.[0]?.totalCredits || 0}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                  <th className="px-6 py-4">Plan Type</th>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">License</th>
                  <th className="px-6 py-4">Date Assigned</th>
                  <th className="px-6 py-4">Balance / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {cutCredits.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">No cut credits present.</td></tr>
                ) : cutCredits.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      <div className="flex flex-col gap-1">
                        <span>{item.planType}</span>
                        {item.isOffer && (
                          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-purple-600 bg-purple-50 border border-purple-100 w-fit px-1.5 py-0.5 rounded-md">
                            <Gift className="w-3 h-3" /> Offer
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{item.owner?.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{item.owner?.organizationType?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {item.license ? (
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900">{item.license.key}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{item.license.batch?.licenseType}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unlinked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {item.planType === 'USAGE' ? `${item.credits} Cuts` : item.planType === 'UNLIMITED' ? (
                        (() => {
                          const start = item.startDate ? new Date(item.startDate) : new Date(item.createdAt);
                          const end = item.endDate ? new Date(item.endDate) : (item.validityDays ? new Date(start.getTime() + item.validityDays * 24 * 60 * 60 * 1000) : null);
                          return end ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` : `${item.validityDays} Days`;
                        })()
                      ) : 'Lifetime'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {renderPagination()}
        </div>
      </div>
      ) : tab === 'cut-logs' ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by key, plotter ID, model or QR..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => { setSearchText(''); setSearchQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="relative md:w-48">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all appearance-none"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            <div className="relative md:w-48">
              <select
                value={selectedIsPositiveCut}
                onChange={e => setSelectedIsPositiveCut(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all appearance-none"
              >
                <option value="">All Cuts</option>
                <option value="true">Successful Cuts</option>
                <option value="false">Failed Cuts</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Model</th>
                    <th className="px-6 py-4">Pattern</th>
                    <th className="px-6 py-4">Organization</th>
                    <th className="px-6 py-4">Parent Org</th>
                    <th className="px-6 py-4">License Key</th>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Plotter ID</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Cut Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {cutLogs.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center text-slate-400 italic">
                        No cut logs found.
                      </td>
                    </tr>
                  ) : (
                    cutLogs.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-slate-600">{(item.model?.category?.parent?.name && item.model?.category?.parent?.name !== 'Main Model') ? item.model?.category?.parent?.name : (item.model?.category?.name || <span className="text-slate-400 italic text-xs">N/A</span>)}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {item.model?.brand?.name || item.brandName || <span className="text-slate-400 italic text-xs">N/A</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-700">{item.model?.name || item.modelName || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-600">{item.modelCutFile?.cutPattern?.name || item.patternName || <span className="text-slate-400 italic text-xs">N/A</span>}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{item.organization?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.organization?.parent?.name || <span className="text-slate-400 italic text-xs">N/A</span>}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">
                          {item.license?.key || <span className="text-slate-400 italic text-xs">Unlinked</span>}
                        </td>
                        <td className="px-6 py-4">
                          {item.user ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-700">{item.user.email}</span>
                              {(`${item.user.firstName || ''} ${item.user.lastName || ''}`.trim()) && (
                                <span className="text-[10px] text-slate-400">{`${item.user.firstName || ''} ${item.user.lastName || ''}`.trim()}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unknown</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          {item.plotterId || <span className="text-slate-400 italic text-xs">N/A</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold">
                          {item.isPositiveCut ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Success
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.reviews || <span className="text-slate-400 italic text-xs">—</span>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </div>
        </div>
      ) : tab === 'master-qrs' ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by QR code or product name..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => { setSearchText(''); setSearchQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                    <th className="px-6 py-4">Created Date</th>
                    <th className="px-6 py-4">Master QR Code</th>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Force</th>
                    <th className="px-6 py-4">Speed</th>
                    <th className="px-6 py-4">Dealer / Org</th>
                    <th className="px-6 py-4">Owner / Dist</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Creator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {masterQRs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic">
                        No Master QRs found.
                      </td>
                    </tr>
                  ) : (
                    masterQRs.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          {item.masterQRCode}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {item.masterProduct}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.force}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.speed}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.dealer?.name || <span className="text-slate-400 italic">N/A</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.owner?.name || <span className="text-slate-400 italic">N/A</span>}
                        </td>
                        <td className="px-6 py-4">
                          {item.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-100">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {item.creator ? `${item.creator.firstName || ''} ${item.creator.lastName || ''}`.trim() || item.creator.email : 'System'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </div>
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
                      {t.itemType === 'Credit' 
                        ? (
                          <div className="flex flex-col">
                            <span className={t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}>{t.amount > 0 ? '+' : ''}{t.amount} Credits</span>
                            {t.isOffer && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-purple-600 font-bold uppercase tracking-wider">
                                <Gift className="w-3 h-3" /> Offer {t.notes ? `• ${t.notes}` : ''}
                              </div>
                            )}
                          </div>
                        )
                        : (t.items?.length === 1 ? (t.items[0].license?.key || t.items[0].credit?.key) : `${t.items?.length || 0} Multiple Items`)
                      }
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
      {modal === 'transfer-credits' && <TransferCreditsModal orgs={orgs} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchData(); }} />}
      {modal === 'dispatch' && <DispatchModal type={tab === 'history' ? 'licenses' : tab} selectedIds={selectedIds} items={tab === 'credits' ? cutCredits : orgLicenses} orgs={orgs} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchData(); }} />}
    </div>
  );
};

export default LicensesPage;
