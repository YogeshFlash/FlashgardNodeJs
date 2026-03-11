import React from 'react';

interface HasPermissionProps {
  permission: string | string[]; // Single permission or array of permissions (requires ALL by default, or ANY if requireAll is false)
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const usePermissions = () => {
  // Read permissions from localStorage (saved during login)
  const getUserPermissions = () => {
    try {
      const u = localStorage.getItem('user');
      if (!u) return [];
      const user = JSON.parse(u);
      
      // Super admins bypass all permission checks
      if (user.isSuperAdmin) return ['*'];
      
      return user.permissions || [];
    } catch {
      return [];
    }
  };

  const hasPermission = (permission: string | string[], requireAll = true): boolean => {
    const userPerms = getUserPermissions();
    
    // Super admin bypass
    if (userPerms.includes('*')) return true;

    const permsToCheck = Array.isArray(permission) ? permission : [permission];
    
    if (permsToCheck.length === 0) return true;

    if (requireAll) {
      return permsToCheck.every(p => userPerms.includes(p));
    } else {
      return permsToCheck.some(p => userPerms.includes(p));
    }
  };

  return { hasPermission };
};

export const HasPermission: React.FC<HasPermissionProps> = ({ 
  permission, 
  requireAll = true, 
  children, 
  fallback = null 
}) => {
  const { hasPermission } = usePermissions();

  if (hasPermission(permission, requireAll)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};
