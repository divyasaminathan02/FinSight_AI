import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  Search,
  Filter,
  CheckCircle,
  Clock,
  UserCheck,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal
} from 'lucide-react';
import api from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [filterAction, setFilterAction] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filterAction],
    queryFn: async () => {
      const res = await api.get('/audit/logs', {
        params: {
          limit: 100,
          action: filterAction === 'All' ? undefined : filterAction
        }
      });
      return res.data;
    }
  });

  const logs = data?.logs || [];
  const filtered = logs.filter((l: any) =>
    search ? (l.action.toLowerCase().includes(search.toLowerCase()) || l.resource.toLowerCase().includes(search.toLowerCase())) : true
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-white border border-slate-700 shadow-md">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Institutional Regulatory Audit Trail</h1>
            <p className="text-xs text-slate-400">
              Immutable ledger of loan decisions, sanctions, disbursements, and authentication events (RBI Fair Practices Code)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Sync Audit Events</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['All', 'APPLICATION', 'DISBURSE', 'REPAYMENT', 'LOGIN'].map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterAction === act
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {act === 'All' ? 'All Activities' : act}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search action or resource..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Resource</th>
                <th className="py-3 px-4">Officer / Subject</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading immutable audit logs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((item: any) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                            item.action.includes('APPROVE') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            item.action.includes('DISBURSE') ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                            item.action.includes('REPAYMENT') ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                            'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {item.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-200">
                          {item.resource}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {item.user}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                          >
                            {isExpanded ? 'Hide Payload' : 'View Payload'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-950/60 border-b border-slate-800">
                          <td colSpan={5} className="p-4">
                            <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto">
                              {JSON.stringify(item.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
