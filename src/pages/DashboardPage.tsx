import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((res) => res.data),
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
    { label: '활성 시리즈', value: data?.active_series || 0, color: 'blue' },
    { label: '전체 작업', value: data?.total_batches || 0, color: 'purple' },
    { label: '전체 자산', value: data?.total_assets || 0, color: 'blue' },
    { label: '출고 가능 (PRINTED)', value: data?.printed_assets || 0, color: 'yellow' },
    { label: '출고 완료 (SHIPPED)', value: data?.shipped_assets || 0, color: 'purple' },
    { label: '정품등록 (ACTIVATED)', value: data?.activated_assets || 0, color: 'green' },
    { label: '전체 출고', value: data?.total_shipments || 0, color: 'blue' },
    { label: '24시간 생성 자산', value: data?.recent_assets_24h || 0, color: 'purple' },
    { label: 'GeoCode 생성률', value: `${data?.geocode_rate || 0}%`, color: (data?.geocode_rate ?? 0) >= 80 ? 'green' : (data?.geocode_rate ?? 0) >= 50 ? 'yellow' : 'red' },
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
