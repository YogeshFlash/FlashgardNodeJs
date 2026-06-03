const fs = require('fs');
let code = fs.readFileSync('src/pages/LicensesPage.tsx', 'utf8');

// 1. Add lucide icons
code = code.replace(/Laptop, RotateCcw, Search/, 'Laptop, RotateCcw, Search, ChevronLeft, ChevronRight');

// 2. Replace state and fetchData
const newStateAndFetch = `const LicensesPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'licenses' | 'credits' | 'history'>('licenses');
  const [orgLicenses, setOrgLicenses] = useState<any[]>([]);
  const [cutCredits, setCutCredits] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const ITEMS_PER_PAGE = 50;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== searchQuery) {
        setDebouncedSearch(searchQuery);
        setPage(1); // Reset to page 1 on new search
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  // Refetch when tab, page, or search changes
  useEffect(() => {
    fetchData();
  }, [tab, page, debouncedSearch]);

  const fetchData = async () => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const take = ITEMS_PER_PAGE;

      const promises: any[] = [
        orgsApi.getAll().catch(() => []),
        licensesApi.getTransfers().catch(() => []),
        cutCreditsApi.getTransfers().catch(() => [])
      ];

      if (tab === 'licenses') {
        promises.push(licensesApi.getInventory(undefined, skip, take, debouncedSearch).catch(() => ({ data: [], total: 0 })));
      } else if (tab === 'credits') {
        promises.push(cutCreditsApi.getInventory(undefined, skip, take, debouncedSearch).catch(() => ({ data: [], total: 0 })));
      }

      const results = await Promise.all(promises);
      const orgsRes = results[0];
      const transferLicRes = results[1];
      const transferCredRes = results[2];
      
      setOrgs(orgsRes || []);
      
      if (tab === 'licenses') {
        const licRes = results[3] || { data: [], total: 0 };
        if (Array.isArray(licRes)) {
           setOrgLicenses(licRes); setTotalItems(licRes.length);
        } else {
           setOrgLicenses(licRes.data || []); setTotalItems(licRes.total || 0);
        }
      } else if (tab === 'credits') {
        const credRes = results[3] || { data: [], total: 0 };
        if (Array.isArray(credRes)) {
           setCutCredits(credRes); setTotalItems(credRes.length);
        } else {
           setCutCredits(credRes.data || []); setTotalItems(credRes.total || 0);
        }
      }

      // Combine transfers
      const transferMap = new Map();
      (transferLicRes || []).forEach((t: any) => transferMap.set(t.id, { ...t, itemType: 'License' }));
      (transferCredRes || []).forEach((t: any) => {
        if (!transferMap.has(t.id)) transferMap.set(t.id, { ...t, itemType: 'Credits' });
      });
      const allTransfers = Array.from(transferMap.values())
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      setTransfers(allTransfers);
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectFullBatch = (items: any[], batchId: string) => {
    const batchItems = items.filter(item => item.batchId === batchId && item.status === 'AVAILABLE');
    const batchItemIds = batchItems.map(item => item.id);
    const allInBatchSelected = batchItemIds.every(id => selectedIds.includes(id));

    if (allInBatchSelected) {
      setSelectedIds(prev => prev.filter(id => !batchItemIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...batchItemIds])]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <Badge variant="green">Available</Badge>;
      case 'IN_TRANSIT': return <Badge variant="amber">In Transit</Badge>;
      case 'ACTIVE': return <Badge variant="indigo">Active</Badge>;
      case 'SUSPENDED': return <Badge variant="amber">Suspended</Badge>;
      case 'CONSUMED': return <Badge variant="gray">Consumed</Badge>;
      case 'REVOKED': return <Badge variant="red">Revoked</Badge>;
      case 'EXPIRED': return <Badge variant="red">Expired</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const groupedLicenses = orgLicenses.reduce((acc: any, item) => {
    const batchId = item.batchId || 'unbatched';
    if (!acc[batchId]) acc[batchId] = { info: item.batch || { batchCode: 'Unbatched', createdAt: item.createdAt }, items: [] };
    acc[batchId].items.push(item);
    return acc;
  }, {});

  const groupedCredits = cutCredits.reduce((acc: any, item) => {
    const batchId = item.batchId || 'unbatched';
    if (!acc[batchId]) acc[batchId] = { info: item.batch || { batchCode: 'Unbatched', createdAt: item.createdAt }, items: [] };
    acc[batchId].items.push(item);
    return acc;
  }, {});`;

code = code.replace(/const LicensesPage = \(\) => \{[\s\S]*?const groupedCredits = [^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\}, \{\}\);/m, newStateAndFetch);

// 3. Update UI tables
code = code.replace(/selectFullBatch\(filteredLicenses,/g, 'selectFullBatch(orgLicenses,');
code = code.replace(/filteredLicenses\.length === 0/g, 'orgLicenses.length === 0');

// Add Pagination UI at the end of the tables for licenses and cut credits
const paginationUI = `
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <span className="text-sm text-slate-500">
                Showing {totalItems > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0} to {Math.min(page * ITEMS_PER_PAGE, totalItems)} of <span className="font-semibold text-slate-700">{totalItems}</span> results
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>`;

// Find `</table>` followed by `</div>` inside `tab === 'licenses'` block
let licensesTableRegex = /(<table className="w-full text-left">[\s\S]*?<\/table>\s*)<\/div>/;
code = code.replace(licensesTableRegex, `$1${paginationUI}`);

// Find `</table>` followed by `</div>` inside `tab === 'credits'` block
let creditsTableRegex = /(tab === 'credits' \? \([\s\S]*?<table className="w-full text-left">[\s\S]*?<\/table>\s*)<\/div>/;
code = code.replace(creditsTableRegex, `$1${paginationUI}`);

code = code.replace(/setTab\('licenses'\);/g, "setTab('licenses'); setPage(1);");
code = code.replace(/setTab\('credits'\);/g, "setTab('credits'); setPage(1);");
code = code.replace(/setTab\('history'\);/g, "setTab('history'); setPage(1);");

fs.writeFileSync('src/pages/LicensesPage.tsx', code);
