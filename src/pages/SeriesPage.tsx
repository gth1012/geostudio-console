import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  if (!text || text === '-') return <>{children}</>;
  const checkTruncation = () => { if (textRef.current) setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth); };
  return (
    <div className="relative inline-block w-full" onMouseEnter={() => { checkTruncation(); if (isTruncated || (textRef.current && textRef.current.scrollWidth > textRef.current.clientWidth)) setShow(true); }} onMouseLeave={() => setShow(false)}>
      <span ref={textRef} className="block truncate">{text}</span>
      {show && isTruncated && (
        <div className="absolute z-50 left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-geo-deep text-txt-primary text-xs rounded-lg shadow-lg max-w-xs whitespace-normal text-center border border-geo-border">
          {text}
          <div className="absolute left-1/2 transform -translate-x-1/2 top-full border-4 border-transparent border-t-geo-deep"></div>
        </div>
      )}
    </div>
  );
}

export default function SeriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', artistName: '' });
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const queryClient = useQueryClient();

  const { data: series, isLoading } = useQuery({ queryKey: ['series'], queryFn: () => api.get('/series').then((res) => res.data.data), enabled: !showTrash });
  const { data: trashedSeries, isLoading: isTrashLoading } = useQuery({ queryKey: ['series-trash'], queryFn: () => api.get('/series/trash').then((res) => res.data.data), enabled: showTrash });

  const createMutation = useMutation({ mutationFn: (data: any) => api.post('/series', data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); setShowModal(false); setForm({ name: '', code: '', description: '', artistName: '' }); } });
  const archiveMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/archive`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['series'] }) });
  const activateMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/activate`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['series'] }) });
  const deleteMutation = useMutation({ mutationFn: (seriesId: string) => api.delete(`/series/${seriesId}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); queryClient.invalidateQueries({ queryKey: ['series-trash'] }); } });
  const restoreMutation = useMutation({ mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/restore`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['series'] }); queryClient.invalidateQueries({ queryKey: ['series-trash'] }); } });
  const permanentDeleteMutation = useMutation({ mutationFn: (seriesId: string) => api.delete(`/series/${seriesId}/permanent`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['series-trash'] }) });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (createMutation.isPending) return; createMutation.mutate(form); };
  const handleDeactivate = (id: string, name: string) => { if (confirm(`"${name}" 시리즈를 비활성화 하시겠습니까?`)) archiveMutation.mutate(id); };
  const handleActivate = (id: string, name: string) => { if (confirm(`"${name}" 시리즈를 활성화 하시겠습니까?`)) activateMutation.mutate(id); };
  const handleDelete = (id: string, name: string) => { if (confirm(`"${name}" 시리즈를 휴지통으로 이동하시겠습니까?`)) deleteMutation.mutate(id); };
  const handleRestore = (id: string, name: string) => { if (confirm(`"${name}" 시리즈를 복구하시겠습니까?`)) restoreMutation.mutate(id); };
  const handlePermanentDelete = (id: string, name: string) => { if (confirm(`"${name}" 시리즈를 비우시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!`)) permanentDeleteMutation.mutate(id); };

  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const isActionPending = archiveMutation.isPending || activateMutation.isPending || deleteMutation.isPending || restoreMutation.isPending || permanentDeleteMutation.isPending;
  const displayData = showTrash ? trashedSeries : series;
  const isDataLoading = showTrash ? isTrashLoading : isLoading;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {!showTrash && (
            <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 시리즈 생성</button>
          )}
        </div>
        <button onClick={() => setShowTrash(!showTrash)} className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${showTrash ? 'bg-status-purple text-white border-status-purple' : 'bg-transparent text-txt-secondary border-geo-border hover:border-geo-border-hover hover:text-txt-primary'}`}>
          {showTrash ? '← 목록으로' : '🗑 휴지통'}
        </button>
      </div>

      {isDataLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-visible">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="w-24 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">ID</th>
                <th className="w-28 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">이름</th>
                <th className="w-24 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">코드</th>
                <th className="w-24 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">아티스트</th>
                <th className="w-40 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">설명</th>
                <th className="w-20 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">{showTrash ? '삭제일' : '상태'}</th>
                <th className="w-24 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">{showTrash ? '' : '생성일'}</th>
                <th className="w-28 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody>
              {displayData?.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-txt-muted">{showTrash ? '휴지통이 비어있습니다.' : '시리즈가 없습니다.'}</td></tr>
              ) : (
                displayData?.map((s: any) => (
                  <tr key={s.series_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                    <td className="px-3 py-3 text-center font-mono text-sm text-status-blue truncate">{s.display_id || '-'}</td>
                    <td className="px-3 py-3 text-center text-txt-primary overflow-visible"><Tooltip text={s.name}><span className="block truncate">{s.name}</span></Tooltip></td>
                    <td className="px-3 py-3 text-center text-txt-secondary overflow-visible"><Tooltip text={s.code || ''}><span className="block truncate">{s.code || '-'}</span></Tooltip></td>
                    <td className="px-3 py-3 text-center text-txt-secondary overflow-visible"><Tooltip text={s.artist_name || ''}><span className="block truncate">{s.artist_name || '-'}</span></Tooltip></td>
                    <td className="px-3 py-3 text-center text-txt-muted overflow-visible"><Tooltip text={s.description || ''}><span className="block truncate">{s.description || '-'}</span></Tooltip></td>
                    <td className="px-3 py-3 text-center">
                      {showTrash ? <span className="text-txt-muted text-xs">{new Date(s.deleted_at).toLocaleDateString()}</span> : (
                        <span className={`inline-block w-16 px-1 py-1 rounded text-xs font-medium text-center ${s.status === 'ACTIVE' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>{s.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-txt-muted text-xs">{!showTrash && new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {showTrash ? (
                          <>
                            <button onClick={() => handleRestore(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-blue-dim text-status-blue rounded hover:bg-status-blue/20 disabled:opacity-50 transition-all">복구</button>
                            <button onClick={() => handlePermanentDelete(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-red-dim text-status-red rounded hover:bg-status-red/20 disabled:opacity-50 transition-all">비우기</button>
                          </>
                        ) : s.status === 'ACTIVE' ? (
                          <button onClick={() => handleDeactivate(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-yellow-dim text-status-yellow rounded hover:bg-status-yellow/20 disabled:opacity-50 transition-all">비활성</button>
                        ) : (
                          <>
                            <button onClick={() => handleActivate(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-green-dim text-status-green rounded hover:bg-status-green/20 disabled:opacity-50 transition-all">활성</button>
                            <button onClick={() => handleDelete(s.series_id, s.name)} disabled={isActionPending} className="w-12 px-1 py-1 text-xs bg-status-red-dim text-status-red rounded hover:bg-status-red/20 disabled:opacity-50 transition-all">삭제</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 pb-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">새 시리즈 생성</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">시리즈 이름 *</label>
                  <input placeholder="시리즈 이름 입력" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 focus:border-status-purple/60 outline-none transition-all" required />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">시리즈 코드 *</label>
                  <input placeholder="시리즈 코드 입력" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 focus:border-status-purple/60 outline-none transition-all" required />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">아티스트</label>
                  <input placeholder="아티스트명 (선택)" value={form.artistName} onChange={(e) => setForm({ ...form, artistName: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 focus:border-status-purple/60 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">설명</label>
                  <textarea placeholder="설명 (선택)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 focus:border-status-purple/60 outline-none transition-all resize-none" rows={2} />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all">취소</button>
                <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">{createMutation.isPending ? '생성 중...' : '생성'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
