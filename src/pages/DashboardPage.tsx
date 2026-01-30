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

  const stats = [
    { label: '시리즈', value: series?.length || 0, color: 'bg-blue-500' },
    { label: '작업', value: batches?.length || 0, color: 'bg-amber-400' },
    { label: '진행 중 작업', value: batches?.filter((b: any) => b.status === 'IN_PROGRESS').length || 0, color: 'bg-emerald-300' },
    { label: '완료된 작업', value: batches?.filter((b: any) => b.status === 'COMPLETED').length || 0, color: 'bg-green-500' },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} text-white p-3 rounded-full w-12 h-12`}>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">최근 시리즈</h3>
          {series?.slice(0, 5).map((s: any) => (
            <div key={s.series_id} className="flex justify-between py-2 border-b last:border-0">
              <span className="font-medium">{s.name}</span>
              <span className={`text-sm px-2 py-1 rounded ${
                s.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
              }`}>{s.status === 'ACTIVE' ? '활성' : '비활성'}</span>
            </div>
          ))}
          {!series?.length && <p className="text-gray-500">시리즈가 없습니다</p>}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">최근 작업</h3>
          {batches?.slice(0, 5).map((b: any) => (
            <div key={b.batch_id} className="flex justify-between py-2 border-b last:border-0">
              <span className="font-medium">{b.name || `작업 ${b.batch_number}`}</span>
              <span className={`text-sm px-2 py-1 rounded ${
                b.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                b.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-700' :
                'bg-gray-100 text-gray-800'
              }`}>{
                b.status === 'COMPLETED' ? '완료' :
                b.status === 'IN_PROGRESS' ? '진행 중' : b.status
              }</span>
            </div>
          ))}
          {!batches?.length && <p className="text-gray-500">작업이 없습니다</p>}
        </div>
      </div>
    </div>
  );
}

