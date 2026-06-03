const fs = require('fs');
const path = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/flashgard-monorepo/apps/frontend/src/pages/DataMigration.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. MainTab type
code = code.replace(/type MainTab = 'legacy' \| 'bulk' \| 'history';/, "type MainTab = 'legacy' | 'mssql' | 'bulk' | 'history';");

// 2. States
const statesHook = `  const [confirmCleanModule, setConfirmCleanModule] = useState<string | null>(null);

  const [dbConfig, setDbConfig] = useState({ user: '', password: '', server: '', database: '', port: 1433 });
  const [dbConnected, setDbConnected] = useState(false);
  const [dbTables, setDbTables] = useState<string[]>([]);
  const [dbMapFile1, setDbMapFile1] = useState('');
  const [dbMapFile2, setDbMapFile2] = useState('');`;
code = code.replace("  const [confirmCleanModule, setConfirmCleanModule] = useState<string | null>(null);", statesHook);

// 3. Effects and Handlers
const currentTabDef = `  const currentTab = legacySubTabs.find(t => t.id === legacySubTab);`;
const handlers = `
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
      setStatusModal({ isOpen: true, title: 'Connected', message: 'Successfully connected to MSSQL database.', type: 'success' });
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
      setStatusModal({ isOpen: true, title: 'Migration Successful', message: 'The database migration has been completed.', type: 'success', data });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsMigrating(false);
    }
  };
`;
code = code.replace(currentTabDef, currentTabDef + handlers);

// 4. Reset State
code = code.replace(/setConfirmCleanModule\(null\);/g, "setConfirmCleanModule(null);\n    setResult(null);\n    setError(null);");

// 5. Tab Button
const tabButton = `        <button
          onClick={() => setActiveTab('mssql')}
          className={\`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-all \${activeTab === 'mssql' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
        >
          <Database className="w-4 h-4" /> Direct DB Link
        </button>`;
code = code.replace(/<button[\s\S]*?onClick=\{\(\) => setActiveTab\('bulk'\)\}[\s\S]*?<\/button>/, tabButton + '\n        $&');

// 6. UI for MSSQL
const legacyBlockStr = `      {activeTab === 'legacy' && (`;
const mssqlUI = `      {(activeTab === 'legacy' || activeTab === 'mssql') && (
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
                      className={\`w-full text-left p-3.5 rounded-xl transition-all border group flex items-center gap-4 
                        \${legacySubTab === tab.id 
                          ? 'bg-white border-amber-200 shadow-lg shadow-amber-500/5 ring-4 ring-amber-500/5' 
                          : 'bg-transparent border-transparent hover:bg-slate-50 text-slate-500'}\`}
                    >
                      <div className={\`p-2 rounded-lg transition-all \${legacySubTab === tab.id ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'bg-slate-100 text-slate-400'}\`}>
                        <tab.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={\`font-bold text-xs \${legacySubTab === tab.id ? 'text-slate-900' : ''}\`}>{tab.label}</p>
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
                    <div className={\`w-full \${legacySubTab === 'users' ? 'max-w-2xl' : 'max-w-lg'} space-y-6\`}>
                      
                      {activeTab === 'mssql' ? (
                        <div className="space-y-6">
                          {!dbConnected ? (
                            <form onSubmit={handleDbConnect} className="space-y-4 p-6 border border-slate-200 rounded-[2rem] bg-slate-50">
                              <h3 className="font-black text-slate-900 mb-4">Connect to MSSQL</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-bold text-slate-500">Server</label>
                                  <input type="text" value={dbConfig.server} onChange={e => setDbConfig({...dbConfig, server: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" required placeholder="localhost" />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-slate-500">Database</label>
                                  <input type="text" value={dbConfig.database} onChange={e => setDbConfig({...dbConfig, database: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200" required placeholder="Flashgard_DB" />
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
                                <button onClick={() => setDbConnected(false)} className="text-xs underline font-bold">Disconnect</button>
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
                                className={\`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-lg text-white transition-all transform \${!dbMapFile1 || isMigrating ? 'bg-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl'}\`}
                              >
                                {isMigrating ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCcw className="w-6 h-6" />}
                                {isMigrating ? 'Syncing...' : 'Start DB Migration'}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        // File Upload UI
`;
// Replace the start of the `activeTab === 'legacy'` block
// This is getting tricky, replacing a huge JSX tree. 
// I will just replace the exact part of DataMigration.tsx instead.

code = code.replace("      {activeTab === 'legacy' && (", "      {(activeTab === 'legacy' || activeTab === 'mssql') && (");
code = code.replace(
  `                        <div className="grid grid-cols-1 gap-6">`,
  `                      {activeTab === 'mssql' ? (
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
                                className={\`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-lg text-white transition-all transform \${!dbMapFile1 || isMigrating ? 'bg-slate-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl'}\`}
                              >
                                {isMigrating ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCcw className="w-6 h-6" />}
                                {isMigrating ? 'Syncing...' : 'Start DB Migration'}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6">`
);

// We need to close the ternary for `activeTab === 'mssql'`
code = code.replace(
  `                      <button
                        onClick={handleMigration}
                        disabled={!file1 || isMigrating}
                        className={\`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-lg text-white transition-all transform \${!file1 || isMigrating ? 'bg-slate-200' : 'bg-amber-600 hover:bg-amber-700 hover:scale-[1.01] shadow-xl shadow-amber-600/10 active:scale-95'}\`}
                      >
                        {isMigrating ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCcw className="w-6 h-6" />}
                        {isMigrating ? 'Syncing...' : 'Start Migration'}
                      </button>`,
  `                      <button
                        onClick={handleMigration}
                        disabled={!file1 || isMigrating}
                        className={\`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-black text-lg text-white transition-all transform \${!file1 || isMigrating ? 'bg-slate-200' : 'bg-amber-600 hover:bg-amber-700 hover:scale-[1.01] shadow-xl shadow-amber-600/10 active:scale-95'}\`}
                      >
                        {isMigrating ? <Loader2 className="w-6 h-6 animate-spin" /> : <RefreshCcw className="w-6 h-6" />}
                        {isMigrating ? 'Syncing...' : 'Start Migration'}
                      </button>
                      )}`
);

fs.writeFileSync(path, code);
console.log('Frontend patched!');
