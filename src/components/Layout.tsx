import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

const menuItems = [
  { path: '/', label: '대시보드', icon: '' },
  { path: '/series', label: '시리즈', icon: '' },
  { path: '/batches', label: '배치', icon: '' },
  { path: '/assets', label: '자산', icon: '' },
  { path: '/exports', label: '반출', icon: '' },
  { path: '/users', label: '사용자', icon: '' },
  { path: '/audit', label: '감사로그', icon: '' },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-900 text-white">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold">GeoStudio</h1>
          <p className="text-sm text-gray-400">{user?.tenantName}</p>
        </div>
        <nav className="p-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {menuItems.find((m) => m.path === location.pathname)?.label || ''}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name} ({user?.role})</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              로그아웃
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
