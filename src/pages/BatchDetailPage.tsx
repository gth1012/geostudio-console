import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

interface BatchItem {
  batch_id: string;
  display_id: string;
  image: string;
  image_url?: string;
  supply: number;
}

export default function BatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [selectedBatches, setSelectedBatches] = useState<Set<string>>(new Set());
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const toast = useToastStore();
  const { data: batch, isLoading: batchLoading } = useQuery({ queryKey: ['batch', id], queryFn: () => api.get(`/batches/${id}`).then((res) => res.data.data) });

  // 같은 시리즈의 모든 배치 목록 조회
  const { data: allBatches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then((res) => res.data.data),
    enabled: showAssetModal,
  });

  // 현재 배치와 같은 시리즈의 DRAFT 배치만 필터링
  const seriesBatches: BatchItem[] = allBatches?.filter((b: any) =>
    b.series_id === batch?.series_id && b.status === 'DRAFT'
  ) || [];

  // 모달 열릴 때 전체 선택
  useEffect(() => {
    if (showAssetModal && seriesBatches.length > 0) {
      setSelectedBatches(new Set(seriesBatches.map(b => b.batch_id)));
    }
  }, [showAssetModal, allBatches]);

  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  const createAssetsMutation = useMutation({
    mutationFn: async (batches: { batch_id: string; quantity: number }[]) => {
      const results = await Promise.all(
        batches.map(b => api.post('/assets/bulk', b))
      );
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setShowAssetModal(false);
      setSelectedBatches(new Set());
      toast.show('자산 생성이 시작되었습니다', 'success');
    },
    onError: (err: any) => { toast.show(err.response?.data?.message || '자산 생성 실패', 'error'); },
  });

  const unlockMutation = useMutation({
    mutationFn: (batchId: string) => api.post(`/geocam/admin/unlock-batch/${batchId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batch', id] }); queryClient.invalidateQueries({ queryKey: ['anomaly', id] }); setShowUnlockConfirm(false); toast.show('잠금이 해제되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '잠금 해제 실패', 'error'); },
  });

  const lockMutation = useMutation({
    mutationFn: (batchId: string) => api.patch(`/studio/batches/${batchId}/lock`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batch', id] }); toast.show('배치가 확정되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '배치 확정 실패', 'error'); },
  });

  const printMutation = useMutation({
    mutationFn: (batchId: string) => api.post(`/api/studio/print/batch/${batchId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batch', id] }); toast.show('Print 실행이 시작되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || 'Print 실행 실패', 'error'); },
  });

  const { data: anomalyStatus } = useQuery({
    queryKey: ['anomaly', id],
    queryFn: () => api.get(`/geocam/anomaly-status/${id}`).then((res) => res.data),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const handleCreateAssets = () => {
    if (selectedBatches.size === 0) return;
    const batchesToCreate = seriesBatches
      .filter(b => selectedBatches.has(b.batch_id))
      .map(b => ({ batch_id: b.batch_id, quantity: b.supply }));
    createAssetsMutation.mutate(batchesToCreate);
  };

  const handleToggleBatch = (batchId: string) => {
    setSelectedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedBatches.size === seriesBatches.length) {
      setSelectedBatches(new Set());
    } else {
      setSelectedBatches(new Set(seriesBatches.map(b => b.batch_id)));
    }
  };

  const totalSelectedAssets = seriesBatches
    .filter(b => selectedBatches.has(b.batch_id))
    .reduce((sum, b) => sum + (b.supply || 0), 0);

  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { COMPLETED: 'bg-status-green-dim text-status-green', PROCESSING: 'bg-status-blue-dim text-status-blue', CREATED: 'bg-status-yellow-dim text-status-yellow', FAILED: 'bg-status-red-dim text-status-red', DRAFT: 'bg-status-yellow-dim text-status-yellow', LOCKED: 'bg-status-purple-dim text-status-purple', SHIPPED: 'bg-status-green-dim text-status-green' };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { DRAFT: '임시저장', IN_PROGRESS: '진행중', COMPLETED: '완료', SHIPPED: '출고완료', FAILED: '실패', LOCKED: '확정', CREATED: '생성됨', PROCESSING: '처리중' };
    return map[status] || status;
  };

  if (batchLoading) return <p className="text-txt-secondary">로딩 중...</p>;
  if (!batch) return <p className="text-txt-muted">자산을 찾을 수 없습니다.</p>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/batches')} className="px-3 py-2 text-sm border border-geo-border text-txt-secondary rounded-lg hover:text-txt-primary hover:border-geo-border-hover transition-all">← 목록</button>
          <h1 className="text-xl font-semibold text-txt-primary">{batch.display_id || batch.batch_id}</h1>
          <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusBadge(batch.status)}`}>{getStatusLabel(batch.status)}</span>
          <span className={`px-2 py-1 rounded text-xs font-medium ${batch.batch_reference_status === 'LOCKED' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>
            {batch.batch_reference_status === 'LOCKED' ? '기준: 확정' : '기준: 미확정'}
          </span>
          {batch.batch_locked_until && new Date(batch.batch_locked_until) > new Date() && (
            <span className="px-2 py-1 rounded text-xs font-bold bg-status-red/20 text-status-red border border-status-red/30 animate-pulse">LOCKED</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {batch.batch_locked_until && new Date(batch.batch_locked_until) > new Date() && (
            <button onClick={() => setShowUnlockConfirm(true)} className="px-4 py-2 bg-status-yellow text-geo-deep rounded-lg hover:bg-status-yellow/80 text-sm font-medium transition-all">잠금 해제</button>
          )}
          {batch.status === 'DRAFT' && (batch.items_total || 0) < (batch.supply || 0) ? (
            <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowAssetModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 자산 생성</button>
          ) : batch.status === 'DRAFT' ? (
            <>
              <span className="px-4 py-2 bg-geo-card text-txt-muted border border-geo-border rounded-lg text-sm font-medium cursor-not-allowed">자산 생성 완료</span>
              <button onClick={() => lockMutation.mutate(batch.batch_id)} disabled={lockMutation.isPending} className="px-4 py-2 bg-status-green text-white rounded-lg hover:bg-status-green/80 disabled:opacity-50 text-sm font-medium transition-all">{lockMutation.isPending ? 'LOCK 중...' : 'LOCK 확정'}</button>
            </>
          ) : batch.status === 'LOCKED' ? (
            <button onClick={() => printMutation.mutate(batch.batch_id)} disabled={printMutation.isPending} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 disabled:opacity-50 transition-all">{printMutation.isPending ? 'Print 중...' : 'Print 실행'}</button>
          ) : (
            <span className="px-4 py-2 bg-status-green text-white rounded-lg text-sm font-medium">확정</span>
          )}
        </div>
      </div>

      <div className="bg-geo-card border border-geo-border rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-txt-primary mb-4">자산 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">시리즈</p><p className="font-medium text-txt-primary">{batch.series?.name || '-'}</p></div>
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">코드</p><p className="font-medium text-txt-primary font-mono">{batch.series?.code || '-'}</p></div>
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">총 자산</p><p className="font-medium text-txt-primary font-mono">{batch.items_total || 0}</p></div>
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">완료</p><p className="font-medium text-status-green font-mono">{batch.items_completed || 0}</p></div>
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">생성일</p><p className="font-medium text-txt-primary">{new Date(batch.created_at).toLocaleDateString()}</p></div>
        </div>
      </div>

      {/* 이상 감지 모니터링 */}
      {anomalyStatus && (
        <div className={`border rounded-xl p-6 mb-6 ${anomalyStatus.is_locked ? 'bg-status-red/5 border-status-red/30' : 'bg-geo-card border-geo-border'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-txt-primary">이상 감지 모니터링</h2>
            {anomalyStatus.is_locked && (
              <span className="px-2 py-1 rounded text-xs font-bold bg-status-red/20 text-status-red border border-status-red/30">잠금 상태</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">5분 내 검증 수</p>
              <p className={`font-medium font-mono text-lg ${anomalyStatus.current_verify_count >= anomalyStatus.threshold ? 'text-status-red' : 'text-txt-primary'}`}>
                {anomalyStatus.current_verify_count ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">임계값</p>
              <p className="font-medium text-txt-primary font-mono text-lg">{anomalyStatus.threshold ?? 50}</p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">잠금 여부</p>
              <p className={`font-medium text-lg ${anomalyStatus.is_locked ? 'text-status-red' : 'text-status-green'}`}>
                {anomalyStatus.is_locked ? '잠금' : '정상'}
              </p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">잠금 사유</p>
              <p className="font-medium text-txt-primary text-sm">{anomalyStatus.lock_reason || '-'}</p>
            </div>
          </div>
          {anomalyStatus.is_locked && anomalyStatus.locked_until && (
            <div className="mt-4 pt-4 border-t border-geo-border/50">
              <p className="text-xs text-txt-muted">잠금 만료: <span className="text-txt-primary font-mono">{new Date(anomalyStatus.locked_until).toLocaleString('ko-KR')}</span></p>
            </div>
          )}
        </div>
      )}

      {/* 자산 목록은 자산 관리 페이지에서 확인 안내 */}
      <div className="bg-geo-card border border-geo-border rounded-xl p-6">
        <p className="text-sm text-txt-secondary text-center">
          자산 목록은 <button onClick={() => navigate('/assets')} className="text-status-purple hover:underline font-medium">자산 관리</button> 페이지에서 확인하세요.
        </p>
      </div>

      {/* 잠금 해제 확인 모달 */}
      {showUnlockConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">자산 잠금 해제</h3>
            <p className="text-sm text-txt-secondary mb-2">이 자산의 이상 감지 잠금을 해제합니다.</p>
            {batch.lock_reason && (
              <p className="text-sm text-status-yellow mb-2">잠금 사유: {batch.lock_reason}</p>
            )}
            <p className="text-xs text-txt-muted mb-6">해제 후 다시 이상이 감지되면 자동으로 잠길 수 있습니다.</p>
            {unlockMutation.isError && <p className="text-sm text-status-red mb-4">{(unlockMutation.error as any)?.response?.data?.message || '해제 실패'}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowUnlockConfirm(false)} disabled={unlockMutation.isPending} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">취소</button>
              <button onClick={() => unlockMutation.mutate(batch.batch_id)} disabled={unlockMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-status-yellow text-geo-deep rounded-lg hover:bg-status-yellow/80 transition-all disabled:opacity-50">
                {unlockMutation.isPending ? '해제 중...' : '잠금 해제'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 자산 생성 모달 */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-md flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            {/* 상단: 시리즈/배치 정보 */}
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">자산 생성</h2>
            </div>
            <div className="px-6 py-3 border-b border-geo-border flex-shrink-0">
              <div className="text-xs text-txt-secondary">Series</div>
              <div className="text-sm text-txt-primary font-medium">
                {batch.series?.name ?? batch.series_name ?? '—'} ({batch.series?.code ?? batch.series_code ?? '-'})
              </div>
            </div>

            {/* 중앙: 이미지 리스트 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {seriesBatches.length === 0 ? (
                <p className="text-sm text-txt-muted text-center py-4">생성 가능한 자산이 없습니다.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-txt-secondary">이미지 목록 ({seriesBatches.length}개)</span>
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-xs text-status-purple hover:underline"
                    >
                      {selectedBatches.size === seriesBatches.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {seriesBatches.map((b) => (
                      <label
                        key={b.batch_id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedBatches.has(b.batch_id)
                            ? 'border-status-purple bg-status-purple/5'
                            : 'border-geo-border hover:border-geo-border-hover'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBatches.has(b.batch_id)}
                          onChange={() => handleToggleBatch(b.batch_id)}
                          className="w-4 h-4 rounded border-geo-border text-status-purple focus:ring-status-purple/40 bg-geo-main cursor-pointer"
                        />
                        <div className="w-12 h-12 rounded-lg border border-geo-border overflow-hidden flex-shrink-0 bg-geo-main">
                          {(b.image || b.image_url) ? (
                            <img
                              src={b.image || b.image_url}
                              alt={b.display_id}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-txt-muted text-xs">
                              No Image
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-txt-primary font-medium truncate">{b.display_id}</div>
                          <div className="text-xs text-txt-muted">발행량: <span className="font-mono text-txt-secondary">{b.supply?.toLocaleString() || 0}</span></div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 하단: 총 자산 수 + 버튼 */}
            <div className="px-6 py-4 border-t border-geo-border flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-txt-secondary">선택된 총 자산 수</span>
                <span className="text-lg font-semibold text-status-purple font-mono">{totalSelectedAssets.toLocaleString()}개</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAssetModal(false); setSelectedBatches(new Set()); }}
                  disabled={createAssetsMutation.isPending}
                  className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateAssets}
                  disabled={createAssetsMutation.isPending || selectedBatches.size === 0}
                  className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all"
                >
                  {createAssetsMutation.isPending ? '생성 중...' : '생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
