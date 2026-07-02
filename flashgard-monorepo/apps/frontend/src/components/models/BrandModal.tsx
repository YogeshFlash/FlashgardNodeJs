import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { brandsApi, filesApi } from '../../lib/api';

interface BrandModalProps {
  item: any;
  onClose: () => void;
  onSave: () => void;
}

const BrandModal: React.FC<BrandModalProps> = ({ item, onClose, onSave }) => {
  const [form, setForm] = useState(item || { name: '', sortOrder: 0, imageUrl: '' });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await filesApi.uploadCatalog(formData);
      setForm({ ...form, imageUrl: res.filename });
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (item?.id) await brandsApi.update(item.id, form);
      else await brandsApi.create(form);
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save brand');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">{item ? 'Edit Brand' : 'New Brand'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Brand Name</label>
            <input 
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none"
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              required 
              placeholder="e.g. Apple" 
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Image URL / Filename</label>
            <div className="flex gap-2">
              <input 
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none"
                value={form.imageUrl || ''} 
                onChange={e => setForm({ ...form, imageUrl: e.target.value })} 
                placeholder="e.g. Apple.jpg" 
              />
              <label className="cursor-pointer px-4 py-2 bg-slate-100 border border-slate-200 hover:bg-slate-200 rounded-lg text-xs font-bold flex items-center justify-center shrink-0">
                {uploading ? 'Uploading...' : 'Upload File'}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  disabled={uploading}
                />
              </label>
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

export default BrandModal;
