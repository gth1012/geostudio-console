import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToastStore } from '../../stores/toast.store';

interface Series {
  series_id: string;
  name: string;
  code: string;
  display_id?: string;
  total_count?: number;
}

interface Asset {
  asset_id: string;
  dina_id: string;
  edition: number;
  status: string;
  render_ref?: string;
  production_key?: string;
  image?: string;
  image_url?: string;
  batch?: {
    image?: string;
    image_url?: string;
  };
}

interface CreateShipmentModalProps {
  onClose: () => void;
}

export default function CreateShipmentModal({ onClose }: CreateShipmentModalProps) {
  const queryClient = useQueryClient();
  const toast = useToastStore();

  const [step, setStep] = useState<'series' | 'assets'>('series');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());

  // 모달 드래그
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 시리즈 목록
  const { data: seriesList } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.get('/series').then(res => res.data.data as Series[]),
  });

  // 선택한 시리즈의 PRINTED 자산 목록 (출고 생성 시 자동 LOCK)
  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets-printed', selectedSeriesId],
    queryFn: () => api.get(`/assets?seriesId=${selectedSeriesId}&printStatus=PRINTED`).then(res => res.data.data as Asset[]),
    enabled: !!selectedSeriesId && step === 'assets',
  });

  // 출고 생성
  const createMutation = useMutation({
    mutationFn: (data: { seriesId: string; assetIds: string[] }) =>
      api.post('/shipments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.show('출고가 생성되었습니다', 'success');
      onClose();
    },
    onError: (err: any) => {
      const code = err.response?.data?.code;
      if (code === 'ASSET_ALREADY_SHIPPED_OR_IN_SHIPMENT') {
        toast.show('이미 출고된 자산이 포함되어 있습니다', 'error');
      } else {
        toast.show(err.response?.data?.message || '출고 생성 실패', 'error');
      }
    },
  });

  // 시리즈 선택 시 다음 단계로
  const handleSeriesSelect = (seriesId: string) => {
    setSelectedSeriesId(seriesId);
    setSelectedAssets(new Set());
    setStep('assets');
  };

  // 자산 선택 토글
  const handleToggleAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  // 전체 선택/해제
  const handleToggleAll = () => {
    if (!assets) return;
    if (selectedAssets.size === assets.length) {
      setSelectedAssets(new Set());
    } else {
      setSelectedAssets(new Set(assets.map(a => a.asset_id)));
    }
  };

  // 출고 생성
  const handleCreate = () => {
    if (selectedAssets.size === 0) return;
    createMutation.mutate({
      seriesId: selectedSeriesId,
      assetIds: Array.from(selectedAssets),
    });
  };

  // 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };
  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  // 자산 로드 시 전체 선택
  useEffect(() => {
    if (assets && assets.length > 0) {
      setSelectedAssets(new Set(assets.map(a => a.asset_id)));
    }
  }, [assets]);

  const selectedSeries = seriesList?.find(s => s.series_id === selectedSeriesId);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="bg-geo-card border border-geo-border rounded-xl w-full max-w-2xl flex flex-col cursor-move select-none"
        style={{ maxHeight: '70vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="bg-geo-main px-6 py-4 border-b border-geo-border rounded-t-xl flex-shrink-0">
          <h2 className="text-lg font-semibold text-txt-primary">출고 생성</h2>
          <p className="text-sm text-txt-muted mt-1">
            {step === 'series' ? '시리즈를 선택하세요' : `${selectedSeries?.name || selectedSeries?.display_id || '시리즈'} - 자산 선택`}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {step === 'series' ? (
            <div className="space-y-2">
              {seriesList?.map(s => (
                <button
                  key={s.series_id}
                  onClick={() => handleSeriesSelect(s.series_id)}
                  className="w-full text-left p-4 rounded-lg border border-geo-border hover:border-status-purple hover:bg-status-purple/5 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-txt-primary">{s.name}</span>
                    {s.code && <span className="text-xs text-txt-muted">({s.code})</span>}
                  </div>
                  <div className="text-xs text-txt-muted mt-1">{s.display_id || s.series_id}</div>
                </button>
              ))}
              {!seriesList?.length && (
                <p className="text-sm text-txt-muted text-center py-4">시리즈가 없습니다</p>
              )}
            </div>
          ) : (
            <>
              {assetsLoading ? (
                <p className="text-sm text-txt-muted text-center py-4">로딩 중...</p>
              ) : assets?.length === 0 ? (
                <p className="text-sm text-txt-muted text-center py-4">PRINTED 상태의 자산이 없습니다</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-txt-secondary">자산 목록 ({assets?.length}개)</span>
                    <button
                      type="button"
                      onClick={handleToggleAll}
                      className="text-xs text-status-purple hover:underline"
                    >
                      {selectedAssets.size === assets?.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {assets?.map(a => (
                      <label
                        key={a.asset_id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedAssets.has(a.asset_id)
                            ? 'border-status-purple bg-status-purple/5'
                            : 'border-geo-border hover:border-geo-border-hover'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAssets.has(a.asset_id)}
                          onChange={() => handleToggleAsset(a.asset_id)}
                          className="w-4 h-4 rounded border-geo-border text-status-purple focus:ring-status-purple/40 bg-geo-main cursor-pointer"
                        />
                        <div className="w-12 h-12 rounded-lg border border-geo-border overflow-hidden flex-shrink-0 bg-geo-main">
                          {(a.image || a.image_url || a.batch?.image || a.batch?.image_url) ? (
                            <img
                              src={a.image || a.image_url || a.batch?.image || a.batch?.image_url}
                              alt={a.dina_id}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-txt-muted text-xs">
                              #{a.edition}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-txt-primary font-mono truncate">{a.dina_id}</div>
                          <div className="text-xs text-txt-muted">에디션: {a.edition}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-geo-border flex-shrink-0">
          {step === 'assets' && (
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-txt-secondary">선택된 자산</span>
              <span className="text-lg font-semibold text-status-purple font-mono">{selectedAssets.size}개</span>
            </div>
          )}
          <div className="flex gap-2">
            {step === 'assets' && (
              <button
                onClick={() => setStep('series')}
                className="px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
              >
                이전
              </button>
            )}
            <button
              onClick={onClose}
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
            >
              취소
            </button>
            {step === 'assets' && (
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || selectedAssets.size === 0}
                className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all"
              >
                {createMutation.isPending ? '생성 중...' : '출고 생성'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
