import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToastStore } from '../../stores/toast.store';

interface ShipmentAsset {
  asset_id: string;
  file_name: string;
  file_sha256: string;
  asset?: {
    dina_id: string;
    edition: number;
  };
}

interface Shipment {
  shipment_id: string;
  display_id: string;
  series_id: string;
  asset_count: number;
  status: string;
  zip_sha256: string;
  zip_size: number;
  created_at: string;
  shipped_at?: string;
  voided_at?: string;
  void_reason?: string;
  series?: {
    name: string;
    code: string;
    artist_name?: string;
    dealer_name?: string;
  };
  shipmentAssets?: ShipmentAsset[];
}

interface SeriesInfo {
  series_id: string;
  name: string;
  artist_name?: string;
  dealer_name?: string;
}

interface ShipmentDetailModalProps {
  shipmentId: string;
  onClose: () => void;
}

export default function ShipmentDetailModal({ shipmentId, onClose }: ShipmentDetailModalProps) {
  const queryClient = useQueryClient();
  const toast = useToastStore();

  const [showVoidInput, setShowVoidInput] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => api.get(`/shipments/${shipmentId}`).then(res => res.data as Shipment),
  });

  const { data: seriesList } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.get('/series').then(res => res.data.data as SeriesInfo[]),
    enabled: !!shipment,
  });

  const seriesInfo = seriesList?.find(s => s.series_id === shipment?.series_id);

  const confirmMutation = useMutation({
    mutationFn: () => api.patch(`/shipments/${shipmentId}/confirm`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
      toast.show('출고 확인이 완료되었습니다.', 'success');
      setShowConfirmModal(false);
    },
    onError: (err: any) => {
      toast.show(err.response?.data?.message || '출고 확인 실패', 'error');
    },
  });

  const voidMutation = useMutation({
    mutationFn: (reason: string) => api.patch(`/shipments/${shipmentId}/void`, { voidReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
      toast.show('출고가 무효화되었습니다', 'success');
      setShowVoidInput(false);
    },
    onError: (err: any) => {
      toast.show(err.response?.data?.message || '무효화 실패', 'error');
    },
  });

  const handleDownload = async () => {
    try {
      const res = await api.get(`/shipments/${shipmentId}/download`);
      const link = document.createElement('a');
      link.href = res.data.downloadUrl;
      link.download = `${shipment?.display_id || 'shipment'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.show(err.response?.data?.message || '다운로드 URL 생성 실패', 'error');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };
  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      READY: 'bg-status-yellow-dim text-status-yellow',
      SHIPPED: 'bg-status-green-dim text-status-green',
      VOID: 'bg-status-red-dim text-status-red',
    };
    return map[status] || 'bg-status-gray-dim text-status-gray';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      READY: '준비완료',
      SHIPPED: '출고완료',
      VOID: '무효',
    };
    return map[status] || status;
  };

  const originalCount = shipment?.shipmentAssets
    ? new Set(shipment.shipmentAssets.map(sa => sa.file_name.split('_')[0])).size
    : 0;
  const totalCount = shipment?.asset_count || 0;

  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
        <div className="bg-geo-card border border-geo-border rounded-xl p-6">
          <p className="text-txt-secondary">로딩 중...</p>
        </div>
      </div>,
      document.body
    );
  }

  if (!shipment) return null;

  // 출고 확인 모달
  if (showConfirmModal) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
        <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-md">
          <div className="bg-geo-main px-6 py-4 border-b border-geo-border rounded-t-xl flex items-center justify-between">
            <h2 className="text-lg font-semibold text-txt-primary">출고 확인</h2>
            <button onClick={() => setShowConfirmModal(false)} className="text-txt-muted hover:text-txt-primary text-xl">×</button>
          </div>
          <div className="px-6 py-4">
            <div className="bg-geo-main border border-geo-border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-status-purple">출고 번호</span>
                <span className="text-sm text-txt-primary font-mono font-semibold">{shipment.display_id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-status-purple">기획사</span>
                <span className="text-sm text-txt-primary">{seriesInfo?.dealer_name || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-status-purple">시리즈</span>
                <span className="text-sm text-txt-primary">{shipment.series?.name || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-status-purple">아티스트</span>
                <span className="text-sm text-txt-primary">{seriesInfo?.artist_name || shipment.series?.artist_name || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-status-purple">출고 수량</span>
                <span className="text-sm text-txt-primary font-mono">{totalCount}개</span>
              </div>
            </div>
            <p className="text-xs text-txt-muted mt-3">출고 확인 시 Agency Console로 전달됩니다.</p>
          </div>
          <div className="px-6 py-4 border-t border-geo-border flex gap-2">
            <button
              onClick={() => setShowConfirmModal(false)}
              className="flex-1 px-4 py-2 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
            >
              취소
            </button>
            <button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="flex-1 px-4 py-2 bg-status-yellow-dim text-status-yellow rounded-lg font-medium hover:bg-status-yellow/20 disabled:opacity-50 transition-all"
            >
              {confirmMutation.isPending ? '처리 중...' : '출고 확인'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="bg-geo-card border border-geo-border rounded-xl w-full max-w-2xl flex flex-col cursor-move select-none"
        style={{ maxHeight: '90vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }}
        onMouseDown={handleMouseDown}
      >
        {/* Header - 상태 배지 없음 */}
        <div className="bg-geo-main px-6 py-4 border-b border-geo-border rounded-t-xl flex-shrink-0 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-txt-primary">{shipment.display_id}</h2>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary text-xl">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">기획사</p>
              <p className="text-sm text-txt-primary">{seriesInfo?.dealer_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">시리즈</p>
              <p className="text-sm text-txt-primary">{shipment.series?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">아티스트</p>
              <p className="text-sm text-txt-primary">{seriesInfo?.artist_name || shipment.series?.artist_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">원본 수량</p>
              <p className="text-sm text-txt-primary font-mono">{originalCount}개</p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">생성 수량</p>
              <p className="text-sm text-txt-primary font-mono">{totalCount}개</p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">출고 수량</p>
              <p className="text-sm text-txt-primary font-mono">{totalCount}개</p>
            </div>
            {shipment.shipped_at && (
              <div>
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">출고 확정일시</p>
                <p className="text-sm text-txt-primary">{formatDate(shipment.shipped_at)}</p>
              </div>
            )}
            {shipment.void_reason && (
              <div className="col-span-2">
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">무효화 사유</p>
                <p className="text-sm text-status-red">{shipment.void_reason}</p>
              </div>
            )}
          </div>

          {/* 포함 자산 목록 */}
          {shipment.shipmentAssets && shipment.shipmentAssets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-status-green mb-3">출고 자산 ({shipment.shipmentAssets.length}개)</h3>
              <div className="bg-geo-main border border-geo-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-geo-border">
                      <th className="px-4 py-2 text-center text-xs font-semibold text-txt-muted uppercase">DINA ID</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-txt-muted uppercase">파일명</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-txt-muted uppercase">SHA256</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-txt-muted uppercase">에디션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipment.shipmentAssets.map(sa => (
                      <tr key={sa.asset_id} className="border-b border-geo-border/50 last:border-0">
                        <td className="px-4 py-2 text-txt-primary font-mono">{sa.asset?.dina_id || '-'}</td>
                        <td className="px-4 py-2 text-txt-secondary text-xs">{sa.file_name}</td>
                        <td className="px-4 py-2 text-txt-muted font-mono text-xs">{sa.file_sha256.substring(0, 12)}...</td>
                        <td className="px-4 py-2 text-center">{sa.asset?.edition === 1 ? <span className="text-status-purple font-medium">{sa.asset.edition}</span> : <span className="text-status-yellow font-medium">{sa.asset?.edition ?? '-'}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SHIPPED 상태 배지 - 하단 */}
          {shipment.status === 'SHIPPED' && (
            <div className="mt-4 flex justify-center">
              <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusBadge(shipment.status)}`}>
                {getStatusLabel(shipment.status)}
              </span>
            </div>
          )}

          {/* VOID 상태 배지 - 하단 */}
          {shipment.status === 'VOID' && (
            <div className="mt-4 flex justify-center">
              <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusBadge(shipment.status)}`}>
                {getStatusLabel(shipment.status)}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-geo-border flex-shrink-0">
          {shipment.status === 'READY' && (
            <>
              {showVoidInput ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={voidReason}
                    onChange={e => setVoidReason(e.target.value)}
                    placeholder="무효화 사유를 입력하세요"
                    className="w-full px-4 py-2 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-status-purple"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowVoidInput(false)}
                      className="flex-1 px-4 py-2 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => voidMutation.mutate(voidReason)}
                      disabled={!voidReason.trim() || voidMutation.isPending}
                      className="flex-1 px-4 py-2 bg-status-red-dim text-status-red rounded-lg font-medium hover:bg-status-red/20 disabled:opacity-50 transition-all"
                    >
                      {voidMutation.isPending ? '처리 중...' : '무효화 확인'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 px-4 py-2 bg-status-yellow-dim text-status-yellow rounded-lg font-medium hover:bg-status-yellow/20 transition-all"
                  >
                    다운로드
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="flex-1 px-4 py-2 bg-status-yellow-dim text-status-yellow rounded-lg font-medium hover:bg-status-yellow/20 transition-all"
                  >
                    출고 확인
                  </button>
                </div>
              )}
            </>
          )}








        </div>
      </div>
    </div>,
    document.body
  );
}
