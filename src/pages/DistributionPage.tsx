import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface QRDistribution {
  distribution_id: string;
  display_id: string;
  series_id: string;
  asset_count: number;
  status: string;
  created_at: string;
  distributed_at?: string;
  registration_rate?: number;
  series?: {
    name: string;
    code: string;
  };
}

export default function DistributionPage() {
  const { data: distributions, isLoading } = useQuery({
    queryKey: ['distributions'],
    queryFn: () => api.get('/distributions').then(res => res.data as QRDistribution[]),
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      CREATED: 'bg-status-gray-dim text-status-gray',
      SENT: 'bg-status-blue-dim text-status-blue',
      PARTIAL: 'bg-status-yellow-dim text-status-yellow',
      EXPIRED: 'bg-status-red-dim text-status-red',
      PENDING: 'bg-status-yellow-dim text-status-yellow',
      DISTRIBUTED: 'bg-status-green-dim text-status-green',
    };
    return map[status] || 'bg-status-gray-dim text-status-gray';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      CREATED: '생성됨',
      SENT: '발송완료',
      PARTIAL: '일부등록',
      EXPIRED: '만료',
      PENDING: '대기',
      DISTRIBUTED: '배포완료',
    };
    return map[status] || status;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-txt-primary">QR 발송 관리</h2>
          <p className="text-sm text-txt-muted mt-1">QR 발송 기록 및 관리</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">배포 ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">프로젝트명</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">수량</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">등록률</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">생성일시</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">발송일시</th>
              </tr>
            </thead>
            <tbody>
              {distributions?.map((d) => (
                <tr
                  key={d.distribution_id}
                  className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors hover:bg-geo-main/50"
                >
                  <td className="px-6 py-4 text-txt-primary font-mono text-sm">{d.display_id}</td>
                  <td className="px-6 py-4 text-txt-primary text-sm">{d.series?.name || '-'}</td>
                  <td className="px-6 py-4 text-txt-primary font-mono text-sm">{d.asset_count?.toLocaleString()}개</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(d.status)}`}>
                      {getStatusLabel(d.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-txt-primary font-mono text-sm">{d.registration_rate ?? 0}%</td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(d.created_at)}</td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(d.distributed_at || '')}</td>
                </tr>
              ))}
              {!distributions?.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-txt-muted">
                    QR 발송 기록이 없습니다.
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
