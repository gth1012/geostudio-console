import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

export default function AssetsPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ batchId: '', seriesId: '', count: '' });
  const [filters, setFilters] = useState({ batchId: '', status: '' });
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetImage, setAssetImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageType, setImageType] = useState<'source' | 'rendered' | 'none'>('none');
  const dragOffset = useRef({ x: 0, y: 0 });
  const queryClient = useQueryClient();
  const toast = useToastStore();

  // 선택된 에셋 이미지 로드 (rendered 우선, 실패 시 source, 둘 다 실패 시 placeholder)
  useEffect(() => {
    if (!selectedAsset?.asset_id) {
      setAssetImage(null);
      setImageType('none');
      return;
    }

    const fetchAssetImage = async () => {
      setImageLoading(true);
      setAssetImage(null);
      setImageType('none');

      // 1. rendered 이미지 시도
      try {
        const res = await api.get(`/assets/${selectedAsset.asset_id}/image-proxy?type=rendered`, {
          responseType: 'arraybuffer',
        });
        const blob = new Blob([res.data], { type: res.headers['content-type'] || 'image/png' });
        const url = URL.createObjectURL(blob);
        setAssetImage(url);
        setImageType('rendered');
        setImageLoading(false);
        return;
      } catch {
        // rendered 실패, source 시도
      }

      // 2. source 이미지 시도
      try {
        const res = await api.get(`/assets/${selectedAsset.asset_id}/image-proxy?type=source`, {
          responseType: 'arraybuffer',
        });
        const blob = new Blob([res.data], { type: res.headers['content-type'] || 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        setAssetImage(url);
        setImageType('source');
        setImageLoading(false);
        return;
      } catch {
        // 둘 다 실패
      }

      // 3. 둘 다 실패 시 placeholder
      setAssetImage(null);
      setImageType('none');
      setImageLoading(false);
    };

    fetchAssetImage();

    // cleanup blob URL
    return () => {
      if (assetImage?.startsWith('blob:')) {
        URL.revokeObjectURL(assetImage);
      }
    };
  }, [selectedAsset?.asset_id]);

  const ITEMS_PER_PAGE = 50;

  // 서버 기반 페이지네이션
  const { data: assetsResponse, isLoading } = useQuery({
    queryKey: ['assets', filters, currentPage],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.batchId) params.append('batchId', filters.batchId);
      if (filters.status) params.append('status', filters.status);
      params.append('page', String(currentPage));
      params.append('limit', String(ITEMS_PER_PAGE));
      return api.get(`/assets?${params}`).then((res) => res.data);
    },
  });

  const { data: batches } = useQuery({ queryKey: ['batches'], queryFn: () => api.get('/batches').then((res) => res.data.data) });

  const assets = assetsResponse?.data || [];
  const totalPages = assetsResponse?.total_pages || 1;
  const totalCount = assetsResponse?.total || 0;

  // 페이지 진입 시 첫번째 에셋 자동 선택
  useEffect(() => {
    if (assets.length > 0 && !selectedAsset) {
      setSelectedAsset(assets[0]);
    }
  }, [assets]);

  // 페이지 그룹 계산 (10개씩)
  const pageGroup = Math.floor((currentPage - 1) / 10);
  const startPage = pageGroup * 10 + 1;
  const endPage = Math.min(startPage + 9, totalPages);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/assets/bulk', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['assets'] }); setShowModal(false); setForm({ batchId: '', seriesId: '', count: '' }); toast.show('자산이 생성되었습니다', 'success'); },
    onError: (err: any) => { toast.show(err.response?.data?.message || '자산 생성 실패', 'error'); },
  });

  const handleBatchSelect = (batchId: string) => { const batch = batches?.find((b: any) => b.batch_id === batchId); setForm({ ...form, batchId, seriesId: batch?.series_id || '' }); };
  const handleMouseDown = (e: React.MouseEvent) => { const tag = (e.target as HTMLElement).tagName; if (['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(tag)) return; setIsDragging(true); dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y }; };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }); };
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); createMutation.mutate({ ...form, count: parseInt(form.count) }); };

  // 필터 변경 시 페이지 초기화
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = { QR_GENERATED: 'bg-status-green-dim text-status-green', DINA_INSERTED: 'bg-status-blue-dim text-status-blue', EXPORTED: 'bg-status-purple-dim text-status-purple', CREATED: 'bg-status-yellow-dim text-status-yellow', ISSUED: 'bg-status-green-dim text-status-green' };
    return map[status] || 'bg-status-yellow-dim text-status-yellow';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = { CREATED: '생성됨', DINA_INSERTED: 'DINA삽입', QR_GENERATED: 'QR생성', EXPORTED: '출고됨', ISSUED: '발급완료' };
    return map[status] || status;
  };

  return (
    <div className="animate-fade-in flex">
      {/* 메인 컨텐츠 */}
      <div className={`flex-1 transition-all duration-300 ${selectedAsset ? 'mr-96' : ''}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 items-center">
            <select value={filters.batchId} onChange={(e) => handleFilterChange({ ...filters, batchId: e.target.value })} className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-secondary text-sm focus:ring-2 focus:ring-status-purple/40 outline-none">
              <option value="">전체 자산</option>
              {batches?.map((b: any) => <option key={b.batch_id} value={b.batch_id}>{b.name || `Batch ${b.batch_number}`}</option>)}
            </select>
            <select value={filters.status} onChange={(e) => handleFilterChange({ ...filters, status: e.target.value })} className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-secondary text-sm focus:ring-2 focus:ring-status-purple/40 outline-none">
              <option value="">전체 상태</option>
              <option value="CREATED">생성됨</option>
              <option value="DINA_INSERTED">DINA삽입</option>
              <option value="QR_GENERATED">QR생성</option>
              <option value="EXPORTED">출고됨</option>
              <option value="ISSUED">발급완료</option>
            </select>
            <span className="text-sm text-txt-muted">총 {totalCount.toLocaleString()}개</span>
          </div>
{/* [HIDDEN] 추후 사용 예정 */ false && <button onClick={() => { setModalPos({ x: 0, y: 0 }); setShowModal(true); }} className="px-4 py-2 bg-status-purple text-white rounded-lg hover:bg-status-purple/80 text-sm font-medium transition-all">+ 생성</button>}
        </div>

        {isLoading ? <p className="text-txt-secondary">로딩 중...</p> : (
          <>
            <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-geo-border">
                  <th className="px-6 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">DINA</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">OTP</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                </tr></thead>
                <tbody>
                  {assets.map((a: any) => (
                    <tr key={a.asset_id} className={`border-b border-geo-border/50 last:border-0 transition-colors cursor-pointer ${selectedAsset?.asset_id === a.asset_id ? 'bg-status-purple/10' : 'dark-table-row'}`} onClick={() => setSelectedAsset(a)}>
                      <td className="px-6 py-4 text-center font-mono text-sm text-txt-primary">{a.edition ? String(a.edition).padStart(5, '0') : '-'}</td>
                      <td className="px-6 py-4 text-center font-mono text-sm text-status-blue hover:underline">{a.dina_id}</td>
                      <td className="px-6 py-4 text-center font-mono text-sm text-txt-secondary">{a.otp_code || '-'}</td>
                      <td className="px-6 py-4 text-center"><span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(a.status)}`}>{getStatusLabel(a.status)}</span></td>
                    </tr>
                  ))}
                  {!assets.length && <tr><td colSpan={4} className="px-6 py-8 text-center text-txt-muted">자산이 없습니다</td></tr>}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-1 mt-6">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                  className="px-2 py-1 text-sm text-txt-secondary hover:text-txt-primary disabled:opacity-30 disabled:cursor-not-allowed">&lt;&lt;</button>
                <button onClick={() => setCurrentPage(Math.max(1, startPage - 10))} disabled={startPage === 1}
                  className="px-2 py-1 text-sm text-txt-secondary hover:text-txt-primary disabled:opacity-30 disabled:cursor-not-allowed">&lt;</button>
                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-sm rounded ${page === currentPage ? 'bg-status-purple text-white' : 'text-txt-secondary hover:text-txt-primary hover:bg-geo-card-hover'}`}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage(Math.min(totalPages, startPage + 10))} disabled={endPage >= totalPages}
                  className="px-2 py-1 text-sm text-txt-secondary hover:text-txt-primary disabled:opacity-30 disabled:cursor-not-allowed">&gt;</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                  className="px-2 py-1 text-sm text-txt-secondary hover:text-txt-primary disabled:opacity-30 disabled:cursor-not-allowed">&gt;&gt;</button>
                <span className="ml-4 text-sm text-txt-muted">{currentPage} / {totalPages} 페이지</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* QR 사이드 패널 */}
      {selectedAsset && (
        <div className="fixed right-0 top-0 h-screen w-96 bg-geo-card border-l border-geo-border shadow-2xl z-40 flex flex-col animate-fade-in">
          <div className="px-6 py-4 border-b border-geo-border flex items-center justify-between">
            <h3 className="text-base font-semibold text-txt-primary">자산 정보</h3>
            <button onClick={() => setSelectedAsset(null)} className="w-8 h-8 flex items-center justify-center rounded-lg text-txt-muted hover:text-txt-primary hover:bg-geo-card-hover transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {/* 자산 이미지 (QR 위에 배치) */}
            {imageLoading && (
              <div className="flex justify-center items-center py-8 mb-4">
                <svg className="animate-spin h-6 w-6 text-status-purple" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            {!imageLoading && assetImage && (
              <div className="mb-4">
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-2">
                  {imageType === 'source' ? '원본 이미지' : '인쇄 결과물'}
                </p>
                <div className={`bg-geo-main border rounded-xl overflow-hidden ${imageType === 'rendered' ? 'border-status-green' : 'border-geo-border'}`}>
                  <img src={assetImage} alt="Asset image" className="w-full h-auto object-contain" />
                </div>
              </div>
            )}
            {!imageLoading && !assetImage && (
              <div className="mb-4">
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-2">이미지</p>
                <div className="bg-geo-main border border-geo-border rounded-xl overflow-hidden flex items-center justify-center py-8">
                  <span className="text-txt-muted text-sm">이미지 없음</span>
                </div>
              </div>
            )}

            {/* QR 코드 */}
            <div className="bg-white p-3 rounded-xl flex justify-center mb-4 w-40 h-40 mx-auto">
              <QRCodeSVG id="qr-code-svg" value={selectedAsset.dina_id} size={136} level="H" />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">DINA ID</p>
                <p className="font-mono text-status-blue font-medium">{selectedAsset.dina_id}</p>
              </div>
              <div>
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">OTP 코드</p>
                <p className="font-mono text-txt-primary font-medium">{selectedAsset.otp_code || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">에디션</p>
                <p className="font-mono text-txt-primary">{selectedAsset.edition ? `#${String(selectedAsset.edition).padStart(5, '0')}` : '-'}</p>
              </div>
              <div>
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">상태</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(selectedAsset.status)}`}>{getStatusLabel(selectedAsset.status)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

{/* [HIDDEN] 추후 사용 예정 */ false && showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-20 px-4 pb-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm flex flex-col cursor-move select-none" style={{ maxHeight: '85vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }} onMouseDown={handleMouseDown}>
            <div className="bg-geo-main px-6 py-3 border-b border-geo-border rounded-t-xl flex-shrink-0">
              <h2 className="text-lg font-semibold text-txt-primary">자산 대량 생성</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">자산 선택 *</label>
                  <select value={form.batchId} onChange={(e) => handleBatchSelect(e.target.value)} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none" required>
                    <option value="">자산을 선택하세요</option>
                    {batches?.map((b: any) => <option key={b.batch_id} value={b.batch_id}>{b.name || `Batch ${b.batch_number}`} ({b.series_name})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-txt-secondary mb-1.5">생성할 자산 수 *</label>
                  <input type="number" placeholder="생성할 자산 수" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none" required min="1" max="1000" />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">취소</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all">생성</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
