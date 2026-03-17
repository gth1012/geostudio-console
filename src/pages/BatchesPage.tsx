import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

interface BatchRow {
  image: string;
  supply: string;
  fileName: string;
}

export default function BatchesPage() {
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [seriesId, setSeriesId] = useState('');
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [deleteTarget, setDeleteTarget] = useState<{ batch_id: string; name: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [imgModalPos, setImgModalPos] = useState({ x: 0, y: 0 });
  const [isImgDragging, setIsImgDragging] = useState(false);
  const imgDragOffset = useRef({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);

  // 필터용 상태
  const [filterTenantId, setFilterTenantId] = useState<string | null>(null);
  const [filterSeriesId, setFilterSeriesId] = useState<string | null>(null);

  // 작업 생성 모달용 기획사→시리즈 선택 상태
  const [modalTenantId, setModalTenantId] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToastStore();

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then((res) => res.data.data),
    refetchInterval: (query) => {
      const list = query.state.data as any[] | undefined;
      const hasPrinting = list?.some((b: any) => b.status === 'PRINTING');
      return hasPrinting ? 3000 : false;
    },
  });

  // 기획사 목록
  const { data: tenantList } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/dealers').then((res) => res.data?.data || []),
  });

  // 필터용 시리즈 목록
  const { data: filterSeriesList } = useQuery({
    queryKey: ['tenants', filterTenantId, 'series'],
    queryFn: () => api.get(`/dealers/${filterTenantId}/series`).then((res) => res.data?.data || []),
    enabled: !!filterTenantId,
  });

  // 작업 생성 모달용 시리즈 목록
  const { data: modalSeriesList } = useQuery({
    queryKey: ['tenants', modalTenantId, 'series'],
    queryFn: () => api.get(`/dealers/${modalTenantId}/series`).then((res) => res.data?.data || []),
    enabled: !!modalTenantId,
  });

  // 필터 적용된 배치 목록
  const filteredBatches = batches?.filter((b: any) => {
    if (filterSeriesId) return b.series_id === filterSeriesId;
    if (filterTenantId) {
      const seriesIds = filterSeriesList?.map((s: any) => s.series_id) || [];
      return seriesIds.includes(b.series_id);
    }
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/batches/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batches'] }); setDeleteTarget(null); toast.show('작업이 삭제됐습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '작업 삭제 실패', 'error'); },
  });

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => api.delete(`/batches/${id}`)));
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setSelectedIds(new Set());
      setShowBulkDeleteModal(false);
      toast.show(`${ids.length}개 작업이 삭제됐습니다`, 'success');
    } catch (err: any) {
      toast.show(err.response?.data?.message || '일괄 작업 삭제 실패', 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkPrint = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkPrinting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id: string) => api.post(`/print/batch/${id}/prepare-and-print`)));
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setSelectedIds(new Set());
      setShowBulkPrintModal(false);
      toast.show(`${ids.length}개 지오코드생성을 시작했습니다`, 'success');
    } catch (err: any) {
      toast.show(err.response?.data?.message || '일괄 지오코드생성 실패', 'error');
    } finally {
      setIsBulkPrinting(false);
    }
  };

  const [createProgress, setCreateProgress] = useState({ current: 0, total: 0 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesId || rows.length === 0) return;
    setIsCreating(true);
    setCreateProgress({ current: 0, total: rows.length });
    try {
      const chunkSize = 3;
      let completed = 0;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        await Promise.all(chunk.map(row => api.post('/batches', { seriesId, image: row.image, supply: parseInt(row.supply) || 0 })));
        completed += chunk.length;
        setCreateProgress({ current: completed, total: rows.length });
      }
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setShowModal(false);
      setSeriesId('');
      setRows([]);
      setModalTenantId(null);
      toast.show(`${rows.length}개 작업이 생성됐습니다`, 'success');
    } catch (err: any) {
      toast.show(err.response?.data?.message || '작업 생성 실패', 'error');
    } finally {
      setIsCreating(false);
      setCreateProgress({ current: 0, total: 0 });
    }
  };

  const addImagesWithDuplicateCheck = useCallback((newImages: BatchRow[]) => {
    setRows(prev => {
      const existingKeys = new Set(prev.map(r => r.fileName));
      const unique: BatchRow[] = [];
      let duplicateCount = 0;
      for (const img of newImages) {
        if (existingKeys.has(img.fileName)) {
          duplicateCount++;
        } else {
          existingKeys.add(img.fileName);
          unique.push(img);
        }
      }
      if (duplicateCount > 0) {
        toast.show(`중복 이미지 ${duplicateCount}개 제외됨`, 'error');
      }
      return [...prev, ...unique];
    });
  }, [toast]);

  const processFiles = useCallback((files: File[]) => {
    const readers = files.map(file => {
      return new Promise<BatchRow>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ image: reader.result as string, supply: '', fileName: file.name });
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(newImages => {
      addImagesWithDuplicateCheck(newImages);
    });
  }, [addImagesWithDuplicateCheck]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.show('이미지 파일만 추가할 수 있습니다', 'error');
      return;
    }
    processFiles(files);
  }, [processFiles, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleRemoveRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleSupplyChange = (index: number, value: string) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, supply: value } : row));
  };

  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const handleImgMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A','SVG','PATH'].includes(tag)) return; setIsImgDragging(true); imgDragOffset.current = { x: e.clientX - imgModalPos.x, y: e.clientY - imgModalPos.y }; };
  const handleImgMouseMove = (e: React.MouseEvent) => { if (!isImgDragging) return; setImgModalPos({ x: e.clientX - imgDragOffset.current.x, y: e.clientY - imgDragOffset.current.y }); };
  const handleImgMouseUp = () => { if (isImgDragging) setIsImgDragging(false); };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { COMPLETED: 'bg-status-green-dim text-status-green', IN_PROGRESS: 'bg-status-yellow-dim text-status-yellow', FAILED: 'bg-status-red-dim text-status-red', DRAFT: 'bg-status-yellow-dim text-status-yellow', LOCKED: 'bg-status-purple-dim text-status-purple', PRINTED: 'bg-status-green-dim text-status-green', SHIPPED: 'bg-status-green-dim text-status-green', PRINTING: 'bg-status-yellow-dim text-status-yellow', PRINT_FAILED: 'bg-status-red-dim text-status-red', PURGED: 'bg-status-gray-dim text-status-gray', VOID: 'bg-status-red-dim text-status-red' };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { DRAFT: '초안', IN_PROGRESS: '진행 중', COMPLETED: '완료', PRINTED: '지오코드 생성 완료', SHIPPED: '출고완료', FAILED: '실패', LOCKED: '확정', PRINTING: '생성 중', PRINT_FAILED: '생성 실패', PURGED: '출고완료', VOID: '무효' };
    return map[status] || status;
  };

  return (
    <div className="animate-fade-in">

      {/* 기획사 → 시리즈 필터 + 작업 생성 버튼 */}
      <div className="flex flex-row items-center gap-3 mb-6">
        <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-yellow-dim text-status-yellow rounded-lg hover:bg-status-yellow/20 text-sm font-medium transition-all">시리즈 선택</button>

        {/* 기획사 필터 */}
        <select
          value={filterTenantId || ''}
          onChange={(e) => { setFilterTenantId(e.target.value || null); setFilterSeriesId(null); }}
          className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-sm text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none min-w-[150px]"
        >
          <option value="">전체 기획사</option>
          {Array.isArray(tenantList) && tenantList.map((t: any) => (
            <option key={t.tenant_id} value={t.tenant_id}>{t.name} ({t.series_count}개)</option>
          ))}
        </select>

        {/* 시리즈 필터 */}
        <select
          value={filterSeriesId || ''}
          onChange={(e) => setFilterSeriesId(e.target.value || null)}
          disabled={!filterTenantId}
          className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-sm text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none min-w-[160px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <option value="">전체 시리즈</option>
          {Array.isArray(filterSeriesList) && filterSeriesList.map((s: any) => (
            <option key={s.series_id} value={s.series_id}>{s.name}</option>
          ))}
        </select>

        {(filterTenantId || filterSeriesId) && (
          <button
            onClick={() => { setFilterTenantId(null); setFilterSeriesId(null); }}
            className="px-3 py-2 text-sm text-txt-muted hover:text-txt-primary border border-geo-border rounded-lg transition-all"
          >
            초기화
          </button>
        )}

        {selectedIds.size > 0 && (
          <button onClick={() => setShowBulkPrintModal(true)} className="px-4 py-2 bg-status-yellow-dim text-status-yellow rounded-lg hover:bg-status-yellow/20 text-sm font-medium transition-all ml-auto">
            지오코드생성 ({selectedIds.size}개)
          </button>
        )}
      </div>

      {isLoading ? <p className="text-txt-secondary">로딩 중.</p> : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-visible">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">ID</th>
                <th className="w-[18%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">시리즈</th>
                <th className="w-[10%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">발행량</th>
                <th className="w-[22%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">상태</th>
                <th className="w-[15%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">생성일</th>
                <th className="w-[20%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches?.map((b: any) => (
                <tr key={b.batch_id} className={`border-b border-geo-border/50 last:border-0 dark-table-row transition-colors ${selectedIds.has(b.batch_id) ? 'bg-status-purple/10' : ''}`}>
                  <td className="px-4 py-3 text-center font-mono text-sm text-status-green cursor-pointer hover:underline" onClick={() => navigate(`/batches/${b.batch_id}`)}>{b.display_id || '-'}</td>
                  <td className="px-4 py-3 text-center text-txt-primary truncate">{b.series_name || '-'}</td>
                  <td className="px-4 py-3 text-center text-txt-primary font-mono">{b.supply?.toLocaleString() || '-'}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center items-center gap-1 flex-wrap">
                      <span className={`inline-block w-24 px-2 py-1 rounded text-xs font-medium text-center whitespace-nowrap ${getStatusBadge(b.status)}`}>{getStatusLabel(b.status)}</span>
                      {b.batch_locked_until && new Date(b.batch_locked_until) > new Date() && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-red/20 text-status-red border border-status-red/30 animate-pulse">LOCKED</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center text-txt-muted text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => navigate(`/batches/${b.batch_id}`)}
                        className="w-16 px-1 py-1 text-xs rounded transition-all bg-status-yellow-dim text-status-yellow hover:bg-status-yellow/20">코드생성</button>
                      <button disabled={b.status !== 'DRAFT'} onClick={() => setDeleteTarget({ batch_id: b.batch_id, name: b.display_id || b.batch_id })}
                        className="w-12 px-1 py-1 text-xs bg-status-red-dim text-status-red rounded hover:bg-status-red/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredBatches?.length > 0 && filteredBatches.every((b: any) => b.status === 'PRINTED') && (
        <div className="mt-4 px-6 py-5 bg-status-purple-dim border border-status-purple/30 rounded-lg text-center">
          <p className="text-base font-semibold text-status-green mb-1">지오코드 생성 완료!</p>
          <p className="text-sm text-txt-secondary">다음 단계는{' '}<button onClick={() => window.location.hash = '/exports'} className="text-status-yellow font-semibold hover:underline">[자산 출고]</button>에서 진행하세요.</p>
        </div>
      )}
      {!filteredBatches?.length && (
        <div className="mt-4 px-6 py-5 bg-status-purple-dim border border-status-purple/30 rounded-lg text-center">
          <p className="text-base font-semibold text-txt-primary mb-1">작업이 없습니다.</p>
          <p className="text-sm text-txt-secondary"><button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="text-status-yellow font-semibold hover:underline">[시리즈 선택]</button>{' '}에서 시리즈 선택 후 작업을 만들어주세요.</p>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">작업 삭제</h3>
            <p className="text-sm text-txt-secondary mb-6">"{deleteTarget.name}" 작업을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">취소</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.batch_id)} disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-50">
                {deleteMutation.isPending ? '삭제 중..' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 지오코드생성 모달 */}
      {showBulkPrintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">일괄 지오코드생성</h3>
            <p className="text-sm text-txt-muted mb-4">선택한 {selectedIds.size}개 작업의 지오코드를 생성합니다.</p>
            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
              {Array.from(selectedIds).map(id => {
                const b = batches?.find((x: any) => x.batch_id === id);
                return b ? (
                  <div key={id} className="flex items-center justify-between px-3 py-2 bg-geo-main rounded-lg">
                    <span className="text-xs font-mono text-txt-secondary">{b.display_id || b.batch_id}</span>
                    <span className="text-xs text-txt-muted">{b.series_name}</span>
                  </div>
                ) : null;
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowBulkPrintModal(false)} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">취소</button>
              <button onClick={handleBulkPrint} disabled={isBulkPrinting} className="flex-1 px-4 py-2.5 bg-status-yellow-dim text-status-yellow rounded-lg font-medium hover:bg-status-yellow/20 transition-all disabled:opacity-50">
                {isBulkPrinting ? '생성 중..' : `지오코드생성 (${selectedIds.size}개)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 삭제 확인 모달 */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">일괄 삭제</h3>
            <p className="text-sm text-txt-secondary mb-6">선택한 {selectedIds.size}개 작업을 삭제하시겠습니까?<br />이 작업은 되돌릴 수 없습니다.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowBulkDeleteModal(false)} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">취소</button>
              <button onClick={handleBulkDelete} disabled={isBulkDeleting}
                className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-50">
                {isBulkDeleting ? '삭제 중..' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 작업 생성 모달 - 기획사→시리즈 2단계 선택 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-start p-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-md flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-4 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0 flex justify-between items-center gap-2">
              <div className="w-6" />
              {/* 기획사 선택 */}
              <select
                value={modalTenantId || ''}
                onChange={(e) => { setModalTenantId(e.target.value || null); setSeriesId(''); }}
                className="flex-1 px-3 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none text-sm"
              >
                <option value="">기획사 선택</option>
                {Array.isArray(tenantList) && tenantList.map((t: any) => (
                  <option key={t.tenant_id} value={t.tenant_id}>{t.name}</option>
                ))}
              </select>
              {/* 시리즈 선택 */}
              <select
                value={seriesId}
                onChange={(e) => setSeriesId(e.target.value)}
                disabled={!modalTenantId}
                className="flex-1 px-3 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                required
              >
                <option value="">시리즈 선택</option>
                {Array.isArray(modalSeriesList) && modalSeriesList.map((s: any) => (
                  <option key={s.series_id} value={s.series_id}>{s.name}</option>
                ))}
              </select>
              <button type="button" onClick={() => { setShowModal(false); setSeriesId(''); setRows([]); setModalTenantId(null); }} className="w-6 h-6 flex items-center justify-center text-txt-muted hover:text-txt-primary transition-all text-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <button type="button" disabled={!seriesId} onClick={() => { setImgModalPos({ x: 0, y: 0 }); setShowImageModal(true); }} className="w-full px-4 py-2.5 bg-status-yellow-dim text-status-yellow rounded-lg font-medium hover:bg-status-yellow/20 transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed">
                    + 원본 이미지 추가
                  </button>
                </div>
                {rows.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-xs text-txt-secondary">원본 목록 ({rows.length}개)</label>
                    {rows.map((row, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-geo-main rounded-lg border border-geo-border">
                        <span className="text-xs text-txt-muted font-mono w-6 text-center flex-shrink-0">{i + 1}</span>
                        <img src={row.image} alt={`batch-${i}`} className="w-12 h-12 object-cover rounded-lg border border-geo-border flex-shrink-0" />
                        <input
                          type="number"
                          placeholder="발행량"
                          value={row.supply}
                          onChange={(e) => handleSupplyChange(i, e.target.value)}
                          autoComplete="off"
                          className="flex-1 px-3 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted text-sm focus:ring-2 focus:ring-status-purple/40 outline-none"
                          min="1"
                          required
                        />
                        <button type="button" onClick={() => handleRemoveRow(i)} className="w-8 h-8 bg-status-red/20 text-status-red rounded-lg flex items-center justify-center hover:bg-status-red/30 transition-all flex-shrink-0">X</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" disabled className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium transition-all opacity-80 cursor-default">원본 이미지 {rows.length}개</button>
                <button type="submit" disabled={isCreating || rows.length === 0} className="flex-1 px-4 py-2.5 bg-status-yellow-dim text-status-yellow rounded-lg font-medium hover:bg-status-yellow/20 transition-all disabled:opacity-50">
                  {isCreating ? `생성 중.. (${createProgress.current}/${createProgress.total})` : `총 발행 이미지 ${rows.reduce((sum: number, r: any) => sum + (Number(r.supply) || 0), 0)}개`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 이미지 추가 모달 */}
      {showImageModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-start pt-4 pl-[464px]" onMouseMove={handleImgMouseMove} onMouseUp={handleImgMouseUp} onMouseLeave={handleImgMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-lg cursor-move select-none" style={{ transform: `translate(${imgModalPos.x}px, ${imgModalPos.y}px)` }} onMouseDown={handleImgMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex items-center justify-between">
              <h2 className="text-base font-semibold text-txt-primary">원본 이미지 추가</h2>
              <button onClick={() => setShowImageModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-geo-card-hover transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-lg px-4 py-3 text-center transition-all cursor-pointer flex items-center justify-center gap-3 ${dragOver ? 'border-status-purple bg-status-purple/10' : 'border-geo-border hover:border-status-purple/50'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFilesChange} className="hidden" />
                <span className="text-sm text-txt-primary font-medium">🖼 이미지 드롭 또는 클릭</span>
              </div>
              {rows.length > 0 && (
                <div>
                  <label className="block text-xs text-txt-secondary mb-2">추가된 이미지 ({rows.length}개)</label>
                  <div className="grid grid-cols-5 gap-2 max-h-40 overflow-y-auto">
                    {rows.map((row, i) => (
                      <div key={i} className="relative group">
                        <img src={row.image} alt={`img-${i}`} className="w-full aspect-square object-cover rounded-lg border border-geo-border" />
                        <span className="absolute top-0.5 left-0.5 bg-black/60 text-white text-[10px] px-1 rounded">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setShowImageModal(false)} className="w-full px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all text-sm">
                확인 ({rows.length}개 이미지)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


