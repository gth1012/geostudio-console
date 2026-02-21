import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Distribution {
  distribution_id: string;
  display_id: string;
  series_id: string;
  asset_count: number;
  status: string;
  created_at: string;
  distributed_at?: string;
  series?: {
    name: string;
    code: string;
  };
}

export default function DistributionPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDistributionId, setSelectedDistributionId] = useState<string | null>(null);

  const { data: distributions, isLoading } = useQuery({
    queryKey: ['distributions'],
    queryFn: () => api.get('/distributions').then(res => res.data as Distribution[]),
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-status-yellow-dim text-status-yellow',
      DISTRIBUTED: 'bg-status-green-dim text-status-green',
      CANCELLED: 'bg-status-red-dim text-status-red',
    };
    return map[status] || 'bg-status-gray-dim text-status-gray';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: '대기',
      DISTRIBUTED: '배포완료',
      CANCELLED: '취소',
    };
    return map[status] || status;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-txt-primary">배포 관리</h2>
          <p className="text-sm text-txt-muted mt-1">배포 기록 및 관리</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all"
        >
          + 배포 생성
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">배포 ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">시리즈명</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">수량</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">생성일시</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">배포일시</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody>
              {distributions?.map((d) => (
                <tr
                  key={d.distribution_id}
                  className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors hover:bg-geo-main/50 cursor-pointer"
                  onClick={() => setSelectedDistributionId(d.distribution_id)}
                >
                  <td className="px-6 py-4 text-txt-primary font-mono text-sm">{d.display_id}</td>
                  <td className="px-6 py-4 text-txt-primary">{d.series?.name || '-'}</td>
                  <td className="px-6 py-4 text-txt-primary font-mono">{d.asset_count}개</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(d.status)}`}>
                      {getStatusLabel(d.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(d.created_at)}</td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(d.distributed_at || '')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedDistributionId(d.distribution_id); }}
                        className="px-2 py-1 text-xs text-txt-secondary border border-geo-border rounded hover:border-geo-border-hover transition-all"
                      >
                        상세
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!distributions?.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-txt-muted">
                    배포 기록이 없습니다. 배포를 생성하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals - TODO: 모달 컴포넌트 구현 필요 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-geo-card border border-geo-border rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-txt-primary mb-4">배포 생성</h3>
            <p className="text-txt-muted text-sm">모달 컴포넌트 구현 필요</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="mt-4 px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded hover:border-geo-border-hover transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      )}
      {selectedDistributionId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-geo-card border border-geo-border rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-txt-primary mb-4">배포 상세</h3>
            <p className="text-txt-muted text-sm">ID: {selectedDistributionId}</p>
            <button
              onClick={() => setSelectedDistributionId(null)}
              className="mt-4 px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded hover:border-geo-border-hover transition-all"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
