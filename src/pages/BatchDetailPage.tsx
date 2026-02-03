import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export default function BatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetCount, setAssetCount] = useState('100');
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const { data: batch, isLoading: batchLoading } = useQuery({ queryKey: ['batch', id], queryFn: () => api.get(`/batches/${id}`).then((res) => res.data.data) });
  const { data: assets, isLoading: assetsLoading } = useQuery({ queryKey: ['assets', id], queryFn: () => api.get(`/assets?batchId=${id}`).then((res) => res.data.data), enabled: !!id });

  const createAssetsMutation = useMutation({
    mutationFn: (data: { batchId: string; seriesId: string; count: number }) => api.post('/assets/bulk', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets', id] }); queryClient.invalidateQueries({ queryKey: ['batch', id] }); setShowAssetModal(false); setAssetCount('100'); },
  });

  const handleCreateAssets = () => { if (!batch) return; createAssetsMutation.mutate({ batchId: batch.batch_id, seriesId: batch.series_id, count: parseInt(assetCount) }); };
  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { COMPLETED: 'bg-status-green-dim text-status-green', PROCESSING: 'bg-status-blue-dim text-status-blue', CREATED: 'bg-status-yellow-dim text-status-yellow', FAILED: 'bg-status-red-dim text-status-red', DRAFT: 'bg-status-yellow-dim text-status-yellow', QR_GENERATED: 'bg-status-green-dim text-status-green', DINA_INSERTED: 'bg-status-blue-dim text-status-blue', EXPORTED: 'bg-status-purple-dim text-status-purple' };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  if (batchLoading) return <p className="text-txt-secondary">로딩 중...</p>;
  if (!batch) return <p className="text-txt-muted">배치를 찾을 수 없습니다.</p>;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/batches')} className="px-3 py-2 text-sm border border-geo-border text-txt-secondary rounded-lg hover:text-txt-primary hover:border-geo-border-hover transition-all">← 목록</button>
          <h1 className="text-xl font-semibold text-txt-primary">{batch.display_id || batch.batch_id}</h1>
          <span className={`px-3 py-1 rounded text-xs font-medium font-mono ${getStatusBadge(batch.status)}`}>{batch.status}</span>
        </div>
        <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowAssetModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 자산 생성</button>
      </div>

      <div className="bg-geo-card border border-geo-border rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-txt-primary mb-4">배치 정보</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">시리즈</p><p className="font-medium text-txt-primary">{batch.series?.name || '-'}</p></div>
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">코드</p><p className="font-medium text-txt-primary font-mono">{batch.series?.code || '-'}</p></div>
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">총 자산</p><p className="font-medium text-txt-primary font-mono">{batch.items_total || 0}</p></div>
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">완료</p><p className="font-medium text-status-green font-mono">{batch.items_completed || 0}</p></div>
          <div><p className="text-xs text-txt-muted uppercase tracking-wider mb-1">생성일</p><p className="font-medium text-txt-primary">{new Date(batch.created_at).toLocaleDateString()}</p></div>
        </div>
      </div>

      <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-geo-border"><h2 className="text-sm font-semibold text-txt-primary">자산 목록 ({assets?.length || 0})</h2></div>
        {assetsLoading ? <p className="p-6 text-txt-secondary">로딩 중...</p> : assets?.length === 0 ? (
          <p className="p-6 text-txt-muted text-center text-sm">자산이 없습니다. [+ 자산 생성] 버튼을 눌러 자산을 생성하세요.</p>
        ) : (
          <table className="w-full table-fixed">
            <thead><tr className="border-b border-geo-border">
              <th className="w-16 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">No</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">DINA ID</th>
              <th className="w-24 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
              <th className="w-24 px-3 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">생성일</th>
            </tr></thead>
            <tbody>
              {assets?.map((asset: any, index: number) => (
                <tr key={asset.asset_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                  <td className="px-3 py-3 text-center text-txt-muted font-mono">{index + 1}</td>
                  <td className="px-3 py-3 text-center font-mono text-status-blue text-sm truncate">{asset.dina_id}</td>
                  <td className="px-3 py-3 text-center"><span className={`inline-block w-20 px-1 py-1 rounded text-xs font-medium text-center ${getStatusBadge(asset.status)}`}>{asset.status}</span></td>
                  <td className="px-3 py-3 text-center text-txt-muted text-xs">{new Date(asset.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAssetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 pb-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">자산 대량 생성</h2>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">시리즈</label>
                  <p className="px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary">{batch.series?.name || '-'}</p>
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">생성할 자산 수</label>
                  <input type="number" value={assetCount} onChange={(e) => setAssetCount(e.target.value)} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none" min="1" max="10000" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button onClick={() => setShowAssetModal(false)} disabled={createAssetsMutation.isPending} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">취소</button>
                <button onClick={handleCreateAssets} disabled={createAssetsMutation.isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">{createAssetsMutation.isPending ? '생성 중...' : '생성'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
