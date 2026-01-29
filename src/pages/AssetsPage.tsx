import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function AssetsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ batchId: '', seriesId: '', count: '' });
  const [filters, setFilters] = useState({ batchId: '', status: '' });
  const queryClient = useQueryClient();

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.batchId) params.append('batchId', filters.batchId);
      if (filters.status) params.append('status', filters.status);
      return api.get(`/assets?${params}`).then((res) => res.data.data);
    },
  });

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then((res) => res.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/assets/bulk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowModal(false);
      setForm({ batchId: '', seriesId: '', count: '' });
    },
  });

  const handleBatchSelect = (batchId: string) => {
    const batch = batches?.find((b: any) => b.batch_id === batchId);
    setForm({ ...form, batchId, seriesId: batch?.series_id || '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...form, count: parseInt(form.count) });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'QR_GENERATED': return 'bg-green-100 text-green-800';
      case 'DINA_INSERTED': return 'bg-blue-100 text-blue-800';
      case 'EXPORTED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">자산 관리</h1>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 대량 생성
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <select
          value={filters.batchId}
          onChange={(e) => setFilters({ ...filters, batchId: e.target.value })}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">전체 배치</option>
          {batches?.map((b: any) => (
            <option key={b.batch_id} value={b.batch_id}>{b.name || `Batch ${b.batch_number}`}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">전체 상태</option>
          <option value="CREATED">CREATED</option>
          <option value="DINA_INSERTED">DINA_INSERTED</option>
          <option value="QR_GENERATED">QR_GENERATED</option>
          <option value="EXPORTED">EXPORTED</option>
        </select>
      </div>

      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">번호</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DINA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">OTP</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시리즈</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {assets?.map((a: any) => (
                <tr key={a.asset_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">#{a.asset_number}</td>
                  <td className="px-6 py-4 font-mono text-sm">{a.dina_code}</td>
                  <td className="px-6 py-4 font-mono text-sm">{a.otp_code}</td>
                  <td className="px-6 py-4">{a.series_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(a.status)}`}>{a.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!assets?.length && <p className="text-center py-8 text-gray-500">자산이 없습니다</p>}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">자산 대량 생성</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <select
                  value={form.batchId}
                  onChange={(e) => handleBatchSelect(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="">배치 선택</option>
                  {batches?.map((b: any) => (
                    <option key={b.batch_id} value={b.batch_id}>{b.name || `Batch ${b.batch_number}`} ({b.series_name})</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="생성할 자산 수"
                  value={form.count}
                  onChange={(e) => setForm({ ...form, count: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                  min="1"
                  max="1000"
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg">취소</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">생성</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
