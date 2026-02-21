import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

// Role 기반 메뉴 필터링
const getRoleBasedMenuItems = (role: string | undefined) => {
  const allMenuItems = [
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
        { path: '/distributions', label: '배포 관리', icon: (
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        )},
        { path: '/activations', label: '최초 등록', icon: (
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
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

  // agency_admin: 제한된 메뉴만
  if (role === 'agency_admin') {
    return [
      {
        section: '메인',
        items: [
          { path: '/', label: '대시보드', icon: (
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          )},
        ],
      },
      {
        section: '기능',
        items: [
          { path: '/exports', label: '제조공장 전달', icon: (
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          )},
          { path: '/distributions', label: 'QR 발송', icon: (
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          )},
          { path: '/activations', label: '최초 등록', icon: (
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>
          )},
        ],
      },
    ];
  }

  // super_admin, ops_admin, viewer: 전체 메뉴
  return allMenuItems;
};

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

  const menuItems = getRoleBasedMenuItems(user?.role);

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
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-status-blue rounded-r-full" />
                  )}
                  <div className="flex items-center justify-center text-txt-secondary group-hover:text-txt-primary">
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-2 border-t border-geo-border flex flex-col gap-0.5">
          <div className="px-3 py-2.5 text-sm text-txt-secondary">
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-txt-secondary hover:bg-geo-card hover:text-txt-primary transition-all duration-150"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-[220px] flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b border-geo-border flex items-center px-8">
          <h1 className="text-xl font-semibold text-txt-primary">{currentLabel || 'GeoStudio'}</h1>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
