import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/admin/dashboard').then((res) => res.data),
    refetchInterval: 30000,
    staleTime: 20000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-txt-secondary">로딩 중...</div>
      </div>
    );
  }

  // 401 에러 시 → AuthLogoutHandler가 /login으로 이동 처리
  // 그 사이 "로드 실패" 노출 방지 → 빈 화면 유지
  if (error) {
    const status = (error as any)?.response?.status;
    if (status === 401) {
      return null;
    }
    return (
      <div className="p-8">
        <div className="text-status-red">운영 현황 로드 실패</div>
      </div>
    );
  }

  const cards = [
    { label: '검증 처리량 (5분)', value: data?.throughput_5min || 0, color: 'blue' },
    { label: '전체 이벤트', value: data?.total_events || 0, color: 'purple' },
    { label: '에러율', value: `${data?.error_rate || 0}%`, color: data?.error_rate >= 3 ? 'red' : data?.error_rate >= 1 ? 'yellow' : 'green' },
    { label: '동기화 지연', value: data?.consumer_lag || 0, color: data?.consumer_lag > 50000 ? 'red' : data?.consumer_lag > 10000 ? 'yellow' : 'green' },
    { label: '처리 실패', value: data?.deadletter_count || 0, color: data?.deadletter_count > 0 ? 'yellow' : 'green' },
    { label: '차단 디바이스', value: data?.blocked_devices || 0, color: data?.blocked_devices > 0 ? 'red' : 'green' },
    { label: 'DB 연결', value: data?.db_connections || 0, color: 'blue' },
    { label: '허용 기기', value: data?.whitelist_count || 0, color: 'purple' },
    { label: '정품 등록 (24시간)', value: data?.recent_claims_24h || 0, color: 'blue' },
  ];

  const sloColor = data?.slo_status === 'CRITICAL' ? 'red' : data?.slo_status === 'WARNING' ? 'yellow' : 'green';

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium bg-status-${sloColor}-dim text-status-${sloColor} border border-status-${sloColor}/30`}>
          서비스 상태: {data?.slo_status === 'NORMAL' ? '정상' : data?.slo_status === 'WARNING' ? '주의' : data?.slo_status === 'CRITICAL' ? '위험' : '알 수 없음'}
        </div>
        <span className="text-xs text-txt-muted">30초마다 자동 갱신</span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-geo-card border border-geo-border rounded-xl p-5 hover:border-geo-border-hover transition-all duration-150"
          >
            <div className="text-xs text-txt-muted mb-2">{card.label}</div>
            <div className={`text-2xl font-semibold text-status-${card.color}`}>
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
