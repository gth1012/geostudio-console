import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

interface Activation {
  activation_id: string;
  display_id: string;
  license_key: string;
  device_id: string;
  status: string;
  activated_at: string;
  expires_at?: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function ActivationPage() {
  const toast = useToastStore();
  const [selectedActivationId, setSelectedActivationId] = useState<string | null>(null);

  const { data: activations, isLoading } = useQuery({
    queryKey: ['activations'],
    queryFn: () => api.get('/activations').then(res => res.data as Activation[]),
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: 'bg-status-green-dim text-status-green',
      EXPIRED: 'bg-status-yellow-dim text-status-yellow',
      REVOKED: 'bg-status-red-dim text-status-red',
    };
    return map[status] || 'bg-status-gray-dim text-status-gray';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      ACTIVE: '활성',
      EXPIRED: '만료',
      REVOKED: '해지',
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

  const handleCopyLicenseKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.show('라이선스 키 복사됨', 'success');
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-txt-primary">인증 관리</h2>
          <p className="text-sm text-txt-muted mt-1">라이선스 인증 기록 및 관리</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">인증 ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">라이선스 키</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">디바이스 ID</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">인증일시</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">만료일시</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody>
              {activations?.map((a) => (
                <tr
                  key={a.activation_id}
                  className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors hover:bg-geo-main/50 cursor-pointer"
                  onClick={() => setSelectedActivationId(a.activation_id)}
                >
                  <td className="px-6 py-4 text-txt-primary font-mono text-sm">{a.display_id}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-txt-secondary font-mono">{a.license_key.substring(0, 16)}...</code>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyLicenseKey(a.license_key); }}
                        className="px-1.5 py-0.5 text-xs text-status-purple border border-status-purple/30 rounded hover:bg-status-purple/10 transition-all"
                      >
                        복사
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-txt-secondary font-mono text-sm">{a.device_id.substring(0, 12)}...</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(a.status)}`}>
                      {getStatusLabel(a.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(a.activated_at)}</td>
                  <td className="px-6 py-4 text-txt-muted text-sm">{formatDate(a.expires_at || '')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedActivationId(a.activation_id); }}
                        className="px-2 py-1 text-xs text-txt-secondary border border-geo-border rounded hover:border-geo-border-hover transition-all"
                      >
                        상세
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!activations?.length && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-txt-muted">
                    인증 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {selectedActivationId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-geo-card border border-geo-border rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-txt-primary mb-4">인증 상세</h3>
            <p className="text-txt-muted text-sm">ID: {selectedActivationId}</p>
            <button
              onClick={() => setSelectedActivationId(null)}
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
