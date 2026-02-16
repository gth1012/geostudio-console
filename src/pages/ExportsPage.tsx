import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';
import CreateShipmentModal from '../components/shipments/CreateShipmentModal';
import ShipmentDetailModal from '../components/shipments/ShipmentDetailModal';

interface Shipment {
  shipment_id: string;
  display_id: string;
  series_id: string;
  asset_count: number;
  status: string;
  zip_sha256: string;
  created_at: string;
  shipped_at?: string;
  series?: {
    name: string;
    code: string;
  };
}

export default function ExportsPage() {
  const toast = useToastStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => api.get('/shipments').then(res => res.data as Shipment[]),
  });

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
      READY: '대기',
      SHIPPED: '출고완료',
      VOID: '무효',
    };
    return map[status] || status;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCopySha = (sha: string) => {
    navigator.clipboard.writeText(sha);
    toast.show('SHA256 복사됨', 'success');
  };

  const handleDownload = async (shipmentId: string) => {
    try {
      const res = await api.get(`/shipments/${shipmentId}/download`);
      window.open(res.data.downloadUrl, '_blank');
    } catch (err: any) {
      toast.show(err.response?.data?.message || '다운로드 URL 생성 실패', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-txt-primary">자산 출고</h2>
          <p className="text-sm text-txt-muted mt-1">출고 기록 및 관리</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all"
        >
          + 출고 생성
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">출고 ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">시리즈명</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">수량</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">출고일시</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">SHA256</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody>
              {shipments?.map((s) => (
                <tr
                  key={s.shipment_id}
                  className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors hover:bg-geo-main/50 cursor-pointer"
                  onClick={() => setSelectedShipmentId(s.shipment_id)}
                >
                  <td className="px-6 py-4 text-txt-primary font-mono text-sm">{s.display_id}</td>
                  <td className="px-6 py-4 text-txt-primary">{s.series?.name || '-'}</td>
                  <td className="px-6 py-4 text-txt-primary font-mono">{s.asset_count}개</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(s.status)}`}>
                      {getStatusLabel(s.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(s.created_at)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-txt-secondary font-mono">{s.zip_sha256.substring(0, 12)}...</code>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopySha(s.zip_sha256); }}
                        className="px-1.5 py-0.5 text-xs text-status-purple border border-status-purple/30 rounded hover:bg-status-purple/10 transition-all"
                      >
                        복사
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedShipmentId(s.shipment_id); }}
                        className="px-2 py-1 text-xs text-txt-secondary border border-geo-border rounded hover:border-geo-border-hover transition-all"
                      >
                        상세
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownload(s.shipment_id); }}
                        className="px-2 py-1 text-xs text-status-purple border border-status-purple/30 rounded hover:bg-status-purple/10 transition-all"
                      >
                        📥
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!shipments?.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-txt-muted">
                    출고 기록이 없습니다. 출고를 생성하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateShipmentModal onClose={() => setShowCreateModal(false)} />
      )}
      {selectedShipmentId && (
        <ShipmentDetailModal
          shipmentId={selectedShipmentId}
          onClose={() => setSelectedShipmentId(null)}
        />
      )}
    </div>
  );
}
