import React, { useState } from 'react';
import { Mail, ShieldCheck, Key, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match.'); return; }
    if (newPw.length < 8) { setPwMsg('Password must be at least 8 characters.'); return; }
    setPwLoading(true); setPwMsg('');
    // In real app: call usersApi.changePassword(...)
    await new Promise(r => setTimeout(r, 800));
    setPwMsg('Password changed successfully!');
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setPwLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm mt-1">View your account details and preferences</p>
      </div>

      {/* Profile card */}
      <div className="card bg-white p-6 space-y-5">
        <div className="flex items-center gap-5 pb-5 border-b border-slate-100">
          <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20">
            {user?.email?.slice(0, 2).toUpperCase() || 'SA'}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {user?.isSuperAdmin ? 'Super Administrator' : 'Administrator'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">{user?.email}</p>
            {user?.isSuperAdmin && (
              <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Mail className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-slate-500 font-medium">Email</p>
              <p className="text-sm text-slate-800">{user?.email || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-xs text-slate-500 font-medium">Access Level</p>
              <p className="text-sm text-slate-800">{user?.isSuperAdmin ? 'Super Admin' : 'Standard'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card bg-white p-6">
        <div className="flex items-center gap-2 mb-5">
          <Key className="w-5 h-5 text-slate-600" />
          <h3 className="text-base font-semibold text-slate-800">Change Password</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {pwMsg && (
            <p className={`text-sm px-3 py-2 rounded-lg ${pwMsg.includes('successfully') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {pwMsg}
            </p>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Current Password</label>
            <input type="password" className="input-field" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">New Password</label>
            <input type="password" className="input-field" value={newPw} onChange={e => setNewPw(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Confirm New Password</label>
            <input type="password" className="input-field" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
          </div>
          <button type="submit" disabled={pwLoading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
            {pwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
