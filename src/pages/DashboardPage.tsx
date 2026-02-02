import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function DashboardPage() {
  const { data: series } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.get('/series').then((res) => res.data.data),
  });

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then((res) => res.data.data),
  });

  const totalAssets = batches?.reduce((sum: number, b: any) => sum + (b.items_completed || 0), 0) || 0;
  const inProgress = batches?.filter((b: any) => b.status === 'IN_PROGRESS').length || 0;
  const completed = batches?.filter((b: any) => b.status === 'COMPLETED').length || 0;
  const drafts = batches?.filter((b: any) => b.status === 'DRAFT').length || 0;

  return (
    <div className="animate-fade-in">
      {/* Hero KPI */}
      <div className="bg-geo-card border border-geo-border rounded-[14px] p-7 mb-4 relative overflow-hidden hover:border-geo-border-hover hover:bg-geo-card-hover transition-all">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-status-green to-status-blue" />
        <div className="text-[13px] text-txt-secondary font-medium tracking-wide uppercase mb-2.5">총 발행 자산 (에셋)</div>
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-4">
            <span className="text-[56px] font-bold tracking-tighter font-mono text-status-green leading-none">
              {totalAssets.toLocaleString()}
            </span>
            <span className="text-base text-txt-secondary mb-2">assets</span>
          </div>
          <div className="flex gap-7 mb-1.5">
            <div className="flex flex-col items-end">
              <span className="text-[22px] font-semibold font-mono text-status-purple">{series?.length || 0}</span>
              <span className="text-[11px] text-txt-muted mt-0.5">시리즈</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[22px] font-semibold font-mono text-status-purple">{batches?.length || 0}</span>
              <span className="text-[11px] text-txt-muted mt-0.5">총 작업</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[22px] font-semibold font-mono text-status-purple">28</span>
              <span className="text-[11px] text-txt-muted mt-0.5">rec/sec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub Stats */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        <StatCard color="blue" label="시리즈" value={series?.length || 0} sub={series?.[0]?.name || '-'} />
        <StatCard color="yellow" label="진행중 작업" value={inProgress + drafts} sub={`DRAFT ${drafts} · IN_PROGRESS ${inProgress}`} />
        <StatCard color="green" label="완료 작업" value={completed} sub={`총 ${batches?.length || 0}건 중`} />
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-2 gap-4 mb-7">
        {/* Recent Series */}
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden hover:border-geo-border-hover transition-colors">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border">
            <span className="text-sm font-semibold text-txt-primary">최근 시리즈</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-blue-dim text-status-blue">
              {series?.length || 0}건
            </span>
          </div>
          {series?.slice(0, 5).map((s: any) => (
            <div key={s.series_id} className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-[34px] h-[34px] rounded-lg bg-status-blue-dim text-status-blue flex items-center justify-center text-[15px]">🎨</div>
                <div>
                  <div className="text-sm font-medium text-txt-primary">{s.name}</div>
                  <div className="text-xs text-txt-muted font-mono mt-0.5">
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium font-mono ${
                s.status === 'ACTIVE'
                  ? 'bg-status-green-dim text-status-green'
                  : 'bg-status-yellow-dim text-status-yellow'
              }`}>
                {s.status === 'ACTIVE' ? '활성' : '비활성'}
              </span>
            </div>
          ))}
          {!series?.length && (
            <div className="px-5 py-8 text-center text-txt-muted text-sm">시리즈가 없습니다</div>
          )}
        </div>

        {/* Recent Batches */}
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden hover:border-geo-border-hover transition-colors">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border">
            <span className="text-sm font-semibold text-txt-primary">최근 작업</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-yellow-dim text-status-yellow">
              {batches?.length || 0}건
            </span>
          </div>
          {batches?.slice(0, 5).map((b: any) => (
            <div key={b.batch_id} className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[15px] ${
                  b.status === 'COMPLETED' ? 'bg-status-green-dim text-status-green' :
                  b.status === 'FAILED' ? 'bg-status-red-dim text-status-red' :
                  'bg-status-yellow-dim text-status-yellow'
                }`}>⚙️</div>
                <div>
                  <div className="text-sm font-medium text-txt-primary">{b.name || `Batch ${b.display_id || b.batch_number}`}</div>
                  <div className="text-xs text-txt-muted font-mono mt-0.5">
                    {b.items_completed || 0}/{b.items_total || 0} processed
                  </div>
                </div>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium font-mono ${
                b.status === 'COMPLETED' ? 'bg-status-green-dim text-status-green' :
                b.status === 'IN_PROGRESS' ? 'bg-status-yellow-dim text-status-yellow' :
                b.status === 'FAILED' ? 'bg-status-red-dim text-status-red' :
                'bg-status-yellow-dim text-status-yellow'
              }`}>
                {b.status}
              </span>
            </div>
          ))}
          {!batches?.length && (
            <div className="px-5 py-8 text-center text-txt-muted text-sm">작업이 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ color, label, value, sub }: { color: 'blue' | 'yellow' | 'green' | 'purple'; label: string; value: number | string; sub: string }) {
  const colorMap = {
    blue: { bar: 'bg-status-blue', text: 'text-status-blue' },
    yellow: { bar: 'bg-status-yellow', text: 'text-status-yellow' },
    green: { bar: 'bg-status-green', text: 'text-status-green' },
    purple: { bar: 'bg-status-purple', text: 'text-status-purple' },
  };

  return (
    <div className="bg-geo-card border border-geo-border rounded-xl px-5 py-[18px] relative overflow-hidden hover:border-geo-border-hover hover:bg-geo-card-hover hover:-translate-y-px transition-all">
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${colorMap[color].bar}`} />
      <div className="text-[11px] text-txt-secondary font-medium tracking-wide uppercase mb-2">{label}</div>
      <div className={`text-[26px] font-bold tracking-tight font-mono ${colorMap[color].text}`}>{value}</div>
      <div className="text-[11px] text-txt-muted font-mono mt-1">{sub}</div>
    </div>
  );
}
