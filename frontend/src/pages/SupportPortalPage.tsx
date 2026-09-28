import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  User,
  Plus,
  Send,
  X,
  Shield,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
  History
} from 'lucide-react';
import { supportApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TicketItem {
  id: number;
  ticket_id: string;
  customer_id: number;
  customer_name: string;
  customer_email?: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string;
  assigned_officer?: string;
  escalated_to?: string;
  escalation_reason?: string;
  resolution_notes?: string;
  message_count: number;
  activity_count: number;
  created_at: string;
  updated_at: string;
}

export const SupportPortalPage: React.FC = () => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Ticket & Drawer State
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Actions Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

  // Form states
  const [replyMessage, setReplyMessage] = useState('');
  const [assignTeam, setAssignTeam] = useState('Operations Helpdesk');
  const [assignOfficer, setAssignOfficer] = useState('');
  const [escalateTo, setEscalateTo] = useState('Senior Operations Manager');
  const [escalateReason, setEscalateReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Create Ticket Form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('LOAN_STATUS');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchMetrics();
  }, [statusFilter, categoryFilter, priorityFilter, searchQuery]);

  const fetchMetrics = async () => {
    try {
      const m = await supportApi.getMetrics();
      setMetrics(m);
    } catch (e) {
      console.warn('Error fetching support metrics:', e);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await supportApi.list({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        priority: priorityFilter !== 'All' ? priorityFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      setTickets(res.tickets || []);
      setTotalTickets(res.total || 0);
    } catch (e) {
      console.error('Error fetching tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    setLoadingDetail(true);
    try {
      const res = await supportApi.get(ticketId);
      setSelectedTicket(res);
    } catch (e) {
      console.error('Error loading ticket details:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    setSubmitting(true);
    try {
      await supportApi.create({
        subject: newSubject,
        category: newCategory,
        priority: newPriority,
        initial_message: newMessage,
      });
      setIsCreateModalOpen(false);
      setNewSubject('');
      setNewMessage('');
      fetchTickets();
      fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    try {
      await supportApi.reply(selectedTicket.ticket_id, {
        message: replyMessage,
      });
      setReplyMessage('');
      loadTicketDetail(selectedTicket.ticket_id);
      fetchTickets();
      fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to post reply.');
    }
  };

  const handleAssign = async () => {
    if (!selectedTicket || !assignTeam.trim()) return;
    try {
      await supportApi.assign(selectedTicket.ticket_id, {
        assigned_to: assignTeam,
        assigned_officer: assignOfficer.trim() || undefined,
      });
      setIsAssignModalOpen(false);
      loadTicketDetail(selectedTicket.ticket_id);
      fetchTickets();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign ticket.');
    }
  };

  const handleEscalate = async () => {
    if (!selectedTicket || !escalateReason.trim()) return;
    try {
      await supportApi.escalate(selectedTicket.ticket_id, {
        escalated_to: escalateTo,
        reason: escalateReason,
      });
      setIsEscalateModalOpen(false);
      setEscalateReason('');
      loadTicketDetail(selectedTicket.ticket_id);
      fetchTickets();
      fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to escalate ticket.');
    }
  };

  const handleResolve = async () => {
    if (!selectedTicket || !resolutionNotes.trim()) return;
    try {
      await supportApi.resolve(selectedTicket.ticket_id, {
        resolution_notes: resolutionNotes,
      });
      setIsResolveModalOpen(false);
      setResolutionNotes('');
      loadTicketDetail(selectedTicket.ticket_id);
      fetchTickets();
      fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resolve ticket.');
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    if (!confirm('Are you sure you want to mark this ticket as CLOSED?')) return;
    try {
      await supportApi.close(selectedTicket.ticket_id);
      loadTicketDetail(selectedTicket.ticket_id);
      fetchTickets();
      fetchMetrics();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to close ticket.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'WAITING_CUSTOMER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ESCALATED':
        return 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="finsight-card p-5 bg-white border border-slate-200 text-slate-900 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 text-white">
              <LifeBuoy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Enterprise Support & Helpdesk System</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                  SLA Protected
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Multi-channel customer servicing, automated escalation, and immutable audit history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchTickets();
                fetchMetrics();
              }}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-blue-600/30"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Ticket</span>
            </button>
          </div>
        </div>
      </div>

      {/* SLA & Status Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="finsight-card p-3 bg-white border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-500">Total Tickets</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{metrics?.total_tickets ?? totalTickets}</div>
        </div>
        <div className="finsight-card p-3 bg-slate-100/80 border-slate-300">
          <span className="text-[10px] uppercase font-bold text-slate-700">Open Tickets</span>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{metrics?.open_tickets ?? 0}</div>
        </div>
        <div className="finsight-card p-3 bg-amber-50/50 border-amber-200">
          <span className="text-[10px] uppercase font-bold text-amber-700">In Progress</span>
          <div className="text-lg font-bold text-amber-800 mt-0.5">{metrics?.in_progress ?? 0}</div>
        </div>
        <div className="finsight-card p-3 bg-purple-50/50 border-purple-200">
          <span className="text-[10px] uppercase font-bold text-purple-700">Waiting Customer</span>
          <div className="text-lg font-bold text-purple-800 mt-0.5">{metrics?.waiting_customer ?? 0}</div>
        </div>
        <div className="finsight-card p-3 bg-rose-50/50 border-rose-200">
          <span className="text-[10px] uppercase font-bold text-rose-700">Escalated</span>
          <div className="text-lg font-bold text-rose-800 mt-0.5">{metrics?.escalated ?? 0}</div>
        </div>
        <div className="finsight-card p-3 bg-emerald-50/50 border-emerald-200">
          <span className="text-[10px] uppercase font-bold text-emerald-700">Resolved / Closed</span>
          <div className="text-lg font-bold text-emerald-800 mt-0.5">
            {(metrics?.resolved ?? 0) + (metrics?.closed ?? 0)}
          </div>
        </div>
      </div>

      {/* Filter Matrix Bar */}
      <div className="finsight-card p-4 bg-white border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket ID, subject, officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="WAITING_CUSTOMER">WAITING_CUSTOMER</option>
              <option value="ESCALATED">ESCALATED</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700"
            >
              <option value="All">All Categories</option>
              <option value="LOAN_STATUS">Loan Status</option>
              <option value="DISBURSEMENT">Disbursement</option>
              <option value="EMI_PAYMENT">EMI Repayment</option>
              <option value="GRIEVANCE">Grievance</option>
              <option value="GENERAL">General</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700"
            >
              <option value="All">All Priorities</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          {(statusFilter !== 'All' || categoryFilter !== 'All' || priorityFilter !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setCategoryFilter('All');
                setPriorityFilter('All');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline text-[11px]"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Ticket Table & Ticket Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Table / List View */}
        <div className={`space-y-3 ${selectedTicket ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="finsight-card overflow-hidden bg-white border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] text-slate-500 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Ticket ID</th>
                    <th className="p-3">Subject & Category</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Assigned To</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.length > 0 ? (
                    tickets.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => loadTicketDetail(t.ticket_id)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          selectedTicket?.ticket_id === t.ticket_id ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <td className="p-3 font-mono font-bold text-blue-700">{t.ticket_id}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 truncate max-w-[200px]">{t.subject}</div>
                          <span className="text-[10px] text-slate-500">{t.category}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{t.customer_name}</div>
                          <span className="text-[10px] text-slate-400">ID: {t.customer_id}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                              t.priority === 'URGENT'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : t.priority === 'HIGH'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getStatusBadge(
                              t.status
                            )}`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-600">
                          <div>{t.assigned_to}</div>
                          {t.assigned_officer && (
                            <span className="text-[10px] text-slate-400">({t.assigned_officer})</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              loadTicketDetail(t.ticket_id);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-500"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        {loading ? 'Loading tickets...' : 'No support tickets found matching current filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Detail & Activity Panel (Shown when ticket is selected) */}
        {selectedTicket && (
          <div className="lg:col-span-5 space-y-4">
            <div className="finsight-card p-5 bg-white border-slate-200 space-y-4 shadow-md">
              {/* Detail Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-blue-700">{selectedTicket.ticket_id}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${getStatusBadge(
                        selectedTicket.status
                      )}`}
                    >
                      {selectedTicket.status}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{selectedTicket.subject}</h3>
                  <p className="text-xs text-slate-500">
                    Category: <span className="font-medium text-slate-700">{selectedTicket.category}</span> • Customer:{' '}
                    <span className="font-medium text-slate-700">{selectedTicket.customer?.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Staff Action Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-b border-slate-100 pb-3">
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200"
                >
                  Assign Ticket
                </button>
                <button
                  onClick={() => setIsEscalateModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer border border-rose-200"
                >
                  Escalate
                </button>
                <button
                  onClick={() => setIsResolveModalOpen(true)}
                  className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold cursor-pointer border border-emerald-200"
                >
                  Resolve
                </button>
                {selectedTicket.status !== 'CLOSED' && (
                  <button
                    onClick={handleClose}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>

              {/* Resolution Notes Callout (If resolved/closed) */}
              {selectedTicket.resolution_notes && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolution Summary</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{selectedTicket.resolution_notes}</p>
                </div>
              )}

              {/* Conversation Messages Thread */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                  <span>Conversation Thread ({selectedTicket.messages?.length || 0})</span>
                </h4>

                <div className="max-h-56 overflow-y-auto space-y-2.5 p-2 bg-slate-50/70 rounded-lg border border-slate-100">
                  {selectedTicket.messages?.map((msg: any, idx: number) => {
                    const isStaff = msg.sender_role !== 'CUSTOMER';
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg text-xs ${
                          isStaff ? 'bg-slate-100/90 border border-slate-300 ml-4' : 'bg-white border border-slate-200 mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-semibold text-slate-700">
                            {msg.sender} ({msg.sender_role})
                          </span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-800 leading-relaxed text-[11px] whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input Box */}
                {selectedTicket.status !== 'CLOSED' && (
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Type your reply message..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                      className="flex-1 px-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleReply}
                      disabled={!replyMessage.trim()}
                      className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Activity History Timeline */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Audit Activity Timeline ({selectedTicket.activity_history?.length || 0})</span>
                </h4>

                <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                  {selectedTicket.activity_history?.map((evt: any, i: number) => (
                    <div key={i} className="text-[11px] border-l-2 border-slate-300 pl-2.5 py-0.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold text-slate-700">{evt.action}</span>
                        <span>{new Date(evt.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                      <div className="text-slate-600 text-[10px] mt-0.5 leading-snug">{evt.details}</div>
                      <div className="text-[9px] text-slate-400">By {evt.actor_name} ({evt.actor_role})</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE TICKET MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Support Ticket</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Subject / Issue Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Disbursement status inquiry for Loan LN-00001"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category *</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  >
                    <option value="LOAN_STATUS">Loan Status</option>
                    <option value="DISBURSEMENT">Disbursement Inquiry</option>
                    <option value="EMI_PAYMENT">EMI Repayment</option>
                    <option value="GRIEVANCE">Customer Grievance</option>
                    <option value="GENERAL">General Support</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Priority *</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Initial Message *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the question or grievance in detail..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-slate-900">Assign Ticket {selectedTicket?.ticket_id}</h3>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Department / Team</label>
              <select
                value={assignTeam}
                onChange={(e) => setAssignTeam(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
              >
                <option value="Operations Helpdesk">Operations Helpdesk</option>
                <option value="Disbursement Desk">Disbursement Desk</option>
                <option value="Credit Underwriting">Credit Underwriting</option>
                <option value="Collections Team">Collections Team</option>
                <option value="Nodal Grievance Redressal">Nodal Grievance Redressal</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assign Officer (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Priya Sharma"
                value={assignOfficer}
                onChange={(e) => setAssignOfficer(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="px-4 py-1.5 rounded bg-blue-600 text-white font-semibold"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESCALATE MODAL */}
      {isEscalateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-rose-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Escalate Ticket {selectedTicket?.ticket_id}</span>
            </h3>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Escalate To (Senior Role / Committee)</label>
              <select
                value={escalateTo}
                onChange={(e) => setEscalateTo(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white"
              >
                <option value="Senior Operations Manager">Senior Operations Manager</option>
                <option value="Chief Risk Officer">Chief Risk Officer</option>
                <option value="Principal Nodal Officer">Principal Nodal Officer</option>
                <option value="Executive Credit Committee">Executive Credit Committee</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Escalation Rationale *</label>
              <textarea
                rows={3}
                required
                placeholder="Reason for escalating this ticket..."
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsEscalateModalOpen(false)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalate}
                disabled={!escalateReason.trim()}
                className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold disabled:opacity-50"
              >
                Confirm Escalation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE MODAL */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-3 text-xs">
            <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Resolve Ticket {selectedTicket?.ticket_id}</span>
            </h3>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Resolution Summary & Notes *</label>
              <textarea
                rows={4}
                required
                placeholder="Describe how the customer issue or grievance was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsResolveModalOpen(false)}
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolutionNotes.trim()}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold disabled:opacity-50"
              >
                Mark Resolved
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
