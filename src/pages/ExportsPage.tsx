import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Shipment {
  batch_id: string;
  display_id: string;
  series_name: string;
  items_total: number;
  shipped_at: string;
  lot_id: string;
  shipment_id: string;
  status: string;
}

export default function ExportsPage() {
  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => api.get('/batches/shipped').then((res) => res.data.data as Shipment[]),
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      SHIPPED: 'bg-status-green-dim text-status-green',
      LOCKED: 'bg-status-purple-dim text-status-purple',
      DRAFT: 'bg-status-yellow-dim text-status-yellow',
    };
    return map[status] || 'bg-status-gray-dim text-status-gray';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { DRAFT: '임시저장', IN_PROGRESS: '진행중', COMPLETED: '완료', SHIPPED: '출고완료', FAILED: '실패', LOCKED: '확정' };
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

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-txt-primary">출고 기록</h2>
        <p className="text-sm text-txt-muted mt-1">출고 완료된 배치 목록</p>
      </div>

      {isLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">배치 ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">시리즈명</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">수량</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">출고일</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">LOT ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Shipment ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody>
              {shipments?.map((s) => (
                <tr key={s.batch_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                  <td className="px-6 py-4 text-txt-primary font-mono text-sm">{s.display_id}</td>
                  <td className="px-6 py-4 text-txt-primary">{s.series_name}</td>
                  <td className="px-6 py-4 text-txt-primary font-mono">{s.items_total?.toLocaleString()}개</td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(s.shipped_at)}</td>
                  <td className="px-6 py-4 text-txt-secondary font-mono text-sm">{s.lot_id}</td>
                  <td className="px-6 py-4 text-txt-secondary font-mono text-sm">{s.shipment_id}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(s.status)}`}>
                      {getStatusLabel(s.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {!shipments?.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-txt-muted">
                    출고된 배치가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
