import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

interface BatchRow {
  image: string;
  supply: string;
}

export default function BatchesPage() {
  const [showModal, setShowModal] = useState(false);
  const [seriesId, setSeriesId] = useState('');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [editTarget, setEditTarget] = useState<{ batch_id: string; name: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ batch_id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const toast = useToastStore();
  const { data: batches, isLoading } = useQuery({ queryKey: ['batches'], queryFn: () => api.get('/batches').then((res) => res.data.data) });
  const { data: series } = useQuery({ queryKey: ['series'], queryFn: () => api.get('/series').then((res) => res.data.data) });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/batches/${id}`, { name }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batches'] }); setEditTarget(null); toast.show('배치가 수정되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '배치 수정 실패', 'error'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/batches/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batches'] }); setDeleteTarget(null); toast.show('배치가 삭제되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '배치 삭제 실패', 'error'); },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesId || rows.length === 0) return;
    setIsCreating(true);
    try {
      for (const row of rows) {
        await api.post('/batches', { seriesId, image: row.image, supply: parseInt(row.supply) || 0 });
      }
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setShowModal(false);
      setSeriesId('');
      setRows([]);
      toast.show(`${rows.length}개 배치가 생성되었습니다`, 'success');
    } catch (err: any) {
      toast.show(err.response?.data?.message || '배치 생성 실패', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const readers = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(newImages => {
      const newRows = newImages.map(image => ({ image, supply: '' }));
      setRows(prev => [...prev, ...newRows]);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSupplyChange = (index: number, value: string) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, supply: value } : row));
  };

  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { COMPLETED: 'bg-status-green-dim text-status-green', IN_PROGRESS: 'bg-status-yellow-dim text-status-yellow', FAILED: 'bg-status-red-dim text-status-red', DRAFT: 'bg-status-yellow-dim text-status-yellow', LOCKED: 'bg-status-purple-dim text-status-purple', SHIPPED: 'bg-status-green-dim text-status-green' };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { DRAFT: '임시 저장', IN_PROGRESS: '진행 중', COMPLETED: '완료', SHIPPED: '출고 완료', FAILED: '실패', LOCKED: '확정' };
    return map[status] || status;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div />
        <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 새 배치</button>
      </div>

      {isLoading ? <p className="text-txt-secondary">로딩 중...</p> : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-visible">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">ID</th>
                <th className="w-[20%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">시리즈</th>
                <th className="w-[12%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">발행량</th>
                <th className="w-[22%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="w-[14%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">생성일</th>
                <th className="w-[20%] px-4 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody>
              {batches?.map((b: any) => (
                <tr key={b.batch_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                  <td className="px-4 py-3 text-center font-mono text-sm text-status-blue">{b.display_id || '-'}</td>
                  <td className="px-4 py-3 text-center text-txt-primary truncate">{b.series_name || '-'}</td>
                  <td className="px-4 py-3 text-center text-txt-primary font-mono">{b.supply?.toLocaleString() || '-'}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center items-center gap-1 flex-wrap">
                      <span className={`inline-block w-16 px-1 py-1 rounded text-xs font-medium text-center ${getStatusBadge(b.status)}`}>{getStatusLabel(b.status)}</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${b.batch_reference_status === 'LOCKED' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>
                        {b.batch_reference_status === 'LOCKED' ? '기준:확정' : '기준:미확정'}
                      </span>
                      {b.batch_locked_until && new Date(b.batch_locked_until) > new Date() && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-red/20 text-status-red border border-status-red/30 animate-pulse">LOCKED</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-txt-muted text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => navigate(`/batches/${b.batch_id}`)}
                        className="w-12 px-1 py-1 text-xs bg-status-purple text-white rounded hover:bg-status-purple/80 transition-all">생성</button>
                      <button disabled={b.status !== 'DRAFT'} onClick={() => { setEditTarget({ batch_id: b.batch_id, name: b.name || '' }); setEditName(b.name || ''); }}
                        className="w-12 px-1 py-1 text-xs bg-status-purple/10 text-status-purple rounded hover:bg-status-purple/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">수정</button>
                      <button disabled={b.status !== 'DRAFT'} onClick={() => setDeleteTarget({ batch_id: b.batch_id, name: b.display_id || b.batch_id })}
                        className="w-12 px-1 py-1 text-xs bg-status-red-dim text-status-red rounded hover:bg-status-red/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!batches?.length && <tr><td colSpan={6} className="px-6 py-8 text-center text-txt-muted">배치가 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* 수정 모달 */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm">
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex items-center justify-between">
              <h2 className="text-lg font-semibold text-txt-primary">배치명 수정</h2>
              <button onClick={() => setEditTarget(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-geo-card-hover transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: editTarget.batch_id, name: editName }); }} className="p-6">
              <label className="block text-xs text-txt-secondary mb-1.5">배치명</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="배치명"
                className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" autoFocus />
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setEditTarget(null)} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">취소</button>
                <button type="submit" disabled={updateMutation.isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all disabled:opacity-50">
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">배치 삭제</h3>
            <p className="text-sm text-txt-secondary mb-6">"{deleteTarget.name}" 배치를 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">취소</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.batch_id)} disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-50">
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 pb-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-md flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">새 배치 생성</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">시리즈 선택 *</label>
                  <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none" required>
                    <option value="">시리즈를 선택하세요</option>
                    {series?.map((s: any) => <option key={s.series_id} value={s.series_id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">디자인 이미지 추가</label>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesChange} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-status-purple/20 file:text-status-purple cursor-pointer" />
                </div>
                {rows.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-xs text-txt-secondary">배치 목록 ({rows.length}개)</label>
                    {rows.map((row, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-geo-main rounded-lg border border-geo-border">
                        <img src={row.image} alt={`batch-${i}`} className="w-12 h-12 object-cover rounded-lg border border-geo-border flex-shrink-0" />
                        <input type="number" placeholder="발행량" value={row.supply} onChange={(e) => handleSupplyChange(i, e.target.value)} className="flex-1 px-3 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted text-sm focus:ring-2 focus:ring-status-purple/40 outline-none" min="1" required />
                        <button type="button" onClick={() => handleRemoveRow(i)} className="w-8 h-8 bg-status-red/20 text-status-red rounded-lg flex items-center justify-center hover:bg-status-red/30 transition-all flex-shrink-0">X</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => { setShowModal(false); setSeriesId(''); setRows([]); }} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">취소</button>
                <button type="submit" disabled={isCreating || rows.length === 0} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all disabled:opacity-50">
                  {isCreating ? '생성 중...' : `생성 (${rows.length}개)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
