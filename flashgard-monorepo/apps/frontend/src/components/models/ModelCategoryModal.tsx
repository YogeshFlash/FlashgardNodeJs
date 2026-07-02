import React, { useState } from 'react';
import { X, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { modelCategoriesApi, filesApi } from '../../lib/api';

interface ModelCategoryModalProps {
  item: any;
  categories: any[];
  onClose: () => void;
  onSave: () => void;
}

function buildCategoryRows(categories: any[]) {
  const byParent = new Map<string, any[]>();
  const byId = new Map<string, any>();

  for (const cat of categories || []) {
    if (!cat?.id) continue;
    byId.set(cat.id, cat);
    const parentKey = cat.parentId || '__root__';
    const arr = byParent.get(parentKey) || [];
    arr.push(cat);
    byParent.set(parentKey, arr);
  }

  for (const arr of byParent.values()) {
    arr.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }

  const roots = (byParent.get('__root__') || []).slice();
  for (const cat of categories || []) {
    if (cat?.parentId && !byId.has(cat.parentId)) roots.push(cat);
  }

  const seenRootIds = new Set<string>();
  const dedupedRoots = roots.filter((c) =>
    c?.id && !seenRootIds.has(c.id) ? (seenRootIds.add(c.id), true) : false
  );

  const rows: { category: any; depth: number; hasChildren: boolean }[] = [];
  const visiting = new Set<string>();

  const walk = (node: any, depth: number) => {
    if (!node?.id) return;
    if (visiting.has(node.id)) return; // cycle guard
    visiting.add(node.id);

    const kids = byParent.get(node.id) || [];
    rows.push({ category: node, depth, hasChildren: kids.length > 0 });
    for (const child of kids) walk(child, depth + 1);

    visiting.delete(node.id);
  };

  dedupedRoots
    .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
    .forEach((r) => walk(r, 0));

  return rows;
}

const ModelCategoryModal: React.FC<ModelCategoryModalProps> = ({ item, categories, onClose, onSave }) => {
  const [form, setForm] = useState(item || { name: '', parentId: '', sortOrder: 0, imageUrl: '' });
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

  const [searchCategory, setSearchCategory] = useState('');
  const [isParentOpen, setIsParentOpen] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Pre-expand all categories by default so the tree is fully visible
    (categories || []).forEach((c: any) => {
      initial.add(c.id);
    });
    return initial;
  });

  const validParents = React.useMemo(() => {
    const excludedIds = new Set<string>();
    if (item?.id) {
      excludedIds.add(item.id);
      let currentLevelIds = [item.id];
      while (currentLevelIds.length > 0) {
        const children = (categories || []).filter((c: any) => c.parentId && currentLevelIds.includes(c.parentId));
        const childIds = children.map(c => c.id);
        if (childIds.length === 0) break;
        childIds.forEach(id => excludedIds.add(id));
        currentLevelIds = childIds;
      }
    }
    return (categories || []).filter((c: any) => !excludedIds.has(c.id));
  }, [categories, item?.id]);

  const filteredParents = React.useMemo(() => {
    const rows = buildCategoryRows(validParents);
    if (searchCategory) {
      return rows.filter((r: any) => r.category.name.toLowerCase().includes(searchCategory.toLowerCase())).slice(0, 150);
    }
    const catMap = new Map(validParents.map((c: any) => [c.id, c]));
    return rows.filter((row: any) => {
      let p = catMap.get(row.category.parentId);
      while (p) {
        if (!expandedCategories.has(p.id)) return false;
        p = catMap.get(p.parentId);
      }
      return true;
    });
  }, [validParents, searchCategory, expandedCategories]);

  const selectedParent = validParents.find((c: any) => c.id === form.parentId);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = { 
        ...form, 
        parentId: form.parentId === '' ? null : form.parentId 
      };
      if (item?.id) await modelCategoriesApi.update(item.id, data);
      else await modelCategoriesApi.create(data);
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold">{item ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={save} className="p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Category Name</label>
            <input 
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none"
              value={form.name} 
              onChange={e => setForm({ ...form, name: e.target.value })} 
              required 
              placeholder="e.g. Smartphones" 
            />
          </div>

          <div className="relative">
            <label className="text-sm font-medium text-slate-700 block mb-1">Parent Category</label>
            <div className="relative">
              <div 
                onClick={() => setIsParentOpen(!isParentOpen)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between cursor-pointer focus:ring-2 focus:ring-[var(--color-accent)]/20"
              >
                <span className="text-sm truncate">
                  {form.parentId ? (selectedParent?.name || 'Unknown') : 'None (Top-level)'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </div>
              {isParentOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsParentOpen(false)} />
                  <div className="absolute z-20 w-full bottom-full mb-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-100 bg-white">
                      <input 
                        autoFocus
                        type="text"
                        placeholder="Search categories..."
                        value={searchCategory}
                        onChange={e => setSearchCategory(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
                      {!searchCategory && (
                        <div
                          onClick={() => { setForm({ ...form, parentId: '' }); setIsParentOpen(false); setSearchCategory(''); }}
                          className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${!form.parentId ? 'bg-indigo-50 text-[var(--color-accent)] font-bold' : 'text-slate-700'}`}
                        >
                          None (Top-level)
                        </div>
                      )}
                      {filteredParents.map((row: any) => {
                        const c = row.category;
                        const depth = row.depth;
                        const hasChildren = row.hasChildren;
                        const isExpanded = expandedCategories.has(c.id);
                        return (
                          <div
                            key={c.id}
                            className={`flex items-center justify-between px-3 py-1 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${form.parentId === c.id ? 'bg-indigo-50 text-[var(--color-accent)] font-bold' : 'text-slate-700'}`}
                          >
                            <div
                              onClick={() => { setForm({ ...form, parentId: c.id }); setIsParentOpen(false); setSearchCategory(''); }}
                              className="flex-1 flex items-center min-w-0 py-1"
                            >
                              {!searchCategory ? (
                                <span className="whitespace-pre truncate">
                                  {'\u00A0'.repeat(depth * 3)}
                                  {depth > 0 ? '↳ ' : ''}
                                  {c.name}
                                </span>
                              ) : (
                                <span className="truncate">{c.name}</span>
                              )}
                            </div>
                            {!searchCategory && hasChildren && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedCategories(prev => {
                                    const next = new Set(prev);
                                    if (next.has(c.id)) next.delete(c.id);
                                    else next.add(c.id);
                                    return next;
                                  });
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 shrink-0"
                              >
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {filteredParents.length === 0 && <div className="p-3 text-sm text-slate-400 text-center">No results found</div>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Image URL / Filename</label>
            <div className="flex gap-2">
              <input 
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[var(--color-accent)]/20 outline-none"
                value={form.imageUrl || ''} 
                onChange={e => setForm({ ...form, imageUrl: e.target.value })} 
                placeholder="e.g. Phone.jpg" 
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

export default ModelCategoryModal;
