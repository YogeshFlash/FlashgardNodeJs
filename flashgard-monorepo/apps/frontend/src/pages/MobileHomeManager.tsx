import React, { useState, useEffect, useCallback } from 'react';
import { mobileHomeApi, rechargeApi } from '../lib/api';
import { 
  Smartphone, Plus, Edit2, Trash2, X,
  LayoutGrid, Image, FileText, CheckCircle2, AlertCircle, Sparkles, RotateCcw,
  CreditCard, Pencil, ToggleLeft, ToggleRight, IndianRupee, BadgeCheck, Clock,
  Search, Copy, Check, ShieldAlert
} from 'lucide-react';

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
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
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
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
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

const RechargePackageModal = ({ pkg, onClose, onSave }: any) => {
  const isEdit = !!pkg;
  const [form, setForm] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    planType: pkg?.planType || 'USAGE',
    credits: pkg?.credits?.toString() || '',
    validityDays: pkg?.validityDays?.toString() || '',
    price: pkg ? Number(pkg.price).toString() : '',
    currency: pkg?.currency || 'INR',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.price) { setError('Name and Price are required.'); return; }
    if (form.planType === 'USAGE' && !form.credits) { setError('Credits is required for USAGE plans.'); return; }
    if (form.planType === 'UNLIMITED' && !form.validityDays) { setError('Validity Days is required for UNLIMITED plans.'); return; }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        planType: form.planType,
        credits: form.planType === 'USAGE' ? Number(form.credits) || 0 : 0,
        validityDays: form.planType === 'UNLIMITED' ? Number(form.validityDays) || 0 : 0,
        price: Number(form.price),
        currency: form.currency,
      };

      if (isEdit) {
        await rechargeApi.updatePackage(pkg.id, payload);
      } else {
        await rechargeApi.createPackage(payload);
      }
      onSave();
    } catch (err: any) {
      setError(err?.message || 'Failed to save package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'Edit Package' : 'New Recharge Package'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="flex gap-2 items-start p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600"><AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</div>}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Package Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Starter Pack" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Plan Type *</label>
              <select value={form.planType} onChange={e => setForm(f => ({ ...f, planType: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white">
                <option value="USAGE">Usage (Cuts)</option>
                <option value="UNLIMITED">Unlimited Time</option>
                <option value="LIFETIME">Lifetime Unlimited</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Price (₹) *</label>
              <input type="number" min="1" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="499" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
          </div>

          {form.planType === 'USAGE' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Credits (Cuts) *</label>
              <input type="number" min="1" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} placeholder="500" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
          )}

          {form.planType === 'UNLIMITED' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Validity Days *</label>
              <input type="number" min="1" value={form.validityDays} onChange={e => setForm(f => ({ ...f, validityDays: e.target.value }))} placeholder="30" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm">
              {loading ? 'Saving...' : isEdit ? 'Update Package' : 'Create Package'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MobileHomeManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'promotions' | 'actions' | 'infocards' | 'recharge'>('promotions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Content States
  const [promotions, setPromotions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [infocards, setInfocards] = useState<any[]>([]);
  const [rechargePackages, setRechargePackages] = useState<any[]>([]);
  const [rechargeTransactions, setRechargeTransactions] = useState<any[]>([]);

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [rechargePackageModal, setRechargePackageModal] = useState<{ mode: 'create' | 'edit'; pkg?: any } | null>(null);

  // Transactions Pagination & Filter State
  const [txnPage, setTxnPage] = useState(1);
  const [txnPageSize, setTxnPageSize] = useState(20);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnSearch, setTxnSearch] = useState('');
  const [txnStatusFilter, setTxnStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [txnLoading, setTxnLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setTxnLoading(true);
    try {
      const skip = (txnPage - 1) * txnPageSize;
      const res = await rechargeApi.getTransactions(skip, txnPageSize, txnSearch || undefined).catch(() => ({ items: [], total: 0 }));
      setRechargeTransactions(res.items || []);
      setTxnTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setTxnLoading(false);
    }
  }, [txnPage, txnPageSize, txnSearch]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [promotionsData, actionsData, infocardsData, pkgs] = await Promise.all([
        mobileHomeApi.getPromotions(),
        mobileHomeApi.getActions(),
        mobileHomeApi.getInfoCards(),
        rechargeApi.getAllPackages().catch(() => []),
      ]);
      setPromotions(promotionsData || []);
      setActions(actionsData || []);
      setInfocards(infocardsData || []);
      setRechargePackages(Array.isArray(pkgs) ? pkgs : []);
      await fetchTransactions();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch mobile management content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'recharge') {
      fetchTransactions();
    }
  }, [txnPage, txnPageSize, txnSearch]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const triggerAlert = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleOpenAdd = () => {
    if (activeTab === 'recharge') {
      setRechargePackageModal({ mode: 'create' });
      return;
    }
    setEditingId(null);
    if (activeTab === 'promotions') {
      setForm({ title: '', subtitle: '', backgroundColor: '#CE1D19', iconName: 'phone_iphone', sortOrder: promotions.length, isActive: true });
    } else if (activeTab === 'actions') {
      setForm({ label: '', iconName: 'qr_code_scanner', action: 'scan', sortOrder: actions.length, isActive: true });
    } else {
      setForm({ title: '', excerpt: '', timeText: '5 min read', sortOrder: infocards.length, isActive: true });
    }
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setForm({ ...item });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    setLoading(true);
    try {
      if (activeTab === 'promotions') {
        await mobileHomeApi.deletePromotion(id);
        setPromotions(promotions.filter(p => p.id !== id));
      } else if (activeTab === 'actions') {
        await mobileHomeApi.deleteAction(id);
        setActions(actions.filter(a => a.id !== id));
      } else {
        await mobileHomeApi.deleteInfoCard(id);
        setInfocards(infocards.filter(i => i.id !== id));
      }
      triggerAlert('success', 'Item deleted successfully');
    } catch (err: any) {
      triggerAlert('error', err.message || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (activeTab === 'promotions') {
        if (editingId) {
          const updated = await mobileHomeApi.updatePromotion(editingId, form);
          setPromotions(promotions.map(p => p.id === editingId ? updated : p));
        } else {
          const created = await mobileHomeApi.createPromotion(form);
          setPromotions([...promotions, created]);
        }
      } else if (activeTab === 'actions') {
        if (editingId) {
          const updated = await mobileHomeApi.updateAction(editingId, form);
          setActions(actions.map(a => a.id === editingId ? updated : a));
        } else {
          const created = await mobileHomeApi.createAction(form);
          setActions([...actions, created]);
        }
      } else {
        if (editingId) {
          const updated = await mobileHomeApi.updateInfoCard(editingId, form);
          setInfocards(infocards.map(i => i.id === editingId ? updated : i));
        } else {
          const created = await mobileHomeApi.createInfoCard(form);
          setInfocards([...infocards, created]);
        }
      }
      setShowModal(false);
      triggerAlert('success', editingId ? 'Item updated successfully' : 'Item created successfully');
    } catch (err: any) {
      triggerAlert('error', err.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-xl">
              <Smartphone className="w-8 h-8" />
            </div>
            Mobile Management
          </h1>
          <p className="text-slate-500 mt-2 text-md">
            Control promotions, quick actions, recharge packages, and informational updates of the mobile client app.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center bg-white shadow-sm" title="Refresh">
            <RotateCcw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-[var(--color-primary-dark)] transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'recharge' ? 'New Package' : 'Add New Element'}
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <span className="text-sm font-medium">{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-rose-50 text-rose-800 rounded-xl border border-rose-100 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('promotions')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'promotions'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Image className="w-4 h-4" />
          Promotions Carousel ({promotions.length})
        </button>
        <button
          onClick={() => setActiveTab('actions')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'actions'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Quick Actions Grid ({actions.length})
        </button>
        <button
          onClick={() => setActiveTab('infocards')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'infocards'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Info & Updates ({infocards.length})
        </button>
        <button
          onClick={() => setActiveTab('recharge')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'recharge'
              ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Recharge Packages ({rechargePackages.length})
        </button>
      </div>

      {/* Content Area */}
      {loading && promotions.length === 0 ? (
        <div className="flex justify-center items-center py-24 text-slate-500 font-medium">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mr-3"></div>
          Loading Mobile Management Config...
        </div>
      ) : activeTab === 'recharge' ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Package Management */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Recharge Packages</h2>
              <p className="text-sm text-slate-500 mt-0.5">Manage UPI recharge packages visible to retailers in the mobile app.</p>
            </div>
            <button
              onClick={() => setRechargePackageModal({ mode: 'create' })}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-all text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Package
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rechargePackages.length === 0 ? (
              <div className="col-span-4 text-center py-16 text-slate-400 italic">No recharge packages found. Create one above.</div>
            ) : rechargePackages.map((pkg: any) => (
              <div key={pkg.id} className={`relative bg-white rounded-2xl border-2 shadow-sm p-5 flex flex-col gap-3 transition-all ${pkg.isActive ? 'border-indigo-200' : 'border-slate-200 opacity-60'}`}>
                {!pkg.isActive && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">Inactive</span>
                )}
                {pkg.isActive && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase border border-emerald-100">Active</span>
                )}
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-indigo-50 rounded-xl">
                    <CreditCard className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm leading-tight">{pkg.name}</p>
                    <p className="text-xs text-slate-400">{pkg.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-end justify-between mt-1">
                  <div>
                    {pkg.planType === 'UNLIMITED' ? (
                      <>
                        <p className="text-2xl font-black text-indigo-700">{pkg.validityDays || 0}</p>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Days</p>
                      </>
                    ) : pkg.planType === 'LIFETIME' ? (
                      <>
                        <p className="text-xl font-black text-indigo-700">Lifetime</p>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Plan</p>
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-black text-indigo-700">{pkg.credits}</p>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cuts</p>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-slate-800 flex items-center gap-0.5">
                      <IndianRupee className="w-4 h-4" />{Number(pkg.price).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{pkg.planType || 'USAGE'}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => setRechargePackageModal({ mode: 'edit', pkg })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={async () => {
                      await rechargeApi.updatePackage(pkg.id, { isActive: !pkg.isActive });
                      fetchData();
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${pkg.isActive ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                  >
                    {pkg.isActive ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                    {pkg.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Delete package "${pkg.name}"?`)) {
                        await rechargeApi.deletePackage(pkg.id);
                        fetchData();
                      }
                    }}
                    className="p-1.5 text-red-400 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Transactions */}
          <div className="pt-6 border-t border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight">Payment Transactions</h2>
                <p className="text-xs text-slate-500 mt-0.5">Real-time payment history and Razorpay order reconciliation.</p>
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={txnSearch}
                    onChange={(e) => { setTxnSearch(e.target.value); setTxnPage(1); }}
                    placeholder="Search Order ID / User / Org..."
                    className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] w-60 shadow-sm"
                  />
                  {txnSearch && (
                    <button onClick={() => { setTxnSearch(''); setTxnPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/60">
                  {(['ALL', 'SUCCESS', 'PENDING', 'FAILED'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => { setTxnStatusFilter(st); setTxnPage(1); }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        txnStatusFilter === st
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st === 'ALL' ? 'All' : st === 'SUCCESS' ? 'Success' : st === 'PENDING' ? 'Pending' : 'Failed'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Pagination Bar */}
            <PaginationBar
              meta={{
                totalPages: Math.ceil(txnTotal / txnPageSize),
                total: txnTotal,
                page: txnPage
              }}
              page={txnPage}
              setPage={setTxnPage}
              pageSize={txnPageSize}
              setPageSize={setTxnPageSize}
            />

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="px-4 py-3.5 w-12 text-center">#</th>
                      <th className="px-5 py-3.5 min-w-[240px]">Organization</th>
                      <th className="px-5 py-3.5 min-w-[220px]">Package</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5 whitespace-nowrap">Date & Time</th>
                      <th className="px-5 py-3.5 min-w-[160px]">User</th>
                      <th className="px-5 py-3.5">Razorpay Order ID</th>
                      <th className="px-5 py-3.5">Payment ID</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {txnLoading ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400 font-medium">
                          <div className="inline-flex items-center gap-2">
                            <RotateCcw className="w-4 h-4 animate-spin text-[var(--color-primary)]" /> Loading transactions...
                          </div>
                        </td>
                      </tr>
                    ) : rechargeTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-16 text-center text-slate-400 italic">
                          <div className="flex flex-col items-center gap-2">
                            <CreditCard className="w-8 h-8 text-slate-300 stroke-1" />
                            <span>No payment transactions found matching your criteria.</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      rechargeTransactions
                        .filter((t: any) => txnStatusFilter === 'ALL' || t.status === txnStatusFilter)
                        .map((txn: any, idx: number) => {
                          const userName = txn.user ? `${txn.user.firstName || ''} ${txn.user.lastName || ''}`.trim() || txn.user.email : '—';
                          const serialNo = (txnPage - 1) * txnPageSize + idx + 1;
                          
                          // Row color tint based on status
                          const rowBgClass = txn.status === 'SUCCESS'
                            ? 'bg-emerald-50/30 hover:bg-emerald-100/50'
                            : txn.status === 'PENDING'
                            ? 'bg-amber-50/35 hover:bg-amber-100/50'
                            : 'bg-rose-50/35 hover:bg-rose-100/50';

                          return (
                            <tr key={txn.id} className={`${rowBgClass} transition-colors group`}>
                              <td className="px-4 py-3.5 text-center font-mono text-xs font-bold text-slate-400">
                                {serialNo}
                              </td>
                              <td className="px-5 py-3.5 min-w-[240px]">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-white text-indigo-700 font-extrabold flex items-center justify-center text-xs flex-shrink-0 border border-slate-200 shadow-xs">
                                    {(txn.organization?.name || 'O').charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-slate-800 text-xs" title={txn.organization?.name || '—'}>{txn.organization?.name || '—'}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 min-w-[220px]">
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800 text-xs">{txn.package?.name || '—'}</span>
                                  <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider">{txn.package?.credits ? `${txn.package.credits} Cuts` : txn.package?.planType || ''}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="inline-flex items-center text-sm font-extrabold text-slate-900 bg-white/80 border border-slate-200/80 px-2.5 py-1 rounded-xl shadow-2xs">
                                  <IndianRupee className="w-3.5 h-3.5 text-slate-500 mr-0.5" />
                                  {Number(txn.amount).toLocaleString('en-IN')}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-xs text-slate-600 font-medium whitespace-nowrap">
                                {new Date(txn.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="px-5 py-3.5 min-w-[160px] text-xs text-slate-700 font-semibold">
                                {userName}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 bg-white/80 px-2 py-1 rounded-lg border border-slate-200/60 w-fit shadow-2xs">
                                  <span className="truncate max-w-[140px]">{txn.razorpayOrderId || '—'}</span>
                                  {txn.razorpayOrderId && (
                                    <button
                                      onClick={() => copyToClipboard(txn.razorpayOrderId)}
                                      className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                                      title="Copy Order ID"
                                    >
                                      {copiedId === txn.razorpayOrderId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 bg-white/80 px-2 py-1 rounded-lg border border-slate-200/60 w-fit shadow-2xs">
                                  <span className="truncate max-w-[140px]">{txn.razorpayPaymentId || '—'}</span>
                                  {txn.razorpayPaymentId && (
                                    <button
                                      onClick={() => copyToClipboard(txn.razorpayPaymentId)}
                                      className="p-1 hover:bg-slate-100 rounded transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                                      title="Copy Payment ID"
                                    >
                                      {copiedId === txn.razorpayPaymentId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                {txn.status === 'SUCCESS' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/60 shadow-xs">
                                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" /> Success
                                  </span>
                                ) : txn.status === 'PENDING' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/60 shadow-xs">
                                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Pending
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200/60 shadow-xs">
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Failed
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Pagination Bar */}
            <PaginationBar
              meta={{
                totalPages: Math.ceil(txnTotal / txnPageSize),
                total: txnTotal,
                page: txnPage
              }}
              page={txnPage}
              setPage={setTxnPage}
              pageSize={txnPageSize}
              setPageSize={setTxnPageSize}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'promotions' && promotions.map((item, idx) => (
            <div 
              key={item.id} 
              style={{ backgroundColor: item.backgroundColor }}
              className={`relative p-6 rounded-2xl text-white shadow-md flex flex-col justify-between h-48 overflow-hidden ${
                item.isActive === false ? 'opacity-60 saturate-50' : ''
              }`}
            >
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white select-none pointer-events-none">
                <Sparkles size={160} />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                    Promo {idx + 1}
                  </span>
                  {item.isActive === false && (
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-rose-600 px-2 py-0.5 rounded-md">
                      Inactive
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mt-3 leading-tight">{item.title}</h3>
                <p className="text-xs text-white/90 mt-1 line-clamp-2">{item.subtitle}</p>
              </div>

              <div className="flex justify-between items-center mt-4">
                <span className="text-xs font-semibold bg-white text-slate-900 px-3 py-1 rounded-full">
                  Explore Now
                </span>

                <div className="flex gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10 backdrop-blur-sm z-10">
                  <button 
                    onClick={() => handleOpenEdit(item)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-1 hover:bg-red-500/30 text-red-100 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {activeTab === 'actions' && actions.map((item, idx) => (
            <div 
              key={item.id}
              className={`bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow ${
                item.isActive === false ? 'opacity-60 saturate-50' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 font-bold">
                  {idx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800">{item.label}</h4>
                    {item.isActive === false && (
                      <span className="text-[9px] uppercase font-bold tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Icon: {item.iconName} | Action: {item.action}</p>
                </div>
              </div>

              <div className="flex gap-1.5">
                <button 
                  onClick={() => handleOpenEdit(item)}
                  className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Edit2 className="w-4.5 h-4.5" />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          ))}

          {activeTab === 'infocards' && infocards.map((item) => (
            <div 
              key={item.id}
              className={`bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow ${
                item.isActive === false ? 'opacity-60 saturate-50' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-800 text-base line-clamp-1">{item.title}</h4>
                  {item.isActive === false && (
                    <span className="text-[9px] uppercase font-bold tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded flex-shrink-0">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">{item.excerpt}</p>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {item.timeText}
                </span>

                <div className="flex gap-1">
                  <button 
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100 transform transition-all">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">
                {editingId ? 'Edit Element' : 'Add New Element'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === 'promotions' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Promotion Title</label>
                    <input 
                      type="text" 
                      required
                      value={form.title || ''}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Exclusive iPhone 17 Launch"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subtitle / Description</label>
                    <textarea 
                      required
                      rows={2}
                      value={form.subtitle || ''}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      placeholder="e.g. Get 20% off on all iPhone 17 Pro designs!"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bg Color (Hex)</label>
                      <input 
                        type="color" 
                        required
                        value={form.backgroundColor || '#CE1D19'}
                        onChange={(e) => setForm({ ...form, backgroundColor: e.target.value })}
                        className="w-full h-10 p-0.5 rounded-xl border border-slate-200 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Icon Name</label>
                      <input 
                        type="text" 
                        required
                        value={form.iconName || 'phone_iphone'}
                        onChange={(e) => setForm({ ...form, iconName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'actions' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Action Label</label>
                    <input 
                      type="text" 
                      required
                      value={form.label || ''}
                      onChange={(e) => setForm({ ...form, label: e.target.value })}
                      placeholder="e.g. Scan QR"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Icon Name</label>
                      <input 
                        type="text" 
                        required
                        value={form.iconName || 'qr_code_scanner'}
                        onChange={(e) => setForm({ ...form, iconName: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Action Code</label>
                      <select 
                        value={form.action || 'scan'}
                        onChange={(e) => setForm({ ...form, action: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                      >
                        <option value="scan">Scan QR</option>
                        <option value="history">History</option>
                        <option value="stock">Stock</option>
                        <option value="help">Help</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'infocards' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Update Title</label>
                    <input 
                      type="text" 
                      required
                      value={form.title || ''}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. System Maintenance"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">excerpt / Summary</label>
                    <textarea 
                      required
                      rows={3}
                      value={form.excerpt || ''}
                      onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                      placeholder="Enter update description..."
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Time Label</label>
                    <input 
                      type="text" 
                      required
                      value={form.timeText || 'Yesterday'}
                      onChange={(e) => setForm({ ...form, timeText: e.target.value })}
                      placeholder="e.g. 5 min read, Yesterday"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 py-2">
                <input 
                  type="checkbox" 
                  id="isActive"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="w-4 h-4 text-[var(--color-primary)] border-slate-300 rounded focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-slate-700 select-none cursor-pointer">
                  Active (Show on Mobile App)
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Display Sort Order</label>
                <input 
                  type="number" 
                  required
                  value={form.sortOrder === undefined ? 0 : form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Element'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {rechargePackageModal && (
        <RechargePackageModal
          pkg={rechargePackageModal.pkg}
          onClose={() => setRechargePackageModal(null)}
          onSave={() => { setRechargePackageModal(null); fetchData(); }}
        />
      )}
    </div>
  );
};

export default MobileHomeManager;
