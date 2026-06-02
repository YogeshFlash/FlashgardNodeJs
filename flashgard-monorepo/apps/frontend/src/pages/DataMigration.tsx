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
  Shield
} from 'lucide-react';
import { migrationApi, API_BASE } from '../lib/api';

type MainTab = 'legacy' | 'mssql' | 'bulk' | 'history';
type LegacySubTab = 'catalog' | 'skins' | 'designs' | 'roles' | 'users' | 'licenses' | 'mobile-users' | 'orders';

const DataMigration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainTab>('legacy');
  const [legacySubTab, setLegacySubTab] = useState<LegacySubTab>('catalog');

  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [migrationLogs, setMigrationLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [confirmCleanModule, setConfirmCleanModule] = useState<string | null>(null);

  const [dbConfig, setDbConfig] = useState({ user: '', password: '', server: '', database: '', port: 1433 });
  const [dbConnected, setDbConnected] = useState(false);
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [dbMapFile1, setDbMapFile1] = useState('');
  const [dbMapFile2, setDbMapFile2] = useState('');

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
      const response = await fetch(`${API_BASE}/migration/logs/csv`, {
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
      const response = await fetch(`${API_BASE}/migration/logs/${logId}/failures`, {
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
      }
      
      setResult(data);
      
    } catch (err: any) {
      setError(err.message);
      
    } finally {
      setIsMigrating(false);
    }
  };

  const legacySubTabs: { id: LegacySubTab; label: string; icon: any; description: string; file1Label: string; file1Name: string; file2Label?: string; file2Name?: string }[] = [
    { id: 'catalog', label: '1. Categories & Brands', icon: Layers, description: 'Setup the high-level organizational structure.', file1Label: 'Catalog CSV', file1Name: 'CatalogueMaster.csv' },
    { id: 'skins', label: '2. Cut Patterns', icon: Scissors, description: 'Define the types of skins and cut settings.', file1Label: 'Skins CSV', file1Name: 'ModelSkinMaster.csv' },
    { id: 'designs', label: '3. Models & Designs', icon: FileCode, description: 'Import 17k+ designs and create Models.', file1Label: 'Designs CSV', file1Name: 'ModelMaster.csv' },
    { id: 'roles', label: '4. User Roles', icon: Shield, description: 'Migrate legacy system roles.', file1Label: 'Roles CSV', file1Name: 'RoleMaster.csv' },
    { id: 'users', label: '5. Org & Users', icon: Users, description: 'Migrate legacy user credentials.', file1Label: 'Users CSV', file1Name: 'UserMaster.csv', file2Label: 'User Roles Map CSV', file2Name: 'UserRolesMaster.csv' },
    { id: 'licenses', label: '6. Licenses', icon: FileCode, description: 'Migrate legacy licenses and assign to dealers.', file1Label: 'Licenses CSV', file1Name: 'LicenseMaster.csv', file2Label: 'License Dealers CSV', file2Name: 'LicenseAssignDealer.csv' },
    { id: 'mobile-users', label: '7. Mobile Users', icon: Users, description: 'Migrate legacy mobile app users and links.', file1Label: 'Mobile Users CSV', file1Name: 'MobileAppUser.csv' },
    { id: 'orders', label: 'Order History', icon: ShoppingCart, description: 'Sync past transactions.', file1Label: 'Orders CSV', file1Name: 'OrderMaster.csv' },
  ];

  const currentTab = legacySubTabs.find(t => t.id === legacySubTab);
  useEffect(() => {
    setDbMapFile1('');
    setDbMapFile2('');
    if (currentTab && dbTables.length > 0) {
      const t1 = currentTab.file1Name.replace('.csv', '');
      const match1 = dbTables.find(t => t.toLowerCase() === t1.toLowerCase() || t.includes(t1));
      if (match1) setDbMapFile1(match1);
      
      if (currentTab.file2Name) {
        const t2 = currentTab.file2Name.replace('.csv', '');
        const match2 = dbTables.find(t => t.toLowerCase() === t2.toLowerCase() || t.includes(t2));
        if (match2) setDbMapFile2(match2);
      }
    }
  }, [legacySubTab, currentTab, dbTables]);

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

  const handleDbMigration = async () => {
    if (!dbMapFile1) return;
    setIsMigrating(true);
    setError(null);
    setResult(null);
    try {
      const data = await migrationApi.dbRun({ 
        moduleType: legacySubTab, 
        tableMap: { file1: dbMapFile1, file2: dbMapFile2 }
      });
      setResult(data);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
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
      <div className="flex gap-1 p-1 bg-slate-100/50 rounded-2xl mb-8 w-fit border border-slate-200/50">
                <button
          onClick={() => setActiveTab('mssql')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all ${activeTab === 'mssql' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Database className="w-4 h-4" /> Direct DB Link
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
              { title: 'System & Core', ids: ['roles', 'users', 'licenses', 'mobile-users', 'orders'] }
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
              
              {['catalog', 'skins', 'designs', 'roles', 'users', 'licenses', 'mobile-users'].includes(legacySubTab) ? (
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
                    <div className={`w-full ${legacySubTab === 'users' ? 'max-w-2xl' : 'max-w-lg'} space-y-6`}>
                      
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
                                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{currentTab?.file1Label} Table</label>
                                  <select value={dbMapFile1} onChange={e => setDbMapFile1(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 mt-2 font-bold text-slate-700" required>
                                    <option value="">-- Select Table --</option>
                                    {dbTables.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </div>
                                {currentTab?.file2Name && (
                                  <div>
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">{currentTab?.file2Label} Table</label>
                                    <select value={dbMapFile2} onChange={e => setDbMapFile2(e.target.value)} className="w-full p-4 rounded-xl border border-slate-200 mt-2 font-bold text-slate-700">
                                      <option value="">-- Select Table (Optional) --</option>
                                      {dbTables.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={handleDbMigration}
                                disabled={!dbMapFile1 || isMigrating}
                                className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-lg text-white transition-all transform ${!dbMapFile1 || isMigrating ? 'bg-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl'}`}
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
                          <div className="bg-emerald-900 text-white p-8 rounded-[2.5rem] shadow-2xl">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                               <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Step Complete
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                              {result && typeof result === 'object' && !Array.isArray(result) && 
                                Object.entries(result)
                                  .filter(([k]) => !['totalRows', 'totalModelRows', 'totalRowsProcessed', 'failures'].includes(k))
                                  .map(([key, val]) => (
                                    <div key={key} className="bg-white/10 p-4 rounded-2xl">
                                      <p className="text-2xl font-black">{val as any}</p>
                                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">{key.replace(/([A-Z])/g, ' $1')}</p>
                                    </div>
                                  ))
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
                      {['catalog', 'skins', 'designs', 'roles', 'users', 'licenses', 'mobile-users'].includes(legacySubTab) && (
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
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                     <th className="px-8 py-4">Date & Time</th>
                     <th className="px-6 py-4 text-center">Module</th>
                     <th className="px-6 py-4">File Name</th>
                     <th className="px-6 py-4 text-center">Status</th>
                     <th className="px-6 py-4 text-right">Processed</th>
                     <th className="px-6 py-4 text-right text-emerald-600">Created</th>
                     <th className="px-6 py-4 text-right text-amber-500">Updated</th>
                     <th className="px-6 py-4 text-right text-red-500">Failed</th>
                     <th className="px-8 py-4 text-center">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {migrationLogs.map((log: any) => (
                     <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-8 py-4 whitespace-nowrap">
                         <p className="text-sm font-bold text-slate-900">{new Date(log.createdAt).toLocaleDateString()}</p>
                         <p className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
                       </td>
                       <td className="px-6 py-4 text-center">
                         <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                           {log.module}
                         </span>
                       </td>
                       <td className="px-6 py-4 max-w-xs truncate font-medium text-slate-600 text-sm">
                         {log.fileName}
                       </td>
                       <td className="px-6 py-4 text-center">
                         <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider
                           ${log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 
                             log.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 
                             'bg-red-100 text-red-700'}`}>
                           {log.status}
                         </span>
                       </td>
                       <td className="px-6 py-4 text-right font-mono text-xs font-bold text-slate-400">
                         {log.recordsProcessed}
                       </td>
                       <td className="px-6 py-4 text-right font-mono text-xs font-bold text-emerald-600">
                         {log.recordsCreated}
                       </td>
                       <td className="px-6 py-4 text-right font-mono text-xs font-bold text-amber-500">
                         {log.recordsUpdated || 0}
                       </td>
                       <td className="px-6 py-4 text-right font-mono text-xs font-bold text-red-500">
                         {log.recordsFailed}
                       </td>
                       <td className="px-8 py-4 text-center">
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
const StatusModal: React.FC<{
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
