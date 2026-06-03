const fs = require('fs');
let c = fs.readFileSync('flashgard-monorepo/apps/frontend/src/pages/Organizations.tsx', 'utf8');

const regex = /{activeTab === 'Details'.*?{activeTab === 'Addresses'.*?}/s;
const replacement = `{activeTab === 'Details' && <DetailsTab org={selected} onEdit={() => setOrgModal(selected)} />}
            {activeTab === 'Contacts' && <ContactsTab orgId={selected.id} />}
            {activeTab === 'Users' && <UsersTab orgId={selected.id} />}
            {activeTab === 'Addresses' && <AddressesTab orgId={selected.id} />}
            {activeTab === 'Licenses' && <LicensesTab orgId={selected.id} />}
            {activeTab === 'Credits' && <CreditsTab orgId={selected.id} />}`;
c = c.replace(regex, replacement);

c = c.replace(/ShieldCheck, /g, '');
c = c.replace(/ChevronLeft, /g, '');

fs.writeFileSync('flashgard-monorepo/apps/frontend/src/pages/Organizations.tsx', c);
