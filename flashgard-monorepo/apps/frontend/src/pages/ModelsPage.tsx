import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ChevronLeft,
  Smartphone, 
  Box, 
  Boxes, 
  Scissors,
  X,
  FileCode,
  Upload,
  RefreshCw,
  Image,
  Wand2,
  Loader2,
  Check
} from 'lucide-react';
import { 
  modelsApi, 
  brandsApi, 
  modelCategoriesApi, 
  cutPatternsApi,
  modelCutFilesApi,
  migrationApi
} from '../lib/api';
import ModelModal from '../components/models/ModelModal';
import BrandModal from '../components/models/BrandModal';
import ModelCategoryModal from '../components/models/ModelCategoryModal';
import CutPatternModal from '../components/models/CutPatternModal';
import UploadCutFileModal from '../components/models/UploadCutFileModal';
import PreviewModal from '../components/models/PreviewModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { HasPermission } from '../components/HasPermission';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

type TabType = 'catalog' | 'categories' | 'brands' | 'patterns' | 'designs';

const ModelsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('categories');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [totalModels, setTotalModels] = useState(0);
  const [cutPatterns, setCutPatterns] = useState<any[]>([]);
  const [cutFiles, setCutFiles] = useState<any[]>([]);
  const [allDesigns, setAllDesigns] = useState<any[]>([]);
  const [designsTotal, setDesignsTotal] = useState(0);
  const [designsPage, setDesignsPage] = useState(1);
  const [activeCombinations, setActiveCombinations] = useState<{categoryId: string, brandId: string}[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const [modal, setModal] = useState<{ type: string; data: any } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<any>({ isOpen: false });
  const [normalizingId, setNormalizingId] = useState<string | null>(null);
  const [normalizedId, setNormalizedId] = useState<string | null>(null);

  const S3_CATALOG_BASE = 'https://flash-buk-01.s3.ap-south-1.amazonaws.com/ScratchGardImages/Uploads/Owner/Catalog';

  const getImageUrl = (url: string, name?: string) => {
    if (!url) {
      if (!name) return '';
      const formattedName = name[0].toUpperCase() + name.substring(1).toLowerCase();
      return `${S3_CATALOG_BASE}/${formattedName}.jpg`;
    }
    if (url.startsWith('http')) return url;
    // Plain filename (e.g. "Phone.jpg") → resolve to S3 catalog path
    if (!url.includes('/')) return `${S3_CATALOG_BASE}/${url}`;
    // Remove leading slash if present to prevent double slashes with API_BASE
    const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
    return `${API_BASE.replace('/api', '')}/${cleanUrl}`;
  };

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    try {
      const [ca, br, cp] = await Promise.all([
        modelCategoriesApi.getAll(),
        brandsApi.getAll(),
        cutPatternsApi.getAll()
      ]);
      setCategories(ca || []);
      setBrands(br || []);
      setCutPatterns(cp || []);

      try {
        const ac = await modelsApi.getActiveCombinations();
        setActiveCombinations(ac || []);
      } catch (acError) {
        console.error('Error fetching active combinations:', acError);
        setActiveCombinations([]);
      }
    } catch (error) {
      console.error('Error fetching master data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const { items, total } = await modelsApi.getAll(
        selectedBrandId || undefined, 
        selectedCategoryId || undefined, 
        searchTerm, 
        skip, 
        itemsPerPage
      );
      setModels(items);
      setTotalModels(total);
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, itemsPerPage, selectedBrandId, selectedCategoryId]);

  const fetchModelDetails = async (id: string) => {
    try {
      const data = await modelsApi.getOne(id);
      setSelected(data);
      setCutFiles(data.cutFiles || []);
    } catch (error) {
      console.error('Error fetching model details:', error);
    }
  };

  const fetchGlobalDesigns = useCallback(async () => {
    try {
      const skip = (designsPage - 1) * itemsPerPage;
      const res = await modelCutFilesApi.getAll(undefined, searchTerm, skip, itemsPerPage);
      setAllDesigns(res.items);
      setDesignsTotal(res.total);
    } catch (error) {
      console.error('Error fetching global designs:', error);
    }
  }, [designsPage, searchTerm, itemsPerPage]);

  const handleNormalize = async (id: string, modelId: string) => {
    setNormalizingId(id);
    try {
      await modelCutFilesApi.normalize(id);
      setNormalizedId(id);
      fetchModelDetails(modelId);
      setTimeout(() => setNormalizedId(null), 3000);
    } catch (error) {
      console.error('Error normalizing cut file:', error);
    } finally {
      setNormalizingId(null);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  useEffect(() => {
    if (activeTab === 'catalog') fetchModels();
    if (activeTab === 'designs') fetchGlobalDesigns();
  }, [activeTab, fetchModels, fetchGlobalDesigns]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, selectedBrandId, selectedCategoryId]);

  const handleDelete = (title: string, message: string, onConfirm: () => Promise<void>) => {
    setConfirm({
      isOpen: true,
      title,
      message,
      isLoading: false,
      onConfirm: async () => {
        setConfirm((c: any) => ({ ...c, isLoading: true }));
        try {
          await onConfirm();
          fetchMasterData();
          if (activeTab === 'catalog') fetchModels();
          setConfirm({ isOpen: false });
        } catch (error) {
          console.error('Error deleting:', error);
          setConfirm((c: any) => ({ ...c, isLoading: false }));
        }
      }
    });
  };

  const handleGenerateModelPreview = async (modelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await migrationApi.generateDesignImagesForModel(modelId);
      if (selected && selected.id === modelId) {
        fetchModelDetails(modelId);
      }
      if (activeTab === 'catalog') {
        fetchModels();
      }
    } catch (err) {
      console.error('Failed to generate preview for model', err);
    }
  };

  const handleGenerateCutFilePreview = async (cutFileId: string, modelId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await migrationApi.generateDesignImageForCutFile(cutFileId);
      if (selected && selected.id === modelId) {
        fetchModelDetails(modelId);
      }
    } catch (err) {
      console.error('Failed to generate preview for cut file', err);
    }
  };

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const treeRows = useMemo(() => {
    const rows: any[] = [];
    const mainModelCat = categories.find(c => c.name === 'Main Model' && c.parentId === null);
    const startParentId = mainModelCat ? mainModelCat.id : null;

    const buildTree = (parentId: string | null, depth: number) => {
      const children = categories
        .filter(c => c.parentId === parentId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      
      children.forEach(cat => {
        rows.push({ type: 'category', data: cat, depth });
        if (expandedIds.has(cat.id)) {
          buildTree(cat.id, depth + 1);
          if (depth >= 0) { 
             const activeBrandIds = activeCombinations.filter(ac => ac.categoryId === cat.id).map(ac => ac.brandId);
             brands
               .filter(b => activeBrandIds.includes(b.id))
               .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
               .forEach(brand => {
                  rows.push({ type: 'brand', data: brand, depth: depth + 1, categoryId: cat.id });
               });
          }
        }
      });
    };
    buildTree(startParentId, 0);
    return rows;
  }, [categories, brands, expandedIds, activeCombinations]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab !== 'catalog') setSelected(null);
  };

  const tabs: { id: TabType; label: string; icon: any; count: number }[] = [
    { id: 'categories', label: 'Categories', icon: Boxes, count: categories.length },
    { id: 'brands', label: 'Brands', icon: Box, count: brands.length },
    { id: 'catalog', label: 'Models', icon: Smartphone, count: totalModels },
    { id: 'patterns', label: 'Patterns', icon: Scissors, count: cutPatterns.length },
    { id: 'designs', label: 'Designs', icon: FileCode, count: designsTotal },
  ];

  const filteredItems = useMemo(() => {
    if (activeTab === 'catalog') return models; 
    const list = 
      activeTab === 'categories' ? categories : 
      activeTab === 'brands' ? brands : 
      cutPatterns;
    if (!searchTerm) return list;
    return list.filter((item: any) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [activeTab, categories, brands, models, cutPatterns, searchTerm]);

  const totalPages = useMemo(() => {
    const totalCount = activeTab === 'catalog' ? totalModels : filteredItems.length;
    return Math.ceil(totalCount / itemsPerPage);
  }, [activeTab, totalModels, filteredItems.length, itemsPerPage]);

  const paginatedItems = useMemo(() => {
    if (activeTab === 'catalog') return filteredItems; 
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [activeTab, filteredItems, currentPage, itemsPerPage]);

  const TabBar = ({ tabs, active, onChange }: { tabs: { id: string; label: string; icon: any; count: number }[]; active: string; onChange: (t: any) => void }) => (
    <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="flex overflow-x-auto no-scrollbar px-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { onChange(tab.id); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all whitespace-nowrap border-b-2 
              ${active === tab.id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent)]/5'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            <tab.icon className={`w-3.5 h-3.5 ${active === tab.id ? 'text-[var(--color-accent)]' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold 
              ${active === tab.id ? 'bg-[var(--color-accent)] text-white' : 'bg-slate-100 text-slate-500'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-6 -mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {modal && (
        <>
          {modal.type === 'categories' && <ModelCategoryModal item={modal.data} categories={categories} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchMasterData(); }} />}
          {modal.type === 'brands' && <BrandModal item={modal.data} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchMasterData(); }} />}
          {modal.type === 'catalog' && <ModelModal item={modal.data} brands={brands} categories={categories} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchModels(); }} />}
          {modal.type === 'patterns' && <CutPatternModal item={modal.data} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchMasterData(); }} />}
          {modal.type === 'upload' && <UploadCutFileModal model={modal.data} cutPatterns={cutPatterns} onClose={() => setModal(null)} onSave={() => { setModal(null); fetchModelDetails(modal.data.id); }} />}
        </>
      )}

      {previewImage && <PreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />}

      <div className={`hidden lg:flex transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} border-r border-slate-200 bg-slate-50 flex-col shrink-0`}>
        <div className="p-3 border-b border-slate-200 bg-white flex items-center justify-between">
          {!isSidebarCollapsed && (
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 truncate">
              <Filter className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Catalog Tree
            </h2>
          )}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors mx-auto lg:mx-0"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {treeRows.map((row, idx) => (
              <div 
                key={`${row.type}-${row.data.id}-${idx}`}
                style={{ paddingLeft: `${row.depth * 1}rem` }}
                onClick={() => {
                  if (row.type === 'category') {
                    toggleExpand(row.data.id);
                    setSelectedCategoryId(row.data.id);
                    setSelectedBrandId(null);
                    setActiveTab('catalog');
                    setSelected(null);
                  }
                  if (row.type === 'brand') {
                    setSelectedCategoryId(row.categoryId);
                    setSelectedBrandId(row.data.id);
                    setActiveTab('catalog');
                    setSelected(null);
                  }
                }}
                className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                  ((row.type === 'brand' && selectedBrandId === row.data.id && selectedCategoryId === row.categoryId) ||
                   (row.type === 'category' && selectedCategoryId === row.data.id && !selectedBrandId))
                  ? 'bg-indigo-50 text-[var(--color-accent)]' 
                  : 'hover:bg-white text-slate-600'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={isSidebarCollapsed ? row.data.name : ''}
              >
                {row.type === 'category' ? (
                  <div className="relative">
                    <ChevronRight className={`w-3 h-3 transition-transform ${expandedIds.has(row.data.id) ? 'rotate-90' : ''}`} />
                    {isSidebarCollapsed && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--color-accent)] rounded-full border-2 border-slate-50" />
                    )}
                  </div>
                ) : (
                  <Box className={`w-3 h-3 ${isSidebarCollapsed ? 'w-4 h-4' : 'opacity-40'}`} />
                )}
                {!isSidebarCollapsed && (
                  <span className={`text-[11px] font-medium truncate ${row.type === 'category' ? 'uppercase tracking-wider font-bold text-slate-900' : ''}`}>
                    {row.data.name}
                  </span>
                )}
              </div>
            ))}
            
            {!isSidebarCollapsed && (selectedBrandId || selectedCategoryId) && (
              <button 
                onClick={() => {
                    setSelectedCategoryId(null);
                    setSelectedBrandId(null);
                    setSearchTerm('');
                }}
                className="w-full mt-4 p-2 text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 border border-dashed border-slate-200 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {!isSidebarCollapsed && (
          <div className="p-4 border-t border-slate-200 bg-white">
            <HasPermission permission="catalog:write">
              <button 
                onClick={() => setModal({ type: 'categories', data: null })}
                className="w-full py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> New Category
              </button>
            </HasPermission>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col bg-slate-50/30 min-h-0">
        {!selected && (
          <div className="flex-shrink-0">
            <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900 capitalize shrink-0">Manage {activeTab}</h2>
              <div className="flex items-center gap-4 flex-1 justify-end">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {activeTab !== 'designs' && (
                  <HasPermission permission="catalog:write">
                    <button 
                      onClick={() => setModal({ type: activeTab, data: null })}
                      className="px-4 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> New {activeTab === 'catalog' ? 'Model' : activeTab.slice(0, -1)}
                    </button>
                  </HasPermission>
                )}
              </div>
            </div>
            <TabBar tabs={tabs} active={activeTab} onChange={handleTabChange} />
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'catalog' && selected ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-start justify-between flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Models</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-[var(--color-accent)]">{selected.name}</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">{selected.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-[var(--color-accent)] rounded-full text-[10px] font-black uppercase tracking-widest">{selected.category?.name}</span>
                    {selected.brand && (
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">{selected.brand.name}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <HasPermission permission="catalog:write">
                    <button onClick={() => setModal({ type: 'upload', data: selected })} className="btn-primary flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Add Cut File
                    </button>
                  </HasPermission>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-xl flex flex-col md:flex-row gap-6 md:gap-10">
                  <div className="w-48 h-48 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selected.imageUrl ? (
                      <img src={getImageUrl(selected.imageUrl)} alt={selected.name} className="w-full h-full object-contain p-4" />
                    ) : (
                      <Smartphone className="w-16 h-16 text-slate-200" />
                    )}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Specifications</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Brand</p>
                          <p className="text-sm font-bold text-slate-700">{selected.brand?.name || 'N/A'}</p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Category</p>
                          <p className="text-sm font-bold text-slate-700">{selected.category?.name}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-indigo-500" /> Associated Cut Files
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-4">Preview</th>
                      <th className="px-8 py-4">Pattern Name</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {cutFiles.map(file => (
                        <tr key={file.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="px-8 py-4">
                            {file.designFilePath ? (
                              <div className="w-16 h-16 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden cursor-pointer" onClick={() => setPreviewImage(getImageUrl(file.designFilePath))}>
                                <img src={getImageUrl(file.designFilePath)} alt="Preview" className="w-full h-full object-contain p-2" />
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center"><Scissors className="w-4 h-4 text-slate-200" /></div>
                            )}
                          </td>
                          <td className="px-8 py-4">
                            <p className="font-black text-slate-900 uppercase tracking-wider">{file.cutPattern?.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">LEGACY ID: {file.legacyId}</p>
                          </td>
                          <td className="px-8 py-4 text-right">
                            <HasPermission permission="catalog:write">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={(e) => handleGenerateCutFilePreview(file.id, selected.id, e)} 
                                  title="Generate Preview"
                                  className="p-1.5 text-slate-400 hover:text-indigo-600"
                                >
                                  <Image className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleNormalize(file.id, selected.id)} 
                                  disabled={normalizingId === file.id}
                                  title="Correct PLT (Normalize)"
                                  className={`p-1.5 transition-all duration-200 ${
                                    normalizedId === file.id 
                                      ? 'text-emerald-600' 
                                      : 'text-slate-400 hover:text-amber-600'
                                  }`}
                                >
                                  {normalizingId === file.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : normalizedId === file.id ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Wand2 className="w-4 h-4" />
                                  )}
                                </button>
                                <button onClick={() => handleDelete('Delete Cut File', 'Are you sure?', async () => { await modelCutFilesApi.remove(file.id); fetchModelDetails(selected.id); })} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>

                              </div>
                            </HasPermission>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Designs Tab */}
              {activeTab === 'designs' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                  <div className="px-6 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Showing {Math.min(designsTotal, (designsPage - 1) * itemsPerPage + 1)} - {Math.min(designsTotal, designsPage * itemsPerPage)} of {designsTotal}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDesignsPage(p => Math.max(1, p - 1))}
                        disabled={designsPage === 1}
                        className="p-1.5 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDesignsPage(p => p + 1)}
                        disabled={designsPage * itemsPerPage >= designsTotal}
                        className="p-1.5 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Model & Brand</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Cut Pattern</th>
                          <th className="px-6 py-4">Order</th>
                          <th className="px-6 py-4">Legacy ID</th>
                          <th className="px-6 py-4">Created At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allDesigns.map((design) => (
                          <tr key={design.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                                  <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{design.model?.name}</p>
                                  <p className="text-xs text-slate-500">{design.model?.brand?.name}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                                {design.model?.category?.name}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-indigo-600 font-bold">
                                <Scissors className="w-3 h-3" />
                                {design.cutPattern?.name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] font-bold">
                                {design.cutPattern?.sortOrder || 0}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-slate-400">
                              {design.legacyId}
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {new Date(design.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Designs Pagination */}
                  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                      Showing {Math.min(designsTotal, (designsPage - 1) * itemsPerPage + 1)} to{' '}
                      {Math.min(designsTotal, designsPage * itemsPerPage)} of{' '}
                      {designsTotal} designs
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDesignsPage(p => Math.max(1, p - 1))}
                        disabled={designsPage === 1}
                        className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDesignsPage(p => p + 1)}
                        disabled={designsPage * itemsPerPage >= designsTotal}
                        className="p-2 border rounded-lg border-slate-200 bg-white disabled:opacity-50 hover:bg-slate-50 transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab !== 'designs' && (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Manage {activeTab}</h2>
                    {(selectedBrandId || selectedCategoryId) && (
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-indigo-50 text-[var(--color-accent)] rounded-full text-xs font-bold flex items-center gap-2">
                          Filtered <X className="w-3 h-3 cursor-pointer" onClick={() => { setSelectedBrandId(null); setSelectedCategoryId(null); }} />
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {totalPages > 1 && (
                      <div className="px-6 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border rounded-lg disabled:opacity-50 bg-white hover:bg-slate-50"><ChevronLeft className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border rounded-lg disabled:opacity-50 bg-white hover:bg-slate-50"><ChevronRight className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            {activeTab !== 'patterns' && <th className="px-6 py-4">Image</th>}
                            <th className="px-6 py-4">Name</th>
                            {activeTab === 'catalog' && <th className="px-6 py-4">Brand</th>}
                            {activeTab === 'patterns' && <th className="px-6 py-4">Cut For</th>}
                            {['categories', 'brands', 'patterns', 'catalog'].includes(activeTab) && <th className="px-6 py-4">Order</th>}
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loading ? (
                            <tr><td colSpan={10} className="p-10 text-center"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-300" /></td></tr>
                          ) : paginatedItems.length === 0 ? (
                            <tr><td colSpan={10} className="p-10 text-center text-slate-400">No items found.</td></tr>
                          ) : paginatedItems.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                              {activeTab !== 'patterns' && (
                                <td className="px-6 py-4">
                                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => setPreviewImage(getImageUrl(item.imageUrl, item.name))}>
                                    <img 
                                      src={getImageUrl(item.imageUrl, item.name)} 
                                      alt={item.name} 
                                      className="w-full h-full object-contain p-1"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                                        const sibling = e.currentTarget.nextElementSibling;
                                        if (sibling) (sibling as HTMLElement).style.display = 'flex';
                                      }}
                                    />
                                    <div style={{ display: 'none' }} className="w-full h-full items-center justify-center text-slate-300">
                                      {activeTab === 'catalog' ? <Smartphone className="w-5 h-5" /> : <Box className="w-5 h-5" />}
                                    </div>
                                  </div>
                                </td>
                              )}
                              <td className="px-6 py-4 font-bold">
                                {activeTab === 'catalog' ? (
                                  <button onClick={() => fetchModelDetails(item.id)} className="hover:text-[var(--color-accent)] text-left">{item.name}</button>
                                ) : <span>{item.name}</span>}
                              </td>
                              {activeTab === 'catalog' && <td className="px-6 py-4 text-slate-500">{item.brand?.name || '-'}</td>}
                              {activeTab === 'patterns' && <td className="px-6 py-4 text-slate-500">{item.cutFor === 1 ? 'Mobile' : 'Other'}</td>}
                              {['categories', 'brands', 'patterns', 'catalog'].includes(activeTab) && (
                                <td className="px-6 py-4">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-400 rounded text-[10px] font-bold">
                                    {item.sortOrder || 0}
                                  </span>
                                </td>
                              )}
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    item.isActive === false 
                                      ? 'bg-rose-500' 
                                      : 'bg-emerald-500'
                                  }`} />
                                  {item.isActive === false ? 'Inactive' : 'Active'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {activeTab === 'catalog' && (
                                    <button 
                                      onClick={(e) => handleGenerateModelPreview(item.id, e)} 
                                      title="Generate Previews"
                                      className="p-1.5 text-slate-400 hover:text-indigo-600"
                                    >
                                      <Image className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button onClick={() => setModal({ type: activeTab, data: item })} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => handleDelete('Delete', 'Are you sure?', async () => { 
                                    if (activeTab === 'categories') await modelCategoriesApi.remove(item.id);
                                    else if (activeTab === 'brands') await brandsApi.remove(item.id);
                                    else if (activeTab === 'catalog') await modelsApi.remove(item.id);
                                    else await cutPatternsApi.remove(item.id);
                                  })} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Page {currentPage} of {totalPages}</p>
                        <div className="flex gap-2">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border rounded-lg disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

      <ConfirmDialog isOpen={confirm.isOpen} title={confirm.title} message={confirm.message} isLoading={confirm.isLoading} onConfirm={confirm.onConfirm} onClose={() => setConfirm({ isOpen: false })} />
    </div>
  );
};

export default ModelsPage;
