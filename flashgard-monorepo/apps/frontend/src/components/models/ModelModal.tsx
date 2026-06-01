import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { modelsApi } from '../../lib/api';

interface ModelModalProps {
  item: any;
  brands: any[];
  categories: any[];
  onClose: () => void;
  onSave: () => void;
}

const ModelModal: React.FC<ModelModalProps> = ({ item, brands, categories, onClose, onSave }) => {
  const [form, setForm] = useState(item || { name: '', brandId: '', categoryId: '', sortOrder: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = { 
        ...form, 
        brandId: form.brandId === '' ? null : form.brandId,
        sortOrder: form.sortOrder === '' ? 0 : parseInt(form.sortOrder)
      };
      if (item?.id) await modelsApi.update(item.id, payload);
      else await modelsApi.create(payload);
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save model');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">{item ? 'Edit Model' : 'New Model'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Model Name</label>
            <input 
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none"
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              required 
              placeholder="e.g. iPhone 15 Pro" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Category</label>
              <select 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none"
                value={form.categoryId} 
                onChange={e => setForm({ ...form, categoryId: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Brand (Optional)</label>
              <select 
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none"
                value={form.brandId} 
                onChange={e => setForm({ ...form, brandId: e.target.value })}
              >
                <option value="">None / Not Applicable</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Sort Order</label>
            <input 
              type="number"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none"
              value={form.sortOrder === null || form.sortOrder === undefined ? '' : form.sortOrder} 
              onChange={e => setForm({ ...form, sortOrder: e.target.value })} 
              placeholder="0" 
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {item ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModelModal;
