const fs = require('fs');

function patch() {
  let content = fs.readFileSync('flashgard-monorepo/apps/frontend/src/pages/Organizations.tsx', 'utf8');

  // Add imports
  if (!content.includes('Ticket')) {
    content = content.replace("Users, MapPin, Phone,", "Users, MapPin, Phone, Ticket, Key, ShieldCheck, ChevronLeft,");
  }
  if (!content.includes('licensesApi')) {
    content = content.replace("import { orgsApi, contactsApi, usersApi, addressesApi }", "import { orgsApi, contactsApi, usersApi, addressesApi, licensesApi, cutCreditsApi }");
  }

  // Modernize TabBar
  const oldTabBar = /const TabBar = \({ tabs, active, onChange.*?\);/s;
  const newTabBar = `const TabBar = ({ tabs, active, onChange }: { tabs: any[]; active: string; onChange: (t: string) => void }) => (
  <div className="flex overflow-x-auto border-b border-slate-200 bg-white no-scrollbar">
    <div className="flex min-w-max px-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={\`px-5 py-4 text-sm font-medium border-b-2 transition-all flex items-center gap-2 whitespace-nowrap
            \${active === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}\`}
        >
          <tab.icon className={\`w-4 h-4 \${active === tab.id ? 'text-blue-600' : 'text-slate-400'}\`} />
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);`;
  content = content.replace(oldTabBar, newTabBar);

  // Update TABS array and Tabs rendering in Main Organizations Page
  const oldTabsDef = "const TABS = ['Details', 'Contacts', 'Users', 'Addresses'];";
  const newTabsDef = `const TABS = [
  { id: 'Details', label: 'Details', icon: Building2 },
  { id: 'Contacts', label: 'Contacts', icon: Phone },
  { id: 'Users', label: 'Users', icon: Users },
  { id: 'Addresses', label: 'Addresses', icon: MapPin },
  { id: 'Licenses', label: 'Licenses', icon: Key },
  { id: 'Credits', label: 'Credits', icon: Ticket },
];`;
  content = content.replace(oldTabsDef, newTabsDef);

  // UsersTab replacement with Pagination
  const oldUsersTabStart = "const UsersTab = ({ orgId }: { orgId: number }) => {";
  const newUsersTab = `const UsersTab = ({ orgId }: { orgId: number }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const take = 50;

  useEffect(() => {
    setLoading(true);
    usersApi.getAll('', false, (page - 1) * take, take, String(orgId))
      .then((data: any) => {
         const arr = Array.isArray(data) ? data : (data?.data || []);
         setItems(arr.filter((u: any) => !u.isSuperAdmin));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId, page]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Users</h3>
        <p className="text-xs text-slate-400">Manage all users via the <a href="/users" className="text-blue-600 hover:underline">Users section</a></p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : items.length === 0 && page === 1 ? (
        <EmptyState icon={Users} message="No users in this organization" addLabel="Go to Users section" onAdd={() => window.location.href = '/users'} />
      ) : (
        <div className="space-y-3">
          {items.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center">
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-600 bg-slate-200/50 px-2.5 py-1 rounded-lg uppercase">{u.role?.name || 'User'}</p>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50">Previous</button>
            <span className="text-sm font-semibold text-slate-500">Page {page}</span>
            <button disabled={items.length < take} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

const LicensesTab = ({ orgId }: { orgId: number }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const take = 50;

  useEffect(() => {
    setLoading(true);
    licensesApi.getInventory(String(orgId), (page - 1) * take, take, '')
      .then((data: any) => {
         const arr = Array.isArray(data) ? data : (data?.data || []);
         setItems(arr);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId, page]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Licenses</h3>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : items.length === 0 && page === 1 ? (
        <EmptyState icon={Key} message="No licenses found for this organization" />
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((l: any) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{l.key}</td>
                  <td className="px-4 py-3 font-semibold text-slate-600">{l.batch?.licenseType || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase \${l.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}\`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                     {l.batch?.planType === 'USAGE' ? \`\${l.remainingCredits} Cuts\` : 'Unlimited'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-4 border-t border-slate-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50">Previous</button>
            <span className="text-sm font-semibold text-slate-500">Page {page}</span>
            <button disabled={items.length < take} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};

const CreditsTab = ({ orgId }: { orgId: number }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const take = 50;

  useEffect(() => {
    setLoading(true);
    cutCreditsApi.getInventory(String(orgId), (page - 1) * take, take, '')
      .then((data: any) => {
         const arr = Array.isArray(data) ? data : (data?.data || []);
         setItems(arr);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId, page]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-700">Cut Credits</h3>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
      ) : items.length === 0 && page === 1 ? (
        <EmptyState icon={Ticket} message="No credits found for this organization" />
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{c.key}</td>
                  <td className="px-4 py-3">
                    <span className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase \${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}\`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                     {c.remainingCredits} Cuts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-4 border-t border-slate-100">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50">Previous</button>
            <span className="text-sm font-semibold text-slate-500">Page {page}</span>
            <button disabled={items.length < take} onClick={() => setPage(p => p + 1)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}
    </div>
  );
};
`;

  // Find UsersTab and cut the rest up to AddressesTab to replace it.
  const oldUsersTabFullRegex = /const UsersTab = \({ orgId }: \{ orgId: number \}\) => \{[\s\S]*?(?=const AddressesTab =)/;
  content = content.replace(oldUsersTabFullRegex, newUsersTab);

  // Update rendering inside main component
  const oldRenderTab = `{activeTab === 'Details' && <DetailsTab org={selected} onEdit={() => setModal(selected)} />}
          {activeTab === 'Contacts' && <ContactsTab orgId={selected.id} />}
          {activeTab === 'Users' && <UsersTab orgId={selected.id} />}
          {activeTab === 'Addresses' && <AddressesTab orgId={selected.id} />}`;
  
  const newRenderTab = `{activeTab === 'Details' && <DetailsTab org={selected} onEdit={() => setModal(selected)} />}
          {activeTab === 'Contacts' && <ContactsTab orgId={selected.id} />}
          {activeTab === 'Users' && <UsersTab orgId={selected.id} />}
          {activeTab === 'Addresses' && <AddressesTab orgId={selected.id} />}
          {activeTab === 'Licenses' && <LicensesTab orgId={selected.id} />}
          {activeTab === 'Credits' && <CreditsTab orgId={selected.id} />}`;

  content = content.replace(oldRenderTab, newRenderTab);

  fs.writeFileSync('flashgard-monorepo/apps/frontend/src/pages/Organizations.tsx', content);
  console.log('Patched correctly');
}

patch();
