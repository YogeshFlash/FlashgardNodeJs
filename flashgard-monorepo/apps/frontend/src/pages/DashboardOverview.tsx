
import { 
  Building2, Users, ShieldCheck, 
  TrendingUp, ArrowRight, Activity 
} from 'lucide-react';

const DashboardOverview = () => {
  const stats = [
    {
      title: 'Total Organizations',
      value: '124',
      change: '+12%',
      trend: 'up',
      icon: Building2,
      color: 'bg-[var(--color-primary)]',
    },
    {
      title: 'Active Users',
      value: '849',
      change: '+5.4%',
      trend: 'up',
      icon: Users,
      color: 'bg-emerald-500',
    },
    {
      title: 'Custom Roles',
      value: '32',
      change: '+2',
      trend: 'neutral',
      icon: ShieldCheck,
      color: 'bg-[var(--color-primary)]',
    },
    {
      title: 'System Health',
      value: '99.9%',
      change: 'All systems operational',
      trend: 'up',
      icon: Activity,
      color: 'bg-amber-500',
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back, Platform Admin. Here's what's happening today.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          Generate Report
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {stats.map((stat) => (
          <div key={stat.title} className="card p-6 border-slate-200/60 bg-white hover:border-slate-300 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color} bg-opacity-10 mb-4 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
              {stat.trend === 'up' && (
                <span className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stat.change}
                </span>
              )}
               {stat.trend === 'neutral' && (
                <span className="flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                  {stat.change}
                </span>
              )}
            </div>
            
            <div>
              <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
              <h3 className="text-3xl font-bold text-slate-800 tracking-tight mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Recent Organizations Table */}
        <div className="lg:col-span-2 card bg-white">
          <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-slate-800">Recent Organizations</h2>
            <button className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]">View All</button>
          </div>
          <div className="p-6">
            <div className="flex flex-col items-center justify-center h-48 text-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
              <Building2 className="w-8 h-8 text-slate-400 mb-3" />
              <p className="text-slate-600 font-medium text-sm">No organizations connected to API yet.</p>
              <p className="text-slate-400 text-xs mt-1">Once you add dealers or distributors, they will appear here.</p>
            </div>
          </div>
        </div>

        {/* System Activity Feed */}
        <div className="card bg-white">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Activity Log</h2>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-2 h-2 mt-2 rounded-full bg-[var(--color-primary)] ring-4 bg-[var(--color-primary)]/10" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">System Initialization completed</p>
                    <p className="text-xs text-slate-400 mt-0.5">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
