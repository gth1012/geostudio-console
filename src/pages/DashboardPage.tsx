import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import api from '../services/api';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (user?.role === 'agency_admin') {
    return <AgencyDashboard />;
  }
  return <StudioDashboard />;
}

/*  Agency Dashboard (SPEC 준수)  */
function AgencyDashboard() {
  const { data: shipments } = useQuery({
    queryKey: ['agency-shipments'],
    queryFn: () => api.get('/shipments').then((res) => res.data),
  });

  const { data: distributions } = useQuery({
    queryKey: ['agency-distributions'],
    queryFn: () => api.get('/distributions').then((res) => res.data),
  });

  const shipmentPending = shipments?.filter((s: any) => s.status === 'DRAFT' || s.status === 'READY').length || 0;
  const shipmentDelivered = shipments?.filter((s: any) => s.status === 'DELIVERED' || s.status === 'LOCKED' || s.status === 'SHIPPED').length || 0;
  const qrPending = distributions?.filter((d: any) => d.status === 'CREATED').length || 0;
  const activationPending = 0;

  return (
    <div className="animate-fade-in">
      {/* KPI 4개 */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        <KpiCard color="yellow" label="출고 대기" value={shipmentPending} />
        <KpiCard color="green" label="출고 완료" value={shipmentDelivered} />
        <KpiCard color="blue" label="QR 발송 대기" value={qrPending} />
        <KpiCard color="purple" label="정품 등록 진행중" value={activationPending} />
      </div>

      {/* 리스트 2개 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 최근 출고 */}
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden hover:border-geo-border-hover transition-colors">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border">
            <span className="text-sm font-semibold text-txt-primary">최근 출고</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-blue-dim text-status-blue">
              {shipments?.length || 0}건
            </span>
          </div>
          {shipments?.slice(0, 5).map((s: any) => (
            <div key={s.shipment_id} className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-[34px] h-[34px] rounded-lg bg-status-blue-dim text-status-blue flex items-center justify-center text-[15px]"></div>
                <div>
                  <div className="text-sm font-medium text-txt-primary">{s.shipment_id}</div>
                  <div className="text-xs text-txt-muted font-mono mt-0.5">
                    {s.quantity || 0}개  {new Date(s.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </div>
              <ShipmentBadge status={s.status} />
            </div>
          ))}
          {!shipments?.length && (
            <div className="px-5 py-8 text-center text-txt-muted text-sm">출고 기록이 없습니다</div>
          )}
        </div>

        {/* 최근 최초 등록 요청 */}
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden hover:border-geo-border-hover transition-colors">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border">
            <span className="text-sm font-semibold text-txt-primary">최근 정품 등록</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-purple-dim text-status-purple">
              0건
            </span>
          </div>
          <div className="px-5 py-8 text-center text-txt-muted text-sm">정품 등록 기록이 없습니다</div>
        </div>
      </div>
    </div>
  );
}

/*  Studio Dashboard (기존 유지)  */
function StudioDashboard() {
  const { data: series } = useQuery({
    queryKey: ['series'],
    queryFn: () => api.get('/series').then((res) => res.data.data),
  });

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then((res) => res.data.data),
  });

  const { data: shipments } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => api.get('/shipments').then((res) => res.data),
  });

  const shippedCount = shipments?.filter((s: any) => s.status === 'SHIPPED').length || 0;
  const totalAssets = batches?.reduce((sum: number, b: any) => sum + (b.items_completed || 0), 0) || 0;
  const inProgress = batches?.filter((b: any) => b.status === 'IN_PROGRESS').length || 0;
  const completed = batches?.filter((b: any) => b.status === 'COMPLETED').length || 0;
  const drafts = batches?.filter((b: any) => b.status === 'DRAFT').length || 0;

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: '임시 저장', IN_PROGRESS: '진행 중', COMPLETED: '완료',
      SHIPPED: '출고 완료', FAILED: '실패', LOCKED: '확정',
    };
    return map[status] || status;
  };

  return (
    <div className="animate-fade-in">
      <div className="bg-geo-card border border-geo-border rounded-[14px] p-7 mb-4 relative overflow-hidden hover:border-geo-border-hover hover:bg-geo-card-hover transition-all">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-status-green to-status-blue" />
        <div className="text-[13px] text-txt-secondary font-medium tracking-wide uppercase mb-2.5">총 발행 자산</div>
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-4">
            <span className="text-[56px] font-bold tracking-tighter font-mono text-status-green leading-none">{totalAssets.toLocaleString()}</span>
            <span className="text-base text-txt-secondary mb-2">assets</span>
          </div>
          <div className="flex gap-7 mb-1.5">
            <div className="flex flex-col items-end">
              <span className="text-[22px] font-semibold font-mono text-status-purple">{series?.length || 0}</span>
              <span className="text-[11px] text-txt-muted mt-0.5">활성 시리즈</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[22px] font-semibold font-mono text-status-purple">{batches?.length || 0}</span>
              <span className="text-[11px] text-txt-muted mt-0.5">누적 작업 수</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[22px] font-semibold font-mono text-status-purple">28</span>
              <span className="text-[11px] text-txt-muted mt-0.5">rec/sec</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-7">
        <StatCard color="blue" label="활성 시리즈" value={series?.length || 0} sub={series?.[0]?.name || '-'} />
        <StatCard color="yellow" label="진행 중인 작업" value={inProgress + drafts} sub={`임시 저장 ${drafts}  처리 중 ${inProgress}`} />
        <StatCard color="green" label="완료된 작업" value={completed} sub={`총 ${batches?.length || 0}건 중`} />
        <StatCard color="purple" label="출고 완료" value={shippedCount} sub={`총 ${shipments?.length || 0}건 중`} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-7">
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden hover:border-geo-border-hover transition-colors">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border">
            <span className="text-sm font-semibold text-txt-primary">최근 생성 시리즈</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-blue-dim text-status-blue">{series?.length || 0}건</span>
          </div>
          {series?.slice(0, 5).map((s: any) => (
            <div key={s.series_id} className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-[34px] h-[34px] rounded-lg bg-status-blue-dim text-status-blue flex items-center justify-center text-[15px]"></div>
                <div>
                  <div className="text-sm font-medium text-txt-primary">{s.name}</div>
                  <div className="text-xs text-txt-muted font-mono mt-0.5">{new Date(s.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium font-mono ${s.status === 'ACTIVE' ? 'bg-status-green-dim text-status-green' : 'bg-status-yellow-dim text-status-yellow'}`}>
                {s.status === 'ACTIVE' ? '활성' : '비활성'}
              </span>
            </div>
          ))}
          {!series?.length && <div className="px-5 py-8 text-center text-txt-muted text-sm">시리즈가 없습니다</div>}
        </div>

        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden hover:border-geo-border-hover transition-colors">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border">
            <span className="text-sm font-semibold text-txt-primary">최근 작업 내역</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-yellow-dim text-status-yellow">{batches?.length || 0}건</span>
          </div>
          {batches?.slice(0, 5).map((b: any) => (
            <div key={b.batch_id} className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[15px] ${
                  b.status === 'COMPLETED' || b.status === 'SHIPPED' ? 'bg-status-green-dim text-status-green' :
                  b.status === 'FAILED' ? 'bg-status-red-dim text-status-red' : 'bg-status-yellow-dim text-status-yellow'
                }`}></div>
                <div>
                  <div className="text-sm font-medium text-txt-primary">{b.name || `Batch ${b.display_id || b.batch_number}`}</div>
                  <div className="text-xs text-txt-muted font-mono mt-0.5">{b.items_completed || 0}/{b.items_total || 0} processed</div>
                </div>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium font-mono ${
                b.status === 'COMPLETED' || b.status === 'SHIPPED' ? 'bg-status-green-dim text-status-green' :
                b.status === 'IN_PROGRESS' ? 'bg-status-yellow-dim text-status-yellow' :
                b.status === 'FAILED' ? 'bg-status-red-dim text-status-red' : 'bg-status-yellow-dim text-status-yellow'
              }`}>
                {getStatusLabel(b.status)}
              </span>
            </div>
          ))}
          {!batches?.length && <div className="px-5 py-8 text-center text-txt-muted text-sm">작업이 없습니다</div>}
        </div>
      </div>
    </div>
  );
}

/*  공통 컴포넌트  */
function KpiCard({ color, label, value }: { color: 'blue' | 'yellow' | 'green' | 'purple'; label: string; value: number }) {
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
      <div className={`text-[32px] font-bold tracking-tight font-mono ${colorMap[color].text}`}>{value}</div>
    </div>
  );
}

function ShipmentBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    DRAFT: { bg: 'bg-status-gray-dim text-status-gray', label: '대기' },
    READY: { bg: 'bg-status-yellow-dim text-status-yellow', label: '준비완료' },
    DELIVERED: { bg: 'bg-status-blue-dim text-status-blue', label: '전달완료' },
    LOCKED: { bg: 'bg-status-green-dim text-status-green', label: '확정' },
    SHIPPED: { bg: 'bg-status-green-dim text-status-green', label: '출고완료' },
  };
  const badge = map[status] || { bg: 'bg-status-gray-dim text-status-gray', label: status };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium font-mono ${badge.bg}`}>{badge.label}</span>
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
