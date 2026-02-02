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
    <div className="animate-fade-in">
      <div className="flex gap-3 mb-6">
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-secondary text-sm focus:ring-2 focus:ring-status-purple/40 outline-none">
          <option value="">전체 액션</option>
          {actions.map((action) => <option key={action} value={action}>{action}</option>)}
        </select>
        <select value={limit} onChange={(e) => setLimit(e.target.value)} className="px-4 py-2 bg-geo-card border border-geo-border rounded-lg text-txt-secondary text-sm focus:ring-2 focus:ring-status-purple/40 outline-none">
          <option value="50">50건</option>
          <option value="100">100건</option>
          <option value="200">200건</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-txt-secondary">로딩 중...</p>
      ) : (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">시간</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">액션</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">대상</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Actor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">Hash</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map((log: any) => (
                <tr key={log.log_id} className="border-b border-geo-border/50 last:border-0 dark-table-row transition-colors">
                  <td className="px-6 py-4 text-sm text-txt-muted font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-status-blue-dim text-status-blue rounded text-xs font-medium font-mono">{log.action}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-txt-secondary">
                    {log.target_type}
                    {log.target_id && <span className="text-txt-muted ml-1">({log.target_id.slice(0, 8)})</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-txt-secondary">
                    {log.actor_type}
                    {log.actor_id && <span className="text-txt-muted ml-1">({log.actor_id.slice(0, 8)})</span>}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-txt-faint">
                    {log.payload_hash?.slice(0, 16)}...
                  </td>
                </tr>
              ))}
              {!logs?.length && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-txt-muted">로그가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
