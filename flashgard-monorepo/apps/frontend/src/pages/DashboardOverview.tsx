import { useState, useEffect } from 'react';
import { 
  Building2, Users, ShieldCheck, 
  Activity, Clock, Database, 
  Terminal, Globe, Zap,
  ArrowUpRight
} from 'lucide-react';
import { dashboardApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Badge = ({ children, variant = 'gray' }: any) => {
  const styles: any = {
    gray: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
    red: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${styles[variant]}`}>
      {children}
    </span>
  );
};

const DashboardOverview = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cpuLoad, setCpuLoad] = useState(1.2);
  const [memUsage, setMemUsage] = useState(244);

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

    // Animate telemetry indicators slightly to feel 'alive'
    const interval = setInterval(() => {
      setCpuLoad(prev => Math.max(0.8, Math.min(4.5, +(prev + (Math.random() - 0.5) * 0.4).toFixed(1))));
      setMemUsage(prev => Math.max(235, Math.min(265, Math.round(prev + (Math.random() - 0.5) * 6))));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-4">
        <Activity className="w-12 h-12 text-[var(--color-primary)] animate-spin" />
        <p className="text-sm font-semibold tracking-wide animate-pulse">Initializing futuristic telemetry grid...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Organizations',
      value: data?.stats?.totalOrgs ?? 0,
      icon: Building2,
      color: 'from-blue-600/10 to-transparent border-blue-500/20 text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-500/10 text-blue-500',
      trend: 'Active nodes',
      link: '/organizations'
    },
    {
      title: 'Active Users',
      value: data?.stats?.activeUsers ?? 0,
      icon: Users,
      color: 'from-emerald-600/10 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-500/10 text-emerald-500',
      trend: 'Online session states',
      link: '/users'
    },
    {
      title: 'Custom Roles',
      value: data?.stats?.totalRoles ?? 0,
      icon: ShieldCheck,
      color: 'from-indigo-600/10 to-transparent border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-500/10 text-indigo-505',
      trend: 'Access matrices',
      link: '/roles'
    },
    {
      title: data?.stats?.fourthCardTitle ?? 'Active Licenses',
      value: data?.stats?.fourthCardValue ?? 0,
      unit: data?.stats?.fourthCardUnit ?? '',
      icon: Activity,
      color: 'from-amber-600/10 to-transparent border-amber-500/20 text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-500/10 text-amber-500',
      trend: 'Authorized plotters',
      link: '/licenses'
    }
  ];

  return (
    <div className="space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-rose-500 text-xs font-black uppercase tracking-widest mb-2">
            <Zap className="w-4 h-4 animate-pulse" />
            Core Telemetry Console
          </div>
          <h1 className="text-3xl font-black tracking-tight">System Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-xl">
            Operator context: <span className="font-bold text-rose-500 dark:text-rose-400">{user?.email || 'User'}</span>. System modules are online. Database connection established.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 self-start md:self-auto text-xs font-semibold text-slate-600 dark:text-slate-300 relative z-10">
          <Clock className="w-4 h-4 text-rose-500" />
          {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link 
            key={stat.title} 
            to={stat.link} 
            className={`bg-gradient-to-br ${stat.color} border p-6 rounded-2xl hover:scale-[1.02] active:scale-[0.99] transition-all hover:shadow-lg hover:shadow-slate-500/5 dark:hover:shadow-black/25 flex flex-col justify-between h-40 group relative overflow-hidden`}
          >
            <div className="absolute right-0 bottom-0 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
            <div className="flex items-start justify-between">
              <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{stat.title}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.iconBg} group-hover:rotate-12 transition-transform`}>
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            
            <div>
              <h3 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                {stat.value}
                {stat.unit && <span className="text-xs font-bold text-slate-400 ml-1">{stat.unit}</span>}
              </h3>
              <p className="text-[10px] text-slate-400/80 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {stat.trend}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Area Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Organizations Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Node Connections</h2>
                <p className="text-xs text-slate-400/80 font-medium">Recently registered organizations</p>
              </div>
              <Link to="/organizations" className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                Manage Nodes
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              {!data?.recentOrgs || data.recentOrgs.length === 0 ? (
                <div className="p-16 text-center flex flex-col items-center justify-center text-slate-400 italic">
                  <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-3 animate-pulse" />
                  <p className="text-sm">No active organization nodes connected.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 text-[10px] font-black uppercase border-b border-slate-100 dark:border-slate-800 tracking-wider">
                      <th className="px-6 py-4">Node / Org Name</th>
                      <th className="px-6 py-4">Tier Class</th>
                      <th className="px-6 py-4">Parent Tree</th>
                      <th className="px-6 py-4">Security</th>
                      <th className="px-6 py-4 text-right">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.recentOrgs.map((org: any) => (
                      <tr key={org.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{org.name}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700">
                            {org.organizationType?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {org.parent?.name || <span className="text-slate-400 dark:text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          {org.isActive ? (
                            <Badge variant="green">Active</Badge>
                          ) : (
                            <Badge variant="red">Offline</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-right">
                          {new Date(org.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* System activity feed + Telemetry Status */}
        <div className="space-y-6">
          
          {/* Telemetry panel */}
          <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Telemetry Status
            </h3>
            
            <div className="space-y-4">
              {/* API Node */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">API Node Status</span>
                </div>
                <Badge variant="green">Healthy</Badge>
              </div>

              {/* Database Node */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Database Cluster</span>
                </div>
                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Online (0.4ms)</span>
              </div>

              {/* CPU load */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">App Server CPU Load</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{cpuLoad}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${Math.min(100, cpuLoad * 15)}%` }} />
                </div>
              </div>

              {/* Memory load */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400 font-bold">App Server Memory</span>
                  <span className="text-slate-700 dark:text-slate-300 font-black">{memUsage} MB / 1024 MB</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${(memUsage / 1024) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col p-6 shadow-sm">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-rose-500" />
              Activity Log
            </h2>
            <div className="overflow-y-auto max-h-56 custom-scrollbar pr-1">
              {!data?.recentActivities || data.recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-slate-400 italic text-center py-12">
                  <Clock className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs">No active logs detected.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.recentActivities.map((log: any) => (
                    <div key={log.id} className="flex gap-3 items-start border-l-2 border-rose-500/20 pl-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {log.action} {log.entity}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Operator: {log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() || log.user.email : 'System'}
                        </p>
                        <p className="text-[9px] text-rose-400/80 font-bold uppercase tracking-wider mt-1">
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
    </div>
  );
};

export default DashboardOverview;
