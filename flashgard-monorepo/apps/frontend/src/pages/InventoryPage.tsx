import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Package, Plus, Search, Loader2, RefreshCw,
  Layers, ClipboardList, Truck, QrCode, X, AlertCircle,
  CheckCircle2, ArrowRight, Zap, RotateCcw,
  Send, Edit2, Trash2, FileText, Package2, PlusCircle
} from 'lucide-react';
import { inventoryApi, orgsApi, filmTypesApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

// ─── Constants ─────────────────────────────────────────────────────────────
const BATCH_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  BULK_RECEIVED: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Bulk Received' },
  RAW_MATERIAL: { color: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Raw Material' },
  PACKAGED: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Packaged' },
  QR_APPLIED: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'QR Applied' },
  IN_TRANSIT: { color: 'bg-sky-100 text-sky-700 border-sky-200', label: 'In Transit' },
  AT_DISTRIBUTOR: { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', label: 'At Distributor' },
  AT_RETAILER: { color: 'bg-teal-100 text-teal-700 border-teal-200', label: 'At Retailer' },
};

const WO_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  OPEN: { color: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Open' },
  IN_PROGRESS: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'In Progress' },
  CLOSED: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Closed' },
};

const DISPATCH_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Draft' },
  DISPATCHED: { color: 'bg-amber-100 text-amber-700 border-amber-200', label: 'Dispatched' },
  RECEIVED: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Received' },
  CANCELLED: { color: 'bg-red-100 text-red-600 border-red-200', label: 'Cancelled' },
};

