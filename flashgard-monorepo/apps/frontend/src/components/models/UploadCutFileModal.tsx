import React, { useState } from 'react';
import { X, Loader2, Upload } from 'lucide-react';
import { modelCutFilesApi } from '../../lib/api';

interface UploadCutFileModalProps {
  model: any;
  cutPatterns: any[];
  onClose: () => void;
  onSave: () => void;
}

const UploadCutFileModal: React.FC<UploadCutFileModalProps> = ({ model, cutPatterns, onClose, onSave }) => {
  const [patternId, setPatternId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('modelId', model.id);
      formData.append('cutPatternId', patternId);
      formData.append('file', file);

      await modelCutFilesApi.upload(formData);
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to upload cut file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Upload Cut File for {model.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-5">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Select Pattern Variation</label>
            <select 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none transition-all"
              value={patternId} 
              onChange={e => setPatternId(e.target.value)}
              required
            >
              <option value="">— Select Pattern —</option>
              {cutPatterns.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Design File (.plt, .png, .jpg)</label>
            <div className="relative group">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                onChange={e => setFile(e.target.files?.[0] || null)}
                required
              />
              <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-2 transition-all
                ${file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 group-hover:bg-slate-100 group-hover:border-[var(--color-accent)]/30'}`}>
                <div className={`p-3 rounded-full ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-white shadow-sm text-slate-400'}`}>
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700">{file ? file.name : 'Click or drag to upload'}</p>
                  <p className="text-xs text-slate-400 mt-1">{file ? `${(file.size / 1024).toFixed(1)} KB` : 'Max file size: 10MB'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2 px-8 disabled:opacity-60">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Start Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadCutFileModal;
