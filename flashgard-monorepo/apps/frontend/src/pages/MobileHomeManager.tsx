import React, { useState, useEffect } from 'react';
import { mobileHomeApi } from '../lib/api';
import { 
  Smartphone, Plus, Edit2, Trash2, X,
  LayoutGrid, Image, FileText, CheckCircle2, AlertCircle, Sparkles, RotateCcw
} from 'lucide-react';

const MobileHomeManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'promotions' | 'actions' | 'infocards'>('promotions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Content States
  const [promotions, setPromotions] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [infocards, setInfocards] = useState<any[]>([]);

  // Modal / Form States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [promotionsData, actionsData, infocardsData] = await Promise.all([
        mobileHomeApi.getPromotions(),
        mobileHomeApi.getActions(),
        mobileHomeApi.getInfoCards()
      ]);
      setPromotions(promotionsData || []);
      setActions(actionsData || []);
      setInfocards(infocardsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch mobile home content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
            Mobile Home Configurator
          </h1>
          <p className="text-slate-500 mt-2 text-md">
            Control promotions, quick actions, and informational updates of the mobile client app home page.
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
            Add New Element
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
      </div>

      {/* Content Area */}
      {loading && promotions.length === 0 ? (
        <div className="flex justify-center items-center py-24 text-slate-500 font-medium">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mr-3"></div>
          Loading Home Screen Config...
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
    </div>
  );
};

export default MobileHomeManager;
