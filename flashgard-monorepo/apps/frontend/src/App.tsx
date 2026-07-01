import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/Login';
import DashboardOverview from './pages/DashboardOverview';
import Organizations from './pages/Organizations';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import ModelsPage from './pages/ModelsPage';
import InventoryPage from './pages/InventoryPage';
import LicensesPage from './pages/LicensesPage';
import DataMigration from './pages/DataMigration';
import MobileHomeManager from './pages/MobileHomeManager';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardOverview />} />
              <Route path="organizations" element={<Organizations />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="models" element={<ModelsPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="licenses" element={<LicensesPage />} />
              <Route path="migration" element={<DataMigration />} />
              <Route path="mobile-home" element={<MobileHomeManager />} />
            </Route>

            {/* Catch-all → redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
