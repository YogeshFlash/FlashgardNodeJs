import React, { useEffect, useState } from 'react';
import { 
  Printer, Plus, Search, Loader2, AlertCircle, X, Shield, 
  CheckCircle, ArrowRight, History, FileText, Check, AlertTriangle
} from 'lucide-react';
import { plottersApi, orgsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export default function PlottersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin;

  // Active tab: 'registry' | 'procurement' | 'logs'
  const [activeTab, setActiveTab] = useState<'registry' | 'procurement' | 'logs'>('registry');

  // State lists
  const [plotters, setPlotters] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedPlotter, setSelectedPlotter] = useState<any | null>(null);
  const [plotterLogs, setPlotterLogs] = useState<any[]>([]);

  // Filtering & loading state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isDistributeOpen, setIsDistributeOpen] = useState(false);
  const [isQAOpen, setIsQAOpen] = useState(false);
  const [isDecommissionOpen, setIsDecommissionOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Distribution Form
  const [distOwnerId, setDistOwnerId] = useState('');
  const [distNotes, setDistNotes] = useState('');
  
  // QA Form
  const [qaStatus, setQaStatus] = useState<'TESTED_OK' | 'TEST_FAILED'>('TESTED_OK');
  const [qaNotes, setQaNotes] = useState('');

  // Decommission Form
  const [decomNotes, setDecomNotes] = useState('');

  // Procurement Form state
  const [poNumber, setPoNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [modelName, setModelName] = useState('');
  const [serialsText, setSerialsText] = useState('');
  const [poNotes, setPoNotes] = useState('');

  // Dropdown search for organizations
  const [orgSearchText, setOrgSearchText] = useState('');
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [plotterData, orgData] = await Promise.all([
        plottersApi.getAll(),
        orgsApi.getAll()
      ]);
      setPlotters(plotterData);
      setOrganizations(orgData);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch plotter data.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !modelName || !serialsText.trim()) {
      setError('Please fill all required fields.');
      return;
    }

    const serials = serialsText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (serials.length === 0) {
      setError('At least one serial number is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await plottersApi.create({
        purchaseOrderNumber: poNumber,
        supplierId,
        modelName,
        serialNumbers: serials,
        notes: poNotes,
      });
      setSuccess(`Successfully registered ${serials.length} plotter(s) in ORDERED status.`);
      
      // Reset Form
      setPoNumber('');
      setSupplierId('');
      setModelName('');
      setSerialsText('');
      setPoNotes('');
      setOrgSearchText('');

      await fetchData();
      setActiveTab('registry');
    } catch (err: any) {
      setError(err?.message || 'Failed to create procurement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotter) return;

    try {
      setSubmitting(true);
      setError(null);
      await plottersApi.updateQA(selectedPlotter.id, qaStatus, qaNotes);
      setSuccess(`Plotter ${selectedPlotter.serialNumber} QA status updated successfully.`);
      setIsQAOpen(false);
      setSelectedPlotter(null);
      setQaNotes('');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update QA status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotter || !distOwnerId) return;

    try {
      setSubmitting(true);
      setError(null);
      await plottersApi.distribute(selectedPlotter.id, distOwnerId, distNotes);
      setSuccess(`Plotter distributed successfully.`);
      setIsDistributeOpen(false);
      setSelectedPlotter(null);
      setDistOwnerId('');
      setDistNotes('');
      setOrgSearchText('');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to distribute plotter.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlotter) return;

    try {
      setSubmitting(true);
      setError(null);
      await plottersApi.decommission(selectedPlotter.id, decomNotes);
      setSuccess(`Plotter decommissioned successfully.`);
      setIsDecommissionOpen(false);
      setSelectedPlotter(null);
      setDecomNotes('');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to decommission plotter.');
    } finally {
      setSubmitting(false);
    }
  };

  const viewLogs = async (plotter: any) => {
    try {
      setLoading(true);
      setSelectedPlotter(plotter);
      const logs = await plottersApi.getLogs(plotter.id);
      setPlotterLogs(logs);
      setIsLogsOpen(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve history logs.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered Plotters List
  const filteredPlotters = plotters.filter(p => {
    const matchesSearch = 
      p.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.modelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.purchaseOrderNumber && p.purchaseOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === '' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: plotters.length,
    ordered: plotters.filter(p => p.status === 'ORDERED').length,
    testedOk: plotters.filter(p => p.status === 'TESTED_OK').length,
    inService: plotters.filter(p => p.status === 'ASSIGNED').length,
    failed: plotters.filter(p => p.status === 'TEST_FAILED').length,
    decommissioned: plotters.filter(p => p.status === 'DECOMMISSIONED').length,
  };

  // Filtered organizations for dropdown
  const filteredOrgs = organizations.filter(o => 
    o.name.toLowerCase().includes(orgSearchText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-7 h-7 text-indigo-600 animate-pulse" />
            Plotter Lifecycle Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track imported plotters from procurement order, QA testing, partner distribution, to active licenses.
          </p>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total Inventory', val: stats.total, color: 'border-l-slate-400 text-slate-700 bg-slate-50' },
          { label: 'Ordered / Import', val: stats.ordered, color: 'border-l-blue-500 text-blue-700 bg-blue-50' },
          { label: 'Pending QA / Passed', val: stats.testedOk, color: 'border-l-emerald-500 text-emerald-700 bg-emerald-50' },
          { label: 'Active In Service', val: stats.inService, color: 'border-l-indigo-500 text-indigo-700 bg-indigo-50' },
          { label: 'QA Failed', val: stats.failed, color: 'border-l-rose-500 text-rose-700 bg-rose-50' },
          { label: 'Retired', val: stats.decommissioned, color: 'border-l-amber-500 text-amber-700 bg-amber-50' },
        ].map((s, idx) => (
          <div key={idx} className={`p-4 rounded-xl border border-slate-200 border-l-4 shadow-sm ${s.color}`}>
            <span className="text-xs font-semibold text-slate-500 block truncate">{s.label}</span>
            <span className="text-2xl font-bold mt-1 block">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Notification Toast Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}</div>
          <button className="ml-auto text-rose-400 hover:text-rose-600" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start gap-3 animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{success}</div>
          <button className="ml-auto text-emerald-400 hover:text-emerald-600" onClick={() => setSuccess(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-1">
        <button
          onClick={() => setActiveTab('registry')}
          className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
            activeTab === 'registry' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Plotter Registry & Distribution
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('procurement')}
            className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition-all ${
              activeTab === 'procurement' 
                ? 'border-indigo-600 text-indigo-600' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Log Import Procurement
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Tab A: Registry / List */}
          {activeTab === 'registry' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by serial number, model, PO number..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="ORDERED">ORDERED</option>
                  <option value="TESTED_OK">TESTED OK</option>
                  <option value="TEST_FAILED">TEST FAILED</option>
                  <option value="DISTRIBUTED">DISTRIBUTED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="DECOMMISSIONED">DECOMMISSIONED</option>
                </select>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                      <th className="px-6 py-3">Serial Number</th>
                      <th className="px-6 py-3">Model Name</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Supplier / PO</th>
                      <th className="px-6 py-3">Current Owner</th>
                      <th className="px-6 py-3">Linked License</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredPlotters.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
                          No plotters found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredPlotters.map((plotter) => {
                        const statusColors: Record<string, string> = {
                          ORDERED: 'bg-blue-50 text-blue-700 border border-blue-200',
                          TESTED_OK: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
                          TEST_FAILED: 'bg-rose-50 text-rose-700 border border-rose-200',
                          DISTRIBUTED: 'bg-purple-50 text-purple-700 border border-purple-200',
                          ASSIGNED: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
                          DECOMMISSIONED: 'bg-slate-100 text-slate-600 border border-slate-200',
                        };
                        return (
                          <tr key={plotter.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-800">{plotter.serialNumber}</td>
                            <td className="px-6 py-4 text-slate-600">{plotter.modelName}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[plotter.status] || 'bg-slate-100'}`}>
                                {plotter.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-slate-800 font-medium">{plotter.supplier?.name || 'N/A'}</div>
                              {plotter.purchaseOrderNumber && (
                                <div className="text-xs text-slate-400 mt-0.5">PO: {plotter.purchaseOrderNumber}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-slate-600">{plotter.currentOwner?.name || 'HQ Warehouse'}</td>
                            <td className="px-6 py-4">
                              {plotter.currentLicense ? (
                                <div className="text-indigo-600 font-semibold truncate max-w-[150px]" title={plotter.currentLicense.key}>
                                  🔑 {plotter.currentLicense.licenseName || plotter.currentLicense.key.slice(0, 8) + '...'}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">Unlinked</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1">
                              {isSuperAdmin && plotter.status === 'ORDERED' && (
                                <button
                                  onClick={() => { setSelectedPlotter(plotter); setIsQAOpen(true); }}
                                  className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                                >
                                  QA Test
                                </button>
                              )}
                              {(plotter.status === 'TESTED_OK' || plotter.status === 'DISTRIBUTED') && (
                                <button
                                  onClick={() => { setSelectedPlotter(plotter); setIsDistributeOpen(true); }}
                                  className="px-2 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
                                >
                                  Distribute
                                </button>
                              )}
                              {plotter.status !== 'DECOMMISSIONED' && (
                                <button
                                  onClick={() => { setSelectedPlotter(plotter); setIsDecommissionOpen(true); }}
                                  className="px-2 py-1 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded hover:bg-rose-100 transition-colors"
                                >
                                  Retire
                                </button>
                              )}
                              <button
                                onClick={() => viewLogs(plotter)}
                                className="px-2 py-1 text-xs bg-slate-100 text-slate-700 border border-slate-200 rounded hover:bg-slate-200 transition-colors inline-flex items-center gap-1"
                              >
                                <History className="w-3 h-3" /> Logs
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab B: Log Procurement Form */}
          {activeTab === 'procurement' && isSuperAdmin && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm max-w-2xl">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 border-b pb-3">
                <FileText className="w-5 h-5 text-indigo-600" />
                Register New Import Procurement
              </h2>
              <form onSubmit={handleCreateProcurement} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">PO Number (Optional)</label>
                    <input
                      type="text"
                      value={poNumber}
                      onChange={e => setPoNumber(e.target.value)}
                      placeholder="e.g. PO-2026-001"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Model Name *</label>
                    <input
                      type="text"
                      required
                      value={modelName}
                      onChange={e => setModelName(e.target.value)}
                      placeholder="e.g. Roland GS-24"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Searchable Org Dropdown (Supplier) */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Supplier Organization *</label>
                  <div
                    onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm cursor-pointer hover:border-slate-300"
                  >
                    <span className="truncate">
                      {supplierId ? organizations.find(o => o.id === supplierId)?.name : 'Select Supplier'}
                    </span>
                    <ChevronDownIcon />
                  </div>
                  {showOrgDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowOrgDropdown(false)} />
                      <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
                        <div className="p-2 border-b border-slate-100 bg-white">
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search organization..."
                            value={orgSearchText}
                            onChange={e => setOrgSearchText(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
                          {filteredOrgs.length === 0 ? (
                            <div className="p-3 text-sm text-slate-400 text-center">No results</div>
                          ) : (
                            filteredOrgs.map(o => (
                              <div
                                key={o.id}
                                onClick={() => { setSupplierId(o.id); setShowOrgDropdown(false); setOrgSearchText(''); }}
                                className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${supplierId === o.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
                              >
                                {o.name}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Serial Numbers * (One per line)</label>
                  <textarea
                    required
                    rows={4}
                    value={serialsText}
                    onChange={e => setSerialsText(e.target.value)}
                    placeholder="Enter serial numbers, each on a new line"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Procurement Notes / Comments</label>
                  <textarea
                    rows={2}
                    value={poNotes}
                    onChange={e => setPoNotes(e.target.value)}
                    placeholder="Provide shipping, pricing, or configuration notes..."
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shadow"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Log Procurement
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* QA Test Action Modal */}
      {isQAOpen && selectedPlotter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsQAOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 relative z-10 animate-scale-up">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Perform QA Status Inspection
            </h3>
            <p className="text-xs text-slate-500 mt-1">Plotter Serial: {selectedPlotter.serialNumber}</p>
            <form onSubmit={handleQA} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Inspection Status Result</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setQaStatus('TESTED_OK')}
                    className={`py-2 px-3 border rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      qaStatus === 'TESTED_OK'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Check className="w-4 h-4" /> Pass QA
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaStatus('TEST_FAILED')}
                    className={`py-2 px-3 border rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                      qaStatus === 'TEST_FAILED'
                        ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <X className="w-4 h-4" /> Fail QA
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Inspection Calibration Notes</label>
                <textarea
                  rows={3}
                  value={qaNotes}
                  onChange={e => setQaNotes(e.target.value)}
                  placeholder="Record blade, cut force, speed test notes..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQAOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit QA Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Distribution Modal */}
      {isDistributeOpen && selectedPlotter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDistributeOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 relative z-10 animate-scale-up">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-indigo-600" />
              Distribute Plotter to Organization
            </h3>
            <p className="text-xs text-slate-500 mt-1">Plotter Serial: {selectedPlotter.serialNumber}</p>
            <form onSubmit={handleDistribute} className="mt-4 space-y-4">
              
              {/* Searchable Org Dropdown (Distribute target) */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Target Organization *</label>
                <div
                  onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-sm cursor-pointer hover:border-slate-300"
                >
                  <span className="truncate">
                    {distOwnerId ? organizations.find(o => o.id === distOwnerId)?.name : 'Select Distributor / Retailer'}
                  </span>
                  <ChevronDownIcon />
                </div>
                {showOrgDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowOrgDropdown(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden">
                      <div className="p-2 border-b border-slate-100 bg-white">
                        <input
                          autoFocus
                          type="text"
                          placeholder="Search organization..."
                          value={orgSearchText}
                          onChange={e => setOrgSearchText(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="overflow-y-auto p-1 max-h-48 custom-scrollbar">
                        {filteredOrgs.length === 0 ? (
                          <div className="p-3 text-sm text-slate-400 text-center">No results</div>
                        ) : (
                          filteredOrgs.map(o => (
                            <div
                              key={o.id}
                              onClick={() => { setDistOwnerId(o.id); setShowOrgDropdown(false); setOrgSearchText(''); }}
                              className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-slate-50 ${distOwnerId === o.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'}`}
                            >
                              {o.name}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Transfer Logistics / Notes</label>
                <textarea
                  rows={3}
                  value={distNotes}
                  onChange={e => setDistNotes(e.target.value)}
                  placeholder="Carrier service, shipping waybill, or transaction notes..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDistributeOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !distOwnerId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decommission Modal */}
      {isDecommissionOpen && selectedPlotter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsDecommissionOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 relative z-10 animate-scale-up">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Retire / Decommission Plotter
            </h3>
            <p className="text-xs text-slate-500 mt-1">Plotter Serial: {selectedPlotter.serialNumber}</p>
            <form onSubmit={handleDecommission} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Reason for Decommissioning *</label>
                <textarea
                  required
                  rows={3}
                  value={decomNotes}
                  onChange={e => setDecomNotes(e.target.value)}
                  placeholder="State reason e.g. Hardware damage, warranty end, active return..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDecommissionOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !decomNotes.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Retire Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Logs Modal */}
      {isLogsOpen && selectedPlotter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsLogsOpen(false)} />
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-2xl w-full p-6 relative z-10 flex flex-col max-h-[85vh] animate-scale-up">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  Lifecycle Logs & Assignment Trail
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Plotter: {selectedPlotter.modelName} (S/N: {selectedPlotter.serialNumber})</p>
              </div>
              <button className="text-slate-400 hover:text-slate-600" onClick={() => setIsLogsOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 mt-4 space-y-4 pr-2 custom-scrollbar">
              {plotterLogs.length === 0 ? (
                <div className="text-center text-slate-400 py-8">No action logs found for this plotter.</div>
              ) : (
                plotterLogs.map((log) => {
                  const logActionColors: Record<string, string> = {
                    CREATE_PO: 'bg-blue-100 text-blue-800',
                    QA_TEST: 'bg-emerald-100 text-emerald-800',
                    DISTRIBUTE: 'bg-purple-100 text-purple-800',
                    ASSIGN_LICENSE: 'bg-indigo-100 text-indigo-800',
                    REASSIGN_LICENSE: 'bg-amber-100 text-amber-800',
                    DECOMMISSION: 'bg-rose-100 text-rose-800',
                  };
                  return (
                    <div key={log.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${logActionColors[log.action] || 'bg-slate-200'}`}>
                          {log.action}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      
                      <p className="text-sm text-slate-700 mt-2 font-medium">{log.notes || 'No description provided.'}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200/50 text-xs text-slate-500">
                        <div>
                          {log.fromOwner && (
                            <div>From Owner: <span className="font-semibold text-slate-700">{log.fromOwner.name}</span></div>
                          )}
                          {log.fromLicense && (
                            <div>Prev License: <span className="font-semibold text-indigo-600">🔑 {log.fromLicense.licenseName || log.fromLicense.key.slice(0, 8)}</span></div>
                          )}
                        </div>
                        <div>
                          {log.toOwner && (
                            <div>To Owner: <span className="font-semibold text-slate-700">{log.toOwner.name}</span></div>
                          )}
                          {log.toLicense && (
                            <div>New License: <span className="font-semibold text-indigo-600">🔑 {log.toLicense.licenseName || log.toLicense.key.slice(0, 8)}</span></div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 mt-2 text-right">
                        Performed By: {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
