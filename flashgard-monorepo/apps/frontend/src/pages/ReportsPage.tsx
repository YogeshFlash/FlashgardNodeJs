import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Key, Cpu, Layers, Loader2, Search, Calendar, ChevronLeft, ChevronRight, FileSpreadsheet, RotateCcw } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'modelReport' | 'dealerPerformance' | 'plotterAnalytics'>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Overview Tab Stats
  const [range, setRange] = useState<number>(6);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // New Reports State Fields
  const [dealerStats, setDealerStats] = useState<any[]>([]);
  const [plotterStats, setPlotterStats] = useState<any[]>([]);
  const [extraReportsLoading, setExtraReportsLoading] = useState<boolean>(false);

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

  // Customized Filter States (Real time local/remote refinement)
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [plotterFilter, setPlotterFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc'); // date-desc, date-asc, model-asc, brand-asc

  // Real-time custom lists populated from data
  const [uniquePlotters, setUniquePlotters] = useState<string[]>([]);
  const [uniqueCategories, setUniqueCategories] = useState<string[]>([]);

  // Column Visibility Selection
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    categoryName: true,
    brand: true,
    model: true,
    dealer: true,
    licenseKey: true,
    licenseRefName: true,
    filmCategory: true,
    productName: true,
    cutType: true,
    plotter: true,
    updatedDate: true,
    parentDealer: true,
    promoterName: true,
    cutQRCode: true,
    cutStatus: true,
    cutReview: true
  });
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);

  // Analytics states
  const [showAnalytics, setShowAnalytics] = useState<boolean>(true);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);
  const [analyticsData, setAnalyticsData] = useState<{
    totalCuts: number;
    successRate: number;
    topBrands: { name: string; count: number }[];
    topModels: { name: string; brand: string; count: number }[];
    categoryShare: { name: string; count: number }[];
  } | null>(null);

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

  // Fetch Model Wise Cut Report items with real-time customized filtering and sorting
  const fetchReport = () => {
    setReportLoading(true);
    // Fetch all relevant filtered records up to 5000 items to support dynamic real-time local filtering, customization, sorting, and analytics
    licensesApi.getReportsCutReport({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      skip: 0,
      take: 5000
    })
      .then((res: any) => {
        const items = res.items || [];
        
        // Extract unique plotters and categories for the filter selectors
        const plottersSet = new Set<string>();
        const categoriesSet = new Set<string>();
        items.forEach((item: any) => {
          if (item.plotter && item.plotter !== 'N/A') plottersSet.add(item.plotter);
          if (item.categoryName && item.categoryName !== 'N/A') categoriesSet.add(item.categoryName);
        });
        setUniquePlotters(Array.from(plottersSet).sort());
        setUniqueCategories(Array.from(categoriesSet).sort());

        // Apply customization filtering
        let processed = [...items];
        if (statusFilter !== 'all') {
          processed = processed.filter(item => item.cutStatus === statusFilter);
        }
        if (plotterFilter !== 'all') {
          processed = processed.filter(item => item.plotter === plotterFilter);
        }
        if (categoryFilter !== 'all') {
          processed = processed.filter(item => item.categoryName === categoryFilter);
        }

        // Apply customized sorting
        processed.sort((a, b) => {
          if (sortBy === 'date-desc') {
            return new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime();
          }
          if (sortBy === 'date-asc') {
            return new Date(a.updatedDate).getTime() - new Date(b.updatedDate).getTime();
          }
          if (sortBy === 'model-asc') {
            return a.model.localeCompare(b.model);
          }
          if (sortBy === 'brand-asc') {
            return a.brand.localeCompare(b.brand);
          }
          return 0;
        });

        // Set state for table display based on pagination offset
        setReportTotal(processed.length);
        setReportItems(processed);
      })
      .catch((err: any) => {
        console.error('Failed to load report:', err);
      })
      .finally(() => {
        setReportLoading(false);
      });
  };

  // Fetch data for analytics aggregation (fetches up to 5000 matching items to aggregate locally)
  const fetchAnalytics = () => {
    if (!showAnalytics) return;
    setAnalyticsLoading(true);
    licensesApi.getReportsCutReport({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      search: search || undefined,
      skip: 0,
      take: 5000
    })
      .then((res: any) => {
        let items = res.items || [];

        // Apply the same real-time filters to analytics representation
        if (statusFilter !== 'all') {
          items = items.filter((item: any) => item.cutStatus === statusFilter);
        }
        if (plotterFilter !== 'all') {
          items = items.filter((item: any) => item.plotter === plotterFilter);
        }
        if (categoryFilter !== 'all') {
          items = items.filter((item: any) => item.categoryName === categoryFilter);
        }

        const totalCuts = items.length;

        // Calculate success/failure rate
        let successCount = 0;
        items.forEach((item: any) => {
          if (item.cutStatus === 'Success') successCount++;
        });
        const successRate = totalCuts > 0 ? Math.round((successCount / totalCuts) * 100) : 0;

        // Top Brands
        const brandMap: Record<string, number> = {};
        const modelMap: Record<string, { brand: string; count: number }> = {};
        const catMap: Record<string, number> = {};

        items.forEach((item: any) => {
          const b = item.brand || 'Unknown';
          brandMap[b] = (brandMap[b] || 0) + 1;

          const mKey = `${b}:::${item.model || 'Unknown'}`;
          if (!modelMap[mKey]) {
            modelMap[mKey] = { brand: b, count: 0 };
          }
          modelMap[mKey].count++;

          const c = item.categoryName || 'Unknown';
          catMap[c] = (catMap[c] || 0) + 1;
        });

        const topBrands = Object.entries(brandMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const topModels = Object.entries(modelMap)
          .map(([key, info]) => {
            const [, modelName] = key.split(':::');
            return { name: modelName, brand: info.brand, count: info.count };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        const categoryShare = Object.entries(catMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setAnalyticsData({
          totalCuts,
          successRate,
          topBrands,
          topModels,
          categoryShare
        });
      })
      .catch((err: any) => {
        console.error('Failed to load analytics data:', err);
      })
      .finally(() => {
        setAnalyticsLoading(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'modelReport') {
      fetchReport();
    }
  }, [startDate, endDate, search, statusFilter, plotterFilter, categoryFilter, sortBy, activeTab]);

  // Fetch aggregated Dealer Performance & Plotter Analytics details
  useEffect(() => {
    if (activeTab === 'dealerPerformance' || activeTab === 'plotterAnalytics') {
      setExtraReportsLoading(true);
      licensesApi.getReportsCutReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
        skip: 0,
        take: 5000
      })
        .then((res: any) => {
          const items = res.items || [];

          // 1. Compile Dealer Performance Stats
          const dealerMap: Record<string, { name: string; total: number; success: number; failed: number; models: Set<string>; lastActive: string }> = {};
          items.forEach((item: any) => {
            const dName = item.dealer || 'Unknown Dealer';
            if (!dealerMap[dName]) {
              dealerMap[dName] = {
                name: dName,
                total: 0,
                success: 0,
                failed: 0,
                models: new Set<string>(),
                lastActive: item.updatedDate
              };
            }
            const record = dealerMap[dName];
            record.total++;
            if (item.cutStatus === 'Success') {
              record.success++;
            } else {
              record.failed++;
            }
            if (item.model) record.models.add(item.model);
            if (new Date(item.updatedDate).getTime() > new Date(record.lastActive).getTime()) {
              record.lastActive = item.updatedDate;
            }
          });

          const dealers = Object.values(dealerMap).map(d => ({
            name: d.name,
            totalCuts: d.total,
            successRate: d.total > 0 ? Math.round((d.success / d.total) * 100) : 0,
            failedCuts: d.failed,
            uniqueModelsCut: d.models.size,
            lastCutDate: d.lastActive
          })).sort((a, b) => b.totalCuts - a.totalCuts);

          setDealerStats(dealers);

          // 2. Compile Plotter Analytics Stats
          const plotterMap: Record<string, { id: string; total: number; success: number; failed: number; categories: Set<string>; dealers: Set<string> }> = {};
          items.forEach((item: any) => {
            const pId = item.plotter || 'Unknown Plotter';
            if (!plotterMap[pId]) {
              plotterMap[pId] = {
                id: pId,
                total: 0,
                success: 0,
                failed: 0,
                categories: new Set<string>(),
                dealers: new Set<string>()
              };
            }
            const record = plotterMap[pId];
            record.total++;
            if (item.cutStatus === 'Success') {
              record.success++;
            } else {
              record.failed++;
            }
            if (item.categoryName) record.categories.add(item.categoryName);
            if (item.dealer) record.dealers.add(item.dealer);
          });

          const plotters = Object.values(plotterMap).map(p => ({
            id: p.id,
            totalCuts: p.total,
            successRate: p.total > 0 ? Math.round((p.success / p.total) * 100) : 0,
            failedCuts: p.failed,
            categoriesCount: p.categories.size,
            dealersCount: p.dealers.size
          })).sort((a, b) => b.totalCuts - a.totalCuts);

          setPlotterStats(plotters);
        })
        .catch((err: any) => {
          console.error('Failed to compile secondary reports:', err);
        })
        .finally(() => {
          setExtraReportsLoading(false);
        });
    }
  }, [startDate, endDate, search, activeTab]);

  useEffect(() => {
    if (activeTab === 'modelReport') {
      fetchAnalytics();
    }
  }, [startDate, endDate, search, statusFilter, plotterFilter, categoryFilter, showAnalytics, activeTab]);

  // Column Visibility for Dealer Performance
  const [visibleDealerCols, setVisibleDealerCols] = useState<Record<string, boolean>>({
    dealerName: true,
    totalCuts: true,
    successRate: true,
    failedCuts: true,
    uniqueModels: true,
    lastActivity: true
  });

  // Column Visibility for Plotter Analytics
  const [visiblePlotterCols, setVisiblePlotterCols] = useState<Record<string, boolean>>({
    plotterName: true,
    totalCuts: true,
    successRate: true,
    failedCuts: true,
    activeCategories: true,
    storesConnected: true
  });

  // Pagination states for Dealer Performance & Plotter Analytics
  const [dealerSkip, setDealerSkip] = useState<number>(0);
  const [plotterSkip, setPlotterSkip] = useState<number>(0);

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

      let csvString = '';
      let fileName = '';

      if (activeTab === 'modelReport') {
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

        csvString = [
          headers.join(','),
          ...rows.map((e: any[]) => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))
        ].join('\r\n');
        fileName = `Model_Wise_Cut_Report_${new Date().toISOString().substring(0,10)}.csv`;
      } else if (activeTab === 'dealerPerformance') {
        const headers = ['Dealer / Store Name', 'Total Cuts', 'Success Rate (%)', 'Failed Cuts', 'Unique Devices Cut', 'Last Activity'];
        const rows = dealerStats.map(d => [
          d.name,
          d.totalCuts,
          d.successRate,
          d.failedCuts,
          d.uniqueModelsCut,
          new Date(d.lastCutDate).toLocaleString()
        ]);
        csvString = [
          headers.join(','),
          ...rows.map((e: any[]) => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))
        ].join('\r\n');
        fileName = `Dealer_Performance_Report_${new Date().toISOString().substring(0,10)}.csv`;
      } else if (activeTab === 'plotterAnalytics') {
        const headers = ['Plotter Name / ID', 'Total Cuts Logged', 'Cut Success Rate (%)', 'Failed Cuts', 'Active Categories', 'Stores Connected'];
        const rows = plotterStats.map(p => [
          p.id,
          p.totalCuts,
          p.successRate,
          p.failedCuts,
          p.categoriesCount,
          p.dealersCount
        ]);
        csvString = [
          headers.join(','),
          ...rows.map((e: any[]) => e.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))
        ].join('\r\n');
        fileName = `Plotter_Analytics_Report_${new Date().toISOString().substring(0,10)}.csv`;
      }

      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
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

  const tabs = [
    { id: 'overview', label: 'Analytics Overview', icon: BarChart3 },
    { id: 'modelReport', label: 'Model Wise Cut Report', icon: Cpu },
    { id: 'dealerPerformance', label: 'Dealer Performance', icon: TrendingUp },
    { id: 'plotterAnalytics', label: 'Plotter Analytics', icon: Layers }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-slate-900 rounded-2xl shadow-lg text-white">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">System Reports</h1>
            <p className="text-slate-500 text-sm mt-0.5">Monitor platform metrics, cutting analytics, and software distribution.</p>
          </div>
        </div>
        <button onClick={() => setRefreshTrigger(p => p + 1)} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center bg-white shadow-sm self-end sm:self-center" title="Refresh">
          <RotateCcw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Side-by-side modern split container */}
      <div className="bg-slate-50/50 border border-slate-200/80 rounded-3xl overflow-hidden flex flex-col lg:flex-row min-h-[650px] shadow-sm">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-white p-4 flex flex-col gap-1.5 shrink-0">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-3 mb-2">Report Categories</p>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all text-left cursor-pointer border
                  ${isActive 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10 font-black' 
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <tab.icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Content Panel */}
        <div className="flex-1 bg-white min-w-0 p-6" key={activeTab + '_' + refreshTrigger}>
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
      ) : activeTab === 'modelReport' ? (
        /* Model Wise Cut Report Tab */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Filtering Header */}
          <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

              {/* Toggle Graphs, Columns & Export Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    showAnalytics
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Toggle Visual Analytics Dashboard"
                >
                  <BarChart3 className="w-4 h-4" />
                  {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                </button>

                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    showColumnSettings
                      ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Customize Columns
                </button>
                
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>

            {/* Customize Columns Settings Dropdown Block */}
            {showColumnSettings && (
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-inner space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Columns to Display</h4>
                  <button 
                    onClick={() => setVisibleColumns(Object.keys(visibleColumns).reduce((acc, k) => ({ ...acc, [k]: true }), {}))}
                    className="text-[10px] text-indigo-600 hover:underline font-bold"
                  >
                    Reset Defaults
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {Object.keys(visibleColumns).map((colKey) => {
                    const label = colKey
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str) => str.toUpperCase())
                      .replace('Ref Name', 'Ref')
                      .replace('Q R Code', 'QR Code');
                    return (
                      <label key={colKey} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none hover:text-slate-950 font-medium">
                        <input
                          type="checkbox"
                          checked={visibleColumns[colKey]}
                          onChange={(e) => setVisibleColumns({ ...visibleColumns, [colKey]: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Real-time Customization Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/50">
              {/* Status Filter */}
              <div className="flex flex-col gap-1 min-w-[120px]">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cut Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setSkip(0); }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              {/* Plotter Filter */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Plotter / Machine</label>
                <select
                  value={plotterFilter}
                  onChange={(e) => { setPlotterFilter(e.target.value); setSkip(0); }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Plotters</option>
                  {uniquePlotters.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Device Category Filter */}
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Device Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setSkip(0); }}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {uniqueCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Sort Configuration */}
              <div className="flex flex-col gap-1 min-w-[150px] ml-auto">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sort Report By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="date-desc">Date (Newest First)</option>
                  <option value="date-asc">Date (Oldest First)</option>
                  <option value="model-asc">Model Name (A-Z)</option>
                  <option value="brand-asc">Brand (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Analytics Dashboard Panel */}
          {showAnalytics && (
            <div className="p-6 border-b border-slate-200 bg-slate-50/20 relative min-h-[160px]">
              {analyticsLoading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                </div>
              )}

              {analyticsData ? (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Filtered Cuts</p>
                        <p className="text-xl font-black text-slate-800">{analyticsData.totalCuts.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Success Rate</p>
                        <p className="text-xl font-black text-slate-800">{analyticsData.successRate}%</p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top Brand</p>
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">
                          {analyticsData.topBrands[0]?.name || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                      <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top Model</p>
                        <p className="text-sm font-bold text-slate-800 truncate max-w-[150px]">
                          {analyticsData.topModels[0]?.name || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Graphs Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top Brands Chart */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Top Brands</h4>
                        <p className="text-[10px] text-slate-400">Distribution across top 5 brands</p>
                      </div>
                      <div className="space-y-3 pt-2">
                        {analyticsData.topBrands.length > 0 ? (
                          analyticsData.topBrands.map((brand, idx) => {
                            const maxVal = analyticsData.topBrands[0]?.count || 1;
                            const pct = Math.round((brand.count / maxVal) * 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-600">{brand.name}</span>
                                  <span className="text-slate-800">{brand.count.toLocaleString()}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-600 rounded-full transition-all duration-500" 
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-6">No brand statistics available</p>
                        )}
                      </div>
                    </div>

                    {/* Top Models Chart */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Top Models</h4>
                        <p className="text-[10px] text-slate-400">Most cut device models</p>
                      </div>
                      <div className="space-y-3 pt-2">
                        {analyticsData.topModels.length > 0 ? (
                          analyticsData.topModels.map((model, idx) => {
                            const maxVal = analyticsData.topModels[0]?.count || 1;
                            const pct = Math.round((model.count / maxVal) * 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-600 truncate max-w-[180px]">{model.brand} {model.name}</span>
                                  <span className="text-slate-800">{model.count.toLocaleString()}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-6">No model statistics available</p>
                        )}
                      </div>
                    </div>

                    {/* Category Share Chart */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Category Share</h4>
                        <p className="text-[10px] text-slate-400">Proportion by film / protector type</p>
                      </div>
                      <div className="space-y-3 pt-2">
                        {analyticsData.categoryShare.length > 0 ? (
                          analyticsData.categoryShare.map((cat, idx) => {
                            const maxVal = analyticsData.categoryShare[0]?.count || 1;
                            const pct = Math.round((cat.count / maxVal) * 100);
                            return (
                              <div key={idx} className="space-y-1">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-slate-600">{cat.name}</span>
                                  <span className="text-slate-800">{cat.count.toLocaleString()}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-emerald-600 rounded-full transition-all duration-500" 
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-6">No category share details available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400 py-12">
                  No data matching criteria to generate analytics.
                </div>
              )}
            </div>
          )}

          {/* Top Pagination Controls */}
          {reportTotal > 0 && (
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 select-none bg-slate-50/30">
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
                  {visibleColumns.categoryName && <th className="px-6 py-4">Category Name</th>}
                  {visibleColumns.brand && <th className="px-6 py-4">Brand</th>}
                  {visibleColumns.model && <th className="px-6 py-4">Model</th>}
                  {visibleColumns.dealer && <th className="px-6 py-4">Dealer / LFR</th>}
                  {visibleColumns.licenseKey && <th className="px-6 py-4">License Key</th>}
                  {visibleColumns.licenseRefName && <th className="px-6 py-4">License Ref Name</th>}
                  {visibleColumns.filmCategory && <th className="px-6 py-4">Film Category</th>}
                  {visibleColumns.productName && <th className="px-6 py-4">Product Name</th>}
                  {visibleColumns.cutType && <th className="px-6 py-4">Cut Type</th>}
                  {visibleColumns.plotter && <th className="px-6 py-4">Plotter</th>}
                  {visibleColumns.updatedDate && <th className="px-6 py-4">Updated Date</th>}
                  {visibleColumns.parentDealer && <th className="px-6 py-4">Parent Dealer</th>}
                  {visibleColumns.promoterName && <th className="px-6 py-4">Promoter Name</th>}
                  {visibleColumns.cutQRCode && <th className="px-6 py-4">Cut QRCode</th>}
                  {visibleColumns.cutStatus && <th className="px-6 py-4">Cut Status</th>}
                  {visibleColumns.cutReview && <th className="px-6 py-4">Cut Review</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium">
                {reportItems.length > 0 ? (
                  reportItems.slice(skip, skip + take).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {visibleColumns.categoryName && <td className="px-6 py-4">{item.categoryName}</td>}
                      {visibleColumns.brand && <td className="px-6 py-4">{item.brand}</td>}
                      {visibleColumns.model && <td className="px-6 py-4 font-bold text-slate-800">{item.model}</td>}
                      {visibleColumns.dealer && <td className="px-6 py-4">{item.dealer}</td>}
                      {visibleColumns.licenseKey && (
                        <td className="px-6 py-4 font-mono text-[11px] bg-slate-50/50 px-2.5 rounded border border-slate-200/40 select-all max-w-[200px] truncate" title={item.licenseKey}>
                          {item.licenseKey}
                        </td>
                      )}
                      {visibleColumns.licenseRefName && <td className="px-6 py-4 text-slate-500">{item.licenseRefName}</td>}
                      {visibleColumns.filmCategory && <td className="px-6 py-4 font-semibold text-slate-800">{item.filmCategory}</td>}
                      {visibleColumns.productName && <td className="px-6 py-4">{item.productName}</td>}
                      {visibleColumns.cutType && <td className="px-6 py-4 text-slate-500">{item.cutType}</td>}
                      {visibleColumns.plotter && <td className="px-6 py-4 font-mono">{item.plotter}</td>}
                      {visibleColumns.updatedDate && <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{new Date(item.updatedDate).toLocaleString()}</td>}
                      {visibleColumns.parentDealer && <td className="px-6 py-4 text-slate-500">{item.parentDealer}</td>}
                      {visibleColumns.promoterName && <td className="px-6 py-4 text-slate-900">{item.promoterName}</td>}
                      {visibleColumns.cutQRCode && (
                        <td className="px-6 py-4 font-mono select-all text-indigo-600 bg-indigo-50/30 px-2 py-0.5 rounded border border-indigo-100/40">
                          {item.cutQRCode}
                        </td>
                      )}
                      {visibleColumns.cutStatus && (
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.cutStatus === 'Success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                            {item.cutStatus}
                          </span>
                        </td>
                      )}
                      {visibleColumns.cutReview && <td className="px-6 py-4 text-slate-500 max-w-[250px] truncate" title={item.cutReview}>{item.cutReview}</td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length || 1} className="px-6 py-12 text-center text-slate-400">
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
      ) : activeTab === 'dealerPerformance' ? (
        /* Dealer Performance Report View */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Customization & Filter Header */}
          <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Filters */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setDealerSkip(0); }}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setDealerSkip(0); }}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Text Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setDealerSkip(0); }}
                    className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Search dealer..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    showColumnSettings ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Customize Columns
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>

            {/* Column Customization checkboxes */}
            {showColumnSettings && (
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-inner space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Select Columns to Display</h4>
                  <button 
                    onClick={() => setVisibleDealerCols(Object.keys(visibleDealerCols).reduce((acc, k) => ({ ...acc, [k]: true }), {}))}
                    className="text-[10px] text-indigo-600 hover:underline font-bold"
                  >
                    Reset Defaults
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.keys(visibleDealerCols).map((k) => {
                    const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return (
                      <label key={k} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={visibleDealerCols[k]}
                          onChange={(e) => setVisibleDealerCols({ ...visibleDealerCols, [k]: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Top Pagination Controls */}
          {dealerStats.length > 0 && (
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50/30">
              <span>
                Showing <strong className="text-slate-700">{dealerSkip + 1}</strong> to{' '}
                <strong className="text-slate-700">{Math.min(dealerSkip + take, dealerStats.length)}</strong> of{' '}
                <strong className="text-slate-700">{dealerStats.length}</strong> dealers
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDealerSkip(Math.max(0, dealerSkip - take))}
                  disabled={dealerSkip === 0}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Page {Math.floor(dealerSkip / take) + 1} of {Math.ceil(dealerStats.length / take) || 1}
                </span>
                <button
                  onClick={() => { if (dealerSkip + take < dealerStats.length) setDealerSkip(dealerSkip + take); }}
                  disabled={dealerSkip + take >= dealerStats.length}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto relative min-h-[300px]">
            {extraReportsLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  {visibleDealerCols.dealerName && <th className="px-6 py-4">Dealer / Store Name</th>}
                  {visibleDealerCols.totalCuts && <th className="px-6 py-4">Total Cuts</th>}
                  {visibleDealerCols.successRate && <th className="px-6 py-4">Success Rate</th>}
                  {visibleDealerCols.failedCuts && <th className="px-6 py-4">Failed Cuts</th>}
                  {visibleDealerCols.uniqueModels && <th className="px-6 py-4">Unique Devices Cut</th>}
                  {visibleDealerCols.lastActivity && <th className="px-6 py-4">Last Activity</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium">
                {dealerStats.length > 0 ? (
                  dealerStats.slice(dealerSkip, dealerSkip + take).map((dealer, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      {visibleDealerCols.dealerName && <td className="px-6 py-4 font-bold text-slate-800">{dealer.name}</td>}
                      {visibleDealerCols.totalCuts && <td className="px-6 py-4 font-semibold text-slate-700">{dealer.totalCuts.toLocaleString()}</td>}
                      {visibleDealerCols.successRate && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              dealer.successRate >= 95 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : dealer.successRate >= 85 
                                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {dealer.successRate}%
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleDealerCols.failedCuts && <td className="px-6 py-4 text-slate-500">{dealer.failedCuts.toLocaleString()}</td>}
                      {visibleDealerCols.uniqueModels && <td className="px-6 py-4 font-semibold text-indigo-600">{dealer.uniqueModelsCut} models</td>}
                      {visibleDealerCols.lastActivity && <td className="px-6 py-4 text-slate-400">{new Date(dealer.lastCutDate).toLocaleString()}</td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Object.values(visibleDealerCols).filter(Boolean).length || 1} className="px-6 py-12 text-center text-slate-400">
                      No dealer performance data found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Controls */}
          {dealerStats.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50/30">
              <span>
                Showing <strong className="text-slate-700">{dealerSkip + 1}</strong> to{' '}
                <strong className="text-slate-700">{Math.min(dealerSkip + take, dealerStats.length)}</strong> of{' '}
                <strong className="text-slate-700">{dealerStats.length}</strong> dealers
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDealerSkip(Math.max(0, dealerSkip - take))}
                  disabled={dealerSkip === 0}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Page {Math.floor(dealerSkip / take) + 1} of {Math.ceil(dealerStats.length / take) || 1}
                </span>
                <button
                  onClick={() => { if (dealerSkip + take < dealerStats.length) setDealerSkip(dealerSkip + take); }}
                  disabled={dealerSkip + take >= dealerStats.length}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Plotter / Cutting Machine Analytics View */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Customization & Filter Header */}
          <div className="p-6 border-b border-slate-200/80 bg-slate-50/50 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                {/* Date Filters */}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setPlotterSkip(0); }}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setPlotterSkip(0); }}
                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Text Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPlotterSkip(0); }}
                    className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Search plotter..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    showColumnSettings ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Customize Columns
                </button>
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              </div>
            </div>

            {/* Column Customization checkboxes */}
            {showColumnSettings && (
              <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-inner space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Select Columns to Display</h4>
                  <button 
                    onClick={() => setVisiblePlotterCols(Object.keys(visiblePlotterCols).reduce((acc, k) => ({ ...acc, [k]: true }), {}))}
                    className="text-[10px] text-indigo-600 hover:underline font-bold"
                  >
                    Reset Defaults
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.keys(visiblePlotterCols).map((k) => {
                    const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    return (
                      <label key={k} className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer font-medium">
                        <input
                          type="checkbox"
                          checked={visiblePlotterCols[k]}
                          onChange={(e) => setVisiblePlotterCols({ ...visiblePlotterCols, [k]: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 w-3.5 h-3.5"
                        />
                        <span>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Top Pagination Controls */}
          {plotterStats.length > 0 && (
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50/30">
              <span>
                Showing <strong className="text-slate-700">{plotterSkip + 1}</strong> to{' '}
                <strong className="text-slate-700">{Math.min(plotterSkip + take, plotterStats.length)}</strong> of{' '}
                <strong className="text-slate-700">{plotterStats.length}</strong> plotters
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlotterSkip(Math.max(0, plotterSkip - take))}
                  disabled={plotterSkip === 0}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Page {Math.floor(plotterSkip / take) + 1} of {Math.ceil(plotterStats.length / take) || 1}
                </span>
                <button
                  onClick={() => { if (plotterSkip + take < plotterStats.length) setPlotterSkip(plotterSkip + take); }}
                  disabled={plotterSkip + take >= plotterStats.length}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto relative min-h-[300px]">
            {extraReportsLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  {visiblePlotterCols.plotterName && <th className="px-6 py-4">Plotter Name / ID</th>}
                  {visiblePlotterCols.totalCuts && <th className="px-6 py-4">Total Cuts Logged</th>}
                  {visiblePlotterCols.successRate && <th className="px-6 py-4">Cut Success rate</th>}
                  {visiblePlotterCols.failedCuts && <th className="px-6 py-4">Failed Cuts</th>}
                  {visiblePlotterCols.activeCategories && <th className="px-6 py-4">Active Categories</th>}
                  {visiblePlotterCols.storesConnected && <th className="px-6 py-4">Stores Connected</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs font-medium">
                {plotterStats.length > 0 ? (
                  plotterStats.slice(plotterSkip, plotterSkip + take).map((plotter, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      {visiblePlotterCols.plotterName && <td className="px-6 py-4 font-mono font-bold text-slate-800">{plotter.id}</td>}
                      {visiblePlotterCols.totalCuts && <td className="px-6 py-4 font-semibold text-slate-700">{plotter.totalCuts.toLocaleString()}</td>}
                      {visiblePlotterCols.successRate && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              plotter.successRate >= 95 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : plotter.successRate >= 85 
                                ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                : 'bg-rose-50 text-rose-700 border-rose-100'
                            }`}>
                              {plotter.successRate}%
                            </span>
                          </div>
                        </td>
                      )}
                      {visiblePlotterCols.failedCuts && <td className="px-6 py-4 text-slate-500">{plotter.failedCuts.toLocaleString()}</td>}
                      {visiblePlotterCols.activeCategories && <td className="px-6 py-4 font-semibold text-blue-600">{plotter.categoriesCount} categories</td>}
                      {visiblePlotterCols.storesConnected && <td className="px-6 py-4 font-semibold text-slate-700">{plotter.dealersCount} store(s)</td>}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Object.values(visiblePlotterCols).filter(Boolean).length || 1} className="px-6 py-12 text-center text-slate-400">
                      No plotter analytics details available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom Pagination Controls */}
          {plotterStats.length > 0 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500 bg-slate-50/30">
              <span>
                Showing <strong className="text-slate-700">{plotterSkip + 1}</strong> to{' '}
                <strong className="text-slate-700">{Math.min(plotterSkip + take, plotterStats.length)}</strong> of{' '}
                <strong className="text-slate-700">{plotterStats.length}</strong> plotters
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlotterSkip(Math.max(0, plotterSkip - take))}
                  disabled={plotterSkip === 0}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Page {Math.floor(plotterSkip / take) + 1} of {Math.ceil(plotterStats.length / take) || 1}
                </span>
                <button
                  onClick={() => { if (plotterSkip + take < plotterStats.length) setPlotterSkip(plotterSkip + take); }}
                  disabled={plotterSkip + take >= plotterStats.length}
                  className="p-1.5 border border-slate-200 rounded-lg bg-white disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
      </div>
    </div>
  );
};

export default ReportsPage;
