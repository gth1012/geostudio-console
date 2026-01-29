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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">반출 요청 관리</h1>
      </div>

      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시리즈</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">타입</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">수량</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">요청자</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">요청일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {exports?.map((e: any) => (
                <tr key={e.export_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{e.series_name || '-'}</td>
                  <td className="px-6 py-4">{e.export_type}</td>
                  <td className="px-6 py-4">{e.total_count}개</td>
                  <td className="px-6 py-4">{e.requested_by_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(e.status)}`}>{e.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(e.requested_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {e.status === 'REQUESTED' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveMutation.mutate(e.export_id)}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => rejectMutation.mutate(e.export_id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          거부
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!exports?.length && <p className="text-center py-8 text-gray-500">반출 요청이 없습니다</p>}
        </div>
      )}
    </div>
  );
}
