import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { permissionsApi, usersApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface UserPermissionsModalProps {
  user: any;
  onClose: () => void;
  onSave: () => void;
}

export function UserPermissionsModal({ user: u, onClose, onSave }: UserPermissionsModalProps) {
  const { user: currentUser } = useAuth();
  const [permissions, setPermissions] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<Record<string, { effect: 'grant' | 'deny'; dataScope?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Scopes array to select from
  const SCOPES = [
    { value: 'own', label: 'Own Data Only' },
    { value: 'team', label: 'Team Data' },
    { value: 'all', label: 'All Data' }
  ];

  useEffect(() => {
    let active = true;
    Promise.all([
      permissionsApi.getAll(),
      usersApi.getUserPermissions(u.id)
    ]).then(([sysPerms, userPerms]) => {
      if (!active) return;
      setPermissions(sysPerms);
      const ormap: Record<string, any> = {};
      userPerms.forEach((up: any) => {
        ormap[up.permissionId] = { effect: up.effect, dataScope: up.dataScope };
      });
      setOverrides(ormap);
      setLoading(false);
    }).catch(err => {
      if (active) { setError(err.message); setLoading(false); }
    });
    return () => { active = false; };
  }, [u.id]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const payloadPermissions = Object.entries(overrides).map(([permissionId, data]) => ({
        permissionId,
        effect: data.effect,
        dataScope: data.dataScope || 'own'
      }));
      await usersApi.updateUserPermissions(u.id, { permissions: payloadPermissions });
      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEffectChange = (permissionId: string, effect: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      if (effect === 'inherit') {
        delete next[permissionId];
      } else {
        next[permissionId] = { effect: effect as 'grant' | 'deny', dataScope: 'own' };
      }
      return next;
    });
  };

  const handleScopeChange = (permissionId: string, scope: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      if (next[permissionId]) {
        next[permissionId].dataScope = scope;
      }
      return next;
    });
  };

  // Group permissions logically by resource (naive grouping by resource prefix if action involves a colon)
  const groupedPermissions: Record<string, any[]> = {};
  permissions.forEach(p => {
    const resource = p.action.split(':')[0] || 'other';
    if (!groupedPermissions[resource]) groupedPermissions[resource] = [];
    groupedPermissions[resource].push(p);
  });

  if (!currentUser?.isSuperAdmin) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Access Denied</h2>
            <p className="text-slate-600 mb-4">Only Super Admins can manage permission overrides.</p>
            <button onClick={onClose} className="btn-primary w-full">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Permission Overrides</h2>
            <p className="text-sm text-slate-500">Configure explicit overrides for {u.firstName || u.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}
          
          {loading ? (
            <div className="flex justify-center items-center h-32"><Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" /></div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([group, perms]) => (
                <div key={group} className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 capitalize">
                    {group} Actions
                  </div>
                  <div className="divide-y divide-slate-100">
                    {perms.map(p => {
                      const current = overrides[p.id];
                      const eff = current ? current.effect : 'inherit';
                      return (
                        <div key={p.id} className="p-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="font-medium text-slate-800 text-sm">{p.description || p.action}</div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{p.action}</div>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            <select 
                              className={`input-field py-1.5 text-sm w-36 cursor-pointer ${eff === 'grant' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : eff === 'deny' ? 'border-red-500 bg-red-50 text-red-800' : 'bg-white'}`}
                              value={eff}
                              onChange={e => handleEffectChange(p.id, e.target.value)}
                            >
                              <option value="inherit">Inherit (Role)</option>
                              <option value="grant">Grant</option>
                              <option value="deny">Deny</option>
                            </select>

                            {eff === 'grant' && (
                              <select 
                                className="input-field py-1.5 text-sm w-36 bg-white cursor-pointer"
                                value={current?.dataScope || 'own'}
                                onChange={e => handleScopeChange(p.id, e.target.value)}
                              >
                                {SCOPES.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            )}
                            {eff !== 'grant' && <div className="w-36 hidden md:block"></div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-end gap-3 bg-white rounded-b-xl">
           <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
           <button type="button" onClick={save} disabled={saving || loading} className="btn-primary flex items-center gap-2 disabled:opacity-60">
             {saving && <Loader2 className="w-4 h-4 animate-spin" />}
             Save Overrides
           </button>
        </div>
      </div>
    </div>
  );
}
