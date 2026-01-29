import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function BatchesPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ seriesId: '', name: '', totalAssets: '' });
  const queryClient = useQueryClient();

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then((res) => res.data.data),
  });

  const { data: series } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.get('/series').then((res) => res.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/batches', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      setShowModal(false);
      setForm({ seriesId: '', name: '', totalAssets: '' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      totalAssets: form.totalAssets ? parseInt(form.totalAssets) : 0,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">배치 관리</h1>
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + 새 배치
        </button>
      </div>

      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">배치명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시리즈</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">번호</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">자산수</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">생성일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {batches?.map((b: any) => (
                <tr key={b.batch_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{b.name || `Batch ${b.batch_number}`}</td>
                  <td className="px-6 py-4">{b.series_name}</td>
                  <td className="px-6 py-4">#{b.batch_number}</td>
                  <td className="px-6 py-4">{b.completed_assets}/{b.total_assets}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(b.status)}`}>{b.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(b.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">새 배치 생성</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <select
                  value={form.seriesId}
                  onChange={(e) => setForm({ ...form, seriesId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                >
                  <option value="">시리즈 선택</option>
                  {series?.map((s: any) => (
                    <option key={s.series_id} value={s.series_id}>{s.name}</option>
                  ))}
                </select>
                <input
                  placeholder="배치명 (선택)"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <input
                  type="number"
                  placeholder="예상 자산 수"
                  value={form.totalAssets}
                  onChange={(e) => setForm({ ...form, totalAssets: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
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
