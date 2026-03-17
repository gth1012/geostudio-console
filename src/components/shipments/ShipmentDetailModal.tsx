import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToastStore } from '../../stores/toast.store';

interface ShipmentAsset {
  asset_id: string;
  file_name: string;
  file_sha256: string | null;
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
  zip_sha256: string | null;
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

  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => api.get(`/shipments/${shipmentId}`).then(res => res.data as Shipment),
    refetchInterval: (query) => query.state.data?.status === 'DRAFT' ? 3000 : false,
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
    },
    onError: (err: any) => {
      toast.show(err.response?.data?.message || '출고 확인 실패', 'error');
    },
  });

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

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-status-gray-dim text-status-gray',
      READY: 'bg-status-yellow-dim text-status-yellow',
      SHIPPED: 'bg-status-green-dim text-status-green',
      VOID: 'bg-status-red-dim text-status-red',
    };
    return map[status] || 'bg-status-gray-dim text-status-gray';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'ZIP 생성 중',
      READY: '출고대기',
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
          <p className="text-txt-secondary">불러오는 중...</p>
        </div>
      </div>,
      document.body
    );
  }

  if (!shipment) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="bg-geo-card border border-geo-border rounded-xl w-full max-w-lg flex flex-col cursor-move select-none"
        style={{ transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="bg-geo-main px-6 py-4 border-b border-geo-border rounded-t-xl flex-shrink-0 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-txt-primary font-mono">{shipment.display_id}</h2>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary text-xl">×</button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-3">

          {/* 그룹 1: 기획사/시리즈/아티스트 */}
          <div className="bg-geo-main border border-geo-border rounded-lg px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base text-status-purple">기획사</span>
              <span className="text-base font-semibold text-txt-primary">{seriesInfo?.dealer_name || '-'}</span>
            </div>
            <div className="border-t border-geo-border/50" />
            <div className="flex items-center justify-between">
              <span className="text-base text-status-purple">시리즈</span>
              <span className="text-base font-semibold text-txt-primary">{shipment.series?.name || '-'}</span>
            </div>
            <div className="border-t border-geo-border/50" />
            <div className="flex items-center justify-between">
              <span className="text-base text-status-purple">아티스트</span>
              <span className="text-base font-semibold text-txt-primary">{seriesInfo?.artist_name || shipment.series?.artist_name || '-'}</span>
            </div>
          </div>

          {/* 그룹 2: 수량 3개 */}
          <div className="bg-geo-main border border-geo-border rounded-lg px-4 py-3 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-base text-status-purple mb-1">원본 수량</p>
              <p className="text-base font-semibold text-status-green">{originalCount}개</p>
            </div>
            <div className="text-center border-x border-geo-border">
              <p className="text-base text-status-purple mb-1">생성 수량</p>
              <p className="text-base font-semibold text-status-green">{totalCount}개</p>
            </div>
            <div className="text-center">
              <p className="text-base text-status-purple mb-1">출고 수량</p>
              <p className="text-base font-semibold text-status-green">{totalCount}개</p>
            </div>
          </div>

          {/* 상태 표시 - SHIPPED/VOID/DRAFT */}
          {(shipment.status === 'SHIPPED' || shipment.status === 'VOID' || shipment.status === 'DRAFT') && (
            <div className="flex justify-center">
              <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusBadge(shipment.status)}`}>
                {getStatusLabel(shipment.status)}
              </span>
            </div>
          )}

          {shipment.void_reason && (
            <div className="bg-geo-main border border-geo-border rounded-lg px-4 py-3">
              <p className="text-base text-status-purple mb-1">무효화 사유</p>
              <p className="text-sm text-status-red">{shipment.void_reason}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-geo-border flex-shrink-0">
          {shipment.status === 'READY' && (
            <button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="w-full px-4 py-2 bg-status-yellow-dim text-status-yellow rounded-lg font-medium hover:bg-status-yellow/20 disabled:opacity-50 transition-all"
            >
              {confirmMutation.isPending ? '처리 중...' : '출고 확인'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
