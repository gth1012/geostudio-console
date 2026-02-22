import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface ActivationRequest {
  request_id: string;
  project_name: string;
  quantity: number;
  status: string;
  requested_at: string;
  completed_at?: string;
}

export default function ActivationPage() {
  const { data: requests, isLoading } = useQuery({
    queryKey: ['activation-requests'],
    queryFn: () => api.get('/agency/activation-requests').then(res => res.data as ActivationRequest[]),
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      REQUESTED: 'bg-status-yellow-dim text-status-yellow',
      PROCESSING: 'bg-status-blue-dim text-status-blue',
      COMPLETED: 'bg-status-green-dim text-status-green',
    };
    return map[status] || 'bg-status-gray-dim text-status-gray';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      REQUESTED: '요청됨',
      PROCESSING: '처리중',
      COMPLETED: '완료',
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
          <h2 className="text-xl font-semibold text-txt-primary">정품 등록 관리</h2>
          <p className="text-sm text-txt-muted mt-1">정품 등록 기록 및 관리</p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Run ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">프로젝트명</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">수량</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">실행일시</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">완료일시</th>
              </tr>
            </thead>
            <tbody>
              {requests?.map((r) => (
                <tr
                  key={r.request_id}
                  className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors hover:bg-geo-main/50"
                >
                  <td className="px-6 py-4 text-txt-primary font-mono text-sm">{r.request_id}</td>
                  <td className="px-6 py-4 text-txt-primary text-sm">{r.project_name}</td>
                  <td className="px-6 py-4 text-txt-primary text-sm">{r.quantity?.toLocaleString()}개</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(r.status)}`}>
                      {getStatusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(r.requested_at)}</td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(r.completed_at || '')}</td>
                </tr>
              ))}
              {!requests?.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-txt-muted">
                    정품 등록 기록이 없습니다.
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
