import React, { useState, useEffect } from 'react';
import { 
  Upload, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileSpreadsheet, 
  Layers, 
  FileCode, 
  Scissors,
  History,
  Info,
  Users,
  ShoppingCart,
  ChevronRight,
  RefreshCcw,
  AlertTriangle,
  Search,
  Download,
  Shield,
  Ticket,
  Cpu
} from 'lucide-react';
import { formatISTDate, formatISTTime } from '../lib/dateUtils';
import { migrationApi, getApiBase } from '../lib/api';
import { SearchableSelect } from '../components/SearchableSelect';

type MainTab = 'legacy' | 'mssql' | 'bulk' | 'history';
type LegacySubTab = 'catalog' | 'skins' | 'designs' | 'roles' | 'users' | 'licenses' | 'mobile-users' | 'cut-credits' | 'mobile-app-cuts' | 'dealer-master-qrs' | 'plotter-masters' | 'materials' | 'stock' | 'orders';

const DataMigration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('mssql');
  const [legacySubTab, setLegacySubTab] = useState<LegacySubTab>('catalog');

  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [file3, setFile3] = useState<File | null>(null);
  const [file4, setFile4] = useState<File | null>(null);
  const [file5, setFile5] = useState<File | null>(null);
  const [file6, setFile6] = useState<File | null>(null);

  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [migrationLogs, setMigrationLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [confirmCleanModule, setConfirmCleanModule] = useState<string | null>(null);

  const [dbConfig, setDbConfig] = useState({ user: 'sa', password: 'sqldb2023', server: 'Yogesh', database: 'scratchgard', port: 1433 });
  const [dbConnected, setDbConnected] = useState(false);
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [dbMapFile1, setDbMapFile1] = useState('');
  const [dbMapFile2, setDbMapFile2] = useState('');
  const [dbMapFile3, setDbMapFile3] = useState('');
  const [dbMapFile4, setDbMapFile4] = useState('');
  const [dbMapFile5, setDbMapFile5] = useState('');

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const logs = await migrationApi.getLogs();
      setMigrationLogs(logs);
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadLogs();
    }
  }, [activeTab]);

  const handleDownloadCsv = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${getApiBase()}/migration/logs/csv`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to download');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `migration_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download CSV log file. Please ensure you are logged in.');
    }
  };

  const handleDownloadFailures = async (logId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${getApiBase()}/migration/logs/${logId}/failures`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
          if (response.status === 404) {
            
          } else {
            throw new Error('Failed to download');
          }
          return;
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `migration_failures_${logId.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download failure log.');
    }
  };

  const handleCleanData = async (module: string) => {
    setIsCleaning(true);
    setError(null);
    setResult(null);

    try {
      const data = await migrationApi.cleanData(module);
      setResult(data);
      
      setConfirmCleanModule(null);
    setResult(null);
    setError(null);
    } catch (err: any) {
      setError(err.message);
      
    } finally {
      setIsCleaning(false);
    }
  };

  const resetState = () => {
    setFile1(null);
    setFile2(null);
    setFile3(null);
    setFile4(null);
    setFile5(null);
    setFile6(null);
    setResult(null);
    setError(null);
    setConfirmCleanModule(null);
    setResult(null);
    setError(null);
  };

  const handleMigration = async () => {
    if (!file1) return;
    setIsMigrating(true);
    setError(null);
    setResult(null);

    try {
      let data;
      if (legacySubTab === 'catalog') data = await migrationApi.migrateCatalog(file1);
      else if (legacySubTab === 'skins') data = await migrationApi.migrateSkins(file1);
      else if (legacySubTab === 'roles') data = await migrationApi.migrateRoles(file1);
      else if (legacySubTab === 'designs') {
        data = await migrationApi.migrateDesigns(file1);
      } else if (legacySubTab === 'users') {
        data = await migrationApi.migrateUsers(
          file1,
          file2 || undefined
        );
      } else if (legacySubTab === 'licenses') {
        data = await migrationApi.migrateLicenses(
          file1,
          file2 || undefined
        );
      } else if (legacySubTab === 'mobile-users') {
        data = await migrationApi.migrateMobileUsers(
          file1
        );
      } else if (legacySubTab === 'mobile-app-cuts') {
        data = await migrationApi.migrateMobileAppCuts(
          file1
        );
      } else if (legacySubTab === 'dealer-master-qrs') {
        data = await migrationApi.migrateDealerMasterQRs(
          file1
        );
      } else if (legacySubTab === 'plotter-masters') {
        data = await migrationApi.migratePlotters(
          file1
        );
      } else if (legacySubTab === 'materials') {
        if (!file2 || !file3 || !file4) {
          throw new Error('All 4 files are required for Materials system migration');
        }
        data = await migrationApi.migrateMaterials(
          file1,
          file2,
          file3,
          file2,
          file4
        );
      } else if (legacySubTab === 'stock') {
        data = await migrationApi.migrateStock(
          file1 || undefined,
          file2 || undefined,
          file3 || undefined,
          file4 || undefined,
          file5 || undefined,
          file6 || undefined
        );
      }
      
      setResult(data);
      
    } catch (err: any) {
      setError(err.message);
      
    } finally {
      setIsMigrating(false);
    }
  };

  const legacySubTabs: { id: LegacySubTab; label: string; icon: any; description: string; file1Label: string; file1Name: string; file2Label?: string; file2Name?: string; file3Label?: string; file3Name?: string; file4Label?: string; file4Name?: string; file5Label?: string; file5Name?: string; file6Label?: string; file6Name?: string }[] = [
    { id: 'catalog', label: '1. Categories & Brands', icon: Layers, description: 'Setup the high-level organizational structure.', file1Label: 'Catalog CSV', file1Name: 'CatalogueMaster.csv' },
    { id: 'skins', label: '2. Cut Patterns', icon: Scissors, description: 'Define the types of skins and cut settings.', file1Label: 'Skins CSV', file1Name: 'ModelSkinMaster.csv' },
    { id: 'designs', label: '3. Models & Designs', icon: FileCode, description: 'Import 17k+ designs and create Models.', file1Label: 'Designs CSV', file1Name: 'ModelMaster.csv' },
    { id: 'roles', label: '4. User Roles', icon: Shield, description: 'Migrate legacy system roles.', file1Label: 'Roles CSV', file1Name: 'RoleMaster.csv' },
    { id: 'users', label: '5. Org & Users', icon: Users, description: 'Migrate legacy user credentials.', file1Label: 'Users CSV', file1Name: 'UserMaster.csv', file2Label: 'User Roles Map CSV', file2Name: 'UserRolesMaster.csv' },
    { id: 'licenses', label: '6. Licenses', icon: FileCode, description: 'Migrate legacy licenses and assign to dealers.', file1Label: 'Licenses CSV', file1Name: 'LicenseMaster.csv', file2Label: 'License Dealers CSV', file2Name: 'LicenseAssignDealer.csv' },
    { id: 'mobile-users', label: '7. Mobile Users', icon: Users, description: 'Migrate legacy mobile app users and links.', file1Label: 'Mobile Users CSV', file1Name: 'MobileAppUser.csv' },
    { id: 'cut-credits', label: '8. Cut Credits', icon: Ticket, description: 'Migrate legacy cut credits and balances.', file1Label: 'CutCreditAssignDealer Table', file1Name: 's_CutCreditAssignDealer', file2Label: 'CutcreditDealerCount Table', file2Name: 's_CutcreditDealerCount' },
    { id: 'mobile-app-cuts', label: '9. Mobile App Cuts', icon: Scissors, description: 'Migrate legacy mobile app cuts to machine cut logs.', file1Label: 'MobileAppCuts Table', file1Name: 'MobileAppCuts' },
    { id: 'dealer-master-qrs', label: '10. Dealer Master QRs', icon: FileSpreadsheet, description: 'Migrate legacy DealerMasterQR table to database.', file1Label: 'DealerMasterQR CSV', file1Name: 'DealerMasterQR' },
    { id: 'plotter-masters', label: '11. Plotter Masters', icon: Cpu, description: 'Migrate legacy PlotterMaster configuration to database.', file1Label: 'PlotterMaster CSV', file1Name: 'PlotterMaster' },
    { id: 'materials', label: '12. Materials System', icon: Layers, description: 'Migrate legacy ProductType, Material, Categories & config.', file1Label: 'ProductType CSV', file1Name: 'ProductTypeMaster.csv', file2Label: 'MaterialMaster CSV', file2Name: 'MaterialMaster.csv', file3Label: 'FilmCategory CSV', file3Name: 'ReportCategoryMaster.csv', file4Label: 'ProductDisplayMaster CSV', file4Name: 'ProductDisplayMaster.csv' },
    { id: 'stock', label: '13. Stock & Dispatches', icon: Database, description: 'Migrate legacy StockHeader, StockLine, StockAssign & StockReverse into modern film_batches, qr_codes & dispatch_orders tables.', file1Label: 'StockHeaderMaster → film_batches', file1Name: 'StockHedaerMaster', file2Label: 'StockLineMaster → qr_codes', file2Name: 'StockLineMaster', file3Label: 'StockAssignHeader → dispatch_orders', file3Name: 'StockAssignHeaderMaster', file4Label: 'StockAssignLine → dispatch_order_items', file4Name: 'StockAssignLineMaster', file5Label: 'StockReverseHeader → return dispatch_orders', file5Name: 'StockReverseHeaderMaster', file6Label: 'StockReverseLine → return items', file6Name: 'StockReverseLineMaster' },
    { id: 'orders', label: 'Order History', icon: ShoppingCart, description: 'Sync past transactions.', file1Label: 'Orders CSV', file1Name: 'OrderMaster.csv' },
  ];

  const currentTab = legacySubTabs.find(t => t.id === legacySubTab);
  useEffect(() => {
    setDbMapFile1('');
    setDbMapFile2('');
    setDbMapFile3('');
    setDbMapFile4('');
    setDbMapFile5('');
    if (currentTab && dbTables.length > 0) {
      if (currentTab.id === 'users') {
        const match1 = dbTables.find(t => t.toLowerCase() === 'aspnetusers');
        if (match1) setDbMapFile1(match1);
        const match2 = dbTables.find(t => t.toLowerCase() === 'aspnetuserroles');
        if (match2) setDbMapFile2(match2);
      } else if (currentTab.id === 'catalog') {
        const match1 = dbTables.find(t => t.toLowerCase().includes('catalogue') || t.toLowerCase().includes('catalogmaster'));
        if (match1) setDbMapFile1(match1);
      } else if (currentTab.id === 'roles') {
        const match1 = dbTables.find(t => t.toLowerCase() === 'aspnetroles');
        if (match1) setDbMapFile1(match1);
      } else {
        const t1 = currentTab.file1Name.replace('.csv', '');
        const match1 = dbTables.find(t => t.toLowerCase() === t1.toLowerCase() || t.includes(t1));
        if (match1) setDbMapFile1(match1);
        
        if (currentTab.file2Name) {
          const t2 = currentTab.file2Name.replace('.csv', '');
          const match2 = dbTables.find(t => t.toLowerCase() === t2.toLowerCase() || t.includes(t2));
          if (match2) setDbMapFile2(match2);
        }

        if (currentTab.file3Name) {
          const t3 = currentTab.file3Name.replace('.csv', '');
          const match3 = dbTables.find(t => t.toLowerCase() === t3.toLowerCase() || t.includes(t3));
          if (match3) setDbMapFile3(match3);
        }

        if (currentTab.file4Name) {
          const t4 = currentTab.file4Name.replace('.csv', '');
          const match4 = dbTables.find(t => t.toLowerCase() === t4.toLowerCase() || t.includes(t4));
          if (match4) setDbMapFile4(match4);
        }

        if (currentTab.file5Name) {
          const t5 = currentTab.file5Name.replace('.csv', '');
          const match5 = dbTables.find(t => t.toLowerCase() === t5.toLowerCase() || t.includes(t5));
          if (match5) setDbMapFile5(match5);
        }
      }
    }
  }, [legacySubTab, dbTables]);

  const handleDbConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMigrating(true);
    setError(null);
    try {
      const res = await migrationApi.dbConnect(dbConfig);
      setDbTables(res.tables || []);
      setDbConnected(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const [jobStatus, setJobStatus] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'mssql') {
      if (legacySubTab === 'stock') {
        migrationApi.getStockMigrationStatus().then((st) => {
          if (st && st.isRunning) {
            setIsMigrating(true);
            setJobStatus(st);
            const pollInterval = setInterval(async () => {
              try {
                const currentSt = await migrationApi.getStockMigrationStatus();
                setJobStatus(currentSt);
                if (currentSt && !currentSt.isRunning) {
                  clearInterval(pollInterval);
                  setIsMigrating(false);
                  if (currentSt.error) setError(currentSt.error);
                  else if (currentSt.result) setResult(currentSt.result);
                }
              } catch {}
            }, 1500);
          }
        }).catch(() => {});
      } else {
        migrationApi.getDbStatus().then((st) => {
          if (st && st.isRunning) {
            setIsMigrating(true);
            setJobStatus(st);
            const pollInterval = setInterval(async () => {
              try {
                const currentSt = await migrationApi.getDbStatus();
                setJobStatus(currentSt);
                if (currentSt && !currentSt.isRunning) {
                  clearInterval(pollInterval);
                  setIsMigrating(false);
                  if (currentSt.error) setError(currentSt.error);
                  else if (currentSt.result) setResult(currentSt.result);
                }
              } catch {}
            }, 1500);
          }
        }).catch(() => {});
      }
    }
  }, [activeTab, legacySubTab]);

  const handleDbMigration = async () => {
    setIsMigrating(true);
    setError(null);
    setResult(null);
    setJobStatus(null);
    try {
      if (legacySubTab === 'stock') {
        const initData = await migrationApi.migrateStockDirectSqlServer(dbConfig);
        if (initData.status === 'STARTED' || initData.status === 'RUNNING') {
          setJobStatus(initData.job);
          const pollInterval = setInterval(async () => {
            try {
              const st = await migrationApi.getStockMigrationStatus();
              setJobStatus(st);
              if (st && !st.isRunning) {
                clearInterval(pollInterval);
                setIsMigrating(false);
                if (st.error) setError(st.error);
                else if (st.result) setResult(st.result);
              }
            } catch {}
          }, 1500);
          return;
        } else {
          setResult(initData);
          setIsMigrating(false);
        }
      } else {
        if (!dbMapFile1) {
          setIsMigrating(false);
          return;
        }
        const initData = await migrationApi.dbRun({ 
          credentials: dbConfig,
          moduleType: legacySubTab, 
          tableMap: { file1: dbMapFile1, file2: dbMapFile2, file3: dbMapFile3, file4: dbMapFile4, file5: dbMapFile5 }
        });
        
        if (initData && (initData.status === 'STARTED' || initData.status === 'RUNNING')) {
          setJobStatus(initData.job);
          const pollInterval = setInterval(async () => {
            try {
              const st = await migrationApi.getDbStatus();
              setJobStatus(st);
              if (st && !st.isRunning) {
                clearInterval(pollInterval);
                setIsMigrating(false);
                if (st.error) setError(st.error);
                else if (st.result) setResult(st.result);
              }
            } catch {}
          }, 1500);
          return;
        } else {
          setResult(initData);
          setIsMigrating(false);
        }
      }
    } catch (err: any) {
      setError(err.message);
      setIsMigrating(false);
    }
  };


  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Database className="w-10 h-10 text-[var(--color-primary)]" />
          Migration Hub
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          Port your legacy MSSQL data into the modern relational schema.
        </p>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit mb-8 border border-slate-200/60">
        <button
          onClick={() => setActiveTab('mssql')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'mssql' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Database className="w-4 h-4 text-amber-500" /> Direct MSSQL Sync
        </button>
        <button
          onClick={() => setActiveTab('legacy')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'legacy' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History className="w-4 h-4" /> MSSQL Legacy
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'bulk' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Upload className="w-4 h-4" /> Bulk Import
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'history' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <History className="w-4 h-4" /> Activity Logs
        </button>
      </div>

      {(activeTab === 'legacy' || activeTab === 'mssql') && (
        <div className="flex flex-col md:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Sidebar */}
          <div className="w-full md:w-80 shrink-0 space-y-6">
            {[
              { title: 'Models Management', ids: ['catalog', 'skins', 'designs'] },
              { title: 'System & Core', ids: ['roles', 'users', 'licenses', 'mobile-users', 'cut-credits', 'mobile-app-cuts', 'dealer-master-qrs', 'plotter-masters', 'materials', 'stock', 'orders'] }
            ].map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="px-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.title}</h3>
                </div>
                <div className="space-y-1">
                  {legacySubTabs.filter(t => group.ids.includes(t.id)).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setLegacySubTab(tab.id); resetState(); }}
                      className={`w-full text-left p-3.5 rounded-xl transition-all border group flex items-center gap-4 
                        ${legacySubTab === tab.id 
                          ? 'bg-white border-amber-200 shadow-lg shadow-amber-500/5 ring-4 ring-amber-500/5' 
                          : 'bg-transparent border-transparent hover:bg-slate-50 text-slate-500'}`}
                    >
                      <div className={`p-2 rounded-lg transition-all ${legacySubTab === tab.id ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-slate-100 text-slate-400'}`}>
                        <tab.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-xs ${legacySubTab === tab.id ? 'text-slate-900' : ''}`}>{tab.label}</p>
                        <p className="text-[9px] opacity-60 truncate">{tab.description}</p>
                      </div>
                      {legacySubTab === tab.id && <ChevronRight className="w-3.5 h-3.5 text-amber-500" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden min-h-[550px] flex flex-col">
              
              {['catalog', 'skins', 'designs', 'roles', 'users', 'licenses', 'mobile-users', 'cut-credits', 'mobile-app-cuts', 'dealer-master-qrs', 'plotter-masters', 'materials', 'stock'].includes(legacySubTab) ? (
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4">
                  <div className="p-8 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        {currentTab && React.createElement(currentTab.icon, { className: "w-4 h-4" })}
                      </div>
                      <h2 className="text-xl font-black text-slate-900">{currentTab?.label}</h2>
                    </div>
                    <p className="text-xs text-slate-500 ml-9">{currentTab?.description}</p>
                  </div>

                  <div className="p-10 flex-1 flex flex-col items-center">
                    <div className={`w-full ${legacySubTab === 'users' || legacySubTab === 'materials' ? 'max-w-2xl' : 'max-w-lg'} space-y-6`}>
                      
                      {activeTab === 'mssql' ? (
                        <div className="space-y-6">
                          {!dbConnected ? (
                            <form onSubmit={handleDbConnect} className="space-y-4 p-6 border border-slate-200 rounded-[2rem] bg-slate-50">
                              <h3 className="font-black text-slate-900 mb-4 flex gap-2"><Database className="w-5 h-5 text-indigo-500"/> Connect to MSSQL</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-bold text-slate-500">Server</label>
                                  <input type="text" value={dbConfig.server} onChange={e => setDbConfig({...dbConfig, server: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" required placeholder="localhost" />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-slate-500">Database</label>
                                  <input type="text" value={dbConfig.database} onChange={e => setDbConfig({...dbConfig, database: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" required placeholder="Flashgard" />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-slate-500">Username</label>
                                  <input type="text" value={dbConfig.user} onChange={e => setDbConfig({...dbConfig, user: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" required />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-slate-500">Password</label>
                                  <input type="password" value={dbConfig.password} onChange={e => setDbConfig({...dbConfig, password: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" required />
                                </div>
                              </div>
                              <button type="submit" disabled={isMigrating} className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl font-bold flex justify-center items-center gap-2">
                                {isMigrating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                                Connect
                              </button>
                            </form>
                          ) : (
                            <div className="space-y-6">
                              <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex justify-between items-center">
                                <span className="font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Connected to {dbConfig.database}</span>
                                <button onClick={() => setDbConnected(false)} className="text-xs underline font-bold hover:text-emerald-900">Disconnect</button>
                              </div>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">{currentTab?.file1Label} Table</label>
                                  <SearchableSelect
                                    options={dbTables.map(t => ({ value: t, label: t }))}
                                    value={dbMapFile1}
                                    onChange={(v) => setDbMapFile1(v)}
                                    placeholder="-- Select Table --"
                                  />
                                </div>
                                {currentTab?.file2Name && (
                                  <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">{currentTab?.file2Label} Table {currentTab.id !== 'users' && '(Optional)'}</label>
                                    <SearchableSelect
                                      options={dbTables.map(t => ({ value: t, label: t }))}
                                      value={dbMapFile2}
                                      onChange={(v) => setDbMapFile2(v)}
                                      placeholder={`-- Select Table ${currentTab.id !== 'users' ? '(Optional) ' : ''}--`}
                                    />
                                  </div>
                                )}
                                {currentTab?.file3Name && (
                                  <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">{currentTab?.file3Label} Table</label>
                                    <SearchableSelect
                                      options={dbTables.map(t => ({ value: t, label: t }))}
                                      value={dbMapFile3}
                                      onChange={(v) => setDbMapFile3(v)}
                                      placeholder="-- Select Table --"
                                    />
                                  </div>
                                )}
                                {currentTab?.file4Name && (
                                  <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">{currentTab?.file4Label} Table</label>
                                    <SearchableSelect
                                      options={dbTables.map(t => ({ value: t, label: t }))}
                                      value={dbMapFile4}
                                      onChange={(v) => setDbMapFile4(v)}
                                      placeholder="-- Select Table --"
                                    />
                                  </div>
                                )}
                                {currentTab?.file5Name && (
                                  <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">{currentTab?.file5Label} Table</label>
                                    <SearchableSelect
                                      options={dbTables.map(t => ({ value: t, label: t }))}
                                      value={dbMapFile5}
                                      onChange={(v) => setDbMapFile5(v)}
                                      placeholder="-- Select Table --"
                                    />
                                  </div>
                                )}
                              </div>
                              {jobStatus?.isRunning && (
                                <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 space-y-3 animate-in fade-in">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                                      <span className="font-bold text-sm text-slate-100">
                                        {jobStatus.step || 'Stock Migration running...'}
                                      </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-400 px-2.5 py-1 rounded border border-amber-500/30">
                                      {jobStatus.progress || 0}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className="bg-gradient-to-r from-indigo-500 to-amber-400 h-2 rounded-full transition-all duration-500" 
                                      style={{ width: `${jobStatus.progress || 5}%` }} 
                                    />
                                  </div>
                                  <p className="text-xs text-slate-400 font-mono italic">
                                    {jobStatus.message || 'Processing background job on server...'}
                                  </p>
                                </div>
                              )}
                              <button
                                onClick={handleDbMigration}
                                disabled={!dbMapFile1 || isMigrating || (currentTab?.id === 'users' && !dbMapFile2) || (currentTab?.id === 'materials' && (!dbMapFile2 || !dbMapFile3 || !dbMapFile4))}
                                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-lg text-white transition-all transform ${!dbMapFile1 || isMigrating || (currentTab?.id === 'users' && !dbMapFile2) || (currentTab?.id === 'materials' && (!dbMapFile2 || !dbMapFile3 || !dbMapFile4)) ? 'bg-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl'}`}
                              >
                                {isMigrating ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCcw className="w-6 h-6" />}
                                {isMigrating ? 'Syncing...' : 'Start DB Migration'}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                        <div className="grid grid-cols-1 gap-6">
                          {/* File 1 */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 px-1">
                              <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {currentTab?.file1Name}
                              </span>
                            </div>
                            <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group overflow-hidden">
                              <div className="flex flex-col items-center justify-center text-center px-6">
                                <div className={`p-4 rounded-full mb-3 transition-all ${file1 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300 group-hover:text-indigo-500'}`}>
                                  {file1 ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                                </div>
                                <p className="text-sm font-bold text-slate-700 truncate max-w-sm">
                                  {file1 ? file1.name : `Select ${currentTab?.file1Label}`}
                                </p>
                              </div>
                              <input type="file" className="hidden" accept=".csv" onChange={(e) => setFile1(e.target.files?.[0] || null)} />
                            </label>
                          </div>


                          {/* File 2 (Optional) */}
                          {currentTab?.file2Name && (
                            <div className="space-y-3 animate-in slide-in-from-top-4">
                              <div className="flex items-center gap-2 px-1">
                                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {currentTab?.file2Name}
                                </span>
                              </div>
                              <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group overflow-hidden">
                                <div className="flex flex-col items-center justify-center text-center px-4">
                                  <div className={`p-2 rounded-full mb-1 transition-all ${file2 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300 group-hover:text-indigo-500'}`}>
                                    {file2 ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                  </div>
                                  <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                                    {file2 ? file2.name : `Select ${currentTab?.file2Label}`}
                                  </p>
                                </div>
                                <input type="file" className="hidden" accept=".csv" onChange={(e) => setFile2(e.target.files?.[0] || null)} />
                              </label>
                            </div>
                          )}

                          {/* File 3 (Optional) */}
                          {currentTab?.file3Name && (
                            <div className="space-y-3 animate-in slide-in-from-top-4">
                              <div className="flex items-center gap-2 px-1">
                                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {currentTab?.file3Name}
                                </span>
                              </div>
                              <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group overflow-hidden">
                                <div className="flex flex-col items-center justify-center text-center px-4">
                                  <div className={`p-2 rounded-full mb-1 transition-all ${file3 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300 group-hover:text-indigo-500'}`}>
                                    {file3 ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                  </div>
                                  <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                                    {file3 ? file3.name : `Select ${currentTab?.file3Label}`}
                                  </p>
                                </div>
                                <input type="file" className="hidden" accept=".csv" onChange={(e) => setFile3(e.target.files?.[0] || null)} />
                              </label>
                            </div>
                          )}

                          {/* File 4 (Optional) */}
                          {currentTab?.file4Name && (
                            <div className="space-y-3 animate-in slide-in-from-top-4">
                              <div className="flex items-center gap-2 px-1">
                                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {currentTab?.file4Name}
                                </span>
                              </div>
                              <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group overflow-hidden">
                                <div className="flex flex-col items-center justify-center text-center px-4">
                                  <div className={`p-2 rounded-full mb-1 transition-all ${file4 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300 group-hover:text-indigo-500'}`}>
                                    {file4 ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                  </div>
                                  <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                                    {file4 ? file4.name : `Select ${currentTab?.file4Label}`}
                                  </p>
                                </div>
                                <input type="file" className="hidden" accept=".csv" onChange={(e) => setFile4(e.target.files?.[0] || null)} />
                              </label>
                            </div>
                          )}

                          {/* File 5 (Optional) */}
                          {currentTab?.file5Name && (
                            <div className="space-y-3 animate-in slide-in-from-top-4">
                              <div className="flex items-center gap-2 px-1">
                                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {currentTab?.file5Name}
                                </span>
                              </div>
                              <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group overflow-hidden">
                                <div className="flex flex-col items-center justify-center text-center px-4">
                                  <div className={`p-2 rounded-full mb-1 transition-all ${file5 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300 group-hover:text-indigo-500'}`}>
                                    {file5 ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                  </div>
                                  <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                                    {file5 ? file5.name : `Select ${currentTab?.file5Label}`}
                                  </p>
                                </div>
                                <input type="file" className="hidden" accept=".csv" onChange={(e) => setFile5(e.target.files?.[0] || null)} />
                              </label>
                            </div>
                          )}

                          {/* File 6 (Optional) */}
                          {currentTab?.file6Name && (
                            <div className="space-y-3 animate-in slide-in-from-top-4">
                              <div className="flex items-center gap-2 px-1">
                                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {currentTab?.file6Name}
                                </span>
                              </div>
                              <label className="relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-300 transition-all group overflow-hidden">
                                <div className="flex flex-col items-center justify-center text-center px-4">
                                  <div className={`p-2 rounded-full mb-1 transition-all ${file6 ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300 group-hover:text-indigo-500'}`}>
                                    {file6 ? <CheckCircle2 className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                                  </div>
                                  <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
                                    {file6 ? file6.name : `Select ${currentTab?.file6Label}`}
                                  </p>
                                </div>
                                <input type="file" className="hidden" accept=".csv" onChange={(e) => setFile6(e.target.files?.[0] || null)} />
                              </label>
                            </div>
                          )}
                        </div>

                      <button
                        onClick={handleMigration}
                        disabled={!file1 || isMigrating}
                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-lg text-white transition-all transform ${!file1 || isMigrating ? 'bg-slate-200' : 'bg-amber-600 hover:bg-amber-700 hover:scale-[1.01] shadow-xl shadow-amber-600/10 active:scale-95'}`}
                      >
                        {isMigrating ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCcw className="w-6 h-6" />}
                        {isMigrating ? 'Syncing...' : 'Start Migration'}
                      </button>
                      </>
                      )}

                      {result && (
                        <div className="mt-8 animate-in fade-in zoom-in-95">
                          <div className="bg-emerald-950 text-white p-8 rounded-[2.5rem] shadow-2xl border border-emerald-800/60">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-emerald-400">
                               <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Step Complete
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {result && typeof result === 'object' && !Array.isArray(result) && 
                                Object.entries(result)
                                  .filter(([k]) => !['totalRows', 'totalModelRows', 'totalRowsProcessed', 'failures', 'failuresCount'].includes(k))
                                  .map(([key, val]) => {
                                    const METRIC_LABELS: Record<string, string> = {
                                      importedCategories: 'imported Categories',
                                      importedBrands: 'imported Brands',
                                      importedModels: 'imported Models',
                                      skippedRows: 'skipped Rows',
                                      skipped: 'skipped Rows',
                                      updatedCategories: 'updated Categories',
                                      updatedBrands: 'updated Brands',
                                      updatedModels: 'updated Models',
                                      importedHeaders: 'imported Stock Headers',
                                      importedLines: 'imported QR Lines',
                                      importedDispatches: 'imported Dispatches',
                                      importedDispatchItems: 'imported Dispatch Items',
                                      importedReversals: 'imported Reversals',
                                    };
                                    const label = METRIC_LABELS[key] || key.replace(/([A-Z])/g, ' $1').toLowerCase().trim();
                                    const numVal = typeof val === 'number' ? val.toLocaleString() : (val as any);
                                    return (
                                       <div key={key} className="bg-white/10 p-5 rounded-2xl border border-white/10 backdrop-blur-md flex flex-col justify-between space-y-3 shadow-sm hover:bg-white/15 transition-colors">
                                         <span className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono tracking-tight leading-none whitespace-normal break-words">
                                           {numVal}
                                         </span>
                                         <span className="text-xs font-bold text-emerald-100/90 leading-snug">
                                           {label}
                                         </span>
                                       </div>
                                    );
                                  })
                              }
                            </div>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="mt-8 bg-rose-50 border border-rose-100 p-6 rounded-[2.5rem] flex items-start gap-4 text-rose-800 animate-in shake">
                          <AlertTriangle className="w-6 h-6 text-rose-500" />
                          <div>
                            <h3 className="font-black">Migration Failed</h3>
                            <p className="text-xs opacity-80 mt-1">{error}</p>
                          </div>
                        </div>
                      )}

                      {legacySubTab === 'designs' && (
                        <div className="pt-4 space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="h-px bg-slate-200 flex-1"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">OR USE LOCAL FILE</span>
                            <div className="h-px bg-slate-200 flex-1"></div>
                          </div>
                          
                          <button
                            onClick={async () => {
                              setIsMigrating(true);
                              setResult(null);
                              try {
                                const data = await migrationApi.migrateDesignsLocal();
                                setResult(data);
                                
                              } catch (err: any) {
                                setError(err.message);
                              } finally {
                                setIsMigrating(false);
                              }
                            }}
                            disabled={isMigrating}
                            className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 border border-slate-100 rounded-[2rem] font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Search className="w-4 h-4" />
                            Run Local Scan (17k+ records)
                          </button>

                          <button
                            onClick={async () => {
                              setIsMigrating(true);
                              setResult(null);
                              try {
                                const data = await migrationApi.generateDesignImages();
                                setResult(data);
                                
                              } catch (err: any) {
                                setError(err.message);
                              } finally {
                                setIsMigrating(false);
                              }
                            }}
                            disabled={isMigrating}
                            className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 rounded-[2rem] font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                          >
                            <FileCode className="w-4 h-4" />
                            Generate Design Previews (from PLT)
                          </button>
                        </div>
                      )}

                      {/* Danger Zone / Clean Data */}
                      {['catalog', 'skins', 'designs', 'roles', 'users', 'licenses', 'mobile-users', 'cut-credits', 'mobile-app-cuts', 'dealer-master-qrs', 'plotter-masters', 'materials', 'stock'].includes(legacySubTab) && (
                        <div className="pt-6 border-t border-slate-100 mt-8 space-y-4">
                          <div className="flex items-center gap-2 text-rose-600 px-1">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              Danger Zone
                            </span>
                          </div>
                          
                          <div className="bg-rose-50/30 rounded-[2rem] p-6 border border-rose-100/50 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="text-left">
                              <h4 className="text-xs font-black text-slate-800">
                                Clean {
                                  legacySubTab === 'designs' 
                                    ? 'Catalog' 
                                    : legacySubTab === 'mobile-users'
                                    ? 'Mobile Users'
                                    : legacySubTab === 'cut-credits'
                                    ? 'Cut Credits'
                                    : legacySubTab === 'mobile-app-cuts'
                                    ? 'Mobile App Cuts'
                                    : legacySubTab === 'plotter-masters'
                                    ? 'Plotter Masters'
                                    : legacySubTab === 'stock'
                                    ? 'Stock & Dispatches'
                                    : legacySubTab.charAt(0).toUpperCase() + legacySubTab.slice(1)
                                } Migration Data
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-0.5 max-w-sm">
                                Permanently wipe all imported records for this module. Root seed and system records will be safely preserved.
                              </p>
                            </div>
                            
                            <button
                              type="button"
                              disabled={isMigrating || isCleaning}
                              onClick={() => {
                                const targetModule = legacySubTab === 'designs' ? 'catalog' : legacySubTab;
                                if (confirmCleanModule === targetModule) {
                                  handleCleanData(targetModule);
                                } else {
                                  setConfirmCleanModule(targetModule);
                                  // Auto reset confirmation after 5 seconds
                                  setTimeout(() => setConfirmCleanModule((prev: string | null) => prev === targetModule ? null : prev), 5000);
                                }
                              }}
                              className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all border shrink-0
                                ${confirmCleanModule === (legacySubTab === 'designs' ? 'catalog' : legacySubTab)
                                  ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700 animate-pulse'
                                  : 'bg-transparent text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300'
                                }`}
                            >
                              {isCleaning ? (
                                <span className="flex items-center gap-1.5">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Cleaning...
                                </span>
                              ) : confirmCleanModule === (legacySubTab === 'designs' ? 'catalog' : legacySubTab) ? (
                                'Click to Confirm Delete'
                              ) : (
                                'Clean Data'
                              )}
                            </button>
                          </div>

                          <div className="flex justify-end px-1">
                            <button
                              type="button"
                              disabled={isMigrating || isCleaning}
                              onClick={() => {
                                if (confirmCleanModule === 'all') {
                                  handleCleanData('all');
                                } else {
                                  setConfirmCleanModule('all');
                                  setTimeout(() => setConfirmCleanModule((prev: string | null) => prev === 'all' ? null : prev), 5000);
                                }
                              }}
                              className={`text-[10px] font-bold transition-all underline decoration-dotted underline-offset-2
                                ${confirmCleanModule === 'all'
                                  ? 'text-rose-600 font-black animate-pulse'
                                  : 'text-slate-400 hover:text-rose-600'
                                }`}
                            >
                              {confirmCleanModule === 'all' ? 'Confirm: Wipe All Migration Data?' : 'Wipe All Imported Modules'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in">
                  <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-8">
                     {React.createElement(currentTab?.icon || AlertCircle, { className: "w-12 h-12" })}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">{currentTab?.label}</h2>
                  <p className="text-slate-500 max-w-sm">This data stream is in the testing phase.</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Activity Logs</h2>
                <p className="text-slate-500">History of all legacy data migration attempts.</p>
              </div>
              <button 
                onClick={handleDownloadCsv}
                className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/10 active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" /> Download CSV
              </button>
           </div>
           
           <div className="overflow-x-auto">
             {logsLoading ? (
               <div className="p-32 text-center">
                 <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Fetching Logs...</p>
               </div>
             ) : migrationLogs.length === 0 ? (
               <div className="p-32 text-center">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <History className="w-10 h-10 text-slate-200" />
                 </div>
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No migration history found</p>
               </div>
             ) : (
               <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date & Time</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Module</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">File Name</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Processed</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-600 uppercase tracking-wide">Created</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-amber-500 uppercase tracking-wide">Updated</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-red-500 uppercase tracking-wide">Failed</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {migrationLogs.map((log: any, idx: number) => (
                      <tr key={log.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-400 whitespace-nowrap">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                         <p className="text-sm font-bold text-slate-900">{formatISTDate(log.createdAt)}</p>
                         <p className="text-[10px] text-slate-400">{formatISTTime(log.createdAt)}</p>
                       </td>
                       <td className="px-4 py-3.5 text-center">
                         <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                           {log.module}
                         </span>
                       </td>
                       <td className="px-4 py-3.5 max-w-xs truncate font-medium text-slate-600 text-sm">
                         {log.fileName}
                       </td>
                       <td className="px-4 py-3.5 text-center">
                         <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
                           ${log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 
                             log.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 
                             'bg-red-100 text-red-700'}`}>
                           {log.status}
                         </span>
                       </td>
                       <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-slate-400">
                         {log.recordsProcessed}
                       </td>
                       <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-emerald-600">
                         {log.recordsCreated}
                       </td>
                       <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-amber-500">
                         {log.recordsUpdated || 0}
                       </td>
                       <td className="px-4 py-3.5 text-right font-mono text-xs font-bold text-red-500">
                         {log.recordsFailed}
                       </td>
                       <td className="px-4 py-3.5 text-center">
                         {log.recordsFailed > 0 && (
                           <button
                             onClick={() => handleDownloadFailures(log.id)}
                             title="Download Failure Details"
                             className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all active:scale-95"
                           >
                             <Download className="w-4 h-4" />
                           </button>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </div>
        </div>
      )}

      {activeTab === 'bulk' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 p-32 text-center shadow-xl animate-in fade-in">
           <Loader2 className="w-12 h-12 text-slate-200 animate-spin mx-auto mb-6" />
           <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Bulk Import Module (Coming Soon)</p>
        </div>
      )}

      {/* Status Modal Instance */}
      
    </div>
  );
};

// --- Premium Status Modal Component ---
export const StatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'error';
  data?: any;
}> = ({ isOpen, onClose, title, message, type = 'success', data }) => {
  if (!isOpen) return null;

  const config = {
    success: {
      bg: 'from-emerald-400 to-teal-600',
      icon: <CheckCircle2 className="w-16 h-16 text-white" />,
      btn: 'bg-emerald-600 hover:bg-emerald-700'
    },
    info: {
      bg: 'from-amber-400 to-amber-600',
      icon: <Info className="w-16 h-16 text-white" />,
      btn: 'bg-amber-600 hover:bg-amber-700'
    },
    error: {
      bg: 'from-red-400 to-red-600',
      icon: <AlertCircle className="w-16 h-16 text-white" />,
      btn: 'bg-red-600 hover:bg-red-700'
    }
  }[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        
        {/* Modal Header/Icon */}
        <div className={`relative h-24 bg-gradient-to-br ${config.bg} flex items-center justify-center`}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-xl border border-white/30">
            {React.cloneElement(config.icon as React.ReactElement<any>, { className: "w-8 h-8 text-white" })}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-8 text-center">
          <h2 className="text-2xl font-black text-slate-900 mb-2">{title}</h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">{message}</p>

          {data && typeof data === 'object' && !Array.isArray(data) && (
            <div className="grid grid-cols-2 gap-2 mb-8 text-left">
              {Object.entries(data)
                .filter(([k]) => !['totalRows', 'totalModelRows', 'totalRowsProcessed', 'failures'].includes(k))
                .map(([key, val]) => (
                  <div key={key} className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </p>
                    <p className="text-base font-black text-slate-900">{val as any}</p>
                  </div>
                ))
              }
            </div>
          )}

          <button
            onClick={onClose}
            className={`w-full py-4 text-white rounded-xl font-black text-base transition-all hover:scale-[1.01] active:scale-95 shadow-lg ${config.btn}`}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataMigration;
