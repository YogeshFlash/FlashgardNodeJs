import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Key, Cpu, Layers, Loader2, Search, Calendar, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { licensesApi } from '../lib/api';

const Card = ({ title, value, change, icon: Icon, colorClass, shadowClass }: any) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[140px] overflow-hidden">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight break-words">{value}</p>
      </div>
      <div className={`p-3 rounded-xl flex-shrink-0 ${colorClass} ${shadowClass} shadow-lg text-white`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    {change && (
      <div className="mt-3 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
          <TrendingUp className="w-3 h-3" /> {change}
        </span>
        <span className="text-[10px] text-slate-400 font-medium">vs last month</span>
      </div>
    )}
  </div>
);

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'modelReport'>('overview');
  
  // Overview Tab Stats
  const [range, setRange] = useState<number>(6);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Model Wise Cut Report Tab States
  const [reportItems, setReportItems] = useState<any[]>([]);
  const [reportTotal, setReportTotal] = useState<number>(0);
  const [reportLoading, setReportLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [skip, setSkip] = useState<number>(0);
  const [take] = useState<number>(20);
  const [exporting, setExporting] = useState<boolean>(false);

  // Fetch Overview Stats
  useEffect(() => {
    if (activeTab === 'overview') {
      setLoading(true);
      licensesApi.getReportsStats(undefined, range)
        .then((res) => {
          setData(res);
          setError('');
        })
        .catch((err) => {
          setError(err.message || 'Failed to load report stats');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [range, activeTab]);

  // Fetch Model Wise Cut Report items
  const fetchReport = () => {
    setReportLoading(true);
    licensesApi.getReportsCutReport({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      skip,
      take
    })
      .then((res: any) => {
        setReportItems(res.items || []);
        setReportTotal(res.total || 0);
      })
      .catch((err: any) => {
        console.error('Failed to load report:', err);
      })
      .finally(() => {
        setReportLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'modelReport') {
      fetchReport();
    }
  }, [startDate, endDate, search, skip, take, activeTab]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await licensesApi.getReportsCutReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
        skip: 0,
        take: 100000 // fetch all matching items up to 100k
      });

      const headers = [
        'Category Name', 'Brand', 'Model', 'Dealer / LFR', 'License Key', 
        'License Ref Name', 'Film Category', 'Product Name', 
        'Cut Type', 'Plotter', 'Updated Date', 'Parent Dealer', 'Promoter Name', 
        'Cut QRCode', 'Cut status', 'Cut Review'
      ];

      const rows = res.items.map((item: any) => [
        item.categoryName,
        item.brand,
        item.model,
        item.dealer,
        item.licenseKey,
        item.licenseRefName,
        item.filmCategory,
        item.productName,
        item.cutType,
        item.plotter,
        new Date(item.updatedDate).toLocaleString(),
        item.parentDealer,
        item.promoterName,
        item.cutQRCode,
        item.cutStatus,
        item.cutReview
      ]);

      const csvString = [
        headers.join(','),
        ...rows.map((e: any[]) => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))
      ].join('\r\n');

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Model_Wise_Cut_Report_${new Date().toISOString().substring(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to export CSV: ' + (err.message || err));
    } finally {
      setExporting(false);
    }
  };

  const handlePrevPage = () => {
    if (skip - take >= 0) {
      setSkip(skip - take);
    }
  };

  const handleNextPage = () => {
    if (skip + take < reportTotal) {
      setSkip(skip + take);
    }
  };

  const currentPage = Math.floor(skip / take) + 1;
  const totalPages = Math.ceil(reportTotal / take) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">System Reports</h1>
            <p className="text-slate-500 text-sm">Monitor platform metrics, cutting analytics, and software distribution.</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Analytics Overview
          </button>
          <button
            onClick={() => setActiveTab('modelReport')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'modelReport' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Model Wise Cut Report
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm font-semibold text-slate-500">Loading platform reports...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <button
                onClick={() => setRange(range)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
               {/* Grid of stats */}
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 <Card 
                   title="Total Cuts" 
                   value={data?.totalCuts?.toLocaleString() ?? '0'} 
                   icon={Cpu} 
                   colorClass="bg-indigo-600" 
                   shadowClass="shadow-indigo-500/20"
                 />
                 <Card 
                   title="Active Licenses" 
                   value={data?.activeLicenses?.toLocaleString() ?? '0'} 
                   icon={Key} 
                   colorClass="bg-blue-600" 
                   shadowClass="shadow-blue-500/20"
                 />
                 <Card 
                   title="Distributed Credits" 
                   value={data?.distributedCredits?.toLocaleString() ?? '0'} 
                   icon={Layers} 
                   colorClass="bg-amber-600" 
                   shadowClass="shadow-amber-500/20"
                 />
               </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left widget: cutting activity */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">Cuts Trend</h3>
                      <p className="text-slate-400 text-xs font-medium">Monthly cutting volume analysis</p>
                    </div>
                    <select 
                      value={range}
                      onChange={(e) => setRange(Number(e.target.value))}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={6}>Last 6 Months</option>
                      <option value={12}>Last 12 Months</option>
                    </select>
                  </div>
                  
                  <div className="h-64 flex items-end gap-2 sm:gap-4 pt-4 relative">
                    {data?.cutsTrend && data.cutsTrend.length > 0 ? (() => {
                      const maxVal = Math.max(...data.cutsTrend.map((d: any) => d.value), 1);
                      return data.cutsTrend.map((bar: any, idx: number) => {
                        const isLatest = idx === data.cutsTrend.length - 1;
                        const isSecondLatest = idx === data.cutsTrend.length - 2;
                        let colorClass = 'bg-slate-200 hover:bg-slate-300';
                        if (isLatest) {
                          colorClass = 'bg-indigo-600 shadow-lg shadow-indigo-600/20';
                        } else if (isSecondLatest) {
                          colorClass = 'bg-indigo-500 shadow-lg shadow-indigo-500/10';
                        }
                        const pct = (bar.value / maxVal) * 80 + 10;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full justify-end min-w-0">
                            <div className="w-full flex justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1 whitespace-nowrap z-10">
                              {bar.value.toLocaleString()}
                            </div>
                            <div 
                              className={`w-full rounded-t-lg transition-all group-hover:scale-x-105 ${colorClass}`} 
                              style={{ height: bar.value > 0 ? `${pct}%` : '4%' }}
                            />
                            <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate w-full text-center">{bar.month}</span>
                          </div>
                        );
                      });
                    })() : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                        No cutting logs recorded in this period.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right widget: license distribution */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-800 text-lg">License Distribution</h3>
                    <p className="text-slate-400 text-xs font-medium">Breakdown by plan tier</p>
                  </div>

                  <div className="space-y-4">
                    {data?.licenseDistribution && data.licenseDistribution.length > 0 ? (() => {
                      const total = data.licenseDistribution.reduce((acc: number, item: any) => acc + item.count, 0);
                      return data.licenseDistribution.map((item: any) => {
                        const pctVal = total > 0 ? Math.round((item.count / total) * 100) : 0;
                        const pct = `${pctVal}%`;
                        let color = 'bg-slate-300';
                        if (item.type === 'PRO') color = 'bg-indigo-600';
                        else if (item.type === 'ADVANCED') color = 'bg-blue-600';
                        else if (item.type === 'BASIC') color = 'bg-slate-400';

                        const tierName = item.type.charAt(0) + item.type.slice(1).toLowerCase() + ' Licenses';

                        return (
                          <div key={item.type} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-bold text-slate-700">{tierName}</span>
                              <span className="text-slate-500 font-semibold">{item.count.toLocaleString()} ({pct})</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${color}`} style={{ width: pct }} />
                            </div>
                          </div>
                        );
                      });
                    })() : (
                      <div className="text-center text-slate-400 text-sm py-8">
                        No active licenses found.
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                    <span>Total Tiers</span>
                    <span>{data?.licenseDistribution?.length || 0} Levels</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* Model Wise Cut Report Tab */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Filtering Header */}
          <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Filters */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setSkip(0); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Start Date"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setSkip(0); }}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="End Date"
                />
              </div>

              {/* Text Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
                  className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Search brand, model, plotter, QR..."
                />
              </div>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer self-start md:self-auto"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto relative min-h-[300px]">
            {reportLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 backdrop-blur-[1px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}

            <table className="w-full text-left border-collapse min-w-[1800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4">Brand</th>
                  <th className="px-6 py-4">Model</th>
                  <th className="px-6 py-4">Dealer / LFR</th>
                  <th className="px-6 py-4">License Key</th>
                  <th className="px-6 py-4">License Ref Name</th>
                  <th className="px-6 py-4">Film Category</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Cut Type</th>
                  <th className="px-6 py-4">Plotter</th>
                  <th className="px-6 py-4">Updated Date</th>
                  <th className="px-6 py-4">Parent Dealer</th>
                  <th className="px-6 py-4">Promoter Name</th>
                  <th className="px-6 py-4">Cut QRCode</th>
                  <th className="px-6 py-4">Cut Status</th>
                  <th className="px-6 py-4">Cut Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium">
                {reportItems.length > 0 ? (
                  reportItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">{item.categoryName}</td>
                      <td className="px-6 py-4">{item.brand}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{item.model}</td>
                      <td className="px-6 py-4">{item.dealer}</td>
                      <td className="px-6 py-4 font-mono text-[11px] bg-slate-50/50 px-2.5 rounded border border-slate-200/40 select-all max-w-[200px] truncate" title={item.licenseKey}>{item.licenseKey}</td>
                      <td className="px-6 py-4 text-slate-500">{item.licenseRefName}</td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{item.filmCategory}</td>
                      <td className="px-6 py-4">{item.productName}</td>
                      <td className="px-6 py-4 text-slate-500">{item.cutType}</td>
                      <td className="px-6 py-4 font-mono">{item.plotter}</td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{new Date(item.updatedDate).toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-500">{item.parentDealer}</td>
                      <td className="px-6 py-4 text-slate-900">{item.promoterName}</td>
                      <td className="px-6 py-4 font-mono select-all text-indigo-600 bg-indigo-50/30 px-2 py-0.5 rounded border border-indigo-100/40">{item.cutQRCode}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.cutStatus === 'Success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {item.cutStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-[250px] truncate" title={item.cutReview}>{item.cutReview}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={16} className="px-6 py-12 text-center text-slate-400">
                      No records matched the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {reportTotal > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 select-none bg-slate-50/30">
              <span>
                Showing <strong className="text-slate-700">{skip + 1}</strong> to{' '}
                <strong className="text-slate-700">{Math.min(skip + take, reportTotal)}</strong> of{' '}
                <strong className="text-slate-700">{reportTotal.toLocaleString()}</strong> entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={skip === 0}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={skip + take >= reportTotal}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
