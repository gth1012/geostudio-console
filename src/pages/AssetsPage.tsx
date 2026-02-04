import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function AssetsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ batchId: '', seriesId: '', count: '' });
  const [filters, setFilters] = useState({ batchId: '', status: '' });
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const queryClient = useQueryClient();

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', filters],
    queryFn: () => { const params = new URLSearchParams(); if (filters.batchId) params.append('batchId', filters.batchId); if (filters.status) params.append('status', filters.status); return api.get(`/assets?${params}`).then((res) => res.data.data); },
  });
  const { data: batches } = useQuery({ queryKey: ['batches'], queryFn: () => api.get('/batches').then((res) => res.data.data) });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/assets/bulk', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); setShowModal(false); setForm({ batchId: '', seriesId: '', count: '' }); },
  });

  const handleBatchSelect = (batchId: string) => { const batch = batches?.find((b: any) => b.batch_id === batchId); setForm({ ...form, batchId, seriesId: batch?.series_id || '' }); };
  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); createMutation.mutate({ ...form, count: parseInt(form.count) }); };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { QR_GENERATED: 'bg-status-green-dim text-status-green', DINA_INSERTED: 'bg-status-blue-dim text-status-blue', EXPORTED: 'bg-status-purple-dim text-status-purple', CREATED: 'bg-status-yellow-dim text-status-yellow' };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3">
          <select value={filters.batchId} onChange={(e) => setFilters({ ...filters, batchId: e.target.value })} className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-secondary text-sm focus:ring-2 focus:ring-status-purple/40 outline-none">
            <option value="">전체 배치</option>
            {batches?.map((b: any) => <option key={b.batch_id} value={b.batch_id}>{b.name || `Batch ${b.batch_number}`}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-secondary text-sm focus:ring-2 focus:ring-status-purple/40 outline-none">
            <option value="">전체 상태</option>
            <option value="CREATED">CREATED</option>
            <option value="DINA_INSERTED">DINA_INSERTED</option>
            <option value="QR_GENERATED">QR_GENERATED</option>
            <option value="EXPORTED">EXPORTED</option>
          </select>
        </div>
        <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 대량 생성</button>
      </div>

      {isLoading ? <p className="text-txt-secondary">로딩 중...</p> : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-geo-border">
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">번호</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">DINA</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">OTP</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">시리즈</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
            </tr></thead>
            <tbody>
              {assets?.map((a: any) => (
                <tr key={a.asset_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                  <td className="px-6 py-4 text-txt-muted font-mono">#{a.asset_number}</td>
                  <td className="px-6 py-4 font-mono text-sm text-status-blue">{a.dina_id}</td>
                  <td className="px-6 py-4 font-mono text-sm text-txt-secondary">{a.otp_code}</td>
                  <td className="px-6 py-4 text-txt-secondary">{a.series_name}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium font-mono ${getStatusBadge(a.status)}`}>{a.status}</span></td>
                </tr>
              ))}
              {!assets?.length && <tr><td colSpan={5} className="px-6 py-8 text-center text-txt-muted">자산이 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 pb-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">자산 대량 생성</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">배치 선택 *</label>
                  <select value={form.batchId} onChange={(e) => handleBatchSelect(e.target.value)} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none" required>
                    <option value="">배치를 선택하세요</option>
                    {batches?.map((b: any) => <option key={b.batch_id} value={b.batch_id}>{b.name || `Batch ${b.batch_number}`} ({b.series_name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">생성할 자산 수 *</label>
                  <input type="number" placeholder="생성할 자산 수" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" required min="1" max="1000" />
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
