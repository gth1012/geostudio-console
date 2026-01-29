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
    { label: '시리즈', value: series?.length || 0, icon: '', color: 'bg-blue-500' },
    { label: '배치', value: batches?.length || 0, icon: '', color: 'bg-green-500' },
    { label: '활성 배치', value: batches?.filter((b: any) => b.status === 'IN_PROGRESS').length || 0, icon: '', color: 'bg-yellow-500' },
    { label: '완료 배치', value: batches?.filter((b: any) => b.status === 'COMPLETED').length || 0, icon: '', color: 'bg-purple-500' },
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
              <div className={`${stat.color} text-white p-3 rounded-lg text-2xl`}>
                {stat.icon}
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
              <span>{s.name}</span>
              <span className="text-sm text-gray-500">{s.status}</span>
            </div>
          ))}
          {!series?.length && <p className="text-gray-500">시리즈가 없습니다</p>}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">최근 배치</h3>
          {batches?.slice(0, 5).map((b: any) => (
            <div key={b.batch_id} className="flex justify-between py-2 border-b last:border-0">
              <span>{b.name || `Batch ${b.batch_number}`}</span>
              <span className={`text-sm px-2 py-1 rounded ${
                b.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                b.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>{b.status}</span>
            </div>
          ))}
          {!batches?.length && <p className="text-gray-500">배치가 없습니다</p>}
        </div>
      </div>
    </div>
  );
}
