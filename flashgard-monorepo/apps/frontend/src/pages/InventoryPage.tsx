import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Package, Plus, Search, Loader2, RefreshCw,
  Layers, ClipboardList, Truck, QrCode, X, AlertCircle, ChevronDown, ChevronRight, ChevronsUpDown,
  CheckCircle2, ArrowRight, Zap, RotateCcw, Check,
  Send, Edit2, Trash2, FileText, Package2, PlusCircle, Tag, Download, Save, FolderTree, PackageCheck, Copy, ExternalLink, Building2, Database
} from 'lucide-react';
import { inventoryApi, orgsApi, filmTypesApi, productTypesApi, materialCategoriesApi, filmCategoriesApi, materialsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatISTDate } from '../lib/dateUtils';

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

const PaginationBar = ({ meta, page, setPage }: { meta: any; page: number; setPage: (fn: any) => void }) => {
  if (!meta || !meta.totalPages || meta.totalPages <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs gap-3 shadow-sm my-2">
      <div className="flex items-center gap-2 text-slate-600 font-medium">
        <span>Showing Page <strong className="text-slate-900 font-bold">{meta.page || page}</strong> of <strong className="text-slate-900 font-bold">{meta.totalPages}</strong></span>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500 font-mono"><strong className="text-slate-800">{meta.total}</strong> total records</span>
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

const MultiPredictiveBatchSelect = ({ selectedBatches, onChange, statusFilter }: { 
  selectedBatches: any[];
  onChange: (batches: any[]) => void;
  statusFilter?: string;
}) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBatches = useCallback(async (querySearch: string) => {
    setLoading(true);
    try {
      let res = await inventoryApi.getBatches({ 
        search: querySearch || undefined, 
        status: statusFilter || 'PACKAGED,QR_APPLIED,IN_TRANSIT,AT_DISTRIBUTOR,AT_RETAILER,BULK_RECEIVED',
        limit: 100 
      });
      let items = res?.items || (Array.isArray(res) ? res : []);
      if (items.length === 0 && !querySearch) {
        res = await inventoryApi.getBatches({ limit: 100 });
        items = res?.items || (Array.isArray(res) ? res : []);
      }
      setResults(items);
    } catch { 
      setResults([]); 
    } finally { 
      setLoading(false); 
    }
  }, [statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchBatches(search), 200);
    return () => clearTimeout(t);
  }, [search, fetchBatches]);

  const toggleBatch = (b: any) => {
    const exists = selectedBatches.some((item: any) => item.id === b.id);
    if (exists) {
      onChange(selectedBatches.filter((item: any) => item.id !== b.id));
    } else {
      onChange([...selectedBatches, b]);
    }
  };

  const removeBatch = (batchId: string) => {
    onChange(selectedBatches.filter((b: any) => b.id !== batchId));
  };

  return (
    <div className="space-y-2 text-left">
      <div className="relative group">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 group-focus-within:text-[var(--color-accent)] transition-colors" />
        <input
          className={`${inputCls} pl-9 pr-10`}
          placeholder="Search packaged stock by code or film type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 absolute right-3 top-3" />}
      </div>

      {/* Selected Batch Tags */}
      {selectedBatches.length > 0 && (
        <div className="flex flex-wrap gap-1.5 py-1">
          {selectedBatches.map((b: any) => (
            <span 
              key={b.id} 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm"
            >
              <span className="font-mono">{b.batchCode}</span>
              <button 
                type="button"
                onClick={() => removeBatch(b.id)} 
                className="p-0.5 hover:bg-indigo-200/60 rounded transition-colors text-indigo-500 hover:text-indigo-800 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Always-visible scrollable batch checklist */}
      <div className="border border-slate-200 bg-white rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 shadow-inner custom-scrollbar">
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading packaged stock...
          </div>
        ) : results.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            No packaged stock batches found
          </div>
        ) : (
          results.map((b: any) => {
            const isSelected = selectedBatches.some((item: any) => item.id === b.id);
            return (
              <div
                key={b.id}
                onClick={() => toggleBatch(b)}
                className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between transition-colors hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-800">{b.batchCode}</span>
                      <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded">
                        {b.filmType?.name || 'Standard'}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Qty: {b.quantity} • Status: {b.status}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};


const PredictiveOrgSelect = ({
  hierarchicalOrgs,
  value,
  onChange,
  placeholder = "Select destination…"
}: {
  hierarchicalOrgs: { org: any; depth: number }[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedEntry = hierarchicalOrgs.find(item => item.org.id === value);
  const displayValue = selectedEntry ? selectedEntry.org.name : '';

  const filtered = hierarchicalOrgs.filter(item =>
    item.org.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.org.organizationType?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      <div className="relative group text-left">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-[var(--color-accent)] transition-colors" />
        <input
          className={`${inputCls} pl-9 pr-10`}
          placeholder={placeholder}
          value={isOpen ? search : displayValue}
          onFocus={() => { setIsOpen(true); setSearch(''); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onChange={e => setSearch(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setSearch(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 text-left">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 italic text-center">
              No matching organizations found
            </div>
          ) : (
            filtered.map(({ org, depth }) => (
              <div
                key={org.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(org.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm transition-colors flex justify-between items-center ${value === org.id ? 'bg-indigo-50/50 text-[var(--color-accent)] font-semibold' : 'text-slate-700'}`}
                style={{ paddingLeft: `${1 + depth * 0.75}rem` }}
              >
                <span className="truncate">
                  {depth > 0 ? '└ ' : ''}{org.name}
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2">
                  {org.organizationType?.name}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};


// ─── Searchable Hierarchical Flash Film Selector ──────────────────────────
const FlashProductSelector = ({ value, onChange, filmCategories = [] }: { value: string; onChange: (id: string) => void; materials?: any[]; filmCategories: any[]; materialCategories?: any[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Find selected film_category
  const selectedItem = useMemo(() => {
    if (!value) return null;
    const fc = filmCategories.find((f: any) => f.id === value);
    if (fc) return fc;
    return { id: value, name: value };
  }, [value, filmCategories]);

  // Build tree strictly from film_categories hierarchy (parentId -> id)
  const treeData = useMemo(() => {
    const getFilmCategoryNode = (fc: any): any => {
      const subFcNodes = (filmCategories || [])
        .filter((c: any) => c.parentId === fc.id)
        .map(getFilmCategoryNode);

      return {
        id: fc.id,
        name: fc.name,
        children: subFcNodes
      };
    };

    // Root film categories (where parentId is null/falsy)
    const rootFilmCategories = (filmCategories || []).filter((fc: any) => !fc.parentId);
    return rootFilmCategories.map(getFilmCategoryNode);
  }, [filmCategories]);

  const filteredTree = useMemo(() => {
    if (!search.trim()) return treeData;
    const q = search.toLowerCase().trim();

    const filterNodes = (nodes: any[]): any[] => {
      return nodes.map(node => {
        const nameMatch = node.name.toLowerCase().includes(q);
        const filteredChildren = node.children ? filterNodes(node.children).filter(Boolean) : [];
        if (nameMatch || filteredChildren.length > 0) {
          return {
            ...node,
            children: nameMatch ? node.children : filteredChildren
          };
        }
        return null;
      }).filter(Boolean);
    };

    return filterNodes(treeData);
  }, [treeData, search]);

  const renderTreeNodes = (nodes: any[], level = 0) => {
    return nodes.map((node: any) => {
      const isSelected = value === node.id;
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div key={node.id} className="py-0.5">
          <div
            onClick={() => {
              onChange(node.id);
              setIsOpen(false);
              setSearch('');
            }}
            style={{ paddingLeft: `${Math.max(level * 12, 6)}px` }}
            className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer text-xs transition ${
              isSelected
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 shadow-2xs'
                : 'hover:bg-slate-100 text-slate-700 font-medium'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <FolderTree className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{node.name}</span>
            </div>
            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
          </div>
          {hasChildren && (
            <div className="mt-0.5 space-y-0.5 border-l border-slate-200 ml-2.5 pl-1">
              {renderTreeNodes(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer text-xs hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
      >
        <span className="truncate font-medium text-slate-800">
          {selectedItem ? (
            <span>{selectedItem.name}</span>
          ) : (
            <span className="text-slate-400">Select Flash Film…</span>
          )}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute z-30 w-full min-w-[280px] left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
            <div className="p-2 border-b border-slate-100 bg-slate-50 relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-4 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search Flash Film..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-7 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-4 text-slate-400 hover:text-slate-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="overflow-y-auto p-1.5 max-h-64 custom-scrollbar text-xs">
              {filteredTree.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic text-xs">No Flash Films found</div>
              ) : (
                renderTreeNodes(filteredTree)
              )}
            </div>
          </div>
        </>
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

  const [searchReceipt, setSearchReceipt] = useState('');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const [materials, setMaterials] = useState<any[]>([]);
  const [filmCategories, setFilmCategories] = useState<any[]>([]);
  const [materialCategories, setMaterialCategories] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successItems, setSuccessItems] = useState<string[] | null>(null);

  const filteredReceipts = useMemo(() => {
    if (!searchReceipt) return receipts;
    return receipts.filter((r: any) => {
      const code = String(r.receiptCode || '').toLowerCase();
      const vendorName = String(r.vendor?.name || '').toLowerCase();
      const invoice = String(r.invoiceNumber || '').toLowerCase();
      const search = searchReceipt.toLowerCase();
      return code.includes(search) || vendorName.includes(search) || invoice.includes(search);
    });
  }, [receipts, searchReceipt]);

  const selectedReceipt = receipts.find((r: any) => r.id === inwardReceiptId);

  const loadReceipts = useCallback(() => {
    inventoryApi.getInwardReceipts({ limit: 100 }).then(d => setReceipts(d.items || [])).catch(() => setReceipts([]));
  }, []);

  useEffect(() => {
    Promise.all([
      materialsApi.getAll(undefined, undefined, false),
      filmCategoriesApi.getAll(undefined, undefined, false),
      materialCategoriesApi.getAll(undefined, undefined, false)
    ]).then(([mRes, fcRes, mcRes]) => {
      const mList = Array.isArray(mRes) ? mRes : ((mRes as any)?.items || []);
      const fcList = Array.isArray(fcRes) ? fcRes : ((fcRes as any)?.items || []);
      const mcList = Array.isArray(mcRes) ? mcRes : ((mcRes as any)?.items || []);
      setMaterials(mList);
      setFilmCategories(fcList);
      setMaterialCategories(mcList);
    }).catch(() => {
      setMaterials([]);
      setFilmCategories([]);
    });
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
          <div className="relative">
            <div 
              onClick={() => setIsReceiptOpen(!isReceiptOpen)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-[var(--color-accent)]/20 text-sm bg-white"
            >
              <span className="truncate">
                {inwardReceiptId ? (
                  `${selectedReceipt?.receiptCode} - ${selectedReceipt?.vendor?.name} (Inv: ${selectedReceipt?.invoiceNumber || 'N/A'}, Date: ${new Date(selectedReceipt?.receivedDate).toLocaleDateString()})`
                ) : 'Select receipt...'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            {isReceiptOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsReceiptOpen(false)} />
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-slate-100 bg-white">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Search receipts..."
                      value={searchReceipt}
                      onChange={e => setSearchReceipt(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
                    {filteredReceipts.map((r: any) => (
                      <div
                        key={r.id}
                        onClick={() => { setInwardReceiptId(r.id); setIsReceiptOpen(false); setSearchReceipt(''); }}
                        className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-slate-50 ${inwardReceiptId === r.id ? 'bg-indigo-50 text-[var(--color-accent)] font-bold' : 'text-slate-700'}`}
                      >
                        {r.receiptCode} - {r.vendor?.name} (Inv: {r.invoiceNumber || 'N/A'}, Date: {new Date(r.receivedDate).toLocaleDateString()})
                      </div>
                    ))}
                    {filteredReceipts.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">No results found</div>}
                  </div>
                </div>
              </>
            )}
          </div>
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
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-tight mb-1">Flash Film *</label>
                    <FlashProductSelector
                      value={item.filmTypeId}
                      onChange={v => updateItem(item.id, 'filmTypeId', v)}
                      materials={materials}
                      filmCategories={filmCategories}
                      materialCategories={materialCategories}
                    />
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
      const items = data || [];
      setQrs(items);
      const allIds = new Set<string>();
      items.forEach((item: any) => {
        allIds.add(item.id);
        if (item.children) {
          item.children.forEach((c: any) => allIds.add(c.id));
        }
      });
      setSelectedQrs(allIds);
    } catch (e: any) {
      console.error('Failed to load QRs:', e);
    } finally {
      setFetchingQrs(false);
    }
  }, [batch.id]);

  const totalAllItems = useMemo(() => {
    return qrs.reduce((acc, q) => acc + 1 + (q.children?.length || 0), 0);
  }, [qrs]);

  const handleSelectAll = () => {
    const next = new Set<string>();
    qrs.forEach((item: any) => {
      next.add(item.id);
      if (item.children) {
        item.children.forEach((c: any) => next.add(c.id));
      }
    });
    setSelectedQrs(next);
  };

  const handleDeselectAll = () => {
    setSelectedQrs(new Set());
  };

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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch Details</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-medium">Batch Code</span>
                <span className="font-mono text-sm font-bold text-slate-800">{batch.batchCode}</span>
              </div>
              {batch.legacyId && (
                <>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 font-medium">Legacy ID</span>
                    <span className="font-mono text-sm font-bold text-amber-700">#{batch.legacyId}</span>
                  </div>
                </>
              )}
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-medium">Film Type</span>
                <span className="text-sm font-bold text-slate-800">{batch.filmType?.name || '—'}</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-medium">Total Stock</span>
                <span className="text-sm font-bold text-slate-800">{batch.quantity} units</span>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-medium">Allocated QRs</span>
                <span className="text-sm font-bold text-indigo-600">{qrs.length} codes</span>
              </div>
            </div>
          </div>
          <StatusBadge status={batch.status} config={BATCH_STATUS_CONFIG} />
        </div>

        {/* Generator Section / Legacy Info Banner */}
        {batch.legacyId ? (
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 border border-amber-200">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">Legacy Migrated Batch (SQL Server ID #{batch.legacyId})</p>
                <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
                  Total batch stock size: <strong>{batch.quantity} units</strong> · Allocated QR codes in legacy database: <strong>{qrs.length} codes</strong>. QR generation is disabled for migrated legacy records.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-200/70 text-amber-900 text-xs font-bold rounded-lg border border-amber-300/60 shrink-0">
              Legacy Record
            </span>
          </div>
        ) : (
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
        )}

        {/* Hierarchy List Section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-400" /> Allocated QR Codes 
              <span className="ml-1 text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                {totalAllItems} Total
              </span>
            </h3>
            <div className="flex items-center gap-3">
              {qrs.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition cursor-pointer"
                  >
                    Select All ({totalAllItems})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={handleDeselectAll}
                    className="text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded transition cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>
              )}
              {fetchingQrs && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            </div>
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
                            className={`p-1 rounded hover:bg-slate-200 transition ${!hasChildren ? 'opacity-0 cursor-default' : 'text-slate-500'}`}
                            title={isExpanded ? 'Collapse box contents' : 'Expand box contents'}
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
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
  const allSelected: any[] = useMemo(() => {
    const list: any[] = [];
    items.forEach((item) => {
      const seq = item.sequenceNumber || item.sequence_number || 'N/A';
      if (selectedIds.has(item.id)) {
        list.push({ ...item, displayTag: `${item.qrType === 'MASTER_BOX' ? 'B-' : 'I-'}${batchCode} #${seq}` });
      }

      if (item.children) {
        item.children.forEach((child: any) => {
          const cSeq = child.sequenceNumber || child.sequence_number || 'N/A';
          if (selectedIds.has(child.id)) {
            list.push({ ...child, displayTag: `I-${batchCode} #${cSeq}` });
          }
        });
      }
    });
    return list;
  }, [items, selectedIds, batchCode]);

  if (allSelected.length === 0) return null;

  return createPortal(
    <div id="printable-qr-section" className="hidden print:block">
      <style>{`
        @media print {
          @page { 
            size: 35mm 35mm; 
            margin: 0; 
          }
          body > *:not(#printable-qr-section) { 
            display: none !important; 
          }
          #printable-qr-section { 
            display: block !important; 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 35mm !important; 
            height: auto !important;
            z-index: 999999 !important; 
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-container {
            display: block !important;
            width: 35mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .sticker-item {
            height: 35mm !important;
            width: 35mm !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 1.5mm !important;
            border: 1px dashed #e2e8f0 !important;
            break-after: page !important;
            page-break-after: always !important;
            page-break-inside: avoid !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            position: relative !important;
            background: white !important;
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
    </div>,
    document.body
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
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Batch Code</th>
                    <th className="px-4 py-2">Quantity</th>
                    <th className="px-4 py-2">Dimensions/Pack</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wo.outputs.map((out: any, idx: number) => (
                    <tr key={out.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2 font-bold text-slate-400 text-xs">{idx + 1}</td>
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
  const { user } = useAuth();
  const [fromOrgId, setFromOrgId] = useState(user?.organizationId || '');
  const [toOrgId, setToOrgId] = useState('');
  const [selectedBatches, setSelectedBatches] = useState<any[]>([]);
  const [qrs, setQrs] = useState<any[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [selectedQrIds, setSelectedQrIds] = useState<Set<string>>(new Set());
  const [expandedBoxes, setExpandedBoxes] = useState<Set<string>>(new Set());
  const [orgs, setOrgs] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { 
    orgsApi.getAll().then((res: any[]) => {
      setOrgs(res || []);
      if (!fromOrgId && res?.length > 0) {
        const hq = res.find((o: any) => !o.parentId || o.organizationType?.name === 'parent' || o.organizationType?.name === 'internal') || res[0];
        if (hq) setFromOrgId(hq.id);
      }
    }).catch(() => { }); 
  }, []);

  const handleBatchesChange = async (batches: any[]) => {
    setSelectedBatches(batches);
    if (batches.length === 0) {
      setQrs([]);
      setSelectedQrIds(new Set());
      return;
    }

    setQrLoading(true);
    try {
      const allResults = await Promise.all(
        batches.map(b => 
          inventoryApi.getBatchQRCodes(b.id).then(res => (res || []).map((q: any) => ({ ...q, batchCode: b.batchCode })))
        )
      );
      const combined = allResults.flat();
      setQrs(combined);
      
      // Auto-select QRs for newly selected batches
      const nextSelected = new Set<string>(selectedQrIds);
      combined.forEach((q: any) => {
        nextSelected.add(q.id);
        if (q.children) q.children.forEach((c: any) => nextSelected.add(c.id));
      });
      setSelectedQrIds(nextSelected);
    } catch {
      setQrs([]);
    } finally {
      setQrLoading(false);
    }
  };

  const toggleBoxExpand = (qrId: string) => {
    setExpandedBoxes(prev => {
      const next = new Set(prev);
      if (next.has(qrId)) next.delete(qrId); else next.add(qrId);
      return next;
    });
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
    if (selectedBatches.length === 0) { setError('Please select at least one batch to dispatch.'); return; }
    
    setLoading(true);
    try {
      await inventoryApi.createDispatch({ 
        fromOrgId: fromOrgId || undefined,
        toOrgId, 
        notes, 
        qrIds: selectedQrIds.size > 0 ? Array.from(selectedQrIds) : undefined,
        items: selectedBatches.map((b: any) => ({
          batchId: b.id,
          quantity: b.quantity || 1,
        }))
      });
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const hierarchicalOrgs = flattenOrgsHierarchy(orgs || []);
  const canSubmitDispatch = !loading && !!toOrgId && selectedBatches.length > 0;
  const displayDispatchCount = selectedQrIds.size > 0 ? selectedQrIds.size : selectedBatches.reduce((acc, b) => acc + (b.quantity || 1), 0);

  return (
    <Modal title="Create Dispatch Order" onClose={onClose} size="lg">
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Dispatch From (Origin)" required>
            <PredictiveOrgSelect
              hierarchicalOrgs={hierarchicalOrgs}
              value={fromOrgId}
              onChange={setFromOrgId}
              placeholder="Search or select origin..."
            />
          </FormField>

          <FormField label="Dispatch To (Destination)" required>
            <PredictiveOrgSelect
              hierarchicalOrgs={hierarchicalOrgs}
              value={toOrgId}
              onChange={setToOrgId}
              placeholder="Search or select destination…"
            />
          </FormField>
        </div>

        <FormField label="Select Batches to Dispatch" required>
          <MultiPredictiveBatchSelect selectedBatches={selectedBatches} onChange={handleBatchesChange} />
        </FormField>

        {selectedBatches.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-indigo-500" /> 
                Inventory across {selectedBatches.length} Batch{selectedBatches.length !== 1 ? 'es' : ''}
              </h3>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {selectedBatches.length} Batch{selectedBatches.length !== 1 ? 'es' : ''} ({selectedBatches.reduce((acc, b) => acc + (b.quantity || 1), 0)} Units{selectedQrIds.size > 0 ? ` • ${selectedQrIds.size} QRs` : ''})
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30 max-h-[300px] overflow-y-auto custom-scrollbar">
              {qrLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <p className="text-xs text-slate-400 font-medium italic">Scanning batch contents...</p>
                </div>
              ) : qrs.length === 0 ? (
                <div className="py-6 px-4 text-center space-y-2">
                  <div className="inline-flex items-center justify-center p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Direct Batch Dispatch (Packaged Stock)</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    The selected batch(es) contain packaged stock without individual QR codes. The batch quantity ({selectedBatches.reduce((acc, b) => acc + (b.quantity || 1), 0)} units) will be dispatched directly upon confirmation.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {qrs.map((qr) => {
                    const isMaster = qr.qrType === 'MASTER_BOX';
                    const hasChildren = qr.children?.length > 0;
                    const isExpanded = expandedBoxes.has(qr.id);

                    return (
                      <div key={qr.id}>
                        {/* Master or Standalone */}
                        <div 
                          className={`group px-4 py-3 flex items-center gap-3 transition-colors ${selectedQrIds.has(qr.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                        >
                          <div 
                            onClick={() => toggleQr(qr.id, isMaster, qr.children)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedQrIds.has(qr.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}
                          >
                            {selectedQrIds.has(qr.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>

                          {isMaster && (
                            <button
                              type="button"
                              disabled={!hasChildren}
                              onClick={() => toggleBoxExpand(qr.id)}
                              className={`p-1 rounded hover:bg-slate-200 transition ${!hasChildren ? 'opacity-0 cursor-default' : 'text-slate-500'}`}
                              title={isExpanded ? 'Collapse box' : 'Expand box'}
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </button>
                          )}

                          <div 
                            onClick={() => toggleQr(qr.id, isMaster, qr.children)}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold font-mono ${selectedQrIds.has(qr.id) ? 'text-indigo-700' : 'text-slate-700'}`}>
                                #{qr.sequenceNumber || qr.sequence_number || 'N/A'}
                              </span>
                              {isMaster && (
                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded uppercase tracking-tighter shadow-sm border border-indigo-200">BOX</span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded">
                                {qr.batchCode}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{qr.qrCode}</p>
                          </div>
                          {hasChildren && (
                            <span className="text-[10px] text-slate-400 font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">
                              {qr.children.length} Units
                            </span>
                          )}
                        </div>

                        {/* Children (if master & expanded) */}
                        {isMaster && hasChildren && isExpanded && (
                          <div className="bg-slate-50/70 divide-y divide-slate-100 border-t border-slate-100 animate-in slide-in-from-top-1 duration-150">
                            {qr.children.map((child: any) => (
                              <div 
                                key={child.id}
                                onClick={() => toggleQr(child.id, false)}
                                className={`pl-14 pr-4 py-2 flex items-center gap-3 cursor-pointer transition-colors ${selectedQrIds.has(child.id) ? 'bg-indigo-50/40' : 'hover:bg-white'}`}
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selectedQrIds.has(child.id) ? (selectedQrIds.has(qr.id) ? 'bg-indigo-400 border-indigo-400' : 'bg-indigo-600 border-indigo-600') : 'bg-white border-slate-200'}`}>
                                  {selectedQrIds.has(child.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1">
                                  <span className={`text-[11px] font-mono leading-none ${selectedQrIds.has(child.id) ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                                    #{child.sequenceNumber || child.sequence_number || 'N/A'}
                                  </span>
                                  <span className="ml-2 font-mono text-[10px] text-slate-400 truncate">{child.qrCode}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-6 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition">Cancel</button>
          <button 
            onClick={handleDispatch} 
            disabled={!canSubmitDispatch} 
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-100 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Confirm Dispatch ({displayDispatchCount} {displayDispatchCount === 1 ? 'Unit' : 'Units'})
          </button>
        </div>
      </div>
    </Modal>
  );
};


// ─── Return Stock Modal ──────────────────────────────────────────────────────
const ReturnStockModal = ({ onClose, onSave }: { onClose: () => void; onSave: () => void }) => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [fromOrgId, setFromOrgId] = useState('');
  const [toOrgId, setToOrgId] = useState('');
  const [selectedBatches, setSelectedBatches] = useState<any[]>([]);
  const [selectedQrIds, setSelectedQrIds] = useState<Set<string>>(new Set());
  const [qrs, setQrs] = useState<any[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [expandedBoxes, setExpandedBoxes] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('[STOCK RETURN] Returned stock to HQ for inventory reconciliation.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => { 
    orgsApi.getAll().then((res: any[]) => {
      setOrgs(res || []);
      // Auto-preselect HQ as destination
      const hq = res?.find((o: any) => !o.parentId || o.organizationType?.name === 'parent' || o.organizationType?.name === 'internal' || o.organizationType?.name === 'HQ') || res?.[0];
      if (hq) setToOrgId(hq.id);

      // Auto-preselect current user's org as origin
      if (user?.organizationId) {
        setFromOrgId(user.organizationId);
      } else if (res?.length > 0) {
        const myOrg = res.find((o: any) => o.id === user?.organizationId) || res.find((o: any) => o.id !== hq?.id) || res[0];
        setFromOrgId(myOrg.id);
      }
    }).catch(() => { }); 
  }, [user]);

  const handleBatchesChange = async (batches: any[]) => {
    setSelectedBatches(batches);
    if (batches.length === 0) {
      setQrs([]);
      setSelectedQrIds(new Set());
      return;
    }

    setQrLoading(true);
    try {
      const allResults = await Promise.all(
        batches.map(b => 
          inventoryApi.getBatchQRCodes(b.id).then(res => (res || []).map((q: any) => ({ ...q, batchCode: b.batchCode })))
        )
      );
      const combined = allResults.flat();
      setQrs(combined);
      
      const nextSelected = new Set<string>(selectedQrIds);
      combined.forEach((q: any) => {
        nextSelected.add(q.id);
        if (q.children) q.children.forEach((c: any) => nextSelected.add(c.id));
      });
      setSelectedQrIds(nextSelected);
    } catch {
      setQrs([]);
    } finally {
      setQrLoading(false);
    }
  };

  const toggleBoxExpand = (qrId: string) => {
    setExpandedBoxes(prev => {
      const next = new Set(prev);
      if (next.has(qrId)) next.delete(qrId); else next.add(qrId);
      return next;
    });
  };

  const toggleQr = (qrId: string, isMaster: boolean, children?: any[]) => {
    const next = new Set(selectedQrIds);
    if (next.has(qrId)) {
      next.delete(qrId);
      if (isMaster && children) children.forEach(c => next.delete(c.id));
    } else {
      next.add(qrId);
      if (isMaster && children) children.forEach(c => next.add(c.id));
    }
    setSelectedQrIds(next);
  };

  const handleReturn = async () => {
    setError('');
    if (!toOrgId) { setError('Please select HQ / destination organization.'); return; }
    if (selectedBatches.length === 0) { setError('Please select at least one batch to return.'); return; }
    
    setLoading(true);
    try {
      await inventoryApi.createDispatch({ 
        fromOrgId: fromOrgId || undefined,
        toOrgId, 
        notes: notes.includes('[STOCK RETURN]') ? notes : `[STOCK RETURN] ${notes}`, 
        qrIds: selectedQrIds.size > 0 ? Array.from(selectedQrIds) : undefined,
        items: selectedBatches.map((b: any) => ({
          batchId: b.id,
          quantity: b.quantity || 1,
        }))
      });
      onSave();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const hierarchicalOrgs = flattenOrgsHierarchy(orgs || []);
  const canSubmitReturn = !loading && !!toOrgId && selectedBatches.length > 0;
  const displayReturnCount = selectedQrIds.size > 0 ? selectedQrIds.size : selectedBatches.reduce((acc, b) => acc + (b.quantity || 1), 0);

  return (
    <Modal title="Return Stock to HQ / Parent" onClose={onClose} size="lg">
      <div className="space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <RotateCcw className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold">Stock Return / Recall Mode</p>
            <p className="mt-0.5 text-amber-800">
              Returning selected stock back to HQ. Once confirmed, returned items will enter transit status until HQ receives and restores them into parent stock.
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField label="Return From (Origin Store / Branch)" required>
            <PredictiveOrgSelect
              hierarchicalOrgs={hierarchicalOrgs}
              value={fromOrgId}
              onChange={setFromOrgId}
              placeholder="Search or select origin branch..."
            />
          </FormField>

          <FormField label="Return To (HQ / Parent Destination)" required>
            <PredictiveOrgSelect
              hierarchicalOrgs={hierarchicalOrgs}
              value={toOrgId}
              onChange={setToOrgId}
              placeholder="Preselected HQ destination..."
            />
          </FormField>
        </div>

        <FormField label="Select Dispatched Stock Batches to Return" required>
          <MultiPredictiveBatchSelect 
            selectedBatches={selectedBatches} 
            onChange={handleBatchesChange} 
            statusFilter="AT_DISTRIBUTOR,AT_RETAILER,IN_TRANSIT" 
          />
        </FormField>

        {selectedBatches.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-600" /> 
                Selected {selectedBatches.length} Batch{selectedBatches.length !== 1 ? 'es' : ''} for Return
              </h3>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {selectedBatches.length} Batch{selectedBatches.length !== 1 ? 'es' : ''} ({selectedBatches.reduce((acc, b) => acc + (b.quantity || 1), 0)} Units{selectedQrIds.size > 0 ? ` • ${selectedQrIds.size} QRs` : ''})
              </span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-amber-50/20 max-h-[280px] overflow-y-auto custom-scrollbar">
              {qrLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                  <p className="text-xs text-slate-400 font-medium italic">Scanning return batch contents...</p>
                </div>
              ) : qrs.length === 0 ? (
                <div className="py-6 px-4 text-center space-y-2">
                  <div className="inline-flex items-center justify-center p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Direct Stock Return (Packaged Stock)</p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    The selected batch(es) contain packaged stock without individual QR codes. The batch quantity ({selectedBatches.reduce((acc, b) => acc + (b.quantity || 1), 0)} units) will be returned directly upon confirmation.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {qrs.map((qr) => {
                    const isMaster = qr.qrType === 'MASTER_BOX';
                    const hasChildren = qr.children?.length > 0;
                    const isExpanded = expandedBoxes.has(qr.id);

                    return (
                      <div key={qr.id}>
                        <div className={`group px-4 py-3 flex items-center gap-3 transition-colors ${selectedQrIds.has(qr.id) ? 'bg-amber-50/60' : 'hover:bg-slate-50'}`}>
                          <div 
                            onClick={() => toggleQr(qr.id, isMaster, qr.children)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${selectedQrIds.has(qr.id) ? 'bg-amber-600 border-amber-600' : 'bg-white border-slate-300 group-hover:border-slate-400'}`}
                          >
                            {selectedQrIds.has(qr.id) && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>

                          {isMaster && (
                            <button
                              type="button"
                              disabled={!hasChildren}
                              onClick={() => toggleBoxExpand(qr.id)}
                              className={`p-1 rounded hover:bg-slate-200 transition ${!hasChildren ? 'opacity-0 cursor-default' : 'text-slate-500'}`}
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-600" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </button>
                          )}

                          <div 
                            onClick={() => toggleQr(qr.id, isMaster, qr.children)}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold font-mono ${selectedQrIds.has(qr.id) ? 'text-amber-800' : 'text-slate-700'}`}>
                                #{qr.sequenceNumber || qr.sequence_number || 'N/A'}
                              </span>
                              {isMaster && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black rounded uppercase tracking-tighter border border-amber-200">BOX</span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded">
                                {qr.batchCode}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">{qr.qrCode}</p>
                          </div>
                          {hasChildren && (
                            <span className="text-[10px] text-slate-400 font-bold bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                              {qr.children.length} Units
                            </span>
                          )}
                        </div>

                        {isMaster && hasChildren && isExpanded && (
                          <div className="bg-slate-50/70 divide-y divide-slate-100 border-t border-slate-100">
                            {qr.children.map((child: any) => (
                              <div 
                                key={child.id}
                                onClick={() => toggleQr(child.id, false)}
                                className={`pl-14 pr-4 py-2 flex items-center gap-3 cursor-pointer transition-colors ${selectedQrIds.has(child.id) ? 'bg-amber-50/30' : 'hover:bg-white'}`}
                              >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selectedQrIds.has(child.id) ? 'bg-amber-600 border-amber-600' : 'bg-white border-slate-200'}`}>
                                  {selectedQrIds.has(child.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                                <div className="flex-1">
                                  <span className={`text-[11px] font-mono leading-none ${selectedQrIds.has(child.id) ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>
                                    #{child.sequenceNumber || child.sequence_number || 'N/A'}
                                  </span>
                                  <span className="ml-2 font-mono text-[10px] text-slate-400 truncate">{child.qrCode}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <FormField label="Return Reason / Remarks">
          <textarea 
            className={`${inputCls} min-h-[80px]`} 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            placeholder="Add reason for return, defect details, or inventory reconciliation notes…" 
          />
        </FormField>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button onClick={onClose} className="px-6 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl transition cursor-pointer">Cancel</button>
          <button 
            onClick={handleReturn} 
            disabled={!canSubmitReturn} 
            className="flex items-center gap-2 px-6 py-2 bg-amber-600 text-white text-sm font-bold rounded-xl hover:bg-amber-700 transition disabled:opacity-50 shadow-md shadow-amber-100 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Confirm Stock Return ({displayReturnCount} {displayReturnCount === 1 ? 'Unit' : 'Units'})
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

  const [searchVendor, setSearchVendor] = useState('');
  const [isVendorOpen, setIsVendorOpen] = useState(false);

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

  const vendors = flattenOrgsHierarchy(orgs || []).filter(({ org }) => {
    const typeStr = (org.type || org.organizationType?.name || '').toLowerCase();
    return typeStr === 'vendor' || typeStr === 'supplier';
  });

  const filteredVendors = useMemo(() => {
    if (!searchVendor) return vendors;
    return vendors.filter(({ org }) => org.name.toLowerCase().includes(searchVendor.toLowerCase()));
  }, [vendors, searchVendor]);

  const selectedVendor = vendors.find(({ org }) => org.id === vendorId);

  return (
    <Modal title="Add Inward Receipt" onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
        <FormField label="Vendor / Supplier" required>
          <div className="relative">
            <div 
              onClick={() => setIsVendorOpen(!isVendorOpen)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-[var(--color-accent)]/20 text-sm"
            >
              <span className="truncate">
                {vendorId ? (selectedVendor?.org?.name || 'Unknown') : 'Select vendor...'}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
            {isVendorOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsVendorOpen(false)} />
                <div className="absolute z-25 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-slate-100 bg-white">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Search vendors..."
                      value={searchVendor}
                      onChange={e => setSearchVendor(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
                    {filteredVendors.map(({ org, depth }) => (
                      <div
                        key={org.id}
                        onClick={() => { setVendorId(org.id); setIsVendorOpen(false); setSearchVendor(''); }}
                        className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer hover:bg-slate-50 ${vendorId === org.id ? 'bg-indigo-50 text-[var(--color-accent)] font-bold' : 'text-slate-700'}`}
                      >
                        {!searchVendor ? (
                          <span className="whitespace-pre truncate">
                            {'\u00A0'.repeat(depth * 3)}
                            {depth > 0 ? '↳ ' : ''}
                            {org.name}
                          </span>
                        ) : (
                          <span className="truncate">{org.name}</span>
                        )}
                      </div>
                    ))}
                    {filteredVendors.length === 0 && <div className="p-3 text-xs text-slate-400 text-center">No results found</div>}
                  </div>
                </div>
              </>
            )}
          </div>
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

const InwardReceiptsTab = ({ onReceiptClick, onAddStock, refreshKey }: { onReceiptClick?: (id: string) => void, onAddStock?: (id: string) => void, refreshKey?: number }) => {
  const [data, setData] = useState<any>({ items: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
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

  useEffect(() => { load(); }, [load, refreshKey]);

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

      {/* Top Pagination Bar */}
      <PaginationBar meta={data.meta} page={page} setPage={setPage} />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.items?.length === 0 ? (
          <EmptyState icon={FileText} message="No inward receipts found" sub="Log an inward receipt to track vendor shipments" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#', 'Receipt Code', 'Vendor', 'Invoice No', 'Received Date', 'Linked Batches', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items?.map((r: any, idx: number) => (
                <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.isDeleted ? 'bg-red-50/50 opacity-75' : ''}`}>
                  <td className="px-4 py-3.5 font-bold text-slate-400 text-xs font-mono">{((page || 1) - 1) * (data.meta?.limit || 20) + idx + 1}</td>
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

      {/* Bottom Pagination Bar */}
      <PaginationBar meta={data.meta} page={page} setPage={setPage} />

      {showAdd && <AddReceiptModal onClose={() => setShowAdd(false)} onSave={() => { setShowAdd(false); load(); }} />}
      <ConfirmDialog {...confirm} onClose={closeConfirm} />
    </div>
  );
};

const BatchesTab = ({ initialReceiptId, onShowInward, onGoToWorkOrder, refreshKey }: { initialReceiptId?: string | null, onShowInward?: () => void, onGoToWorkOrder?: (code: string) => void, refreshKey?: number }) => {
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
  }, [refreshKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getBatches({
        page, limit: 20,
        search: search || undefined,
        status: statusFilter || 'BULK_RECEIVED,RAW_MATERIAL',
        inwardReceiptId: receiptFilterId || undefined
      });
      setData(res);
    } catch { setData({ items: [], meta: {} }); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, receiptFilterId]);

  useEffect(() => { load(); }, [load, refreshKey]);

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
            <option value="">All Stock Batches (Bulk & Raw)</option>
            <option value="BULK_RECEIVED">Bulk Received</option>
            <option value="RAW_MATERIAL">Raw Material</option>
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

      {/* Top Pagination Bar */}
      <PaginationBar meta={data.meta} page={page} setPage={setPage} />

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
                  {['#', 'Batch Code', 'Film Type', 'Inward Receipt', 'Qty', 'Dimensions', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items?.map((b: any, idx: number) => (
                  <tr key={b.id} className={`group hover:bg-slate-50 transition-colors ${b.isDeleted ? 'bg-red-50/50 opacity-75 grayscale-[0.5]' : ''}`}>
                    <td className="px-4 py-3.5 font-bold text-slate-400 text-xs font-mono">{((page || 1) - 1) * (data.meta?.limit || 20) + idx + 1}</td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => setQrBatch(b)}
                        title="Click to view complete batch details & QR hierarchy"
                        className="flex flex-col gap-0.5 text-left group/batch cursor-pointer"
                      >
                        <span className={`font-mono text-xs px-2 py-1 rounded transition flex items-center gap-1.5 w-fit ${b.isDeleted ? 'bg-red-100 text-red-700 line-through' : 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/80 group-hover/batch:bg-indigo-600 group-hover/batch:text-white shadow-sm'}`}>
                          <Package className="w-3.5 h-3.5" />
                          {b.batchCode}
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover/batch:opacity-100" />
                        </span>
                        {b.isDeleted && <span className="text-[10px] font-bold text-red-500 uppercase">Deleted</span>}
                        {b.legacyId && <span className="text-[10px] text-slate-400 font-mono">Legacy ID: {b.legacyId}</span>}
                      </button>
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
          </>
        )}
      </div>

      {/* Bottom Pagination Bar */}
      <PaginationBar meta={data.meta} page={page} setPage={setPage} />

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

      {/* Top Pagination Bar */}
      <PaginationBar meta={data.meta} page={page} setPage={setPage} />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.items?.length === 0 ? (
          <EmptyState icon={ClipboardList} message="No work orders found" sub="Work orders are created automatically during inward procurement" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#', 'Work Order', 'Source (Raw)', 'Input Qty', 'Produced Qty', 'Wastage', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items?.map((wo: any, idx: number) => {
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
                    <td className="px-4 py-3.5 font-bold text-slate-400 text-xs font-mono">{((page || 1) - 1) * (data.meta?.limit || 20) + idx + 1}</td>
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

// ─── Packaged Tab ─────────────────────────────────────────────────────────────
const PackagedTab = ({ refreshKey, onGoToWorkOrder: _onGoToWorkOrder }: { refreshKey?: number; onGoToWorkOrder?: (code: string) => void }) => {
  const [data, setData] = useState<any>({ items: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [qrBatch, setQrBatch] = useState<any>(null);
  const [editBatch, setEditBatch] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<any>({ isOpen: false, title: '', message: '', onConfirm: async () => { }, isLoading: false });
  const closeConfirm = () => setConfirm((prev: any) => ({ ...prev, isOpen: false }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryApi.getBatches({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setData(res);
    } catch { setData({ items: [], meta: {} }); }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load, refreshKey]);

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
              placeholder="Search packaged batch code…"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          >
            <option value="">All Packaged Statuses</option>
            <option value="PACKAGED">Packaged</option>
            <option value="QR_APPLIED">QR Applied</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="AT_DISTRIBUTOR">At Distributor</option>
            <option value="AT_RETAILER">At Retailer</option>
          </select>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Pagination Bar */}
      <PaginationBar meta={data.meta} page={page} setPage={setPage} />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.items?.length === 0 ? (
          <EmptyState icon={PackageCheck} message="No packaged stock found" sub="Packaged stock created from work orders or inward entries will appear here" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#', 'Batch Code', 'Flash Film / Product', 'Packaged Date', 'Owner / Branch', 'Quantity', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items?.map((b: any, idx: number) => (
                <tr key={b.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400 text-xs font-mono">{((page || 1) - 1) * (data.meta?.limit || 20) + idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => setQrBatch(b)}
                      title="Click to view complete batch details & QR hierarchy"
                      className="flex flex-col gap-0.5 text-left group/batch cursor-pointer"
                    >
                      <span className="font-mono text-xs px-2 py-1 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200/80 group-hover/batch:bg-amber-600 group-hover/batch:text-white transition flex items-center gap-1.5 w-fit shadow-sm">
                        <Package className="w-3.5 h-3.5" />
                        {b.batchCode}
                        <ExternalLink className="w-3 h-3 opacity-60 group-hover/batch:opacity-100" />
                      </span>
                      {b.legacyId && (
                        <span className="text-[10px] text-slate-400 font-mono pl-1">Legacy ID: {b.legacyId}</span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-800">{b.filmType?.name || '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                    {b.createdAt 
                      ? new Date(b.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) 
                      : (b.arrivalDate ? new Date(b.arrivalDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {b.organization?.name || 'HQ / Parent'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">{b.quantity} units</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={b.status} config={BATCH_STATUS_CONFIG} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQrBatch(b)} title="Generate / View QR Codes" className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition flex items-center gap-1 text-xs font-semibold cursor-pointer">
                        <QrCode className="w-4 h-4" /> QR
                      </button>
                      <button onClick={() => setEditBatch(b)} title="Edit batch" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Pagination Bar */}
      <PaginationBar meta={data.meta} page={page} setPage={setPage} />

      {qrBatch && <QRGenerateModal batch={qrBatch} onClose={() => setQrBatch(null)} onSave={() => { setQrBatch(null); load(); }} />}
      {editBatch && <EditBatchModal batch={editBatch} onClose={() => setEditBatch(null)} onSave={() => { setEditBatch(null); load(); }} />}
      <ConfirmDialog {...confirm} onClose={closeConfirm} />
    </div>
  );
};

const ViewDispatchModal = ({ dispatch: initialDispatch, onClose, onReceive }: { dispatch: any; onClose: () => void; onReceive?: (d: any) => void }) => {
  const [dispatch, setDispatch] = useState<any>(initialDispatch);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [viewTab, setViewTab] = useState<'items' | 'qrs'>('items');
  const [qrSearch, setQrSearch] = useState('');
  const [expandedBoxes, setExpandedBoxes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialDispatch?.id) {
      setLoading(true);
      inventoryApi.getDispatch(initialDispatch.id)
        .then(d => { if (d) setDispatch(d); })
        .catch(() => setDispatch(initialDispatch))
        .finally(() => setLoading(false));
    }
  }, [initialDispatch?.id]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(dispatch.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Collect top-level QR codes (Master Boxes or Standalone Individuals) from all items in this dispatch
  const { rootQrs } = useMemo(() => {
    if (!dispatch.items) return { rootQrs: [], totalQrsCount: 0 };

    const seenQrIds = new Set<string>();
    const roots: any[] = [];

    const totalQuantityDispatched = dispatch.items.reduce(
      (acc: number, it: any) => acc + (it.quantityDispatched || it.quantity || 0), 0
    );

    dispatch.items.forEach((it: any) => {
      let qrs = it.filmBatch?.qrCodes || [];

      // If QRs have assignedOrgId matching dispatch toOrgId, prioritize them
      if (dispatch.toOrgId) {
        const assignedQrs = qrs.filter((q: any) => q.assignedOrgId === dispatch.toOrgId);
        if (assignedQrs.length > 0) {
          qrs = assignedQrs;
        }
      }

      qrs.forEach((q: any) => {
        if (!seenQrIds.has(q.id)) {
          seenQrIds.add(q.id);
          if (!q.parentId) {
            roots.push({
              ...q,
              batchCode: it.filmBatch?.batchCode,
              filmTypeName: it.filmBatch?.filmType?.name,
            });
          }
        }
      });
    });

    const finalRoots = totalQuantityDispatched > 0 && roots.length > totalQuantityDispatched
      ? roots.slice(0, totalQuantityDispatched)
      : roots;

    return { rootQrs: finalRoots, totalQrsCount: finalRoots.length };
  }, [dispatch]);

  const filteredQrs = useMemo(() => {
    if (!qrSearch.trim()) return rootQrs;
    const term = qrSearch.toLowerCase();
    return rootQrs.filter((q: any) => {
      const selfMatch = 
        q.qrCode?.toLowerCase().includes(term) ||
        q.batchCode?.toLowerCase().includes(term) ||
        q.filmTypeName?.toLowerCase().includes(term) ||
        String(q.sequenceNumber).includes(term);
      
      const childMatch = q.children?.some((c: any) => 
        c.qrCode?.toLowerCase().includes(term) ||
        String(c.sequenceNumber).includes(term)
      );

      return selfMatch || childMatch;
    });
  }, [rootQrs, qrSearch]);

  const toggleBox = (qrId: string) => {
    setExpandedBoxes(prev => {
      const next = new Set(prev);
      if (next.has(qrId)) next.delete(qrId); else next.add(qrId);
      return next;
    });
  };

  const totalDispatched = dispatch.items?.reduce((acc: number, it: any) => acc + (it.quantityDispatched || it.quantity || 0), 0) || 0;
  const totalReceived = dispatch.items?.reduce((acc: number, it: any) => acc + (it.quantityReceived || 0), 0) || 0;

  return (
    <Modal isOpen={true} onClose={onClose} title="Dispatch Order Details" size="lg">
      <div className="space-y-5 text-left">
        {/* Header Info Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Dispatch ID</span>
              <button 
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                title="Click to copy full ID"
              >
                #{dispatch.id?.slice(0, 12)}…
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-400" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dispatched on {dispatch.dispatchDate ? new Date(dispatch.dispatchDate).toLocaleString() : 'N/A'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={dispatch.status} config={DISPATCH_STATUS_CONFIG} />
          </div>
        </div>

        {/* Transfer Route Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Origin / Source
            </div>
            <p className="text-sm font-bold text-slate-800">{dispatch.fromOrganization?.name || 'Main Warehouse'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{dispatch.fromOrganization?.organizationType?.name || 'HQ / Supplier'}</p>
          </div>

          <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              <Truck className="w-3.5 h-3.5 text-indigo-500" /> Destination
            </div>
            <p className="text-sm font-bold text-indigo-900">{dispatch.toOrganization?.name || 'Target Store'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{dispatch.toOrganization?.organizationType?.name || 'Distributor / Retailer'}</p>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setViewTab('items')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                viewTab === 'items' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Dispatched Items ({dispatch.items?.length || 0})
            </button>
            <button
              onClick={() => setViewTab('qrs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                viewTab === 'qrs' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" /> QR Codes ({rootQrs.length})
            </button>
          </div>

          {viewTab === 'qrs' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search QRs, batches..."
                value={qrSearch}
                onChange={e => setQrSearch(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 w-44"
              />
            </div>
          )}
        </div>

        {/* TAB 1: Items Summary Table */}
        {viewTab === 'items' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Batch Summary Breakdown
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                Total Units: <strong className="text-slate-800">{totalDispatched}</strong>
                {dispatch.status === 'RECEIVED' && <span className="text-emerald-600 font-semibold ml-1.5">(Received: {totalReceived})</span>}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-500">#</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-500">Batch Code</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-500">Flash Product</th>
                    <th className="px-3.5 py-2.5 font-semibold text-slate-500 text-right">Qty Dispatched</th>
                    {dispatch.status === 'RECEIVED' && <th className="px-3.5 py-2.5 font-semibold text-slate-500 text-right">Qty Received</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dispatch.items?.length > 0 ? (
                    dispatch.items.map((it: any, idx: number) => (
                      <tr key={it.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 font-bold text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-3.5 py-2.5">
                          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {it.filmBatch?.batchCode || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-700 font-medium">
                          {it.filmBatch?.filmType?.name || 'Standard Film'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-slate-900">
                          {it.quantityDispatched || it.quantity || 0} units
                        </td>
                        {dispatch.status === 'RECEIVED' && (
                          <td className="px-3.5 py-2.5 text-right font-bold text-emerald-700">
                            {it.quantityReceived || 0} units
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">No batch items attached to this dispatch order.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: QR Codes List View */}
        {viewTab === 'qrs' && (
          <div className="space-y-3">
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 max-h-[320px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="py-12 flex justify-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
              ) : filteredQrs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 italic text-xs">
                  {rootQrs.length === 0 ? 'No QR codes registered for this dispatch order.' : 'No QR codes match your search query.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 bg-white">
                  {filteredQrs.map((qr: any) => {
                    const isMaster = qr.qrType === 'MASTER_BOX';
                    const isExpanded = expandedBoxes.has(qr.id);
                    const hasChildren = qr.children?.length > 0;

                    return (
                      <div key={qr.id} className="p-3 hover:bg-slate-50 transition-colors text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            {isMaster && hasChildren && (
                              <button onClick={() => toggleBox(qr.id)} className="p-0.5 hover:bg-slate-200 rounded text-slate-500">
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <QrCode className={`w-4 h-4 shrink-0 ${isMaster ? 'text-indigo-600' : 'text-slate-400'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {qr.qrCode}
                                </span>
                                {qr.sequenceNumber && (
                                  <span className="text-[10px] font-mono text-slate-400 font-semibold">
                                    #{String(qr.sequenceNumber).padStart(4, '0')}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Batch: <strong className="text-slate-700">{qr.batchCode}</strong> • {qr.filmTypeName}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isMaster ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {qr.qrType || 'INDIVIDUAL'}
                            </span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                              {qr.status}
                            </span>
                          </div>
                        </div>

                        {/* Master Box Children */}
                        {isMaster && isExpanded && hasChildren && (
                          <div className="mt-2.5 ml-6 border-l-2 border-indigo-100 pl-3 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contains {qr.children.length} Inner Units:</p>
                            {qr.children.map((child: any) => (
                              <div key={child.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2">
                                  <QrCode className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-mono text-xs font-semibold text-slate-700">{child.qrCode}</span>
                                  {child.sequenceNumber && (
                                    <span className="text-[10px] font-mono text-slate-400">#{String(child.sequenceNumber).padStart(4, '0')}</span>
                                  )}
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 uppercase">{child.status}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes & Tracking Information */}
        {dispatch.notes && (
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
            <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-amber-600" /> Dispatch Notes & Tracking Info
            </h4>
            <p className="text-xs text-amber-900 whitespace-pre-wrap leading-relaxed">{dispatch.notes}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Close
          </button>

          {onReceive && (
            <button
              type="button"
              onClick={() => { onClose(); onReceive(dispatch); }}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-md shadow-emerald-100 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Receive This Dispatch
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ─── Dispatch Tab ─────────────────────────────────────────────────────────────
const DispatchTab = () => {
  const [data, setData] = useState<any>({ items: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [receiveDispatch, setReceiveDispatch] = useState<any>(null);
  const [viewDispatch, setViewDispatch] = useState<any>(null);
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
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 cursor-pointer">
            <Send className="w-4 h-4" /> Create Dispatch
          </button>
          <button onClick={() => setShowReturn(true)} className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition cursor-pointer shadow-sm">
            <RotateCcw className="w-4 h-4" /> Return Stock
          </button>
        </div>
      </div>

      {/* Top Pagination Bar */}
      <PaginationBar meta={data.meta} page={page} setPage={setPage} />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : data.items?.length === 0 ? (
          <EmptyState icon={Truck} message="No dispatch orders found" sub="Create a dispatch order to move stock" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#', 'Dispatch ID', 'From', 'To', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items?.map((d: any, idx: number) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-slate-400 text-xs font-mono">{((page || 1) - 1) * (data.meta?.limit || 20) + idx + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setViewDispatch(d)}
                        className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 transition cursor-pointer"
                        title="Click to view full dispatch details"
                      >
                        #{d.id?.slice(0, 8)}…
                        <ExternalLink className="w-3 h-3 text-indigo-400" />
                      </button>
                      {d.notes?.includes('[STOCK RETURN]') && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded uppercase tracking-tighter border border-amber-200 shadow-sm">
                          Return
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">{d.fromOrganization?.name}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />{d.toOrganization?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 text-xs">
                    {d.dispatchDate ? formatISTDate(d.dispatchDate) : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={d.status} config={DISPATCH_STATUS_CONFIG} />
                  </td>
                  <td className="px-4 py-3.5">
                    {canReceive(d) && (
                      <button
                        onClick={() => setReceiveDispatch(d)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
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

      {/* Bottom Pagination Bar */}
      <PaginationBar meta={data.meta} page={page} setPage={setPage} />

      {showCreate && <DispatchModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); load(); }} />}
      {showReturn && <ReturnStockModal onClose={() => setShowReturn(false)} onSave={() => { setShowReturn(false); load(); }} />}
      {receiveDispatch && <ReceiveDispatchModal dispatch={receiveDispatch} onClose={() => setReceiveDispatch(null)} onSave={() => { setReceiveDispatch(null); load(); }} />}
      {viewDispatch && (
        <ViewDispatchModal 
          dispatch={viewDispatch} 
          onClose={() => setViewDispatch(null)} 
          onReceive={canReceive(viewDispatch) ? (d) => setReceiveDispatch(d) : undefined} 
        />
      )}
    </div>
  );
};

// ─── Film Types & Materials Tab ────────────────────────────────────────────────
export const FilmTypeModal = ({ item, filmTypes, onClose, onSave }: { item?: any; filmTypes: any[]; onClose: () => void; onSave: () => void }) => {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [parentId, setParentId] = useState(item?.parentId || '');
  const [thickness, setThickness] = useState(item?.thickness ? String(item.thickness) : '');
  const [layers, setLayers] = useState(item?.layers ? String(item.layers) : '1');
  const [minForce, setMinForce] = useState(item?.minForce ? String(item.minForce) : '');
  const [minSpeed, setMinSpeed] = useState(item?.minSpeed ? String(item.minSpeed) : '');
  const [isActive, setIsActive] = useState(item?.isActive !== false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Film Type name is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        parentId: parentId || null,
        thickness: thickness ? Number(thickness) : undefined,
        layers: layers ? Number(layers) : 1,
        minForce: minForce ? Number(minForce) : undefined,
        minSpeed: minSpeed ? Number(minSpeed) : undefined,
        isActive,
      };

      if (item?.id) {
        await filmTypesApi.update(item.id, payload);
      } else {
        await filmTypesApi.create(payload);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save Film Type');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={item ? 'Edit Film Type / Material' : 'New Film Type / Material'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Film / Material Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Shield Dry Matte, Canvas Titan"
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Category</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
            >
              <option value="">None (Top-Level Category)</option>
              {filmTypes.filter((f: any) => f.id !== item?.id).map((f: any) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Layers</label>
            <input
              type="number"
              min="1"
              max="10"
              value={layers}
              onChange={(e) => setLayers(e.target.value)}
              placeholder="1"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Thickness (mm)</label>
            <input
              type="number"
              step="0.01"
              value={thickness}
              onChange={(e) => setThickness(e.target.value)}
              placeholder="e.g. 0.15"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Min Speed</label>
            <input
              type="number"
              value={minSpeed}
              onChange={(e) => setMinSpeed(e.target.value)}
              placeholder="e.g. 15"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Min Force (g)</label>
            <input
              type="number"
              value={minForce}
              onChange={(e) => setMinForce(e.target.value)}
              placeholder="e.g. 45"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Optional material description or cutting instructions..."
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="filmIsActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="filmIsActive" className="text-xs font-medium text-slate-700">Active Material Status</label>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 transition shadow-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {item ? 'Update Film Type' : 'Create Film Type'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Taxonomy Modals ─────────────────────────────────────────────────────────
const ProductTypeModal = ({ item, onClose, onSave }: { item?: any; onClose: () => void; onSave: () => void }) => {
  const [name, setName] = useState(item?.name || '');
  const [slug, setSlug] = useState(item?.slug || '');
  const [isActive, setIsActive] = useState(item?.isActive !== false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setName(item?.name || '');
    setSlug(item?.slug || '');
    setIsActive(item?.isActive !== false);
    setError('');
  }, [item]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!item?.id) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    setLoading(true);
    try {
      const generatedSlug = (slug || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const payload = {
        name: name.trim(),
        slug: generatedSlug || 'material-category',
        isActive
      };
      if (item?.id) await productTypesApi.update(item.id, payload);
      else await productTypesApi.create(payload);
      onSave();
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to save Top Material Category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={item?.id ? 'Edit Top Material Category' : 'New Top Material Category'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4 py-2">
        {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g. Canvas, Screen Guard"
            className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Slug / Identifier</label>
          <input
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            placeholder="e.g. canvas"
            className="w-full px-3 py-2 text-xs border rounded-lg font-mono bg-slate-50"
          />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="ptActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
          <label htmlFor="ptActive" className="text-xs font-medium text-slate-700">Active Status</label>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

const MaterialCategoryModal = ({ item, productTypes: _productTypes, materialCategories = [], onClose, onSave }: { item?: any; productTypes: any[]; materialCategories?: any[]; onClose: () => void; onSave: () => void }) => {
  const [name, setName] = useState(item?.name || '');
  const [productTypeId, setProductTypeId] = useState(item?.productTypeId || '');
  const [description, setDescription] = useState(item?.description || '');
  const [isActive, setIsActive] = useState(item?.isActive !== false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [treeSearch, setTreeSearch] = useState('');

  useEffect(() => {
    setName(item?.name || '');
    setProductTypeId(item?.productTypeId || '');
    setDescription(item?.description || '');
    setIsActive(item?.isActive !== false);
  }, [item]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    setLoading(true);
    try {
      const payload = { 
        name: name.trim(), 
        parentId: productTypeId || undefined, 
        description: description.trim() || undefined, 
        isActive 
      };
      if (item?.id) {
        await materialCategoriesApi.update(item.id, payload);
      } else {
        await materialCategoriesApi.create(payload);
      }
      onSave();
    } catch (e: any) {
      setError(e.message || 'Failed to save Material Category');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryNode = materialCategories.find((p: any) => p.id === productTypeId);

  const renderTreeNodes = (nodes: any[], level = 0) => {
    return nodes.map((node: any) => {
      if (item?.id && node.id === item.id) return null; // prevent self-parenting
      const childMcs = materialCategories.filter((mc: any) => mc.parentId === node.id);
      const isSelected = productTypeId === node.id;

      return (
        <div key={node.id} className="pt-1 first:pt-0">
          <div
            onClick={() => setProductTypeId(node.id)}
            style={{ paddingLeft: `${Math.max(level * 16, 6)}px` }}
            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-100 text-slate-800'}`}
          >
            {level === 0 ? <Package2 className="w-4 h-4 text-indigo-600 shrink-0" /> : <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
            <span className="flex-1 text-xs font-semibold">{node.name}</span>
            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
          </div>

          {childMcs.length > 0 && (
            <div className="border-l border-slate-200 mt-1 space-y-1 ml-3">
              {renderTreeNodes(childMcs, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const topLevelCategories = materialCategories.filter((m: any) => !m.parentId);
  const filteredCategories = topLevelCategories.filter((cat: any) => {
    const query = treeSearch.toLowerCase().trim();
    if (!query) return true;
    if (cat.name?.toLowerCase().includes(query)) return true;
    const childMcs = materialCategories.filter((mc: any) => mc.parentId === cat.id);
    return childMcs.some((mc: any) => mc.name?.toLowerCase().includes(query));
  });

  return (
    <Modal title={item?.id ? 'Edit Material Category' : 'New Material Category'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4 py-2">
        {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Material Category Name *</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mobile Screen Protector" className="w-full px-3 py-2 text-xs border rounded-lg" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Category (Optional for Top-Level)</label>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="p-2 bg-slate-50 border-b border-slate-200 relative flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search parent categories…"
                  value={treeSearch}
                  onChange={e => setTreeSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {treeSearch && (
                  <button type="button" onClick={() => setTreeSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {productTypeId && (
                <button
                  type="button"
                  onClick={() => setProductTypeId('')}
                  className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-rose-600 border border-slate-200 bg-white rounded-md shrink-0 cursor-pointer"
                >
                  Clear (Make Top-Level)
                </button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 text-xs">
              {filteredCategories.length === 0 ? (
                <div className="p-3 text-center text-slate-400 italic">No parent categories found</div>
              ) : (
                renderTreeNodes(filteredCategories)
              )}
            </div>

            <div className="p-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Selected Parent:</span>
              <span className="font-bold text-indigo-600">{selectedCategoryNode?.name || 'None (Top-Level Category)'}</span>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 text-xs border rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="mcActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
          <label htmlFor="mcActive" className="text-xs font-medium text-slate-700">Active Status</label>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

const FilmCategoryModal = ({ item, filmCategories = [], onClose, onSave }: { item?: any; filmCategories: any[]; onClose: () => void; onSave: () => void }) => {
  const [name, setName] = useState(item?.name || '');
  const [parentId, setParentId] = useState(item?.parentId || '');
  const [isActive, setIsActive] = useState(item?.isActive !== false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [treeSearch, setTreeSearch] = useState('');

  useEffect(() => {
    setName(item?.name || '');
    setParentId(item?.parentId || '');
    setIsActive(item?.isActive !== false);
  }, [item]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Category Name is required');
    setLoading(true);
    try {
      const payload = { name: name.trim(), parentId: parentId || undefined, isActive };
      if (item?.id) await filmCategoriesApi.update(item.id, payload);
      else await filmCategoriesApi.create(payload);
      onSave();
    } catch (e: any) {
      setError(e.message || 'Failed to save Category');
    } finally {
      setLoading(false);
    }
  };

  const selectedParentNode = filmCategories.find((fc: any) => fc.id === parentId);

  const renderFilmTreeNodes = (nodes: any[], level = 0) => {
    return nodes.map((node: any) => {
      if (item?.id && node.id === item.id) return null; // Prevent self-parenting
      const childFcs = filmCategories.filter((fc: any) => fc.parentId === node.id);
      const isSelected = parentId === node.id;

      return (
        <div key={node.id} className="pt-1 first:pt-0">
          <div
            onClick={() => setParentId(node.id)}
            style={{ paddingLeft: `${Math.max(level * 16, 6)}px` }}
            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-100 text-slate-800'}`}
          >
            <Tag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="flex-1 text-xs font-semibold">{node.name}</span>
            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
          </div>

          {childFcs.length > 0 && (
            <div className="border-l border-slate-200 mt-1 space-y-1 ml-3">
              {renderFilmTreeNodes(childFcs, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const topLevelFilms = filmCategories.filter((fc: any) => !fc.parentId);
  const filteredFilms = topLevelFilms.filter((fc: any) => {
    const query = treeSearch.toLowerCase().trim();
    if (!query) return true;
    if (fc.name?.toLowerCase().includes(query)) return true;
    const childFcs = filmCategories.filter((child: any) => child.parentId === fc.id);
    return childFcs.some((child: any) => child.name?.toLowerCase().includes(query));
  });

  return (
    <Modal title={item?.id ? 'Edit Flash Category' : 'New Flash Category'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4 py-2">
        {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Screen Protectors, Canvas 3D" className="w-full px-3 py-2 text-xs border rounded-lg" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Parent Category (Optional)</label>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="p-2 bg-slate-50 border-b border-slate-200 relative flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search categories hierarchy..."
                  value={treeSearch}
                  onChange={e => setTreeSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {treeSearch && (
                  <button type="button" onClick={() => setTreeSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {parentId && (
                <button
                  type="button"
                  onClick={() => setParentId('')}
                  className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-rose-600 border border-slate-200 bg-white rounded-md shrink-0 cursor-pointer"
                >
                  Clear (Top-Level)
                </button>
              )}
            </div>

            <div className="max-h-36 overflow-y-auto min-h-[80px] p-2 space-y-1 divide-y divide-slate-100 text-xs scrollbar-thin scrollbar-thumb-slate-300">
              {filteredFilms.length === 0 ? (
                <div className="p-3 text-center text-slate-400 italic">No parent categories found</div>
              ) : (
                renderFilmTreeNodes(filteredFilms)
              )}
            </div>

            <div className="p-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between font-medium">
              <span>Selected Parent:</span>
              <span className="font-bold text-indigo-600">{selectedParentNode ? selectedParentNode.name : 'None (Top-Level)'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="fcActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
          <label htmlFor="fcActive" className="text-xs font-medium text-slate-700">Active Status</label>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

const MaterialModal = ({ item, filmCategories = [], materialCategories = [], onClose, onSave }: { item?: any; filmCategories: any[]; materialCategories?: any[]; onClose: () => void; onSave: () => void }) => {
  const [name, setName] = useState(item?.name || '');
  const [filmCategoryId, setFilmCategoryId] = useState(item?.filmCategoryId || '');
  const [selectedMaterialCategoryId, setSelectedMaterialCategoryId] = useState('');
  const [thickness, setThickness] = useState(item?.thickness ? String(item.thickness) : '');
  const [layers, setLayers] = useState(item?.layers ? String(item.layers) : '1');
  const [minForce, setMinForce] = useState(item?.minForce ? String(item.minForce) : '');
  const [minSpeed, setMinSpeed] = useState(item?.minSpeed ? String(item.minSpeed) : '');
  const [isActive, setIsActive] = useState(item?.isActive !== false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [matCatSearch, setMatCatSearch] = useState('');
  const [filmCatSearch, setFilmCatSearch] = useState('');

  useEffect(() => {
    setName(item?.name || '');
    setFilmCategoryId(item?.filmCategoryId || '');
    setThickness(item?.thickness ? String(item.thickness) : '');
    setLayers(item?.layers ? String(item.layers) : '1');
    setMinForce(item?.minForce ? String(item.minForce) : '');
    setMinSpeed(item?.minSpeed ? String(item.minSpeed) : '');
    setIsActive(item?.isActive !== false);
    
    if (item?.filmCategoryId) {
      const parentFc = filmCategories.find((fc: any) => fc.id === item.filmCategoryId);
      if (parentFc?.materialCategoryId) {
        setSelectedMaterialCategoryId(parentFc.materialCategoryId);
      }
    }
  }, [item, filmCategories]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !filmCategoryId) return setError('Name and Film Category are required');
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        filmCategoryId,
        thickness: thickness ? Number(thickness) : undefined,
        layers: layers ? Number(layers) : 1,
        minForce: minForce ? Number(minForce) : undefined,
        minSpeed: minSpeed ? Number(minSpeed) : undefined,
        isActive,
      };
      if (item?.id) await materialsApi.update(item.id, payload);
      else await materialsApi.create(payload);
      onSave();
    } catch (e: any) {
      setError(e.message || 'Failed to save Material');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategoryNode = materialCategories.find((p: any) => p.id === selectedMaterialCategoryId);

  const renderMatCatTree = (nodes: any[], level = 0) => {
    return nodes.map((node: any) => {
      const childMcs = materialCategories.filter((mc: any) => mc.parentId === node.id);
      const isSelected = selectedMaterialCategoryId === node.id;

      return (
        <div key={node.id} className="pt-1 first:pt-0">
          <div
            onClick={() => {
              setSelectedMaterialCategoryId(node.id);
              // Auto-select first matching Film Category if available under this Material Category
              const matchingFc = filmCategories.find((fc: any) => fc.materialCategoryId === node.id);
              if (matchingFc) setFilmCategoryId(matchingFc.id);
            }}
            style={{ paddingLeft: `${Math.max(level * 16, 6)}px` }}
            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-100 text-slate-800'}`}
          >
            {level === 0 ? <Package2 className="w-4 h-4 text-indigo-600 shrink-0" /> : <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
            <span className="flex-1 text-xs font-semibold">{node.name}</span>
            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
          </div>

          {childMcs.length > 0 && (
            <div className="border-l border-slate-200 mt-1 space-y-1 ml-3">
              {renderMatCatTree(childMcs, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const topLevelCategories = materialCategories.filter((m: any) => !m.parentId);
  const filteredMatCategories = topLevelCategories.filter((cat: any) => {
    const query = matCatSearch.toLowerCase().trim();
    if (!query) return true;
    if (cat.name?.toLowerCase().includes(query)) return true;
    const childMcs = materialCategories.filter((mc: any) => mc.parentId === cat.id);
    return childMcs.some((mc: any) => mc.name?.toLowerCase().includes(query));
  });

  const renderFilmCatTree = (nodes: any[], level = 0) => {
    return nodes.map((node: any) => {
      const childFcs = filmCategories.filter((fc: any) => fc.parentId === node.id);
      const isSelected = filmCategoryId === node.id;

      return (
        <div key={node.id} className="pt-1 first:pt-0">
          <div
            onClick={() => setFilmCategoryId(node.id)}
            style={{ paddingLeft: `${Math.max(level * 16, 6)}px` }}
            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition ${isSelected ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200' : 'hover:bg-slate-100 text-slate-800'}`}
          >
            {level === 0 ? <Tag className="w-4 h-4 text-indigo-600 shrink-0" /> : <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
            <span className="flex-1 text-xs font-semibold">{node.name}</span>
            {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
          </div>

          {childFcs.length > 0 && (
            <div className="border-l border-slate-200 mt-1 space-y-1 ml-3">
              {renderFilmCatTree(childFcs, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const topLevelFilmCategories = filmCategories.filter((fc: any) => {
    return !fc.parentId || !filmCategories.some((p: any) => p.id === fc.parentId);
  });

  const filterFilmNode = (cat: any): boolean => {
    const query = filmCatSearch.toLowerCase().trim();
    if (!query) return true;
    if (cat.name?.toLowerCase().includes(query)) return true;
    const childFcs = filmCategories.filter((fc: any) => fc.parentId === cat.id);
    return childFcs.some(child => filterFilmNode(child));
  };

  const filteredFilmCategories = topLevelFilmCategories.filter(filterFilmNode);

  const selectedFcNode = filmCategories.find((fc: any) => fc.id === filmCategoryId);

  return (
    <Modal title={item?.id ? 'Edit Flash Product' : 'New Flash Product'} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4 py-2">
        {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">{error}</div>}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Material Name *</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Shield Dry Matte, Eco Clear" className="w-full px-3 py-2 text-xs border rounded-lg" />
        </div>

        {/* Searchable Material Category Tree Selector */}
        {materialCategories.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Material Category (Searchable Tree)</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="p-2 bg-slate-50 border-b border-slate-200 relative flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search material category tree..."
                    value={matCatSearch}
                    onChange={e => setMatCatSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {matCatSearch && (
                    <button type="button" onClick={() => setMatCatSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {selectedMaterialCategoryId && (
                  <button
                    type="button"
                    onClick={() => setSelectedMaterialCategoryId('')}
                    className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-rose-600 border border-slate-200 bg-white rounded-md shrink-0 cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="max-h-32 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100 text-xs scrollbar-thin scrollbar-thumb-slate-300">
                {filteredMatCategories.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 italic">No material categories found</div>
                ) : (
                  renderMatCatTree(filteredMatCategories)
                )}
              </div>

              <div className="p-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between font-medium">
                <span>Selected Category:</span>
                <span className="font-bold text-indigo-600">{selectedCategoryNode ? selectedCategoryNode.name : 'All Categories'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Searchable Film Category Tree Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Film Category * (Searchable Tree)</label>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="p-2 bg-slate-50 border-b border-slate-200 relative flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search film category tree..."
                  value={filmCatSearch}
                  onChange={e => setFilmCatSearch(e.target.value)}
                  className="w-full pl-8 pr-7 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {filmCatSearch && (
                  <button type="button" onClick={() => setFilmCatSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto min-h-[80px] p-2 space-y-1 divide-y divide-slate-100 text-xs scrollbar-thin scrollbar-thumb-slate-300">
              {filteredFilmCategories.length === 0 ? (
                <div className="p-4 text-center text-slate-400 italic">No film categories found</div>
              ) : (
                renderFilmCatTree(filteredFilmCategories)
              )}
            </div>

            <div className="p-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between font-medium">
              <span>Selected Film Category:</span>
              <span className="font-bold text-indigo-600">{selectedFcNode ? selectedFcNode.name : 'None Selected'}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Layers</label>
            <input type="number" min="1" max="10" value={layers} onChange={e => setLayers(e.target.value)} className="w-full px-3 py-2 text-xs border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Thickness (mm)</label>
            <input type="number" step="0.01" value={thickness} onChange={e => setThickness(e.target.value)} placeholder="0.15" className="w-full px-3 py-2 text-xs border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Min Speed</label>
            <input type="number" value={minSpeed} onChange={e => setMinSpeed(e.target.value)} placeholder="15" className="w-full px-3 py-2 text-xs border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Min Force (g)</label>
            <input type="number" value={minForce} onChange={e => setMinForce(e.target.value)} placeholder="45" className="w-full px-3 py-2 text-xs border rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="matActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
          <label htmlFor="matActive" className="text-xs font-medium text-slate-700">Active Status</label>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs border rounded-lg">Cancel</button>
          <button type="submit" disabled={loading} className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </form>
    </Modal>
  );
};

const FilmTypesTab = () => {
  const [subTab, setSubTab] = useState<'categories' | 'filmcategories' | 'materials'>('categories');
  
  const [productTypes, setProductTypes] = useState<any[]>([]);
  const [materialCategories, setMaterialCategories] = useState<any[]>([]);
  const [filmCategories, setFilmCategories] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const pt = await productTypesApi.create({ name: 'Canvas', slug: 'canvas', isActive: true });
      if (pt?.id) {
        const categories = [
          'Mobile Screen Protector',
          'Mobile Canvas',
          'Tablet Screen Protector',
          'Mobile Canvas Play',
          'Krystal Mobile Clear Film',
          'Laptop Film Protector',
          'Mobile 3D Canvas',
          'Flashgard Giveaway'
        ];
        for (const catName of categories) {
          const mc = await materialCategoriesApi.create({ name: catName, productTypeId: pt.id, isActive: true });
          if (mc?.id && catName === 'Mobile Screen Protector') {
            await filmCategoriesApi.create({ name: 'HD Ultra Clear', materialCategoryId: mc.id, isActive: true });
          }
        }
      }
      await loadAllData();
    } catch (err: any) {
      console.error('Failed to seed defaults', err);
      setApiError(err.message || 'Failed to seed default categories');
    } finally {
      setIsSeeding(false);
    }
  };

  const effectiveProductTypes = productTypes.length > 0 
    ? productTypes 
    : (materialCategories.length > 0 || filmCategories.length > 0 
        ? [{ id: 'synthetic_pt', name: 'General Categories', slug: 'general', isActive: true, isSynthetic: true }] 
        : []);
  const [modalType, setModalType] = useState<'producttype' | 'materialcategory' | 'filmcategory' | 'material' | null>(null);
  const [modalItem, setModalItem] = useState<any | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; type: 'producttype' | 'materialcategory' | 'filmcategory' | 'material' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      if (subTab === 'categories') {
        const [ptsRes, mcsRes] = await Promise.allSettled([
          productTypesApi.getAll(search || undefined, false),
          materialCategoriesApi.getAll(undefined, search || undefined, false)
        ]);

        const errors = [ptsRes, mcsRes]
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map(r => r.reason?.message || String(r.reason));

        if (errors.length > 0) {
          setApiError(errors[0]);
        }

        const pts = ptsRes.status === 'fulfilled' ? ptsRes.value : [];
        const mcs = mcsRes.status === 'fulfilled' ? mcsRes.value : [];

        const ptList = Array.isArray(pts) ? pts : ((pts as any)?.items || []);
        const mcList = Array.isArray(mcs) ? mcs : ((mcs as any)?.items || []);

        setProductTypes(ptList);
        setMaterialCategories(mcList);

        // Auto expand all product types and material categories
        const expandKeys = new Set<string>();
        ptList.forEach((p: any) => expandKeys.add('pt_' + p.id));
        mcList.forEach((m: any) => expandKeys.add('mc_' + m.id));
        setExpandedRows(expandKeys);
      } else if (subTab === 'filmcategories') {
        const fcsRes = await filmCategoriesApi.getAll(undefined, search || undefined, false);
        const fcList = Array.isArray(fcsRes) ? fcsRes : ((fcsRes as any)?.items || []);
        setFilmCategories(fcList);
      } else if (subTab === 'materials') {
        const [mRes, fcRes, mcRes] = await Promise.allSettled([
          materialsApi.getAll(undefined, search || undefined, false),
          filmCategoriesApi.getAll(undefined, undefined, false),
          materialCategoriesApi.getAll(undefined, undefined, false)
        ]);

        if (mRes.status === 'rejected') {
          setApiError('Unable to fetch Flash Products. Please verify backend service is running.');
        }

        const m = mRes.status === 'fulfilled' ? mRes.value : [];
        const fc = fcRes.status === 'fulfilled' ? fcRes.value : [];
        const mc = mcRes.status === 'fulfilled' ? mcRes.value : [];

        const items = Array.isArray(m) ? m : ((m as any)?.items || []);
        const fcList = Array.isArray(fc) ? fc : ((fc as any)?.items || []);
        const mcList = Array.isArray(mc) ? mc : ((mc as any)?.items || []);

        setMaterials(items);
        setFilmCategories(fcList);
        setMaterialCategories(mcList);

        // Auto expand all material categories for hierarchical materials view
        const expandKeys = new Set<string>();
        mcList.forEach((mc: any) => expandKeys.add('m_mc_' + mc.id));
        setExpandedRows(expandKeys);
      }
    } catch (err: any) {
      console.error(err);
      setApiError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [subTab, search]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const xlsxMod = await import('xlsx-js-style');
      const XLSX = xlsxMod.default || xlsxMod;

      let dataToExport: any[] = [];
      let sheetName = 'Categories_Taxonomy';

      if (subTab === 'categories') {
        let rowCount = 1;
        for (const pt of productTypes) {
          dataToExport.push({
            '#': rowCount++,
            'Tier Level': 'Tier 1: Product Type',
            'Category Name': pt.name,
            'Parent Category': 'Top-Level',
            'Status': pt.isActive ? 'Active' : 'Inactive'
          });
          const childMcs = materialCategories.filter((m: any) => m.productTypeId === pt.id);
          for (const mc of childMcs) {
            dataToExport.push({
              '#': rowCount++,
              'Tier Level': 'Tier 2: Material Category',
              'Category Name': mc.name,
              'Parent Category': pt.name,
              'Status': mc.isActive ? 'Active' : 'Inactive'
            });
            const childFcs = filmCategories.filter((f: any) => f.materialCategoryId === mc.id);
            for (const fc of childFcs) {
              dataToExport.push({
                '#': rowCount++,
                'Tier Level': 'Tier 3: Film Category',
                'Category Name': fc.name,
                'Parent Category': mc.name,
                'Status': fc.isActive ? 'Active' : 'Inactive'
              });
            }
          }
        }
      } else {
        sheetName = 'Catalog_Materials';
        dataToExport = materials.map((m: any, idx: number) => ({
          '#': idx + 1,
          'Material Name': m.name,
          'Parent Film Category': m.filmCategory?.name || '—',
          'Layers': m.layers || 1,
          'Thickness (mm)': m.thickness || '—',
          'Status': m.isActive ? 'Active' : 'Inactive'
        }));
      }

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      XLSX.writeFile(workbook, `${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (confirmDelete.type === 'producttype') await productTypesApi.remove(confirmDelete.id);
      else if (confirmDelete.type === 'materialcategory') await materialCategoriesApi.remove(confirmDelete.id);
      else if (confirmDelete.type === 'filmcategory') await filmCategoriesApi.remove(confirmDelete.id);
      else if (confirmDelete.type === 'material') await materialsApi.remove(confirmDelete.id);

      setConfirmDelete(null);
      await loadAllData();
    } catch (err: any) {
      console.error('Delete failed:', err);
      const msg = err.message || `Failed to delete "${confirmDelete.name}". It may have linked items.`;
      setDeleteError(msg);
      setApiError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Sub-Nav Bar: 3 Consolidated Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/50 p-1.5 rounded-xl overflow-x-auto gap-1">
        <button
          onClick={() => { setSubTab('categories'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${subTab === 'categories' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Layers className="w-4 h-4" /> Material Category
        </button>
        <button
          onClick={() => { setSubTab('materials'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${subTab === 'materials' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <ClipboardList className="w-4 h-4" /> Flash Products
        </button>
        <button
          onClick={() => { setSubTab('filmcategories'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${subTab === 'filmcategories' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Tag className="w-4 h-4" /> Flash Categories
        </button>
      </div>

      {/* Control Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={subTab === 'categories' ? "Search material categories..." : subTab === 'filmcategories' ? "Search flash categories..." : "Search flash products..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {subTab === 'categories' && (
            <button
              onClick={() => {
                if (expandedRows.size > 0) {
                  setExpandedRows(new Set());
                } else {
                  const expandKeys = new Set<string>();
                  expandKeys.add('pt_synthetic_pt');
                  productTypes.forEach((p: any) => expandKeys.add('pt_' + p.id));
                  setExpandedRows(expandKeys);
                }
              }}
              className="px-3 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 bg-white shadow-sm flex items-center gap-1.5 text-xs font-semibold text-slate-600 cursor-pointer"
              title={expandedRows.size > 0 ? "Collapse All Rows" : "Expand All Rows"}
            >
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{expandedRows.size > 0 ? 'Collapse All' : 'Expand All'}</span>
            </button>
          )}
          <button onClick={handleExportExcel} disabled={isExporting} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 bg-white shadow-sm flex items-center justify-center cursor-pointer" title="Export Excel">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> : <Download className="w-4 h-4 text-slate-600" />}
          </button>
          <button onClick={loadAllData} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 bg-white shadow-sm cursor-pointer" title="Refresh">
            <RotateCcw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {subTab === 'categories' ? (
            <button onClick={() => { setModalItem(null); setModalType('materialcategory'); }} className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition shadow-sm cursor-pointer">
              <Plus className="w-4 h-4" /> New Material Category
            </button>
          ) : subTab === 'filmcategories' ? (
            <button onClick={() => { setModalItem(null); setModalType('filmcategory'); }} className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition shadow-sm cursor-pointer">
              <Plus className="w-4 h-4" /> New Flash Category
            </button>
          ) : (
            <button onClick={() => { setModalItem(null); setModalType('material'); }} className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 transition shadow-sm cursor-pointer">
              <Plus className="w-4 h-4" /> New Flash Product
            </button>
          )}
        </div>
      </div>

      {apiError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium">{apiError}</span>
          </div>
          <button onClick={loadAllData} className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition cursor-pointer">
            Retry
          </button>
        </div>
      )}

      {/* Main Dynamic Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
            {subTab === 'categories' ? (
              <tr>
                <th className="px-4 py-3">Category Hierarchy</th>
                <th className="px-4 py-3">Parent Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            ) : subTab === 'filmcategories' ? (
              <tr>
                <th className="px-4 py-3">Flash Category Hierarchy</th>
                <th className="px-4 py-3">Parent Flash Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            ) : (
              <tr>
                <th className="px-4 py-3">Flash Product Hierarchy</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Layers & Thickness</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />Loading items...</td></tr>
            ) : subTab === 'categories' ? (
              effectiveProductTypes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                        <Layers className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">No Category Taxonomy Found</h3>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Set up your catalog hierarchy starting with top-level Product Types, or seed standard default categories in 1 click.
                      </p>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        <button
                          onClick={handleSeedDefaults}
                          disabled={isSeeding}
                          className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
                        >
                          {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Seed Default Categories
                        </button>
                        <button
                          onClick={() => { setModalItem(null); setModalType('producttype'); }}
                          className="px-4 py-2 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl flex items-center gap-2 transition cursor-pointer"
                        >
                          <Plus className="w-4 h-4" /> Create Top Product Type
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                (() => {
                  const renderCategoryTreeRows = (nodes: any[], parentName: string, level = 0): React.ReactNode => {
                    return nodes.map((mc: any) => {
                      const mcKey = 'mc_' + mc.id;
                      const isExpanded = expandedRows.has(mcKey);
                      const subChildren = materialCategories.filter((sub: any) => sub.parentId === mc.id);

                      return (
                        <React.Fragment key={mcKey}>
                          <tr className={`border-t border-slate-100 hover:bg-indigo-50/20 transition ${level === 0 ? 'bg-slate-50/70 border-t-2 border-slate-200 font-bold' : 'bg-white'}`}>
                            <td className="px-4 py-3 text-slate-900" style={{ paddingLeft: `${level * 20 + 16}px` }}>
                              <div className="flex items-center gap-2">
                                {subChildren.length > 0 ? (
                                  <button
                                    onClick={() => toggleRow(mcKey)}
                                    className="p-0.5 rounded hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                ) : (
                                  <div className="w-4 h-4 shrink-0" />
                                )}
                                {level === 0 ? <Package2 className="w-4 h-4 text-indigo-600 shrink-0" /> : <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                                <span className={`text-xs ${level === 0 ? 'font-black tracking-tight text-slate-900' : 'font-bold text-slate-700'}`}>{mc.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs italic">{level === 0 ? 'Top-Level' : parentName}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${mc.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {mc.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => { setModalItem({ productTypeId: mc.id }); setModalType('materialcategory'); }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                  title="Add Sub Category"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setModalItem(mc); setModalType('materialcategory'); }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                  title="Edit Category"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ id: mc.id, name: mc.name, type: 'materialcategory' })}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && subChildren.length > 0 && renderCategoryTreeRows(subChildren, mc.name, level + 1)}
                        </React.Fragment>
                      );
                    });
                  };

                  const topLevelCategories = materialCategories.filter((m: any) => !m.parentId);
                  return topLevelCategories.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No categories found. Click "+ New Material Category" to create one.
                      </td>
                    </tr>
                  ) : (
                    renderCategoryTreeRows(topLevelCategories, '', 0)
                  );
                })()
              )
            ) : subTab === 'filmcategories' ? (
              filmCategories.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400">No Flash Films found. Click "+ New Flash Film" to create one.</td></tr>
              ) : (
                (() => {
                  const renderFilmTreeTableRows = (nodes: any[], parentName: string, level = 0): React.ReactNode => {
                    return nodes.map((fc: any) => {
                      const fcKey = 'fc_' + fc.id;
                      const isExpanded = expandedRows.has(fcKey);
                      const childFcs = filmCategories.filter((sub: any) => sub.parentId === fc.id);

                      return (
                        <React.Fragment key={fcKey}>
                          <tr className={`border-t border-slate-100 hover:bg-indigo-50/20 transition ${level === 0 ? 'bg-slate-50/70 border-t-2 border-slate-200 font-bold' : 'bg-white'}`}>
                            <td className="px-4 py-3 text-slate-900" style={{ paddingLeft: `${level * 20 + 16}px` }}>
                              <div className="flex items-center gap-2">
                                {childFcs.length > 0 ? (
                                  <button
                                    onClick={() => toggleRow(fcKey)}
                                    className="p-0.5 rounded hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                                  >
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                ) : (
                                  <div className="w-4 h-4 shrink-0" />
                                )}
                                <Tag className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className={`text-xs ${level === 0 ? 'font-black tracking-tight text-slate-900' : 'font-bold text-slate-700'}`}>{fc.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs italic">{level === 0 ? 'Top-Level' : parentName}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${fc.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {fc.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => { setModalItem({ parentId: fc.id }); setModalType('filmcategory'); }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                  title="Add Sub Category"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setModalItem(fc); setModalType('filmcategory'); }}
                                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                  title="Edit Category"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete({ id: fc.id, name: fc.name, type: 'filmcategory' })}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && childFcs.length > 0 && renderFilmTreeTableRows(childFcs, fc.name, level + 1)}
                        </React.Fragment>
                      );
                    });
                  };

                  const topLevelFilms = filmCategories.filter((fc: any) => !fc.parentId);
                  return topLevelFilms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No Flash Categories found. Click "+ New Flash Category" to create one.
                      </td>
                    </tr>
                  ) : (
                    renderFilmTreeTableRows(topLevelFilms, '', 0)
                  );
                })()
              )
            ) : (
              (() => {
                const renderMaterialTreeTableRows = (mcNodes: any[], parentName: string, level = 0): React.ReactNode => {
                  return mcNodes.map((mc: any) => {
                    const mcKey = 'm_mc_' + mc.id;
                    const isExpanded = expandedRows.has(mcKey);
                    const childMcs = materialCategories.filter((sub: any) => sub.parentId === mc.id);

                    const matchingFcIds = new Set(filmCategories.filter((fc: any) => fc.materialCategoryId === mc.id).map((fc: any) => fc.id));
                    const catMaterials = materials.filter((m: any) => 
                      m.filmCategory?.materialCategoryId === mc.id || 
                      m.filmCategory?.materialCategory?.id === mc.id || 
                      matchingFcIds.has(m.filmCategoryId)
                    );
                    const hasChildren = childMcs.length > 0 || catMaterials.length > 0;

                    return (
                      <React.Fragment key={mcKey}>
                        <tr className={`border-t border-slate-100 hover:bg-indigo-50/20 transition ${level === 0 ? 'bg-slate-50/80 border-t-2 border-slate-200 font-bold' : 'bg-white'}`}>
                          <td className="px-4 py-3 text-slate-900" style={{ paddingLeft: `${level * 20 + 16}px` }}>
                            <div className="flex items-center gap-2">
                              {hasChildren ? (
                                <button
                                  onClick={() => toggleRow(mcKey)}
                                  className="p-0.5 rounded hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              ) : (
                                <div className="w-4 h-4 shrink-0" />
                              )}
                              {level === 0 ? <Package2 className="w-4 h-4 text-indigo-600 shrink-0" /> : <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                              <span className={`text-xs ${level === 0 ? 'font-black tracking-tight text-slate-900' : 'font-bold text-slate-700'}`}>{mc.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/60 font-semibold text-slate-600">
                                {catMaterials.length} product{catMaterials.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-xs italic">{level === 0 ? 'Top-Level Material' : parentName}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">—</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${mc.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {mc.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => { setModalItem({ materialCategoryId: mc.id }); setModalType('material'); }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Add Flash Product under this Category"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setModalItem(mc); setModalType('materialcategory'); }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Material Category"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <>
                            {/* Child Material Categories */}
                            {childMcs.length > 0 && renderMaterialTreeTableRows(childMcs, mc.name, level + 1)}

                            {/* Direct Flash Products under this Material Category */}
                            {catMaterials.map((m: any) => (
                              <tr key={'m_' + m.id} className="border-t border-slate-100 hover:bg-indigo-50/30 transition bg-white">
                                <td className="px-4 py-2.5 text-slate-900" style={{ paddingLeft: `${(level + 1) * 20 + 16}px` }}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 shrink-0" />
                                    <Package2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span className="text-xs font-bold text-slate-800">{m.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-indigo-600 font-semibold text-xs">{m.filmCategory?.name || '—'}</td>
                                <td className="px-4 py-2.5 text-slate-600 text-xs">{m.layers || 1} Layer(s) {m.thickness && `(${m.thickness}mm)`}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${m.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {m.isActive !== false ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <button onClick={() => { setModalItem(m); setModalType('material'); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer" title="Edit Product"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => setConfirmDelete({ id: m.id, name: m.name, type: 'material' })} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer" title="Delete Product"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </React.Fragment>
                    );
                  });
                };

                const topLevelMcs = materialCategories.filter((m: any) => !m.parentId);
                const allMatchingFcIds = new Set(filmCategories.filter((fc: any) => !!fc.materialCategoryId).map((fc: any) => fc.id));
                const uncategorizedMaterials = materials.filter((m: any) => 
                  !m.filmCategory?.materialCategoryId && 
                  !m.filmCategory?.materialCategory?.id && 
                  !allMatchingFcIds.has(m.filmCategoryId)
                );

                if (topLevelMcs.length === 0 && uncategorizedMaterials.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No Flash Products found. Click "+ New Flash Product" to create one.
                      </td>
                    </tr>
                  );
                }

                return (
                  <>
                    {renderMaterialTreeTableRows(topLevelMcs, '', 0)}

                    {uncategorizedMaterials.length > 0 && (
                      <>
                        <tr className="bg-amber-50/60 border-t-2 border-amber-200 font-bold">
                          <td className="px-4 py-3 text-amber-900" colSpan={5}>
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="text-xs font-black uppercase tracking-tight text-amber-900">Uncategorized / Direct Flash Products</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-200/60 font-semibold text-amber-800">
                                {uncategorizedMaterials.length} product{uncategorizedMaterials.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </td>
                        </tr>
                        {uncategorizedMaterials.map((m: any) => (
                          <tr key={'m_uncat_' + m.id} className="border-t border-slate-100 hover:bg-slate-50 transition bg-white">
                            <td className="px-4 py-2.5 text-slate-900 pl-8">
                              <div className="flex items-center gap-2">
                                <Package2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="text-xs font-bold text-slate-800">{m.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-slate-400 italic text-xs">Uncategorized</td>
                            <td className="px-4 py-2.5 text-slate-600 text-xs">{m.layers || 1} Layer(s) {m.thickness && `(${m.thickness}mm)`}</td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${m.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                {m.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => { setModalItem(m); setModalType('material'); }} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer" title="Edit Product"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => setConfirmDelete({ id: m.id, name: m.name, type: 'material' })} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer" title="Delete Product"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </>
                );
              })()
            )}
          </tbody>
        </table>
      </div>

      {modalType === 'producttype' && <ProductTypeModal item={modalItem} onClose={() => { setModalType(null); setModalItem(null); }} onSave={() => { setModalType(null); setModalItem(null); loadAllData(); }} />}
      {modalType === 'materialcategory' && <MaterialCategoryModal item={modalItem} productTypes={productTypes} materialCategories={materialCategories} onClose={() => { setModalType(null); setModalItem(null); }} onSave={() => { setModalType(null); setModalItem(null); loadAllData(); }} />}
      {modalType === 'filmcategory' && <FilmCategoryModal item={modalItem} filmCategories={filmCategories} onClose={() => { setModalType(null); setModalItem(null); }} onSave={() => { setModalType(null); setModalItem(null); loadAllData(); }} />}
      {modalType === 'material' && <MaterialModal item={modalItem} filmCategories={filmCategories} materialCategories={materialCategories} onClose={() => { setModalType(null); setModalItem(null); }} onSave={() => { setModalType(null); setModalItem(null); loadAllData(); }} />}

      {confirmDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Item"
          message={`Are you sure you want to delete "${confirmDelete.name}"?`}
          confirmLabel="Delete"
          variant="danger"
          isLoading={isDeleting}
          errorMessage={deleteError || undefined}
          onConfirm={handleDelete}
          onClose={() => { setConfirmDelete(null); setDeleteError(null); }}
        />
      )}
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
  { id: 'packaged', label: 'Packaged Stock', icon: PackageCheck },
  { id: 'dispatch', label: 'Dispatch', icon: Truck },
  { id: 'filmtypes', label: 'Flash Products & Categories', icon: Tag },
];

export default function InventoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('packaged');
  const [initialReceiptId, setInitialReceiptId] = useState<string | null>(null);
  const [initialBatchSearch, setInitialBatchSearch] = useState<string | null>(null);
  const [showInward, setShowInward] = useState(false);
  const [inwardInitialId, setInwardInitialId] = useState<string | null>(null);

  const orgType = (user?.organization as any)?.organizationType?.name || user?.organization?.type || '';
  const isHQ = orgType === 'parent' || orgType === 'internal' || user?.isSuperAdmin;

  const userPerms = useMemo(() => user?.permissions || [], [user]);

  const hasTabAccess = useCallback((tabId: string) => {
    if (user?.isSuperAdmin) return true;

    const tabPermMap: Record<string, string[]> = {
      receipts: ['inventory_inward:read', 'inventory_inward:write', 'inward:read', 'inward:write'],
      batches: ['inventory_batches:read', 'inventory_batches:write'],
      workorders: ['inventory_workorders:read', 'inventory_workorders:write', 'production:read', 'production:write'],
      packaged: ['inventory_packaged:read', 'inventory_packaged:write'],
      dispatch: ['inventory_dispatch:read', 'inventory_dispatch:write', 'dispatch:read', 'dispatch:write'],
      filmtypes: ['inventory_filmtypes:read', 'inventory_filmtypes:write'],
    };

    const reqPerms = tabPermMap[tabId] || [];
    const hasSpecificPerm = reqPerms.some(p => userPerms.includes(p));
    if (hasSpecificPerm) return true;

    const allTabPerms = Object.values(tabPermMap).flat();
    const hasAnyTabSpecificAssigned = allTabPerms.some(p => userPerms.includes(p));

    if (hasAnyTabSpecificAssigned) return false;

    return userPerms.includes('inventory:read') || userPerms.includes('inventory:write');
  }, [user, userPerms]);

  const visibleTabs = useMemo(() => {
    return TABS.filter(t => hasTabAccess(t.id));
  }, [hasTabAccess]);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  const [stats, setStats] = useState({ receipts: 0, batches: 0, workOrders: 0, dispatches: 0, inTransit: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

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

  const loadStats = useCallback(() => {
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

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleInwardSaved = () => {
    setShowInward(false);
    setInwardInitialId(null);
    setRefreshKey(prev => prev + 1);
    loadStats();
  };

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
        <StatsCard icon={ClipboardList} label="Work Orders" value={stats.workOrders} color="bg-purple-500" />
        <StatsCard icon={Package} label="Total Batches" value={stats.batches} color="bg-indigo-500" />
        <StatsCard icon={Truck} label="Dispatch Orders" value={stats.dispatches} color="bg-blue-500" />
        <StatsCard icon={Zap} label="In Transit" value={stats.inTransit} color="bg-amber-500" />
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <TabBar tabs={visibleTabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === 'receipts' && <InwardReceiptsTab onReceiptClick={handleReceiptClick} onAddStock={handleAddStock} refreshKey={refreshKey} />}
        {activeTab === 'batches' && <BatchesTab initialReceiptId={initialReceiptId} onShowInward={() => { setInwardInitialId(null); setShowInward(true); }} onGoToWorkOrder={handleBatchToWorkOrder} refreshKey={refreshKey} />}
        {activeTab === 'workorders' && <WorkOrdersTab initialBatchSearch={initialBatchSearch} onClearSearch={() => setInitialBatchSearch(null)} />}
        {activeTab === 'packaged' && <PackagedTab refreshKey={refreshKey} onGoToWorkOrder={handleBatchToWorkOrder} />}
        {activeTab === 'dispatch' && <DispatchTab />}
        {activeTab === 'filmtypes' && <FilmTypesTab />}
      </div>

      {showInward && (
        <InwardProcurementModal
          initialInwardReceiptId={inwardInitialId}
          onClose={() => { setShowInward(false); setInwardInitialId(null); }}
          onSave={handleInwardSaved}
        />
      )}
    </div>
  );
}
