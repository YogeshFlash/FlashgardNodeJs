import { useState, useEffect } from 'react';
import { 
  Building2, Users, ShieldCheck, 
  Activity, Clock
} from 'lucide-react';
import { dashboardApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Badge = ({ children, variant = 'gray' }: any) => {
  const styles: any = {
    gray: 'bg-slate-100 text-slate-600 border-slate-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]}`}>
      {children}
    </span>
  );
};

const getFriendlyActivityText = (action: string, entity: string, details?: any) => {
  const act = (action || '').toUpperCase();
  const ent = (entity || '').toUpperCase();

  const entityNames: Record<string, string> = {
    USER: 'user',
    ORGANIZATION: 'organization',
    ORGANIZATIONTYPE: 'organization type',
    ROLE: 'role',
    PERMISSION: 'permission',
    MODELCATEGORY: 'category',
    BRAND: 'brand',
    MODEL: 'model',
    CUTPATTERN: 'pattern',
    MODELCUTFILE: 'pattern cut file',
    ORGLICENSE: 'license',
    CUTCREDIT: 'credits transfer',
    DEALERMASTERQR: 'dealer master QRs',
    PLOTTER: 'plotter',
    PLOTTERMASTER: 'plotter master profile',
    PRODUCTTYPE: 'product type',
    MATERIALCATEGORY: 'material category',
    MATERIAL: 'material',
    FILMCATEGORY: 'film category',
    FILMTYPE: 'film type',
  };

  const friendlyEntity = entityNames[ent] || entity.toLowerCase();
  
  let nameLabel = '';
  if (details && typeof details === 'object') {
    nameLabel = details.name || details.email || details.title || details.label || '';
    if (nameLabel) nameLabel = ` "${nameLabel}"`;
  }

  switch (act) {
    case 'CREATE':
      if (ent === 'MODELCUTFILE') return 'Uploaded a pattern cut file';
      if (ent === 'CUTCREDIT') return `Transferred cut credits to a dealer${nameLabel}`;
      if (ent === 'DEALERMASTERQR') return 'Generated new master QRs';
      return `Created new ${friendlyEntity}${nameLabel}`;
    case 'UPDATE':
      return `Updated ${friendlyEntity}${nameLabel}`;
    case 'DELETE':
    case 'REMOVE':
      return `Deleted ${friendlyEntity}${nameLabel}`;
    case 'RESTORE':
      return `Restored ${friendlyEntity}${nameLabel}`;
    case 'PURGE':
      return `Permanently deleted ${friendlyEntity}${nameLabel}`;
    case 'LOGIN':
      return 'Logged into the portal';
    case 'LOGOUT':
      return 'Signed out of the portal';
    case 'DISPATCH':
      return `Dispatched credits to organization${nameLabel}`;
    default:
      return `${action.toLowerCase()} ${friendlyEntity}${nameLabel}`;
  }
};

const DashboardOverview = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load dashboard statistics:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 animate-pulse text-slate-400 space-y-4">
        <Activity className="w-12 h-12 text-slate-300 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Loading dashboard data...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Organizations',
      value: data?.stats?.totalOrgs ?? 0,
      unit: '',
      icon: Building2,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
      iconBg: 'bg-indigo-100 text-indigo-600',
      link: '/organizations'
    },
    {
      title: 'Active Users',
      value: data?.stats?.activeUsers ?? 0,
      unit: '',
      icon: Users,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      iconBg: 'bg-emerald-100 text-emerald-600',
      link: '/users'
    },
    {
      title: 'Custom Roles',
      value: data?.stats?.totalRoles ?? 0,
      unit: '',
      icon: ShieldCheck,
      color: 'bg-blue-50 text-blue-600 border-blue-100',
      iconBg: 'bg-blue-100 text-blue-600',
      link: '/roles'
    },
    {
      title: data?.stats?.fourthCardTitle ?? 'Active Licenses',
      value: data?.stats?.fourthCardValue ?? 0,
      unit: data?.stats?.fourthCardUnit ?? '',
      icon: Activity,
      color: 'bg-amber-50 text-amber-600 border-amber-100',
      iconBg: 'bg-amber-100 text-amber-600',
      link: '/licenses'
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">
            Welcome back, <span className="font-bold text-slate-700">{user?.email || 'User'}</span>. Here's a quick summary of your platform's activity.
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200/50 flex items-center gap-1.5 self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5" />
          {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {statCards.map((stat) => (
          <Link key={stat.title} to={stat.link} className="card p-6 border border-slate-200/60 bg-white hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.title}</span>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.iconBg} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">
                {stat.value}
                {stat.unit && <span className="text-sm font-semibold text-slate-500 ml-1">{stat.unit}</span>}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Area Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Recent Organizations Table */}
        <div className="lg:col-span-2 card bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-900">Recent Organizations</h2>
              <Link to="/organizations" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider">View All</Link>
            </div>
            <div className="overflow-x-auto">
              {!data?.recentOrgs || data.recentOrgs.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400 italic">
                  <Building2 className="w-10 h-10 text-slate-300 mb-3" />
                  <p className="text-sm">No organizations connected yet.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase border-b border-slate-100">
                      <th className="px-6 py-3">Organization Name</th>
                      <th className="px-6 py-3">Type</th>
                      <th className="px-6 py-3">Parent Organization</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Joined Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentOrgs.map((org: any) => (
                      <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{org.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                            {org.organizationType?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {org.parent?.name || <span className="text-slate-400 italic">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {org.isActive ? (
                            <Badge variant="green">Active</Badge>
                          ) : (
                            <Badge variant="red">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* System Activity Feed */}
        <div className="card bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Activity Log</h2>
          </div>
          <div className="p-6 flex-1 overflow-y-auto">
            {!data?.recentActivities || data.recentActivities.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-center py-12">
                <Clock className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-sm">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {data.recentActivities.map((log: any) => (
                  <div key={log.id} className="flex gap-4 items-start">
                    <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {getFriendlyActivityText(log.action, log.entity, log.details)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        By {log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email : 'System'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wider">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
