import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function SeriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', artistName: '' });
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const queryClient = useQueryClient();

  const { data: series, isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.get('/series').then((res) => res.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/series', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      setShowModal(false);
      setForm({ name: '', code: '', description: '', artistName: '' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (seriesId: string) => api.put(`/series/${seriesId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (seriesId: string) => api.delete(`/series/${seriesId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createMutation.isPending) return;
    createMutation.mutate(form);
  };

  const handleDeactivate = (seriesId: string, seriesName: string) => {
    if (confirm(`"${seriesName}" 시리즈를 Deactivate 하시겠습니까?`)) {
      archiveMutation.mutate(seriesId);
    }
  };

  const handleActivate = (seriesId: string, seriesName: string) => {
    if (confirm(`"${seriesName}" 시리즈를 Activate 하시겠습니까?`)) {
      activateMutation.mutate(seriesId);
    }
  };

  const handleDelete = (seriesId: string, seriesName: string) => {
    if (confirm(`정말 "${seriesName}" 시리즈를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      deleteMutation.mutate(seriesId);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const openModal = () => {
    setModalPos({ x: 0, y: 0 });
    setShowModal(true);
  };

  const isActionPending = archiveMutation.isPending || activateMutation.isPending || deleteMutation.isPending;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">시리즈</h1>
        <button
          onClick={openModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 새 시리즈
        </button>
      </div>

      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시리즈 이름</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시리즈 코드</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">아티스트</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">설명</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">생성일</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {series?.map((s: any) => (
                <tr key={s.series_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-blue-600">{s.display_id || '-'}</td>
                  <td className="px-6 py-4 font-medium">{s.name}</td>
                  <td className="px-6 py-4 text-gray-500">{s.code || '-'}</td>
                  <td className="px-6 py-4">{s.artist_name || '-'}</td>
                  <td className="px-6 py-4 text-gray-500">{s.description || '-'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        s.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {s.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {s.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleDeactivate(s.series_id, s.name)}
                          disabled={isActionPending}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                        >
                          비활성
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleActivate(s.series_id, s.name)}
                            disabled={isActionPending}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            활성
                          </button>
                          <button
                            onClick={() => handleDelete(s.series_id, s.name)}
                            disabled={isActionPending}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                            title="연결된 데이터가 없을 때만 삭제 가능"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="bg-white rounded-lg p-6 w-full max-w-md"
            style={{ transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }}
          >
            <div
              className="cursor-move bg-gray-100 -mx-6 -mt-6 px-6 py-3 rounded-t-lg mb-4"
              onMouseDown={handleMouseDown}
            >
              <h2 className="text-xl font-bold">새 시리즈 생성</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <input
                  placeholder="시리즈 이름"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                <input
                  placeholder="시리즈 코드"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  required
                />
                <input
                  placeholder="아티스트"
                  value={form.artistName}
                  onChange={(e) => setForm({ ...form, artistName: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <textarea
                  placeholder="설명"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg"
                  disabled={createMutation.isPending}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? '생성 중...' : '생성'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
