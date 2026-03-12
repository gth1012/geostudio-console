import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface SeriesStatus {
  series_id: string;
  series_name: string;
  artist_name: string;
  total: number;
  unclaimed: number;
  claimed: number;
  claim_rate: number;
}

export default function SeriesStatusPage() {
  const { data, isLoading, error } = useQuery<SeriesStatus[]>({
    queryKey: ['series-status'],
    queryFn: () => api.get('/api/admin/series-status').then((res) => res.data),
    staleTime: 30000,
    retry: false,
  });

  const totalAssets = data?.reduce((sum, s) => sum + s.total, 0) || 0;
  const totalUnclaimed = data?.reduce((sum, s) => sum + s.unclaimed, 0) || 0;
  const totalClaimed = data?.reduce((sum, s) => sum + s.claimed, 0) || 0;

  return (
    <div className="p-8">
      {/* 전체 요약 배너 */}
      <div className="bg-status-purple-dim border border-status-purple/30 rounded-xl px-6 py-4 mb-4 flex items-center gap-8">
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-muted">총 자산</span>
          <span className="text-lg font-semibold text-status-purple">{totalAssets.toLocaleString()}</span>
        </div>
        <div className="w-px h-5 bg-geo-border" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-muted">미등록</span>
          <span className="text-lg font-semibold text-status-yellow">{totalUnclaimed.toLocaleString()}</span>
        </div>
        <div className="w-px h-5 bg-geo-border" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-txt-muted">등록완료</span>
          <span className="text-lg font-semibold text-status-green">{totalClaimed.toLocaleString()}</span>
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="text-txt-secondary text-sm mt-8">로딩 중...</div>
      ) : error ? (
        <div className="bg-status-red-dim border border-status-red/30 rounded-xl px-6 py-4 mt-4">
          <span className="text-status-red text-sm">시리즈 현황 로드 실패</span>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="bg-status-purple-dim border border-status-purple/30 rounded-xl px-6 py-4 mt-4">
          <span className="text-status-purple text-sm">등록된 시리즈가 없습니다.</span>
        </div>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-txt-muted uppercase tracking-wider">시리즈명</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-txt-muted uppercase tracking-wider">아티스트</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-txt-muted uppercase tracking-wider">총 자산</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-txt-muted uppercase tracking-wider">미등록</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-txt-muted uppercase tracking-wider">등록완료</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-txt-muted uppercase tracking-wider">등록률</th>
              </tr>
            </thead>
            <tbody>
              {data.map((series, idx) => (
                <tr
                  key={series.series_id}
                  className={`border-b border-geo-border last:border-0 hover:bg-geo-border/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-geo-border/10'}`}
                >
                  <td className="px-5 py-3.5 text-txt-primary font-medium">{series.series_name || '-'}</td>
                  <td className="px-5 py-3.5 text-txt-secondary">{series.artist_name || '-'}</td>
                  <td className="px-5 py-3.5 text-center text-status-green font-semibold">{series.total.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-center text-status-yellow font-semibold">{series.unclaimed.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-center text-status-green font-semibold">{series.claimed.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      series.claim_rate >= 80
                        ? 'bg-status-green-dim text-status-green'
                        : series.claim_rate >= 30
                        ? 'bg-status-yellow-dim text-status-yellow'
                        : 'bg-status-red-dim text-status-red'
                    }`}>
                      {series.claim_rate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
