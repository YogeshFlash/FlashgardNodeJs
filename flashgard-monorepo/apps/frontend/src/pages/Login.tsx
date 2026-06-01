import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Loader2, Building2, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

const Login = () => {
  const navigate = useNavigate();
  const { login, switchOrganization } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectOrgMode, setSelectOrgMode] = useState(false);
  const [availableOrgs, setAvailableOrgs] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const user = await login(email, password);
      // Secondary login step for multi-org users
      if (user.accessibleOrgs && user.accessibleOrgs.length > 1) {
        setAvailableOrgs(user.accessibleOrgs);
        setSelectOrgMode(true);
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgSelect = async (orgId: string) => {
    setError('');
    setIsLoading(true);
    try {
      await switchOrganization(orgId);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to switch organization.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 -left-1/4 w-[800px] h-[800px] bg-[var(--color-primary)]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-[var(--color-accent)]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-8 glass-panel z-10 mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/10 mb-6 p-2">
            <img src={logo} alt="Flashgard" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Flashgard</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your CRM dashboard</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {!selectOrgMode ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoComplete="email"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300" />
                <span className="text-slate-600">Remember me</span>
              </label>
              <a href="#" className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full mt-6 py-2.5 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Signing in...' : 'Sign In to Dashboard'}
            </button>
          </form>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-medium text-slate-800 border-b border-slate-100 pb-2 mb-4">Select Organization</h3>
            <p className="text-sm text-slate-500 mb-4">You have access to multiple organizations. Please select one to continue.</p>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {availableOrgs.map((org: any) => (
                <button
                  key={org.organizationId}
                  onClick={() => handleOrgSelect(org.organizationId)}
                  disabled={isLoading}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-[var(--color-primary)] transition-colors">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 group-hover:text-[var(--color-primary)] transition-colors">{org.organizationName || 'Unnamed Organization'}</p>
                      <p className="text-xs text-slate-500">Log in to this workspace</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[var(--color-primary)] transform group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectOrgMode(false)}
              disabled={isLoading}
              className="w-full py-2.5 mt-4 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
