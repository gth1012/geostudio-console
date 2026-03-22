import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';
import { useAuthStore } from '../stores/auth.store';

export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'STUDIO_VIEWER' });
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const queryClient = useQueryClient();
  const toast = useToastStore();
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then((res) => res.data.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['users'] }); setShowModal(false); setForm({ email: '', password: '', name: '', role: 'STUDIO_VIEWER' }); toast.show('사용자가 생성되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '사용자 생성 실패', 'error'); },
  });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); createMutation.mutate(form); };
  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const getRoleBadge = (role: string) => {
    const map: Record<string, string> = { super_admin: 'bg-status-red-dim text-status-red', STUDIO_ADMIN: 'bg-status-red-dim text-status-red', agency_admin: 'bg-status-purple-dim text-status-purple', ops_admin: 'bg-status-blue-dim text-status-blue', STUDIO_OPERATOR: 'bg-status-blue-dim text-status-blue', viewer: 'bg-status-yellow-dim text-status-yellow', STUDIO_VIEWER: 'bg-status-yellow-dim text-status-yellow' };
    return map[role] || 'bg-status-yellow-dim text-status-yellow';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div />
        {isSuperAdmin && <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 새 사용자</button>}
      </div>

      {isLoading ? <p className="text-txt-secondary">로딩 중...</p> : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-geo-border">
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">이름</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">이메일</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">역할</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">마지막 로그인</th>
            </tr></thead>
            <tbody>
              {users?.map((u: any) => (
                <tr key={u.user_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                  <td className="px-6 py-4 font-medium text-txt-primary">{u.name}</td>
                  <td className="px-6 py-4 text-txt-secondary">{u.email}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium font-mono ${getRoleBadge(u.role)}`}>{u.role}</span></td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium font-mono ${u.status === 'ACTIVE' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>{u.status}</span></td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {!users?.length && <tr><td colSpan={5} className="px-6 py-8 text-center text-txt-muted">사용자가 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4 pb-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">새 사용자 생성</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">이름 *</label>
                  <input placeholder="이름 입력" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">이메일 *</label>
                  <input type="email" placeholder="이메일 입력" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" required />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">비밀번호 *</label>
                  <input type="password" placeholder="비밀번호 입력" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" required minLength={6} />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">역할</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none">
                    <option value="STUDIO_VIEWER">STUDIO_VIEWER</option>
                    <option value="STUDIO_OPERATOR">STUDIO_OPERATOR</option>
                    <option value="STUDIO_ADMIN">STUDIO_ADMIN</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">취소</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all">생성</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
