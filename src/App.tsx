import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SeriesPage from './pages/SeriesPage';
import BatchesPage from './pages/BatchesPage';
import AssetsPage from './pages/AssetsPage';
import ExportsPage from './pages/ExportsPage';
import UsersPage from './pages/UsersPage';
import AuditPage from './pages/AuditPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="series" element={<SeriesPage />} />
          <Route path="batches" element={<BatchesPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="exports" element={<ExportsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="audit" element={<AuditPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
