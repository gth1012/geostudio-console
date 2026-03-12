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
  onClose: (createdId?: string) => void;
}

export default function CreateShipmentModal({ onClose }: CreateShipmentModalProps) {
  const queryClient = useQueryClient();
  const toast = useToastStore();

  const [step, setStep] = useState<'series' | 'assets'>('series');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showList, setShowList] = useState(false); // 목록 펼치기 토글

  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const { data: seriesList } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.get('/series').then(res => res.data.data as Series[]),
  });

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets-printed', selectedSeriesId],
    queryFn: () =>
      api.get(`/assets?seriesId=${selectedSeriesId}&printStatus=PRINTED&excludeShipped=true&limit=0`)
        .then(res => res.data.data as Asset[]),
    enabled: !!selectedSeriesId && step === 'assets',
  });

  const createMutation = useMutation({
    mutationFn: (data: { seriesId: string; assetIds: string[] }) =>
      api.post('/shipments', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      const shipmentId = res.data?.shipmentId || res.data?.data?.shipmentId || '';
      toast.show('출고가 생성되었습니다', 'success');
      onClose(shipmentId);
    },
    onError: (err: any) => {
      const code = err.response?.data?.code;
      const msgMap: Record<string, string> = {
        ASSET_ALREADY_SHIPPED_OR_IN_SHIPMENT: '이미 출고됐거나 출고 대기 중인 자산이 포함되어 있습니다.',
        INVALID_ASSET_STATUS: '지오코드생성 완료 자산이 아닌 자산이 포함되어 있습니다.',
        SERIES_MISMATCH: '모든 자산이 같은 시리즈에 속해야 합니다.',
        SHIPMENT_CREATION_FAILED: '출고 생성에 실패했습니다. 잠시 후 다시 시도하세요.',
      };
      toast.show(msgMap[code] || err.response?.data?.message || '출고 생성 실패', 'error');
    },
  });

  const handleSeriesSelect = (seriesId: string) => {
    setSelectedSeriesId(seriesId);
    setSelectedAssets(new Set());
    setStep('assets');
    setModalPos({ x: 0, y: 0 });
    setShowList(false);
  };

  const handleToggleAsset = (assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (!assets) return;
    if (selectedAssets.size === assets.length) setSelectedAssets(new Set());
    else setSelectedAssets(new Set(assets.map(a => a.asset_id)));
  };

  const handleCreate = () => {
    if (selectedAssets.size === 0) return;
    createMutation.mutate({ seriesId: selectedSeriesId, assetIds: Array.from(selectedAssets) });
  };

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
  const handleMouseUp = () => { if (isDragging) setIsDragging(false); };

  useEffect(() => {
    if (assets && assets.length > 0) {
      setSelectedAssets(new Set(assets.map(a => a.asset_id)));
    }
  }, [assets]);

  const selectedSeries = seriesList?.find(s => s.series_id === selectedSeriesId);
  const isAllSelected = assets ? selectedAssets.size === assets.length : false;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center px-4 pt-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="bg-geo-card border border-geo-border rounded-xl w-full max-w-2xl flex flex-col cursor-move select-none"
        style={{ maxHeight: 'calc(100vh - 2rem)', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="bg-geo-main px-6 py-4 border-b border-geo-border rounded-t-xl flex-shrink-0">
          <h2 className="text-lg font-semibold text-txt-primary">출고 생성</h2>
          <p className="text-sm text-txt-muted mt-1">
            {step === 'series' && '시리즈를 선택하세요'}
            {step === 'assets' && `${selectedSeries?.name || '시리즈'} — PRINTED 자산만 출고 가능합니다`}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">

          {/* Step: series */}
          {step === 'series' && (
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
          )}

          {/* Step: assets */}
          {step === 'assets' && (
            <>
              {assetsLoading ? (
                <p className="text-sm text-txt-muted text-center py-4">로딩 중...</p>
              ) : assets?.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-txt-muted">지오코드생성 완료 자산이 없습니다</p>
                  <p className="text-xs text-txt-muted mt-1">지오코드 생성 완료 후 출고하세요</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-txt-secondary">생성 목록 ({assets?.length}개)</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={handleToggleAll} className="text-xs text-status-purple hover:underline">
                        {isAllSelected ? '전체 해제' : '전체 선택'}
                      </button>
                      <button type="button" onClick={() => setShowList(v => !v)} className="text-xs text-txt-muted hover:text-txt-primary underline">
                        {showList ? '목록 접기 ▲' : '목록 보기 ▼'}
                      </button>
                    </div>
                  </div>

                  {/* 전체선택 배너 */}
                  {isAllSelected && !showList && (
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-status-purple bg-status-purple/5">
                      <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-status-red/90 to-status-red/50 border-status-red">
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-sm text-txt-primary font-medium">전체 <span className="text-status-purple font-mono">{assets?.length}개</span> 선택됨</span>
                    </div>
                  )}

                  {/* 목록 펼쳤을 때만 렌더링 */}
                  {showList && (
                    <div className="space-y-2">
                      {assets?.map(a => {
                        const isSelected = selectedAssets.has(a.asset_id);
                        return (
                          <div
                            key={a.asset_id}
                            onClick={() => handleToggleAsset(a.asset_id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'border-status-purple bg-status-purple/5' : 'border-geo-border hover:border-geo-border-hover'}`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-gradient-to-br from-status-red/90 to-status-red/50 border-status-red' : 'border-geo-border-hover bg-geo-main'}`}>
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-txt-primary font-mono truncate">{a.dina_id}</span>
                                <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-status-green-dim text-status-green">지오코드생성완료</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
              onClick={() => onClose()}
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
            >
              취소
            </button>
            {step === 'assets' && (
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending || selectedAssets.size === 0}
                className="flex-1 px-4 py-2.5 bg-status-yellow-dim text-status-yellow rounded-lg font-medium hover:bg-status-yellow/20 disabled:opacity-50 transition-all"
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