// ─── Shared Components ──────────────────────────────────────────────────────
const TabBar = ({ tabs, active, onChange }: any) => (
  <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
    <div className="flex overflow-x-auto">
      {tabs.map((tab: any) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap border-b-2
            ${active === tab.id
              ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
        >
          <tab.icon className={`w-4 h-4 ${active === tab.id ? 'text-[var(--color-accent)]' : 'text-slate-400'}`} />
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);

const StatusBadge = ({ status, config }: { status: string; config: Record<string, { color: string; label: string }> }) => {
  const cfg = config[status] || { color: 'bg-slate-100 text-slate-600 border-slate-200', label: status };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

const EmptyState = ({ icon: Icon, message, sub }: any) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-slate-300" />
    </div>
    <p className="text-slate-600 font-semibold">{message}</p>
    {sub && <p className="text-slate-400 text-sm mt-1">{sub}</p>}
  </div>
);

const Modal = ({ title, onClose, children, size = 'md' }: any) => {
  const widths: Record<string, string> = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-3xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">{children}</div>
      </div>
    </div>
  );
};

const FormField = ({ label, required, children, error }: any) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

const inputCls = "w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent transition";
const selectCls = `${inputCls} appearance-none`;

const flattenOrgsHierarchy = (orgs: any[] = []) => {
  const byParent = new Map<string, any[]>();
  const byId = new Map<string, any>();

  for (const org of orgs) {
    if (!org?.id) continue;
    byId.set(org.id, org);
    const parentKey = org.parentId ? String(org.parentId) : '__root__';
    const arr = byParent.get(parentKey) || [];
    arr.push(org);
    byParent.set(parentKey, arr);
  }

  const result: { org: any; depth: number }[] = [];
  const seen = new Set<string>();

  const walk = (parentId: string, depth: number) => {
    const children = byParent.get(parentId) || [];
    children.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    for (const child of children) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      result.push({ org: child, depth });
      walk(child.id, depth + 1);
    }
  };

  walk('__root__', 0);
  // Add any orphans
  for (const org of orgs) {
    if (!seen.has(org.id)) {
      seen.add(org.id);
      result.push({ org, depth: 0 });
      walk(org.id, 1);
    }
  }
  return result;
};

const PredictiveReceiptSelect = ({ receipts, value, onChange, placeholder = "Filter by Receipt…" }: { receipts: any[], value: string, onChange: (id: string) => void, placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = receipts.find(r => r.id === value);
  const displayValue = selected ? `${selected.receiptCode} ${selected.invoiceNumber ? `(${selected.invoiceNumber})` : ''}` : '';

  const filtered = receipts.filter(r =>
    r.receiptCode.toLowerCase().includes(search.toLowerCase()) ||
    (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative w-48 sm:w-64">
      <div className="relative group">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[var(--color-accent)] transition-colors" />
        <input
          className={`${inputCls} pl-9 pr-8 !py-2 !text-xs bg-white border-slate-200 hover:border-slate-300 focus:border-[var(--color-accent)] focus:ring-0 shadow-sm`}
          placeholder={placeholder}
          value={isOpen ? search : displayValue}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onChange={e => setSearch(e.target.value)}
        />
        {value && (
          <button
            onClick={() => { onChange(''); setSearch(''); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 text-left">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">No matching receipts</div>
          ) : (
            filtered.map(r => (
              <div
                key={r.id}
                onMouseDown={(e) => {
                  e.preventDefault(); 
                  onChange(r.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full px-4 py-2 text-left text-xs cursor-pointer hover:bg-slate-50 transition flex flex-col gap-0.5 ${value === r.id ? 'bg-indigo-50/50 text-[var(--color-accent)]' : 'text-slate-700'}`}
              >
                <span className="font-mono font-bold">{r.receiptCode}</span>
                {r.invoiceNumber && <span className="text-[10px] opacity-70">Invoice: {r.invoiceNumber} • {new Date(r.receivedDate).toLocaleDateString()}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const PredictiveBatchSelect = ({ onChange, placeholder = "Select Batch…" }: { onChange: (batch: any) => void, placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  useEffect(() => {
    if (!search && !isOpen) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await inventoryApi.getBatches({ search, limit: 10 });
        setResults(res.items || []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [search, isOpen]);

  return (
    <div className="relative">
      <div className="relative group text-left">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[var(--color-accent)] transition-colors" />
        <input
          className={`${inputCls} pl-9 pr-10`}
          placeholder={placeholder}
          value={isOpen ? search : (selectedBatch?.batchCode || '')}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onChange={e => setSearch(e.target.value)}
        />
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 text-left">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 italic text-center">
              {loading ? 'Searching...' : 'No batches found'}
            </div>
          ) : (
            results.map(b => (
              <div
                key={b.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setSelectedBatch(b);
                  onChange(b);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded italic">
                    {b.batchCode}
                  </span>
                  <StatusBadge status={b.status} config={BATCH_STATUS_CONFIG} />
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                  <Package className="w-3 h-3" />
                  <span className="text-slate-900 font-bold">{b.quantity} {b.batchType === 'RAW_MATERIAL' ? 'm' : 'units'}</span>
                  <span className="opacity-40">•</span>
                  <span className="text-indigo-600 truncate">{b.organization?.name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};


// ─── Inward Modal ─────────────────────────────────────────────────────────────
const InwardProcurementModal = ({ onClose, onSave, initialInwardReceiptId }: { onClose: () => void; onSave: () => void; initialInwardReceiptId?: string | null }) => {
  const [inwardReceiptId, setInwardReceiptId] = useState(initialInwardReceiptId || '');
  const [generalNotes, setGeneralNotes] = useState('');
  const [items, setItems] = useState<any[]>([
    { id: Math.random().toString(36).substr(2, 9), type: 'BULK_RECEIVED', filmTypeId: '', quantity: '', packSize: '', rollLength: '', rollWidth: '', notes: '' }
  ]);
  const [showAddReceipt, setShowAddReceipt] = useState(false);

  const [filmTypes, setFilmTypes] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successItems, setSuccessItems] = useState<string[] | null>(null);

  const loadReceipts = useCallback(() => {
    inventoryApi.getInwardReceipts({ limit: 100 }).then(d => setReceipts(d.items || [])).catch(() => setReceipts([]));
  }, []);

  useEffect(() => {
    filmTypesApi.getAll().then(d => setFilmTypes(Array.isArray(d) ? d : [])).catch(() => setFilmTypes([]));
    loadReceipts();
  }, [loadReceipts]);

  const addItem = () => setItems([...items, { id: Math.random().toString(36).substr(2, 9), type: 'BULK_RECEIVED', filmTypeId: '', quantity: '', packSize: '', notes: '' }]);
  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id: string, k: string, v: any) => setItems(items.map(i => i.id === id ? { ...i, [k]: v } : i));

  const handleSave = async () => {
    setError('');
    const isValid = items.every(i => {
      const hasBasic = i.filmTypeId && i.quantity;
      if (i.type === 'RAW_MATERIAL') {
        return hasBasic && i.rollLength && i.rollWidth;
      }
      return hasBasic && i.packSize;
    });

    if (!inwardReceiptId || !isValid) {
      setError('Please select an inward receipt and fill all required fields (Type, Quantity, and Dimensions/Size) for all items.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        inwardReceiptId,
        notes: generalNotes,
        items: items.map(i => ({
          type: i.type,
          filmTypeId: i.filmTypeId,
          quantity: Number(i.quantity),
          packSize: i.type === 'RAW_MATERIAL' ? `${i.rollLength}m x ${i.rollWidth}m` : String(i.packSize),
          rollLength: i.type === 'RAW_MATERIAL' ? Number(i.rollLength) : null,
          rollWidth: i.type === 'RAW_MATERIAL' ? Number(i.rollWidth) : null,
          notes: i.notes
        }))
      };
      const res = await inventoryApi.createInwardProcurement(payload);
      setSuccessItems(res.batchCodes || []);
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (successItems) {
    return (
      <Modal title="Inward Procurement Successful" onClose={onClose}>
        <div className="space-y-6 py-2">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Procurement Logged</h3>
            <p className="text-slate-500 mt-2">Successfully created {successItems.length} new batches.</p>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Generated Batch Codes</p>
            </div>
            <div className="p-4 space-y-2">
              {successItems.map(code => (
                <div key={code} className="flex items-center gap-2 font-mono text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {code}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition active:scale-[0.98]"
          >
            Close and Continue
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Inward Procurement" onClose={onClose} size="lg">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Header Info */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">Inward Receipt (Master) <span className="text-red-500">*</span></label>
            <button
              onClick={() => setShowAddReceipt(true)}
              className="text-xs font-bold text-[var(--color-accent)] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> New Receipt
            </button>
          </div>
          <select className={selectCls} value={inwardReceiptId} onChange={e => setInwardReceiptId(e.target.value)}>
            <option value="">Select receipt…</option>
            {receipts.map((r: any) => (
              <option key={r.id} value={r.id}>
                {r.receiptCode} - {r.vendor?.name} (Inv: {r.invoiceNumber || 'N/A'}, Date: {new Date(r.receivedDate).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {showAddReceipt && (
          <AddReceiptModal
            onClose={() => setShowAddReceipt(false)}
            onSave={(newReceipt?: any) => {
              setShowAddReceipt(false);
              loadReceipts();
              if (newReceipt?.id) setInwardReceiptId(newReceipt.id);
            }}
          />
        )}

        {/* Items List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Stock Batches</h3>
            <button
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 px-2.5 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Stock
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="relative p-3 border border-slate-200 rounded-xl bg-white shadow-sm hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                      {idx + 1}
                    </span>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                      <button
                        onClick={() => updateItem(item.id, 'type', 'BULK_RECEIVED')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${item.type === 'BULK_RECEIVED' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Bulk (Precut)
                      </button>
                      <button
                        onClick={() => updateItem(item.id, 'type', 'RAW_MATERIAL')}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${item.type === 'RAW_MATERIAL' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Raw (Rolls)
                      </button>
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button onClick={() => removeItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">Film Type</label>
                    <select className={`${selectCls} !py-1.5 !text-xs`} value={item.filmTypeId} onChange={e => updateItem(item.id, 'filmTypeId', e.target.value)}>
                      <option value="">Select type…</option>
                      {filmTypes.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">{item.type === 'RAW_MATERIAL' ? 'Rolls' : 'Packs'}</label>
                    <input
                      type="number"
                      className={`${inputCls} !py-1.5 !text-xs`}
                      value={item.quantity}
                      onChange={e => updateItem(item.id, 'quantity', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">{item.type === 'RAW_MATERIAL' ? 'Length (m)' : 'Pack Size'}</label>
                    <input
                      className={`${inputCls} !py-1.5 !text-xs`}
                      value={item.type === 'RAW_MATERIAL' ? item.rollLength : item.packSize}
                      onChange={e => updateItem(item.id, item.type === 'RAW_MATERIAL' ? 'rollLength' : 'packSize', e.target.value)}
                      placeholder={item.type === 'RAW_MATERIAL' ? 'e.g. 50' : 'e.g. 24pcs'}
                    />
                  </div>
                  {item.type === 'RAW_MATERIAL' && (
                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">Width (m)</label>
                      <input
                        className={`${inputCls} !py-1.5 !text-xs`}
                        value={item.rollWidth}
                        onChange={e => updateItem(item.id, 'rollWidth', e.target.value)}
                        placeholder="e.g. 1.2"
                      />
                    </div>
                  )}
                  <div className={`${item.type === 'RAW_MATERIAL' ? 'col-span-12' : 'col-span-12 sm:col-span-3'}`}>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">Item Notes</label>
                    <input
                      className={`${inputCls} !py-1.5 !text-xs`}
                      value={item.notes}
                      onChange={e => updateItem(item.id, 'notes', e.target.value)}
                      placeholder="Specific notes…"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <FormField label="General Procurement Notes">
          <textarea
            className={inputCls}
            rows={2}
            value={generalNotes}
            onChange={e => setGeneralNotes(e.target.value)}
            placeholder="Notes for the entire shipment…"
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 disabled:opacity-60 transition active:scale-[0.98] shadow-lg shadow-slate-200"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Procurement
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── QR Generate Modal ──────────────────────────────────────────────────────
const QRGenerateModal = ({ batch, onClose, onSave }: any) => {
  const getInitialCounts = () => {
    const qty = Number(batch?.quantity) || 0;
    const packSize = parseInt(batch?.packSize) || 0;
    
    if (packSize > 0) {
      return {
        individualCount: String(packSize),
        masterBoxCount: String(Math.ceil(qty / packSize))
      };
    }

    return {
      individualCount: qty > 0 ? String(qty) : '',
      masterBoxCount: ''
    };
  };

  const [form, setForm] = useState(getInitialCounts());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrs, setQrs] = useState<any[]>([]);
  const [fetchingQrs, setFetchingQrs] = useState(false);
  const [expandedBoxes, setExpandedBoxes] = useState<Set<string>>(new Set());
  const [selectedQrs, setSelectedQrs] = useState<Set<string>>(new Set());

  const toggleSelection = (qr: any, isChecked: boolean) => {
    setSelectedQrs(prev => {
      const next = new Set(prev);
      const walk = (item: any, add: boolean) => {
        if (add) next.add(item.id); else next.delete(item.id);
        if (item.children) item.children.forEach((c: any) => walk(c, add));
      };
      walk(qr, isChecked);
      return next;
    });
  };

  const loadQrs = useCallback(async () => {
    setFetchingQrs(true);
    try {
      const data = await inventoryApi.getBatchQRCodes(batch.id);
      setQrs(data || []);
    } catch (e: any) {
      console.error('Failed to load QRs:', e);
    } finally {
      setFetchingQrs(false);
    }
  }, [batch.id]);

  useEffect(() => { loadQrs(); }, [loadQrs]);

  const handleGenerate = async () => {
    setError('');
    const individualPerBox = Number(form.individualCount) || 0;
    const master = Number(form.masterBoxCount) || 0;
    
    // Multiplier logic: 10 per box * 5 boxes = 50 total individuals
    const finalIndividualCount = master > 0 ? individualPerBox * master : individualPerBox;

    if (finalIndividualCount + master === 0) { setError('Enter at least 1 QR count.'); return; }
    setLoading(true);
    try {
      await inventoryApi.generateQR(batch.id, { 
        individualCount: finalIndividualCount, 
        masterBoxCount: master 
      });
      loadQrs();
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleBox = (id: string) => {
    setExpandedBoxes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <Modal title={`QR Codes — ${batch.batchCode}`} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Info Header */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch Context</p>
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Code</span>
                <span className="font-mono text-sm font-bold text-slate-800">{batch.batchCode}</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Film Type</span>
                <span className="text-sm font-bold text-slate-800">{batch.filmType?.name}</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Boxes</span>
                <span className="text-sm font-bold text-slate-800">{batch.quantity}</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-500">Box Count</span>
                <span className="text-sm font-bold text-slate-800">{batch.packSize || '—'}</span>
              </div>
            </div>
          </div>
          <StatusBadge status={batch.status} config={BATCH_STATUS_CONFIG} />
        </div>

        {/* Generator Section */}
        <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
          <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Generate New QR Codes
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Individuals Per Box">
              <div className="relative">
                <input 
                  type="number" 
                  className={`${inputCls} focus:ring-indigo-500 pr-10`} 
                  min="0" 
                  value={form.individualCount} 
                  onChange={e => setForm(f => ({ ...f, individualCount: e.target.value }))} 
                  placeholder="0" 
                />
                <Edit2 className="w-3.5 h-3.5 text-slate-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </FormField>
            <FormField label="Number of Master Boxes">
              <div className="relative">
                <input 
                  type="number" 
                  className={`${inputCls} focus:ring-indigo-500 pr-10`} 
                  min="0" 
                  value={form.masterBoxCount} 
                  onChange={e => setForm(f => ({ ...f, masterBoxCount: e.target.value }))} 
                  placeholder="0" 
                />
                <Edit2 className="w-3.5 h-3.5 text-slate-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </FormField>
          </div>
          <div className="flex items-center justify-between gap-4">
             <div className="flex flex-col">
               <p className="text-[10px] text-indigo-400 font-medium">Individuals will be evenly distributed across generated Master Boxes.</p>
               <button 
                 onClick={() => setForm(getInitialCounts())}
                 className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold mt-1 flex items-center gap-1 w-fit"
               >
                 <RotateCcw className="w-3 h-3" /> Reset to batch defaults
               </button>
             </div>
             <button 
               onClick={handleGenerate} 
               disabled={loading} 
               className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition active:scale-[0.98] disabled:opacity-50 shadow-md shadow-indigo-200"
             >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <QrCode className="w-4 h-4" />}
                Generate
             </button>
          </div>
          {error && <p className="mt-3 text-xs text-red-600 font-medium flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {error}</p>}
        </div>

        {/* Hierarchy List Section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" /> Allocated QR Codes 
              <span className="ml-1 text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                {qrs.reduce((acc, q) => acc + 1 + (q.children?.length || 0), 0)} Total
              </span>
            </h3>
            {fetchingQrs && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
            {qrs.length === 0 && !fetchingQrs ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                  <QrCode className="w-6 h-6 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-400">No QR codes generated yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Use the generator above to create codes for this batch.</p>
              </div>
            ) : (
              qrs.map((qr) => {
                const isMaster = qr.qrType === 'MASTER_BOX';
                const hasChildren = qr.children?.length > 0;
                const isExpanded = expandedBoxes.has(qr.id);

                return (
                  <div key={qr.id} className="group">
                    {/* Parent Row */}
                    <div className={`flex items-center justify-between p-3 transition-colors border-b border-transparent ${isExpanded ? 'bg-indigo-50/30 border-indigo-100' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={selectedQrs.has(qr.id)}
                          onChange={e => toggleSelection(qr, e.target.checked)}
                        />
                        {isMaster ? (
                          <button 
                            disabled={!hasChildren}
                            onClick={() => toggleBox(qr.id)}
                            className={`p-1 rounded hover:bg-slate-200 transition ${!hasChildren ? 'opacity-0 cursor-default' : 'text-slate-400'}`}
                          >
                            {isExpanded ? <RotateCcw className="w-3.5 h-3.5 rotate-90" /> : <Send className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <div className="w-6" /> // spacer for standalone individuals
                        )}
                        <div className="p-1 bgColor-white border border-slate-200 rounded shrink-0 shadow-sm transition-transform hover:scale-110">
                           <QRCodeSVG value={qr.qrCode || ''} size={32} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 ${
                               isMaster ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                             }`}>
                                {isMaster ? 'Master Box' : 'Individual'}
                              </span>
                              <div className={`${isMaster ? 'bg-indigo-50' : 'bg-slate-100'} border ${isMaster ? 'border-indigo-100' : 'border-slate-200'} rounded px-1.5 shrink-0`}>
                                 <span className={`text-[10px] font-bold ${isMaster ? 'text-indigo-600' : 'text-slate-500'}`}>#{qr.sequenceNumber || qr.sequence_number || 'N/A'}</span>
                              </div>

                             <span className="font-mono text-[11px] font-bold text-slate-800 truncate" title={qr.qrCode}>
                                {qr.qrCode || 'No Code'}
                             </span>
                          </div>
                          {isMaster && (
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                              Contains {qr.children?.length || 0} individual unit{(qr.children?.length !== 1) ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                       <div className="flex items-center gap-4">
                        <StatusBadge status={qr.status} config={{ [qr.status]: { label: qr.status, color: 'text-[10px] lowercase' } }} />
                      </div>
                    </div>

                    {/* Children Rows */}
                    {isMaster && isExpanded && (
                      <div className="bg-slate-50/50 border-t border-slate-100 divide-y divide-slate-100 animate-in slide-in-from-top-1 duration-200">
                        {qr.children.map((child: any) => (
                           <div key={child.id} className="flex items-center justify-between py-2.5 pl-4 pr-4 hover:bg-white transition-colors">
                             <div className="flex items-center gap-3 min-w-0">
                               <input 
                                 type="checkbox" 
                                 className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer ml-8"
                                 checked={selectedQrs.has(child.id)}
                                 onChange={e => toggleSelection(child, e.target.checked)}
                               />
                               <div className="flex items-center gap-2 min-w-0">
                                 <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                                 <div className="bg-slate-100 border border-slate-200 rounded px-1 shrink-0">
                                   <span className="text-[10px] font-bold text-slate-500">#{child.sequenceNumber || child.sequence_number || 'N/A'}</span>
                                 </div>
                                 <div className="p-0.5 bg-white border border-slate-100 rounded shrink-0">
                                    <QRCodeSVG value={child.qrCode || ''} size={24} />
                                 </div>
                                 <span className="text-[10px] font-medium text-slate-600 uppercase shrink-0">Individual</span>
                                 <span className="font-mono text-[10px] text-slate-500 truncate" title={child.qrCode}>{child.qrCode || 'No Code'}</span>
                               </div>
                             </div>
                             <div className="flex items-center gap-3">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter shrink-0">{child.status}</span>
                             </div>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
        </div>
      </div>
    </div>

      <div className="flex justify-between items-center gap-3 mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2">
            {selectedQrs.size > 0 && (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                    {selectedQrs.size} item{selectedQrs.size !== 1 ? 's' : ''} selected
                </span>
            )}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="px-6 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition">Close</button>
          <button 
            disabled={selectedQrs.size === 0}
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition active:scale-[0.98] disabled:opacity-50 shadow-md shadow-indigo-100"
          >
            <QrCode className="w-4 h-4" />
            Print Selected ({selectedQrs.size})
          </button>
        </div>
      </div>

      {/* Hidden Printable Section */}
      <PrintableQRPage items={qrs} selectedIds={selectedQrs} batchCode={batch.batchCode} />
    </Modal>
  );
};

// ─── Printable QR Page ──────────────────────────────────────────────────────
const PrintableQRPage = ({ items, selectedIds, batchCode }: { items: any[], selectedIds: Set<string>, batchCode: string }) => {
  // Map and calculate sequence tags for all items in the batch
  const allSelected: any[] = [];

  items.forEach((item) => {
    const seq = item.sequenceNumber || item.sequence_number || 'N/A';
    if (selectedIds.has(item.id)) {
      allSelected.push({ ...item, displayTag: `${item.qrType === 'MASTER_BOX' ? 'B-' : 'I-'}${batchCode} #${seq}` });
    }

    if (item.children) {
      item.children.forEach((child: any) => {
        const cSeq = child.sequenceNumber || child.sequence_number || 'N/A';
        if (selectedIds.has(child.id)) {
          allSelected.push({ ...child, displayTag: `I-${batchCode} #${cSeq}` });
        }
      });
    }
  });

  if (allSelected.length === 0) return null;

  return (
    <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:z-[9999]">
      <style>{`
        @media print {
          @page { 
            size: 35mm 35mm; 
            margin: 0; 
          }
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            display: flex; 
            flex-direction: column;
          }
          .sticker-item {
            height: 35mm;
            width: 35mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1mm;
            border: 1px dashed #eee;
            page-break-after: always;
            box-sizing: border-box;
            overflow: hidden;
          }
        }
      `}</style>
      <div className="print-container">
        {allSelected.map((qr) => (
          <div key={qr.id} className="sticker-item bg-white">
            <div className="shrink-0 mb-1">
              <QRCodeSVG value={qr.qrCode || ''} size={70} /> {/* ~24mm */}
            </div>
            <div className="w-full text-center px-0.5">
              <p className="font-mono text-[6px] font-bold text-slate-500 break-all leading-[1.1] mb-1">
                {qr.qrCode}
              </p>
              <div className="pt-1 border-t border-slate-200">
                <p className="text-[7.5px] font-black text-slate-900 uppercase tracking-tight break-words leading-[1.2]">
                  {qr.displayTag}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Close Work Order Modal ──────────────────────────────────────────────────
// ─── Record Output Modal (Partial) ──────────────────────────────────────────
const RecordOutputModal = ({ wo, onClose, onSave }: any) => {
  const src = wo?.sourceFilmBatch;
  const initialFilmType = src?.filmTypeId || '';
  const [outputs, setOutputs] = useState([{
    filmTypeId: initialFilmType,
    packSize: '',
    quantity: '',
    rollLength: '',
    rollWidth: ''
  }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSlitting = wo.workOrderType === 'SLITTING';
  const remainingQty = src?.quantity || 0;

  const addRow = () => setOutputs([...outputs, {
    filmTypeId: initialFilmType,
    packSize: '',
    quantity: '',
    rollLength: '',
    rollWidth: ''
  }]);

  const removeRow = (index: number) => setOutputs(outputs.filter((_, i) => i !== index));

  const updateRow = (index: number, key: string, val: string) => {
    const next = [...outputs];
    next[index] = { ...next[index], [key]: val };
    setOutputs(next);
  };

  const extractNumeric = (str: string | null | undefined): number => {
    if (!str) return 0;
    const match = String(str).match(/\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  const calculateUsage = (items: any[]) => {
    let total = 0;
    if (isSlitting) {
      const srcArea = (src.rollLength || 0) * (src.rollWidth || 0);
      if (srcArea <= 0) return 0;
      items.forEach(o => {
        const outArea = (Number(o.rollLength) || 0) * (Number(o.rollWidth) || 0);
        if (outArea > 0) total += (Number(o.quantity) || 0) / (srcArea / outArea);
      });
    } else {
      const srcCount = extractNumeric(src.packSize);
      if (srcCount <= 0) return 0;
      items.forEach(o => {
        const outCount = extractNumeric(o.packSize);
        total += (Number(o.quantity) || 0) * (outCount / srcCount);
      });
    }
    return Math.round(total * 100) / 100;
  };

  const projectedUsage = calculateUsage(outputs);
  const nextRemaining = Math.max(0, Math.round((remainingQty - projectedUsage) * 100) / 100);

  // Formatting input source display
  const inputSourceHtml = src?.rollLength && src?.rollWidth
    ? `${wo.inputQuantity} unit • ${src.rollLength}m x ${src.rollWidth}m`
    : `${wo.inputQuantity} unit${src?.packSize ? ` • ${src.packSize} count` : ''}`;

  const handleSave = async () => {
    setError('');
    const isValid = outputs.every(o => o.quantity && (isSlitting ? (o.rollLength && o.rollWidth) : o.packSize));
    if (!isValid) {
      setError('Please fill all required fields for each output row.');
      return;
    }
    setLoading(true);
    try {
      await inventoryApi.addWorkOrderOutput(wo.id, {
        outputs: outputs.map(o => ({
          ...o,
          quantity: Number(o.quantity),
          rollLength: isSlitting ? Number(o.rollLength) : null,
          rollWidth: isSlitting ? Number(o.rollWidth) : null
        }))
      });
      onSave();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <Modal title={`Record Output — ${wo?.sourceFilmBatch?.batchCode}`} onClose={onClose} size="lg">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
          <div><p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Type</p><p className="font-bold text-slate-900">{wo?.workOrderType}</p></div>
          <div><p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Film Type</p><p className="font-bold text-indigo-700 truncate">{src?.filmType?.name}</p></div>
          <div><p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Input Source</p><p className="font-bold text-slate-900 truncate">{inputSourceHtml}</p></div>
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Remaining Source</p>
            <div className="flex items-baseline gap-1.5">
              <p className="font-bold text-emerald-600">{nextRemaining} units</p>
              {projectedUsage > 0 && (
                <span className="text-[10px] text-amber-500 font-medium">(-{projectedUsage})</span>
              )}
            </div>
          </div>
          <div><p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Source Batch</p><p className="font-mono text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 w-fit">{src?.batchCode}</p></div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <PlusCircle className="w-4 h-4" /> New Output Entries
            </h3>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Another Row
            </button>
          </div>

          <div className="space-y-3">
            {outputs.map((form, idx) => (
              <div key={idx} className="p-4 border border-indigo-100 rounded-2xl bg-indigo-50/20 space-y-4 relative group">
                {outputs.length > 1 && (
                  <button
                    onClick={() => removeRow(idx)}
                    className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label={`${isSlitting ? 'Box Quantity' : 'Produce Qty'} (Row ${idx + 1})`} required>
                    <input type="number" className={inputCls} value={form.quantity} onChange={e => updateRow(idx, 'quantity', e.target.value)} placeholder="0" min="0" />
                  </FormField>
                  {isSlitting ? (
                    <>
                      <FormField label="Film Height (m)" required>
                        <input type="number" className={inputCls} value={form.rollLength} onChange={e => updateRow(idx, 'rollLength', e.target.value)} placeholder="0" />
                      </FormField>
                      <FormField label="Film Width (m)" required>
                        <input type="number" className={inputCls} value={form.rollWidth} onChange={e => updateRow(idx, 'rollWidth', e.target.value)} placeholder="0" />
                      </FormField>
                    </>
                  ) : (
                    <FormField label="Pack Size (count)" required>
                      <input className={inputCls} value={form.packSize} onChange={e => updateRow(idx, 'packSize', e.target.value)} placeholder="e.g. 50" />
                    </FormField>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {wo.outputs?.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Previously Recorded
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-4 py-2">Batch Code</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Dimensions/Pack</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wo.outputs.map((out: any) => (
                    <tr key={out.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs">{out.outputBatch?.batchCode}</td>
                      <td className="px-4 py-2 font-semibold text-slate-700">
                        {out.quantity} {isSlitting ? 'boxes' : 'units'}
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-xs">
                        {isSlitting 
                          ? `${out.outputBatch?.rollLength}m x ${out.outputBatch?.rollWidth}m` 
                          : (out.packSize || '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Record {outputs.length} Output{outputs.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Finalize Work Order Modal ───────────────────────────────────────────────
const FinalizeWOModal = ({ wo, onClose, onSave }: any) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFinalize = async () => {
    setLoading(true);
    try {
      await inventoryApi.finalizeWorkOrder(wo.id);
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Finalize Work Order" onClose={onClose} size="sm">
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Finalize Completion?</h3>
          <p className="text-slate-500 text-sm mt-2 px-6">
            This will mark the work order as **Closed**. Any remaining source material will be recorded as wastage. No further outputs can be added.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
          <button onClick={handleFinalize} disabled={loading} className="w-full py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition disabled:opacity-60">
            {loading ? 'Finalizing...' : 'Yes, Finalize Now'}
          </button>
          <button onClick={onClose} className="w-full py-2.5 text-slate-500 text-sm font-medium hover:bg-slate-100 rounded-lg">
            Not yet, go back
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Dispatch Modal ──────────────────────────────────────────────────────────
const DispatchModal = ({ onClose, onSave }: any) => {
  const [toOrgId, setToOrgId] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [qrs, setQrs] = useState<any[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [selectedQrIds, setSelectedQrIds] = useState<Set<string>>(new Set());
  const [orgs, setOrgs] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { orgsApi.getAll().then(setOrgs).catch(() => { }); }, []);

  const handleBatchSelect = async (batch: any) => {
    setSelectedBatch(batch);
    setQrLoading(true);
    setSelectedQrIds(new Set());
    try {
      const res = await inventoryApi.getBatchQRCodes(batch.id);
      setQrs(res || []);
    } catch {
      setQrs([]);
    } finally {
      setQrLoading(false);
    }
  };

  const toggleQr = (qrId: string, isMaster: boolean, children?: any[]) => {
    const next = new Set(selectedQrIds);
    if (next.has(qrId)) {
      next.delete(qrId);
      if (isMaster && children) {
        children.forEach(c => next.delete(c.id));
      }
    } else {
      next.add(qrId);
      if (isMaster && children) {
        children.forEach(c => next.add(c.id));
      }
    }
    setSelectedQrIds(next);
  };

  const handleDispatch = async () => {
    setError('');
    if (!toOrgId) { setError('Please select a destination organization.'); return; }
    if (selectedQrIds.size === 0) { setError('Please select at least one item to dispatch.'); return; }
    
    setLoading(true);
    try {
      await inventoryApi.createDispatch({ 
        toOrgId, 
        notes, 
        qrIds: Array.from(selectedQrIds) 
      });
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const hierarchicalOrgs = flattenOrgsHierarchy(orgs || []);

  return (
    <Modal title="Create Dispatch Order" onClose={onClose} size="lg">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Dispatch To" required>
            <select className={selectCls} value={toOrgId} onChange={e => setToOrgId(e.target.value)}>
              <option value="">Select destination…</option>
              {hierarchicalOrgs.map(({ org, depth }) => (
                <option key={org.id} value={org.id}>
                  {'\u00A0'.repeat(depth * 3)}{depth > 0 ? '└ ' : ''}{org.name} ({org.organizationType?.name})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Select Batch to Dispatch" required>
            <PredictiveBatchSelect onChange={handleBatchSelect} />
          </FormField>
        </div>

        {selectedBatch && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-500" /> 
                Inventory in {selectedBatch.batchCode}
              </h3>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {selectedQrIds.size} Selected
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30 max-h-[300px] overflow-y-auto custom-scrollbar">
              {qrLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs text-slate-400 font-medium italic">Scanning batch contents...</p>
                </div>
              ) : qrs.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-400 italic">No available QR codes found in this batch</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {qrs.map((qr) => (
                    <div key={qr.id}>
                      {/* Master or Standalone */}
                      <div 
                        onClick={() => toggleQr(qr.id, qr.qrType === 'MASTER_BOX', qr.children)}
                        className={`group px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors ${selectedQrIds.has(qr.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedQrIds.has(qr.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}>
                          {selectedQrIds.has(qr.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold font-mono ${selectedQrIds.has(qr.id) ? 'text-indigo-700' : 'text-slate-700'}`}>
                              #{qr.sequenceNumber || qr.sequence_number || 'N/A'}
                            </span>
                            {qr.qrType === 'MASTER_BOX' && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded uppercase tracking-tighter shadow-sm border border-indigo-200">BOX</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{qr.qrCode}</p>
                        </div>
                        {qr.children?.length > 0 && (
                          <span className="text-[10px] text-slate-400 font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">
                            {qr.children.length} Units
                          </span>
                        )}
                      </div>

                      {/* Children (if master) */}
                      {qr.children?.length > 0 && (
                        <div className="bg-slate-50/50 divide-y divide-slate-50">
                          {qr.children.map((child: any) => (
                            <div 
                              key={child.id}
                              onClick={() => toggleQr(child.id, false)}
                              className={`pl-12 pr-4 py-2 flex items-center gap-3 cursor-pointer transition-colors ${selectedQrIds.has(child.id) ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}
                            >
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selectedQrIds.has(child.id) ? (selectedQrIds.has(qr.id) ? 'bg-indigo-400 border-indigo-400' : 'bg-indigo-600 border-indigo-600') : 'bg-white border-slate-200'}`}>
                                {selectedQrIds.has(child.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <span className={`text-[11px] font-mono leading-none ${selectedQrIds.has(child.id) ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                                  #{child.sequenceNumber || child.sequence_number || 'N/A'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <FormField label="Dispatch Notes">
          <textarea 
            className={`${inputCls} min-h-[80px]`} 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            placeholder="Add any tracking numbers, vehicle details or special instructions…" 
          />
        </FormField>
      </div>

      <div className="flex items-center justify-between mt-8 pt-5 border-t border-slate-100">
        <p className="text-xs text-slate-500 italic">
          Total items selected for dispatch: <span className="font-bold text-slate-900 not-italic">{selectedQrIds.size}</span>
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancel</button>
          <button 
            onClick={handleDispatch} 
            disabled={loading || selectedQrIds.size === 0} 
            className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition disabled:opacity-50 disabled:grayscale shadow-lg shadow-slate-200"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Confirm Dispatch
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Receive Dispatch Modal ──────────────────────────────────────────────────
const ReceiveDispatchModal = ({ dispatch, onClose, onSave }: any) => {
  const [receivedItems, setReceivedItems] = useState<any[]>(
    dispatch.items?.map((it: any) => ({ itemId: it.id, receivedQuantity: it.quantityDispatched || it.quantity })) || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setQty = (id: string, qty: string) => {
    setReceivedItems(prev => prev.map(it => it.itemId === id ? { ...it, receivedQuantity: Number(qty) } : it));
  };

  const handleReceive = async () => {
    setError('');
    setLoading(true);
    try {
      await inventoryApi.receiveDispatch(dispatch.id, { receivedItems });
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Receive Dispatch — #${dispatch.id?.slice(0, 8)}…`} onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg border border-slate-200">
          From: <span className="font-medium">{dispatch.fromOrganization?.name}</span>
          <span className="mx-2 text-slate-400">→</span>
          To: <span className="font-medium">{dispatch.toOrganization?.name}</span>
        </div>
        <div className="space-y-3">
          {dispatch.items?.map((item: any, i: number) => (
            <div key={item.id} className="p-3 border border-slate-200 rounded-xl">
              <p className="text-xs font-semibold text-slate-500 mb-2">Batch #{i + 1}: {item.filmBatch?.batchCode}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-slate-500">
                  Dispatched: <span className="font-semibold text-slate-700">{item.quantityDispatched ?? item.quantity}</span>
                </div>
                <FormField label="Received Qty" required>
                  <input
                    type="number"
                    className={inputCls}
                    value={receivedItems.find(r => r.itemId === item.id)?.receivedQuantity ?? ''}
                    onChange={e => setQty(item.id, e.target.value)}
                    max={item.quantityDispatched ?? item.quantity}
                    min="0"
                  />
                </FormField>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
        <button onClick={handleReceive} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Confirm Receipt
        </button>
      </div>
    </Modal>
  );
};

// ─── Batches Tab ─────────────────────────────────────────────────────────────
const EditBatchModal = ({ batch, onClose, onSave }: { batch: any; onClose: () => void; onSave: () => void }) => {
  const [form, setForm] = useState({
    quantity: String(batch.quantity),
    packSize: batch.packSize || '',
    rollLength: batch.rollLength ? String(batch.rollLength) : '',
    rollWidth: batch.rollWidth ? String(batch.rollWidth) : '',
    arrivalDate: batch.arrivalDate ? new Date(batch.arrivalDate).toISOString().split('T')[0] : '',
    notes: batch.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const handleSave = async () => {
    setError(''); setLoading(true);
    try {
      await inventoryApi.updateBatch(batch.id, {
        ...form,
        quantity: Number(form.quantity),
        rollLength: batch.batchType === 'RAW_MATERIAL' ? Number(form.rollLength) : null,
        rollWidth: batch.batchType === 'RAW_MATERIAL' ? Number(form.rollWidth) : null,
      });
      onSave();
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };
  return (
    <Modal title={`Edit Batch — ${batch.batchCode}`} onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Quantity" required><input type="number" className={inputCls} value={form.quantity} onChange={e => set('quantity', e.target.value)} min="0" /></FormField>
          {batch.batchType === 'RAW_MATERIAL' ? (
            <>
              <FormField label="Roll Length (m)" required>
                <input type="number" className={inputCls} value={form.rollLength} onChange={e => set('rollLength', e.target.value)} placeholder="0" />
              </FormField>
              <FormField label="Roll Width (m)" required>
                <input type="number" className={inputCls} value={form.rollWidth} onChange={e => set('rollWidth', e.target.value)} placeholder="0" />
              </FormField>
            </>
          ) : (
            <FormField label="Pack Size"><input type="text" className={inputCls} value={form.packSize} onChange={e => set('packSize', e.target.value)} placeholder="e.g. 50pcs" /></FormField>
          )}
        </div>
        <FormField label="Arrival Date"><input type="date" className={inputCls} value={form.arrivalDate} onChange={e => set('arrivalDate', e.target.value)} /></FormField>
        <FormField label="Notes"><textarea className={inputCls} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" /></FormField>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition">Cancel</button>
        <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-[var(--color-accent)] text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-60">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
        </button>
      </div>
    </Modal>
  );
};

// ─── Inward Receipts Tab ─────────────────────────────────────────────────────────────
const AddReceiptModal = ({ onClose, onSave }: any) => {
  const [vendorId, setVendorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { orgsApi.getAll().then(d => setOrgs(Array.isArray(d) ? d : [])); }, []);

  const handleSave = async () => {
    setError('');
    if (!vendorId) { setError('Vendor is required'); return; }
    setLoading(true);
    try {
      const res = await inventoryApi.createInwardReceipt({ vendorId, invoiceNumber, receivedDate, notes });
      onSave(res);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const hierarchicalOrgs = flattenOrgsHierarchy(orgs || []);

  return (
    <Modal title="Add Inward Receipt" onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        <FormField label="Vendor / Supplier" required>
          <select className={selectCls} value={vendorId} onChange={e => setVendorId(e.target.value)}>
            <option value="">Select vendor…</option>
            {hierarchicalOrgs.map(({ org, depth }) => (
              <option key={org.id} value={org.id}>
                {'\u00A0'.repeat(depth * 3)}{depth > 0 ? '└ ' : ''}{org.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Invoice Number">
          <input className={inputCls} value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="e.g. INV-12345" />
        </FormField>
        <FormField label="Received Date" required>
          <input type="date" className={inputCls} value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
        </FormField>
        <FormField label="Notes">
          <textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </FormField>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
        <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-5 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg disabled:opacity-60">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save Receipt
        </button>
      </div>
    </Modal>
  );
};

const InwardReceiptsTab = ({ onReceiptClick, onAddStock }: { onReceiptClick?: (id: string) => void, onAddStock?: (id: string) => void }) => {
  const [data, setData] = useState<any>({ items: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [page] = useState(1);
  const [receiptCode, setReceiptCode] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [confirm, setConfirm] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: async () => { }, isLoading: false });
  const closeConfirm = () => setConfirm((p: any) => ({ ...p, isOpen: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getInwardReceipts({
        page,
        limit: 20,
        receiptCode: receiptCode || undefined,
        invoiceNumber: invoiceNumber || undefined,
      });
      setData(res);
    } catch { setData({ items: [], meta: {} }); }
    finally { setLoading(false); }
  }, [page, receiptCode, invoiceNumber]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className={`${inputCls} pl-9 w-40 sm:w-48`}
              placeholder="Receipt Code…"
              value={receiptCode}
              onChange={e => setReceiptCode(e.target.value)}
            />
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className={`${inputCls} pl-9 w-40 sm:w-48`}
              placeholder="Invoice Number…"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
            />
          </div>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200">
          <Plus className="w-4 h-4" /> Add Receipt
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.items?.length === 0 ? (
          <EmptyState icon={FileText} message="No inward receipts found" sub="Log an inward receipt to track vendor shipments" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Receipt Code', 'Vendor', 'Invoice No', 'Received Date', 'Linked Batches', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items?.map((r: any) => (
                <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.isDeleted ? 'bg-red-50/50 opacity-75' : ''}`}>
                  <td className="px-4 py-3.5"><span className="font-mono text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded">{r.receiptCode}</span></td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">{r.vendor?.name}</td>
                  <td className="px-4 py-3.5 text-slate-500">{r.invoiceNumber || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-500">{new Date(r.receivedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => onReceiptClick?.(r.id)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex items-center gap-1.5 shadow-sm border border-blue-100 group-hover:scale-105"
                    >
                      <Package2 className="w-3.5 h-3.5" />
                      {r.filmBatches?.length || 0} batches
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    {!r.isDeleted && (
                      <div className="flex items-center gap-1.5 focus-within:opacity-100">
                        <button
                          title="Add Stock Batches to this Receipt"
                          onClick={() => onAddStock?.(r.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setConfirm({
                              isOpen: true, title: 'Delete Receipt', message: `Delete receipt ${r.receiptCode}? Linked batches will not be deleted.`,
                              confirmLabel: 'Delete', variant: 'danger',
                              onConfirm: async () => {
                                setConfirm((p: any) => ({ ...p, isLoading: true, errorMessage: '' }));
                                try { await inventoryApi.deleteInwardReceipt(r.id); load(); closeConfirm(); }
                                catch (e: any) { setConfirm((p: any) => ({ ...p, isLoading: false, errorMessage: e.message })); }
                              }
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && <AddReceiptModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); load(); }} />}
      <ConfirmDialog {...confirm} onClose={closeConfirm} />
    </div>
  );
};

const BatchesTab = ({ initialReceiptId, onShowInward, onGoToWorkOrder }: { initialReceiptId?: string | null, onShowInward?: () => void, onGoToWorkOrder?: (code: string) => void }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>({ items: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [qrBatch, setQrBatch] = useState<any>(null);
  const [editBatch, setEditBatch] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [receiptFilterId, setReceiptFilterId] = useState(initialReceiptId || '');

  useEffect(() => {
    if (initialReceiptId) {
      setReceiptFilterId(initialReceiptId);
      setPage(1);
    }
  }, [initialReceiptId]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [confirm, setConfirm] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: async () => { }, isLoading: false });
  const closeConfirm = () => setConfirm((prev: any) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    inventoryApi.getInwardReceipts({ limit: 100 }).then(d => setReceipts(d.items || [])).catch(() => setReceipts([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getBatches({
        page, limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        inwardReceiptId: receiptFilterId || undefined
      });
      setData(res);
    } catch { setData({ items: [], meta: {} }); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, receiptFilterId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search batch code…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
            />
          </div>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]">
            <option value="">All Statuses</option>
            {Object.entries(BATCH_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <PredictiveReceiptSelect
            receipts={receipts}
            value={receiptFilterId}
            onChange={(id) => { setReceiptFilterId(id); setPage(1); }}
          />

          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowInward}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition active:scale-[0.98] shadow-lg shadow-slate-200"
          >
            <Plus className="w-4 h-4" /> Inward Procurement
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.items?.length === 0 ? (
          <EmptyState icon={Package} message="No batches found" sub="Log an inward entry to get started" />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Batch Code', 'Film Type', 'Inward Receipt', 'Qty', 'Dimensions', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items?.map((b: any) => (
                  <tr key={b.id} className={`group hover:bg-slate-50 transition-colors ${b.isDeleted ? 'bg-red-50/50 opacity-75 grayscale-[0.5]' : ''}`}>
                    <td className="px-4 py-3.5">
                      <span className={`font-mono text-xs px-2 py-1 rounded ${b.isDeleted ? 'bg-red-100 text-red-700 line-through' : 'bg-slate-100 text-slate-700'}`}>{b.batchCode}</span>
                      {b.isDeleted && <span className="ml-2 text-[10px] font-bold text-red-500 uppercase">Deleted</span>}
                    </td>
                    <td className={`px-4 py-3.5 font-medium ${b.isDeleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{b.filmType?.name}</td>
                    <td className={`px-4 py-3.5 ${b.isDeleted ? 'text-slate-400 line-through' : 'text-slate-600'}`}>
                      {b.inwardReceipt ? (
                        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {b.inwardReceipt.receiptCode}
                        </span>
                      ) : '—'}
                    </td>
                    <td className={`px-4 py-3.5 font-semibold ${b.isDeleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{b.quantity}</td>
                    <td className={`px-4 py-3.5 text-xs ${b.isDeleted ? 'text-slate-400 line-through' : 'text-slate-500'}`}>
                      {b.rollLength && b.rollWidth ? `${b.rollLength}m x ${b.rollWidth}m` : (b.packSize + ' count' || '—')}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={b.status} config={BATCH_STATUS_CONFIG} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!b.isDeleted ? (
                          <>
                            {(b.status === 'PACKAGED' || b.status === 'QR_APPLIED') && (
                              <button onClick={() => setQrBatch(b)} title="Generate QR Codes" className="p-1.5 text-slate-400 hover:text-[var(--color-accent)] hover:bg-[var(--color-accent)]/10 rounded-lg transition">
                                <QrCode className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setEditBatch(b)} title="Edit batch" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              title="View Work Orders for this Batch"
                              onClick={() => onGoToWorkOrder?.(b.batchCode)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <ClipboardList className="w-4 h-4" />
                            </button>
                            {!['IN_TRANSIT', 'AT_DISTRIBUTOR', 'AT_RETAILER'].includes(b.status) && (
                              <button
                                title="Delete batch"
                                onClick={() => {
                                  setConfirm({
                                    isOpen: true,
                                    title: 'Delete Batch',
                                    message: `Delete batch ${b.batchCode}? This will soft-delete the batch.`,
                                    confirmLabel: 'Delete',
                                    variant: 'danger',
                                    onConfirm: async () => {
                                      setConfirm((p: any) => ({ ...p, isLoading: true, errorMessage: '' }));
                                      try { await inventoryApi.deleteBatch(b.id); load(); closeConfirm(); }
                                      catch (e: any) { setConfirm((p: any) => ({ ...p, isLoading: false, errorMessage: e.message })); }
                                    }
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : user?.isSuperAdmin && (
                          <>
                            <button
                              title="Restore batch"
                              onClick={() => {
                                setConfirm({
                                  isOpen: true,
                                  title: 'Restore Batch',
                                  message: `Restore batch ${b.batchCode}?`,
                                  confirmLabel: 'Restore',
                                  variant: 'success',
                                  onConfirm: async () => {
                                    setConfirm((p: any) => ({ ...p, isLoading: true, errorMessage: '' }));
                                    try { await inventoryApi.restoreBatch(b.id); load(); closeConfirm(); }
                                    catch (e: any) { setConfirm((p: any) => ({ ...p, isLoading: false, errorMessage: e.message })); }
                                  }
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              title="Permanently Purge batch"
                              onClick={() => {
                                setConfirm({
                                  isOpen: true,
                                  title: 'Permanently Purge Batch',
                                  message: `PERMANENTLY delete batch ${b.batchCode}? This removes ALL child data and cannot be undone.`,
                                  confirmLabel: 'Purge',
                                  variant: 'danger',
                                  onConfirm: async () => {
                                    setConfirm((p: any) => ({ ...p, isLoading: true, errorMessage: '' }));
                                    try { await inventoryApi.purgeBatch(b.id); load(); closeConfirm(); }
                                    catch (e: any) { setConfirm((p: any) => ({ ...p, isLoading: false, errorMessage: e.message })); }
                                  }
                                });
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-100 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {data.meta?.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-500">
                  Page {data.meta.page} of {data.meta.totalPages} · {data.meta.total} total
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-50">Previous</button>
                  <button onClick={() => setPage(p => Math.min(data.meta.totalPages, p + 1))} disabled={page === data.meta.totalPages} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-50">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {qrBatch && <QRGenerateModal batch={qrBatch} onClose={() => setQrBatch(null)} onSave={() => { setQrBatch(null); load(); }} />}
      {editBatch && <EditBatchModal batch={editBatch} onClose={() => setEditBatch(null)} onSave={() => { setEditBatch(null); load(); }} />}
      <ConfirmDialog
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onClose={closeConfirm}
        isLoading={confirm.isLoading}
        variant={confirm.variant}
        confirmLabel={confirm.confirmLabel}
        errorMessage={confirm.errorMessage}
      />
    </div>
  );
};

// ─── Work Orders Tab ─────────────────────────────────────────────────────────
const WorkOrdersTab = ({ initialBatchSearch, onClearSearch }: { initialBatchSearch?: string | null, onClearSearch?: () => void }) => {
  const [data, setData] = useState<any>({ items: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState(initialBatchSearch || '');
  const [recordOutputWO, setRecordOutputWO] = useState<any>(null);
  const [finalizeWO, setFinalizeWO] = useState<any>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (initialBatchSearch) {
      setSearch(initialBatchSearch);
      setPage(1);
    }
  }, [initialBatchSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getWorkOrders({
        page,
        limit: 20,
        status: statusFilter || undefined,
        search: search || undefined
      });
      setData(res);
    } catch { setData({ items: [], meta: {} }); }
    finally { setLoading(false); }
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search Batch ID…"
            className="pl-9 pr-10 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white w-48 sm:w-64"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); onClearSearch?.(); }}
              className="p-1 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
          <option value="">All Statuses</option>
          {Object.entries(WO_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.items?.length === 0 ? (
          <EmptyState icon={ClipboardList} message="No work orders found" sub="Work orders are created automatically during inward procurement" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Work Order', 'Source (Raw)', 'Input Qty', 'Produced Qty', 'Wastage', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items?.map((wo: any) => {
                const src = wo.sourceFilmBatch;
                // Dimensions display logic for Input (Source)
                const inputDetails = src?.rollLength && src?.rollWidth
                  ? `${src.rollLength}m x ${src.rollWidth}m`
                  : (src?.packSize ? `${src.packSize} count` : '—');

                // For output, we look at outputs array summary
                const firstOut = wo.outputs?.[0]?.outputBatch;
                const outputDetails = firstOut?.rollLength && firstOut?.rollWidth
                  ? `${firstOut.rollLength}m x ${firstOut.rollWidth}m`
                  : (wo.outputs?.[0]?.packSize ? `${wo.outputs[0].packSize} count` : '—');

                return (
                  <tr key={wo.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-xs">{wo.workOrderType}</span>
                        <span className="text-[10px] text-slate-400 font-mono">#{wo.id?.slice(0, 8)}…</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50/50 px-1.5 py-0.5 rounded border border-indigo-100/50 w-fit">{src?.batchCode}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 font-medium">{src?.filmType?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-xs">{wo.inputQuantity} unit</span>
                        <span className="text-[10px] text-slate-500 font-medium italic">{inputDetails}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className={`font-bold text-xs ${wo.outputQuantity > 0 ? 'text-emerald-700' : 'text-slate-400 font-normal italic'}`}>
                          {wo.outputQuantity || 0} {wo.workOrderType === 'SLITTING' ? 'boxes' : (wo.outputQuantity === 1 ? 'unit' : 'units')}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium italic">{outputDetails}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {wo.wastageQuantity != null
                        ? <span className="text-amber-600 font-medium text-xs">{wo.wastageQuantity} {wo.workOrderType === 'SLITTING' ? 'units' : 'unit'}</span>
                        : <span className="text-slate-400 font-normal italic text-[10px]">Pending closure…</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={wo.status} config={WO_STATUS_CONFIG} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {wo.status !== 'CLOSED' && (
                          <button
                            onClick={() => setRecordOutputWO(wo)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                            title="Record partial output"
                          >
                            <PlusCircle className="w-3.5 h-3.5" /> Output
                          </button>
                        )}
                        {wo.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => setFinalizeWO(wo)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                            title="Finalize and close work order"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Finalize
                          </button>
                        )}
                        {wo.status === 'CLOSED' && (
                          <span className="text-xs text-slate-400 font-medium italic">Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {recordOutputWO && (
        <RecordOutputModal
          wo={recordOutputWO}
          onClose={() => setRecordOutputWO(null)}
          onSave={() => { setRecordOutputWO(null); load(); }}
        />
      )}

      {finalizeWO && (
        <FinalizeWOModal
          wo={finalizeWO}
          onClose={() => setFinalizeWO(null)}
          onSave={() => { setFinalizeWO(null); load(); }}
        />
      )}
    </div>
  );
};

// ─── Dispatch Tab ─────────────────────────────────────────────────────────────
const DispatchTab = () => {
  const [data, setData] = useState<any>({ items: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [receiveDispatch, setReceiveDispatch] = useState<any>(null);
  const [page, setPage] = useState(1);
  const { user } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getDispatches({ page, limit: 20, status: statusFilter || undefined });
      setData(res);
    } catch { setData({ items: [], meta: {} }); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const canReceive = (d: any) =>
    d.status === 'DISPATCHED' && d.toOrgId === user?.organizationId;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none">
            <option value="">All Statuses</option>
            {Object.entries(DISPATCH_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90">
          <Send className="w-4 h-4" /> Create Dispatch
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.items?.length === 0 ? (
          <EmptyState icon={Truck} message="No dispatch orders found" sub="Create a dispatch order to move stock" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Dispatch ID', 'From', 'To', 'Batches', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items?.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-slate-500">#{d.id?.slice(0, 8)}…</span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">{d.fromOrganization?.name}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />{d.toOrganization?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {d.items?.length > 0 ? (
                        d.items.map((item: any, idx: number) => (
                          <span key={idx} className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200" title={item.filmBatch?.batchCode}>
                            {item.filmBatch?.batchCode || 'Unknown'}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-xs">No batches</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {d.dispatchDate ? new Date(d.dispatchDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={d.status} config={DISPATCH_STATUS_CONFIG} />
                  </td>
                  <td className="px-4 py-3.5">
                    {canReceive(d) && (
                      <button
                        onClick={() => setReceiveDispatch(d)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <DispatchModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); load(); }} />}
      {receiveDispatch && <ReceiveDispatchModal dispatch={receiveDispatch} onClose={() => setReceiveDispatch(null)} onSave={() => { setReceiveDispatch(null); load(); }} />}
    </div>
  );
};

// ─── Stats Card ───────────────────────────────────────────────────────────────
const StatsCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shrink-0`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? '—'}</p>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'receipts', label: 'Inward Receipts', icon: FileText },
  { id: 'batches', label: 'Stock Batches', icon: Package },
  { id: 'workorders', label: 'Work Orders', icon: ClipboardList },
  { id: 'dispatch', label: 'Dispatch', icon: Truck },
];

export default function InventoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('');
  const [initialReceiptId, setInitialReceiptId] = useState<string | null>(null);
  const [initialBatchSearch, setInitialBatchSearch] = useState<string | null>(null);
  const [showInward, setShowInward] = useState(false);
  const [inwardInitialId, setInwardInitialId] = useState<string | null>(null);

  const orgType = (user?.organization as any)?.organizationType?.name || user?.organization?.type || '';
  const isHQ = orgType === 'parent' || orgType === 'internal' || user?.isSuperAdmin;

  const visibleTabs = TABS.filter(t => t.id !== 'receipts' || isHQ);

  useEffect(() => {
    setActiveTab(isHQ ? 'receipts' : 'batches');
  }, [isHQ]);

  const [stats, setStats] = useState({ receipts: 0, batches: 0, workOrders: 0, dispatches: 0, inTransit: 0 });

  const handleReceiptClick = (id: string) => {
    setInitialReceiptId(id);
    setActiveTab('batches');
  };

  const handleBatchToWorkOrder = (batchCode: string) => {
    setInitialBatchSearch(batchCode);
    setActiveTab('workorders');
  };

  const handleAddStock = (id: string) => {
    setInwardInitialId(id);
    setShowInward(true);
  };

  useEffect(() => {
    Promise.allSettled([
      inventoryApi.getInwardReceipts({ page: 1, limit: 1 }),
      inventoryApi.getBatches({ page: 1, limit: 1 }),
      inventoryApi.getWorkOrders({ page: 1, limit: 1 }),
      inventoryApi.getDispatches({ page: 1, limit: 1 }),
      inventoryApi.getBatches({ page: 1, limit: 1, status: 'IN_TRANSIT' }),
    ]).then(([r, b, w, d, t]) => {
      setStats({
        receipts: r.status === 'fulfilled' ? (r.value?.meta?.total ?? 0) : 0,
        batches: b.status === 'fulfilled' ? (b.value?.meta?.total ?? 0) : 0,
        workOrders: w.status === 'fulfilled' ? (w.value?.meta?.total ?? 0) : 0,
        dispatches: d.status === 'fulfilled' ? (d.value?.meta?.total ?? 0) : 0,
        inTransit: t.status === 'fulfilled' ? (t.value?.meta?.total ?? 0) : 0,
      });
    });
  }, []);

  return (
    <div className="min-h-full">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
            <p className="text-sm text-slate-500">Track film batches, work orders, QR codes, and dispatch operations</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {isHQ && <StatsCard icon={FileText} label="Inward Receipts" value={stats.receipts} color="bg-slate-600" />}
        <StatsCard icon={Package} label="Total Batches" value={stats.batches} color="bg-indigo-500" />
        <StatsCard icon={ClipboardList} label="Work Orders" value={stats.workOrders} color="bg-purple-500" />
        <StatsCard icon={Truck} label="Dispatch Orders" value={stats.dispatches} color="bg-blue-500" />
        <StatsCard icon={Zap} label="In Transit" value={stats.inTransit} color="bg-amber-500" />
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <TabBar tabs={visibleTabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'receipts' && <InwardReceiptsTab onReceiptClick={handleReceiptClick} onAddStock={handleAddStock} />}
        {activeTab === 'batches' && <BatchesTab initialReceiptId={initialReceiptId} onShowInward={() => { setInwardInitialId(null); setShowInward(true); }} onGoToWorkOrder={handleBatchToWorkOrder} />}
        {activeTab === 'workorders' && <WorkOrdersTab initialBatchSearch={initialBatchSearch} onClearSearch={() => setInitialBatchSearch(null)} />}
        {activeTab === 'dispatch' && <DispatchTab />}
      </div>

      {showInward && (
        <InwardProcurementModal
          initialInwardReceiptId={inwardInitialId}
          onClose={() => { setShowInward(false); setInwardInitialId(null); }}
          onSave={() => { setShowInward(false); setInwardInitialId(null); /* would need to refresh current tab context */ }}
        />
      )}
    </div>
  );
}
