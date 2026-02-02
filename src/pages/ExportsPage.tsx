import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function ExportsPage() {
  const queryClient = useQueryClient();

  const { data: exports, isLoading } = useQuery({
    queryKey: ['exports'],
    queryFn: () => api.get('/exports').then((res) => res.data.data),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/exports/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exports'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.put(`/exports/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exports'] }),
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      APPROVED: 'bg-status-green-dim text-status-green',
      COMPLETED: 'bg-status-blue-dim text-status-blue',
      REJECTED: 'bg-status-red-dim text-status-red',
      REQUESTED: 'bg-status-yellow-dim text-status-yellow',
    };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  return (
    <div className="animate-fade-in">
      {isLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">시리즈</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">타입</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">수량</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">요청자</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">요청일</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody>
              {exports?.map((e: any) => (
                <tr key={e.export_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                  <td className="px-6 py-4 text-txt-primary">{e.series_name || '-'}</td>
                  <td className="px-6 py-4 text-txt-secondary font-mono text-sm">{e.export_type}</td>
                  <td className="px-6 py-4 text-txt-primary font-mono">{e.total_count}개</td>
                  <td className="px-6 py-4 text-txt-secondary">{e.requested_by_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium font-mono ${getStatusBadge(e.status)}`}>{e.status}</span>
                  </td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{new Date(e.requested_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {e.status === 'REQUESTED' && (
                      <div className="flex gap-2">
                        <button onClick={() => approveMutation.mutate(e.export_id)} className="px-3 py-1 bg-status-green-dim text-status-green rounded text-xs font-medium hover:bg-status-green/20 transition-all">승인</button>
                        <button onClick={() => rejectMutation.mutate(e.export_id)} className="px-3 py-1 bg-status-red-dim text-status-red rounded text-xs font-medium hover:bg-status-red/20 transition-all">거부</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!exports?.length && (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-txt-muted">반출 요청이 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
