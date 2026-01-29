import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [limit, setLimit] = useState('100');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit', actionFilter, limit],
    queryFn: () => api.get(`/audit/logs?limit=${limit}${actionFilter ? `&action=${actionFilter}` : ''}`).then((res) => res.data.data),
  });

  const actions = [
    'SOURCE_VAULT_ACCESS', 'SOURCE_UPLOAD', 'SERIES_CREATED', 'BATCH_CREATED',
    'BATCH_STARTED', 'BATCH_COMPLETED', 'DINA_INSERTED', 'EXPORT_REQUESTED',
    'EXPORT_APPROVED', 'EXPORT_COMPLETED', 'OUTSOURCING_ON', 'OUTSOURCING_OFF',
    'SESSION_STARTED', 'ACCOUNT_CREATED', 'ACCOUNT_DISABLED',
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">감사 로그</h1>

      <div className="flex gap-4 mb-6">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">전체 액션</option>
          {actions.map((action) => (
            <option key={action} value={action}>{action}</option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="50">50건</option>
          <option value="100">100건</option>
          <option value="200">200건</option>
        </select>
      </div>

      {isLoading ? (
        <p>로딩 중...</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시간</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">대상</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logs?.map((log: any) => (
                <tr key={log.log_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{log.action}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {log.target_type}
                    {log.target_id && <span className="text-gray-400 ml-1">({log.target_id.slice(0, 8)})</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {log.actor_type}
                    {log.actor_id && <span className="ml-1">({log.actor_id.slice(0, 8)})</span>}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-gray-400">
                    {log.payload_hash?.slice(0, 16)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs?.length && <p className="text-center py-8 text-gray-500">로그가 없습니다</p>}
        </div>
      )}
    </div>
  );
}
