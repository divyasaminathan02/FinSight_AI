import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  AlertCircle,
  PlusCircle,
  Filter,
  CheckCircle2,
  X,
  User,
  ArrowRight,
  MessageSquare,
  Send,
  Calendar,
  Layers
} from 'lucide-react';
import { tasksApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TaskItem {
  id: number;
  task_id: string;
  title: string;
  description?: string;
  role_target: string;
  assigned_to?: string;
  priority: string;
  status: string;
  due_date?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  comments: Array<{ text: string; timestamp: string }>;
  created_at: string;
}

export const TaskCenterPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [commentText, setCommentText] = useState('');

  // Form states for new task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [roleTarget, setRoleTarget] = useState<string>(user?.role || 'CREDIT_OFFICER');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [assignedTo, setAssignedTo] = useState(user?.full_name || 'Staff Member');
  const [entityType, setEntityType] = useState('APPLICATION');
  const [entityId, setEntityId] = useState('');

  // Fetch tasks
  const { data: tasks = [], isLoading, refetch } = useQuery<TaskItem[]>({
    queryKey: ['global-tasks', selectedRole, selectedStatus, selectedPriority],
    queryFn: () => tasksApi.list({
      role: selectedRole === 'ALL' ? undefined : selectedRole,
      status: selectedStatus === 'ALL' ? undefined : selectedStatus,
      priority: selectedPriority === 'ALL' ? undefined : selectedPriority
    }),
    staleTime: 15000,
  });

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: () => tasksApi.create({
      title: taskTitle,
      description: taskDesc || undefined,
      role_target: roleTarget,
      assigned_to: assignedTo,
      priority: taskPriority,
      related_entity_type: entityType,
      related_entity_id: entityId || undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-tasks'] });
      setIsCreateOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      setEntityId('');
    }
  });

  // Update task mutation
  const updateMutation = useMutation({
    mutationFn: ({ taskId, payload }: { taskId: string; payload: any }) =>
      tasksApi.update(taskId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['global-tasks'] });
      if (activeTask && activeTask.task_id === updated.task_id) {
        setActiveTask(updated);
      }
      setCommentText('');
    }
  });

  const handleAddComment = () => {
    if (!activeTask || !commentText.trim()) return;
    updateMutation.mutate({
      taskId: activeTask.task_id,
      payload: { comment: commentText.trim() }
    });
  };

  const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const urgentCount = tasks.filter(t => t.priority === 'URGENT' || t.priority === 'HIGH').length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Institutional Task & Approval Center</h1>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Work Queue
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global collaborative operational actions, credit underwriting reviews, fraud investigations, and financial reconciliations.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Dispatch New Task</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400">Pending Actions</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting team intervention</div>
        </div>
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400">In Active Progress</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{inProgressCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Under institutional review</div>
        </div>
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-400">High / Urgent Priority</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{urgentCount}</div>
          <div className="text-[10px] text-rose-500/80 mt-0.5">SLA-bound compliance tasks</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Role Target:</span>
          {['ALL', 'CREDIT_OFFICER', 'FRAUD_OFFICER', 'OPERATIONS', 'FINANCE_MANAGER', 'RISK_MANAGER', 'ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRole(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedRole === r
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Status:</span>
          {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatus === st
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Queue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`p-5 bg-slate-900/90 border rounded-2xl transition-all shadow-xl space-y-3 ${
              task.status === 'COMPLETED'
                ? 'border-slate-800/60 opacity-75'
                : task.priority === 'URGENT'
                ? 'border-rose-800/80 shadow-rose-950/20'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    task.priority === 'URGENT' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    task.priority === 'HIGH' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {task.priority}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold uppercase">
                    {task.role_target?.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1.5">{task.title}</h3>
              </div>

              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase shrink-0 ${
                task.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                task.status === 'IN_PROGRESS' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {task.status?.replace('_', ' ')}
              </span>
            </div>

            {task.description && (
              <p className="text-xs text-slate-400 line-clamp-2">{task.description}</p>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{task.assigned_to || 'Assigned Desk'}</span>
              </div>
              {task.related_entity_id && (
                <span className="font-mono text-blue-400">
                  Ref: {task.related_entity_type} #{task.related_entity_id}
                </span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setActiveTask(task)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Activity & Notes ({task.comments?.length || 0})</span>
              </button>

              <div className="flex items-center gap-2">
                {task.status === 'PENDING' && (
                  <button
                    onClick={() => updateMutation.mutate({ taskId: task.task_id, payload: { status: 'IN_PROGRESS' } })}
                    className="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    Start Task
                  </button>
                )}
                {task.status !== 'COMPLETED' && (
                  <button
                    onClick={() => updateMutation.mutate({ taskId: task.task_id, payload: { status: 'COMPLETED' } })}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Complete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {tasks.length === 0 && !isLoading && (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
          No tasks found matching current filter criteria.
        </div>
      )}

      {/* Task Activity & Remark Drawer / Modal */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{activeTask.title}</h3>
                <span className="text-[11px] text-slate-400 font-mono">Task ID: {activeTask.task_id}</span>
              </div>
              <button onClick={() => setActiveTask(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeTask.description && (
              <p className="text-xs text-slate-300 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                {activeTask.description}
              </p>
            )}

            {/* Comments List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300">Activity Log & Remarks:</span>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {activeTask.comments && activeTask.comments.length > 0 ? (
                  activeTask.comments.map((c, i) => (
                    <div key={i} className="p-2.5 bg-slate-800/50 rounded-lg text-xs space-y-1">
                      <div className="text-slate-200">{c.text}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{c.timestamp}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 py-3 text-center">No remarks posted yet.</div>
                )}
              </div>
            </div>

            {/* Post Remark */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                placeholder="Add remark or resolution note..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddComment}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create Work Queue Task</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Verify KYC & GST Returns for APP-260901-B892"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Functional Role</label>
                <select
                  value={roleTarget}
                  onChange={(e) => setRoleTarget(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="CREDIT_OFFICER">Credit Underwriting Desk</option>
                  <option value="FRAUD_OFFICER">Fraud & KYC Investigation</option>
                  <option value="OPERATIONS">Operations & Disbursement Desk</option>
                  <option value="FINANCE_MANAGER">Finance & Treasury Operations</option>
                  <option value="COLLECTION_MANAGER">Collections & Remediation</option>
                  <option value="RISK_MANAGER">Portfolio Risk Management</option>
                  <option value="ADMIN">System Administration</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (SLA)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Assignee</label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Related Entity Type</label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="APPLICATION">Loan Application</option>
                    <option value="LOAN">Sanctioned Loan</option>
                    <option value="CUSTOMER">Customer Account</option>
                    <option value="FRAUD_ALERT">Fraud Incident</option>
                    <option value="TRANSACTION">Financial Transaction</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Entity Reference ID</label>
                  <input
                    type="text"
                    placeholder="e.g. LN-2026-88192"
                    value={entityId}
                    onChange={(e) => setEntityId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description & Context</label>
                <textarea
                  rows={2}
                  placeholder="Provide guidance or instructions..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!taskTitle || createMutation.isPending}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30 cursor-pointer disabled:opacity-50"
              >
                {createMutation.isPending ? 'Dispatching...' : 'Dispatch Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
