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
      <div className="finsight-card p-5 bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-200 shadow-xs">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Institutional Regulatory Audit Trail</h1>
            <p className="text-xs text-slate-700 font-semibold mt-0.5">
              Immutable ledger of loan decisions, sanctions, disbursements, and authentication events (RBI Fair Practices Code)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterAction === act
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-xs'
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
            className="w-full bg-white border border-slate-300 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-900 font-medium outline-none focus:border-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Audit Log Table in Light Pale Blue Shade */}
      <div className="bg-[#F0F7FF] border border-blue-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs bg-white">
            <thead className="bg-[#E1EFFF] text-blue-950 uppercase text-[11px] font-extrabold tracking-wider border-b border-blue-200">
              <tr>
                <th className="py-3.5 px-4 text-blue-950 font-bold">Action</th>
                <th className="py-3.5 px-4 text-blue-950 font-bold">Entity Resource</th>
                <th className="py-3.5 px-4 text-blue-950 font-bold">Officer / Subject</th>
                <th className="py-3.5 px-4 text-blue-950 font-bold">Timestamp (UTC)</th>
                <th className="py-3.5 px-4 text-right text-blue-950 font-bold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-100 text-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-blue-950 font-semibold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading immutable audit logs...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-600 font-medium">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((item: any) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="bg-white hover:bg-[#F0F7FF] transition-colors">
                        <td className="py-3.5 px-4">
                          <span className={`text-[11px] px-2.5 py-0.5 rounded font-mono font-bold ${
                            item.action.includes('APPROVE') ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                            item.action.includes('DISBURSE') ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                            item.action.includes('REPAYMENT') ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                            'bg-slate-100 text-slate-800 border border-slate-300'
                          }`}>
                            {item.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                          {item.resource}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {item.user}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px] font-medium">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer underline"
                          >
                            {isExpanded ? 'Hide Payload' : 'View Payload'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-[#F0F7FF] border-b border-blue-200">
                          <td colSpan={5} className="p-4">
                            <pre className="p-3 bg-white border border-blue-200 rounded-xl text-[11px] font-mono text-slate-900 font-semibold overflow-x-auto shadow-inner">
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
