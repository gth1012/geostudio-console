import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

export default function BatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetCount, setAssetCount] = useState('100');
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const toast = useToastStore();
  const { data: batch, isLoading: batchLoading } = useQuery({ queryKey: ['batch', id], queryFn: () => api.get(`/batches/${id}`).then((res) => res.data.data) });
  const { data: assets, isLoading: assetsLoading } = useQuery({ queryKey: ['assets', id], queryFn: () => api.get(`/assets?batchId=${id}`).then((res) => res.data.data), enabled: !!id });

  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [qrDinaId, setQrDinaId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 50;

  const createAssetsMutation = useMutation({
    mutationFn: (data: { batchId: string; seriesId: string; count: number }) => api.post('/assets/bulk', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets', id] }); queryClient.invalidateQueries({ queryKey: ['batch', id] }); setShowAssetModal(false); setAssetCount('100'); toast.show('자산이 생성되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '자산 생성 실패', 'error'); },
  });

  const lockMutation = useMutation({
    mutationFn: (batchId: string) => api.post(`/batches/${batchId}/lock`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batch', id] }); queryClient.invalidateQueries({ queryKey: ['assets', id] }); setShowLockConfirm(false); toast.show('배치가 확정되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '배치 확정 실패', 'error'); },
  });

  const unlockMutation = useMutation({
    mutationFn: (batchId: string) => api.post(`/geocam/admin/unlock-batch/${batchId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['batch', id] }); queryClient.invalidateQueries({ queryKey: ['anomaly', id] }); setShowUnlockConfirm(false); toast.show('잠금이 해제되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '잠금 해제 실패', 'error'); },
  });

  const { data: anomalyStatus } = useQuery({
    queryKey: ['anomaly', id],
    queryFn: () => api.get(`/geocam/anomaly-status/${id}`).then((res) => res.data),
    enabled: !!id,
    refetchInterval: 30000,
  });

  const handleCreateAssets = () => { if (!batch) return; createAssetsMutation.mutate({ batchId: batch.batch_id, seriesId: batch.series_id, count: parseInt(assetCount) }); };
  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { COMPLETED: 'bg-status-green-dim text-status-green', PROCESSING: 'bg-status-blue-dim text-status-blue', CREATED: 'bg-status-yellow-dim text-status-yellow', FAILED: 'bg-status-red-dim text-status-red', DRAFT: 'bg-status-yellow-dim text-status-yellow', LOCKED: 'bg-status-purple-dim text-status-purple', SHIPPED: 'bg-status-green-dim text-status-green', QR_GENERATED: 'bg-status-green-dim text-status-green', DINA_INSERTED: 'bg-status-blue-dim text-status-blue', EXPORTED: 'bg-status-purple-dim text-status-purple', ISSUED: 'bg-status-green-dim text-status-green' };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { DRAFT: '임시저장', IN_PROGRESS: '진행중', COMPLETED: '완료', SHIPPED: '출고완료', FAILED: '실패', LOCKED: '확정', CREATED: '생성됨', PROCESSING: '처리중', QR_GENERATED: 'QR생성', DINA_INSERTED: 'DINA삽입', EXPORTED: '출고됨', ISSUED: '발급완료' };
    return map[status] || status;
  };

  const handleDownloadQR = () => {
    if (!qrDinaId) return;
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const a = document.createElement('a');
      a.download = `${qrDinaId}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (batchLoading) return <p className="text-txt-secondary">로딩 중...</p>;
  if (!batch) return <p className="text-txt-muted">배치를 찾을 수 없습니다.</p>;

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
          {batch.status === 'DRAFT' && (
            <button onClick={() => setShowLockConfirm(true)} className="px-4 py-2 bg-status-red text-white rounded-lg hover:bg-status-red/80 text-sm font-medium transition-all">LOCK 확정</button>
          )}
          <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowAssetModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 자산 생성</button>
        </div>
      </div>

      <div className="bg-geo-card border border-geo-border rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-txt-primary mb-4">배치 정보</h2>
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

      <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-geo-border"><h2 className="text-sm font-semibold text-txt-primary">자산 목록 ({assets?.length || 0})</h2></div>
        {assetsLoading ? <p className="p-6 text-txt-secondary">로딩 중...</p> : assets?.length === 0 ? (
          <p className="p-6 text-txt-muted text-center text-sm">자산이 없습니다. [+ 자산 생성] 버튼을 눌러 자산을 생성하세요.</p>
        ) : (
          <>
            <table className="w-full table-fixed">
              <thead><tr className="border-b border-geo-border">
                <th className="w-16 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">No</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">DINA ID</th>
                <th className="w-32 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">에디션</th>
                <th className="w-24 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="w-24 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">생성일</th>
              </tr></thead>
              <tbody>
                {assets?.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((asset: any, index: number) => (
                  <tr key={asset.asset_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                    <td className="px-3 py-3 text-center text-txt-muted font-mono">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                    <td className="px-3 py-3 text-center font-mono text-status-blue text-sm truncate cursor-pointer hover:underline" onClick={() => setQrDinaId(asset.dina_id)}>{asset.dina_id}</td>
                    <td className="px-3 py-3 text-center font-mono text-sm text-txt-primary">{asset.edition ? `#${String(asset.edition).padStart(5, '0')} / ${(batch.series?.total_count || 0).toLocaleString()}` : <span className="text-txt-muted">-</span>}</td>
                    <td className="px-3 py-3 text-center"><span className={`inline-block w-20 px-1 py-1 rounded text-xs font-medium text-center ${getStatusBadge(asset.status)}`}>{getStatusLabel(asset.status)}</span></td>
                    <td className="px-3 py-3 text-center text-txt-muted text-xs">{new Date(asset.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* 페이지네이션 */}
            {assets && assets.length > ITEMS_PER_PAGE && (() => {
              const totalPages = Math.ceil(assets.length / ITEMS_PER_PAGE);
              const pageGroup = Math.floor((currentPage - 1) / 10);
              const startPage = pageGroup * 10 + 1;
              const endPage = Math.min(startPage + 9, totalPages);
              const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
              return (
                <div className="px-6 py-4 border-t border-geo-border flex justify-center items-center gap-1">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                    className="px-2 py-1 text-xs font-medium text-txt-secondary border border-geo-border rounded hover:bg-geo-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all">{'<<'}</button>
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 10))} disabled={currentPage <= 10}
                    className="px-2 py-1 text-xs font-medium text-txt-secondary border border-geo-border rounded hover:bg-geo-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all">{'<'}</button>
                  {pages.map((page) => (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      className={`w-8 py-1 text-xs font-medium rounded transition-all ${currentPage === page ? 'bg-status-purple text-white' : 'text-txt-secondary border border-geo-border hover:bg-geo-card-hover'}`}>{page}</button>
                  ))}
                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 10))} disabled={currentPage > totalPages - 10}
                    className="px-2 py-1 text-xs font-medium text-txt-secondary border border-geo-border rounded hover:bg-geo-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all">{'>'}</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs font-medium text-txt-secondary border border-geo-border rounded hover:bg-geo-card-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all">{'>>'}</button>
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* 잠금 해제 확인 모달 */}
      {showUnlockConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">배치 잠금 해제</h3>
            <p className="text-sm text-txt-secondary mb-2">이 배치의 이상 감지 잠금을 해제합니다.</p>
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

      {/* LOCK 확정 모달 */}
      {showLockConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">배치 확정 (LOCK)</h3>
            <p className="text-sm text-txt-secondary mb-2">확정 후 취소할 수 없습니다.</p>
            <p className="text-sm text-txt-primary mb-1">에디션 <span className="font-mono text-status-blue">#{String(batch.series?.next_edition || 1).padStart(5, '0')}</span> ~ <span className="font-mono text-status-blue">#{String((batch.series?.next_edition || 1) + (assets?.length || 0) - 1).padStart(5, '0')}</span> 가 배정됩니다.</p>
            <p className="text-xs text-txt-muted mb-6">자산 수: {assets?.length || 0}개</p>
            {lockMutation.isError && <p className="text-sm text-status-red mb-4">{(lockMutation.error as any)?.response?.data?.message || '확정 실패'}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowLockConfirm(false)} disabled={lockMutation.isPending} className="px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">취소</button>
              <button onClick={() => lockMutation.mutate(batch.batch_id)} disabled={lockMutation.isPending}
                className="px-4 py-2 text-sm font-medium bg-status-red text-white rounded-lg hover:bg-status-red/80 transition-all disabled:opacity-50">
                {lockMutation.isPending ? '확정 중...' : '확정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAssetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 pb-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">자산 대량 생성</h2>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">시리즈</label>
                  <p className="px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary">{batch.series?.name || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">생성할 자산 수</label>
                  <input type="number" value={assetCount} onChange={(e) => setAssetCount(e.target.value)} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none" min="1" max="10000" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowAssetModal(false)} disabled={createAssetsMutation.isPending} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">취소</button>
                <button onClick={handleCreateAssets} disabled={createAssetsMutation.isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">{createAssetsMutation.isPending ? '생성 중...' : '생성'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR 코드 모달 */}
      {qrDinaId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setQrDinaId(null)}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-xs p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-txt-primary">QR 코드</h3>
              <button onClick={() => setQrDinaId(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-geo-card-hover transition-all">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="bg-white p-4 rounded-lg flex justify-center mb-4">
              <QRCodeSVG id="qr-code-svg" value={qrDinaId} size={180} level="H" />
            </div>
            <p className="text-center font-mono text-sm text-txt-secondary mb-4">{qrDinaId}</p>
            <button onClick={handleDownloadQR} className="w-full px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all">
              다운로드
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
