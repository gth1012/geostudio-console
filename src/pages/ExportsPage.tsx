import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import CreateShipmentModal from '../components/shipments/CreateShipmentModal';
import ShipmentDetailModal from '../components/shipments/ShipmentDetailModal';
import { useToastStore } from '../stores/toast.store';

interface Shipment {
  shipment_id: string;
  display_id: string;
  series_id: string;
  tenant_id: string;
  asset_count: number;
  status: string;
  zip_sha256: string;
  created_at: string;
  delivered_at?: string;
  activation_status?: string;
  activation_success?: number;
  activation_total?: number;
  series?: {
    name: string;
    code: string;
    artist_name?: string;
  };
}

export default function ExportsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const toast = useToastStore();

  const { data: tenantList } = useQuery({
    queryKey: ['dealers'],
    queryFn: () => api.get('/dealers').then((res) => res.data?.data || []),
  });

  const { data: seriesList } = useQuery({
    queryKey: ['dealers', selectedTenantId, 'series'],
    queryFn: () => api.get(`/dealers/${selectedTenantId}/series`).then((res) => res.data?.data || []),
    enabled: !!selectedTenantId,
  });

  const tenantMap: Record<string, string> = {};
  if (Array.isArray(tenantList)) {
    tenantList.forEach((t: any) => { tenantMap[t.tenant_id] = t.name; });
  }

  const { data: shipments, isLoading } = useQuery({
    queryKey: ['shipments', selectedSeriesId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSeriesId) params.append('seriesId', selectedSeriesId);
      return api.get(`/shipments?${params}`).then(res => res.data as Shipment[]);
    },
  });

  const readyShipments = shipments?.filter(s => s.status === 'READY') || [];

  const handleTenantSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTenantId(e.target.value || null);
    setSelectedSeriesId(null);
  };

  const handleSeriesSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeriesId(e.target.value || null);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(readyShipments.map(s => s.shipment_id)));
    else setSelectedIds(new Set());
  };

  const allReadySelected = readyShipments.length > 0 && readyShipments.every(s => selectedIds.has(s.shipment_id));

  const handleBulkConfirm = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkConfirming(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => api.patch(`/shipments/${id}/confirm`, { recipientEmail })));
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      setSelectedIds(new Set());
      setShowBulkConfirmModal(false);
      setRecipientEmail('');
      toast.show(`${ids.length}건 출고 확정 완료`, 'success');
    } catch (err: any) {
      toast.show(err.response?.data?.message || '출고 확정 실패', 'error');
    } finally {
      setIsBulkConfirming(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-status-gray-dim text-status-gray',
      READY: 'bg-status-yellow-dim text-status-yellow',
      DELIVERED: 'bg-status-blue-dim text-status-blue',
      LOCKED: 'bg-status-green-dim text-status-green',
      SHIPPED: 'bg-status-purple-dim text-status-purple',
      VOID: 'bg-status-red-dim text-status-red',
    };
    return map[status] || 'bg-status-gray-dim text-status-gray';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: '생성됨',
      READY: '준비완료',
      DELIVERED: '전달완료',
      LOCKED: '확정',
      SHIPPED: '출고완료',
      VOID: '무효',
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

  const readyCount = shipments?.filter(s => s.status === 'READY').length || 0;
  const shippedCount = shipments?.filter(s => s.status === 'SHIPPED').length || 0;
  const voidCount = shipments?.filter(s => s.status === 'VOID').length || 0;

  return (
    <div className="animate-fade-in">

      {/* 기획사 → 시리즈 필터 + 버튼 */}
      <div className="flex gap-3 items-center mb-4">
        <select
          value={selectedTenantId || ''}
          onChange={handleTenantSelect}
          className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-sm text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none min-w-[160px]"
        >
          <option value="">전체 기획사</option>
          {Array.isArray(tenantList) && tenantList.map((t: any) => (
            <option key={t.tenant_id} value={t.tenant_id}>
              {t.name} ({t.series_count}개 시리즈)
            </option>
          ))}
        </select>

        <select
          value={selectedSeriesId || ''}
          onChange={handleSeriesSelect}
          disabled={!selectedTenantId}
          className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-sm text-txt-primary focus:ring-2 focus:ring-status-purple/40 outline-none min-w-[180px] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <option value="">전체 시리즈</option>
          {Array.isArray(seriesList) && seriesList.map((s: any) => (
            <option key={s.series_id} value={s.series_id}>
              {s.name} ({s.asset_count}개)
            </option>
          ))}
        </select>

        {(selectedTenantId || selectedSeriesId) && (
          <button
            onClick={() => { setSelectedTenantId(null); setSelectedSeriesId(null); }}
            className="px-3 py-2 text-sm text-txt-muted hover:text-txt-primary border border-geo-border rounded-lg hover:border-status-purple/50 transition-all"
          >
            초기화
          </button>
        )}

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-status-yellow-dim text-status-yellow rounded-lg font-medium hover:bg-status-yellow/20 transition-all"
          >
            출고 생성
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkConfirmModal(true)}
              className="px-4 py-2 bg-status-green text-white rounded-lg font-medium hover:bg-status-green/80 transition-all"
            >
              일괄 출고 확정 ({selectedIds.size}건)
            </button>
          )}
        </div>
      </div>

      {/* 상태 요약 카드 */}
      {!isLoading && shipments && shipments.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-geo-card border border-geo-border rounded-lg px-4 py-3">
            <p className="text-xs text-txt-muted">준비완료</p>
            <p className="text-xl font-semibold font-mono text-status-yellow mt-0.5">{readyCount}</p>
          </div>
          <div className="bg-geo-card border border-geo-border rounded-lg px-4 py-3">
            <p className="text-xs text-txt-muted">출고완료</p>
            <p className="text-xl font-semibold font-mono text-status-purple mt-0.5">{shippedCount}</p>
          </div>
          <div className="bg-geo-card border border-geo-border rounded-lg px-4 py-3">
            <p className="text-xs text-txt-muted">무효</p>
            <p className="text-xl font-semibold font-mono text-status-red mt-0.5">{voidCount}</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-txt-secondary">로딩 중..</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="w-[4%] px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allReadySelected && readyShipments.length > 0}
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-geo-border text-status-purple focus:ring-status-purple/40 bg-geo-main cursor-pointer"
                  />
                </th>
                <th className="w-[16%] px-4 py-3 text-left text-xs font-semibold text-status-purple uppercase tracking-wider">ID</th>
                <th className="w-[12%] px-4 py-3 text-left text-xs font-semibold text-status-purple uppercase tracking-wider">기획사</th>
                <th className="w-[14%] px-4 py-3 text-left text-xs font-semibold text-status-purple uppercase tracking-wider">시리즈</th>
                <th className="w-[12%] px-4 py-3 text-left text-xs font-semibold text-status-purple uppercase tracking-wider">아티스트</th>
                <th className="w-[7%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">수량</th>
                <th className="w-[9%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">상태</th>
                <th className="w-[16%] px-4 py-3 text-left text-xs font-semibold text-status-purple uppercase tracking-wider">출고일시</th>
                <th className="w-[8%] px-4 py-3 text-center text-xs font-semibold text-status-purple uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody>
              {shipments?.map((s) => (
                <tr
                  key={s.shipment_id}
                  className={`border-b border-geo-border/50 last:border-0 dark-table-row transition-colors ${selectedIds.has(s.shipment_id) ? 'bg-status-purple/10' : 'hover:bg-geo-main/50'}`}
                >
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.shipment_id)}
                      onChange={e => handleSelectOne(s.shipment_id, e.target.checked)}
                      disabled={s.status !== 'READY'}
                      className="w-4 h-4 rounded border-geo-border text-status-purple focus:ring-status-purple/40 bg-geo-main cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </td>
                  <td className="px-4 py-3 text-txt-primary font-mono text-sm truncate cursor-pointer hover:text-status-purple" onClick={() => setSelectedShipmentId(s.shipment_id)}>
                    {s.display_id}
                  </td>
                  <td className="px-4 py-3 text-txt-secondary text-sm truncate">
                    {tenantMap[s.tenant_id] || '-'}
                  </td>
                  <td className="px-4 py-3 text-txt-primary text-sm truncate">{s.series?.name || '-'}</td>
                  <td className="px-4 py-3 text-txt-primary text-sm truncate">{s.series?.artist_name || '-'}</td>
                  <td className="px-4 py-3 text-txt-primary font-mono text-sm text-center">{s.asset_count?.toLocaleString()}개</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusBadge(s.status)}`}>
                      {getStatusLabel(s.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-txt-muted text-sm whitespace-nowrap">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedShipmentId(s.shipment_id)}
                      className="px-3 py-1.5 text-xs text-txt-secondary border border-geo-border rounded hover:border-geo-border-hover hover:text-txt-primary transition-all whitespace-nowrap"
                    >
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!shipments?.length && (
        <div className="mt-4 px-6 py-5 bg-status-purple-dim border border-status-purple/30 rounded-lg text-center">
          <p className="text-base font-semibold text-txt-primary mb-1">출고 목록이 없습니다.</p>
          <p className="text-sm text-txt-secondary">상단 <button onClick={() => setShowCreateModal(true)} className="text-status-yellow font-semibold hover:underline">[출고 생성]</button> 버튼으로 첫 출고를 시작하세요.</p>
        </div>
      )}

      {showBulkConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-txt-primary mb-2">출고 확정</h3>
            <p className="text-sm text-txt-secondary mb-4">선택한 {selectedIds.size}건을 출고 확정하시겠습니까?</p>
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="수신자 이메일 (선택)"
              className="w-full px-4 py-2 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-status-purple mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowBulkConfirmModal(false); setRecipientEmail(''); }}
                className="flex-1 px-4 py-2 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
              >
                취소
              </button>
              <button
                onClick={handleBulkConfirm}
                disabled={isBulkConfirming}
                className="flex-1 px-4 py-2 bg-status-green text-white rounded-lg font-medium hover:bg-status-green/80 disabled:opacity-50 transition-all"
              >
                {isBulkConfirming ? '처리 중..' : '확정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateShipmentModal onClose={(createdId) => {
          setShowCreateModal(false);
          if (createdId) setSelectedShipmentId(createdId);
        }} />
      )}
      {selectedShipmentId && (
        <ShipmentDetailModal
          shipmentId={selectedShipmentId}
          onClose={() => setSelectedShipmentId(null)}
        />
      )}
    </div>
  );
}




