import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function BatchesPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ seriesId: '', name: '', totalAssets: '' });
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: batches, isLoading } = useQuery({ queryKey: ['batches'], queryFn: () => api.get('/batches').then((res) => res.data.data) });
  const { data: series } = useQuery({ queryKey: ['series'], queryFn: () => api.get('/series').then((res) => res.data.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/batches', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batches'] }); setShowModal(false); setForm({ seriesId: '', name: '', totalAssets: '' }); },
  });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); createMutation.mutate({ ...form, totalAssets: form.totalAssets ? parseInt(form.totalAssets) : 0 }); };
  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { COMPLETED: 'bg-status-green-dim text-status-green', IN_PROGRESS: 'bg-status-yellow-dim text-status-yellow', FAILED: 'bg-status-red-dim text-status-red', DRAFT: 'bg-status-yellow-dim text-status-yellow' };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div />
        <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 새 배치</button>
      </div>

      {isLoading ? <p className="text-txt-secondary">로딩 중...</p> : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">배치명</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">시리즈</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">번호</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">자산수</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">생성일</th>
              </tr>
            </thead>
            <tbody>
              {batches?.map((b: any) => (
                <tr key={b.batch_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                  <td className="px-6 py-4 font-medium text-status-blue cursor-pointer hover:text-status-blue/80 transition-colors" onClick={() => navigate(`/batches/${b.batch_id}`)}>{b.name || `Batch ${b.display_id}`}</td>
                  <td className="px-6 py-4 text-txt-secondary">{b.series_name}</td>
                  <td className="px-6 py-4 text-txt-secondary font-mono">{b.display_id || '-'}</td>
                  <td className="px-6 py-4 text-txt-primary font-mono">{b.items_completed}/{b.items_total}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium font-mono ${getStatusBadge(b.status)}`}>{b.status}</span></td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{new Date(b.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {!batches?.length && <tr><td colSpan={6} className="px-6 py-8 text-center text-txt-muted">배치가 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 pb-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">새 배치 생성</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">시리즈 선택 *</label>
                  <select value={form.seriesId} onChange={(e) => setForm({ ...form, seriesId: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none" required>
                    <option value="">시리즈를 선택하세요</option>
                    {series?.map((s: any) => <option key={s.series_id} value={s.series_id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">배치명</label>
                  <input placeholder="배치명 (선택)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">예상 자산 수</label>
                  <input type="number" placeholder="예상 자산 수" value={form.totalAssets} onChange={(e) => setForm({ ...form, totalAssets: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" />
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
