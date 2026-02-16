import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

const menuItems = [
  {
    section: '메인',
    items: [
      { path: '/', label: '대시보드', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      )},
      { path: '/series', label: '시리즈 생성', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
      )},
      { path: '/batches', label: '작업 관리', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m-7.07-2.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83"/></svg>
      )},
    ],
  },
  {
    section: '관리',
    items: [
      { path: '/assets', label: '자산 관리', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
      )},
      { path: '/exports', label: '자산 출고', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
      )},
      { path: '/users', label: '사용자 관리', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      )},
    ],
  },
  {
    section: '시스템',
    items: [
      { path: '/audit', label: '로그 조회', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      )},
      { path: '/system-admin', label: '시스템 관리', icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
      )},
    ],
  },
];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const currentLabel = menuItems
    .flatMap((s) => s.items)
    .find((m) => isActive(m.path))?.label || '';

  return (
    <div className="flex min-h-screen bg-geo-main">
      {/* Sidebar */}
      <aside className="w-[220px] min-h-screen bg-geo-sidebar border-r border-geo-border flex flex-col fixed z-10">
        {/* Logo */}
        <div className="px-5 py-6 flex items-center gap-2.5 border-b border-geo-border">
          <div className="w-8 h-8 bg-gradient-to-br from-status-purple to-status-blue rounded-lg flex items-center justify-center text-sm font-bold text-white">
            G
          </div>
          <span className="text-base font-semibold tracking-tight text-txt-primary">GeoStudio</span>
        </div>

        {/* Nav */}
        <nav className="p-2 flex-1 flex flex-col gap-0.5">
          {menuItems.map((section) => (
            <div key={section.section}>
              <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold text-txt-muted tracking-widest uppercase">
                {section.section}
              </div>
              {section.items.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    isActive(item.path)
                      ? 'bg-geo-card text-txt-primary font-medium'
                      : 'text-txt-secondary hover:bg-geo-card hover:text-txt-primary'
                  }`}
                >
                  {isActive(item.path) && (
                    <div className="absolute left-[-8px] w-[3px] h-6 bg-status-purple rounded-r" />
                  )}
                  <span className={isActive(item.path) ? 'opacity-100' : 'opacity-60'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-geo-border">
          <div
            onClick={handleLogout}
            className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-geo-card transition-colors"
          >
            <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-status-green to-status-blue flex items-center justify-center text-xs font-semibold text-white">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-txt-primary truncate">{user?.name || '사용자'}</div>
              <div className="text-[11px] text-txt-muted">{user?.role || 'viewer'}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-[220px] flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="px-8 py-5 flex items-center justify-between border-b border-geo-border bg-geo-deep sticky top-0 z-5 backdrop-blur-xl">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-txt-primary">{currentLabel}</h1>
            <p className="text-[13px] text-txt-secondary mt-0.5">Artion Project V1 — Production</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-status-green font-mono">
              <span className="w-[7px] h-[7px] rounded-full bg-status-green animate-pulse-glow" />
              Online
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-[13px] font-medium text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover hover:text-txt-primary transition-all"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
