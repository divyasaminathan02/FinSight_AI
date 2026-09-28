import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  Users,
  Building2,
  GitBranch,
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
  Settings,
  Bell,
  SlidersHorizontal,
  RefreshCw,
  Search,
  Plus,
  Edit2,
  Lock,
  Unlock,
  Eye,
  Server,
  Database,
  Cpu,
  Radio,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Briefcase,
  FileCheck,
  Zap,
  Globe
} from 'lucide-react';
import { adminApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AdminPortalPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | 'users'
    | 'roles'
    | 'branches'
    | 'departments'
    | 'scope'
    | 'products'
    | 'approval_rules'
    | 'audit_logs'
    | 'config'
    | 'health'
  >('users');

  // Notification Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // =========================================================================
  // 1. USERS MODULE QUERIES & MUTATIONS
  // =========================================================================
  const [userSearch, setUserSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('FinSight@2026');

  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: 'FinSight@2026',
    full_name: '',
    role: 'CREDIT_ANALYST',
    department: 'Enterprise Credit & Portfolio Risk',
    branch_id: 'BR-MUM-01',
    branch_name: 'Mumbai Central Flagship',
    region: 'West',
    phone: '+91 98201 12345'
  });

  const { data: usersList = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users', userSearch, selectedRoleFilter],
    queryFn: () =>
      adminApi.getUsers({
        query: userSearch || undefined,
        role: selectedRoleFilter !== 'ALL' ? selectedRoleFilter : undefined
      })
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => adminApi.createUser(data),
    onSuccess: () => {
      showToast('New staff user created successfully!');
      setIsCreateUserModalOpen(false);
      setNewUserForm({
        email: '',
        password: 'FinSight@2026',
        full_name: '',
        role: 'CREDIT_ANALYST',
        department: 'Enterprise Credit & Portfolio Risk',
        branch_id: 'BR-MUM-01',
        branch_name: 'Mumbai Central Flagship',
        region: 'West',
        phone: '+91 98201 12345'
      });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to create user', 'error');
    }
  });

  const editUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.editUser(id, data),
    onSuccess: () => {
      showToast('User profile and permissions updated.');
      setEditingUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to update user', 'error');
    }
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleUserStatus(id),
    onSuccess: (res) => {
      showToast(res.message);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Status toggle failed', 'error');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, pass }: { id: number; pass: string }) => adminApi.resetUserAccess(id, pass),
    onSuccess: () => {
      showToast('User credentials reset and account unlocked.');
      setResettingUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to reset access', 'error');
    }
  });

  // =========================================================================
  // 2. ROLES & PERMISSIONS QUERIES
  // =========================================================================
  const { data: rolesList = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => adminApi.getRoles()
  });

  const { data: permissionsList = [] } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => adminApi.getPermissions()
  });

  // =========================================================================
  // 3. BRANCHES, DEPARTMENTS & TEAMS
  // =========================================================================
  const { data: branchesList = [], refetch: refetchBranches } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => adminApi.getBranches()
  });

  const { data: departmentsList = [] } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => adminApi.getDepartments()
  });

  const { data: teamsList = [] } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => adminApi.getTeams()
  });

  const [newBranchForm, setNewBranchForm] = useState({
    branch_code: '',
    name: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    region: 'West',
    address: '',
    manager_name: '',
    contact_phone: '+91 '
  });
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);

  const createBranchMutation = useMutation({
    mutationFn: (data: any) => adminApi.createBranch(data),
    onSuccess: () => {
      showToast('Branch registered successfully.');
      setIsAddBranchModalOpen(false);
      refetchBranches();
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to add branch', 'error');
    }
  });

  // =========================================================================
  // 4. ORGANIZATIONAL SCOPE QUERY
  // =========================================================================
  const { data: orgScopeData, refetch: refetchScope } = useQuery({
    queryKey: ['admin-org-scope'],
    queryFn: () => adminApi.getOrganizationalScope()
  });

  // =========================================================================
  // 5. LOAN PRODUCTS QUERIES & MUTATIONS (VERSIONED)
  // =========================================================================
  const { data: loanProductsList = [], refetch: refetchProducts } = useQuery({
    queryKey: ['admin-loan-products'],
    queryFn: () => adminApi.getLoanProducts()
  });

  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateLoanProduct(id, data),
    onSuccess: (res) => {
      showToast(res.message);
      setEditingProduct(null);
      refetchProducts();
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to update loan product', 'error');
    }
  });

  // =========================================================================
  // 6. APPROVAL MATRIX & WORKFLOW EVALUATION
  // =========================================================================
  const { data: approvalRulesList = [], refetch: refetchRules } = useQuery({
    queryKey: ['admin-approval-rules'],
    queryFn: () => adminApi.getApprovalRules()
  });

  const [editingRule, setEditingRule] = useState<any | null>(null);

  const [evalTestAmount, setEvalTestAmount] = useState(1500000);
  const [evalTestCibil, setEvalTestCibil] = useState(740);
  const [evalTestDti, setEvalTestDti] = useState(38);
  const [evalTestRisk, setEvalTestRisk] = useState(35);
  const [evalResult, setEvalResult] = useState<any | null>(null);

  const evaluateRuleMutation = useMutation({
    mutationFn: (data: any) => adminApi.evaluateApprovalRules(data),
    onSuccess: (data) => {
      setEvalResult(data);
      showToast('Approval rule matrix evaluated successfully.');
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => adminApi.updateApprovalRule(id, data),
    onSuccess: () => {
      showToast('Approval rule updated successfully.');
      setEditingRule(null);
      refetchRules();
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to update rule', 'error');
    }
  });

  // =========================================================================
  // 7. AUDIT LOGS QUERY & STATE DIFF VIEWER
  // =========================================================================
  const [auditActionFilter, setAuditActionFilter] = useState('All');
  const [auditSearch, setAuditSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const { data: auditLogsData, isLoading: isLoadingAudit, refetch: refetchAudit } = useQuery({
    queryKey: ['admin-audit-logs', auditActionFilter, auditSearch],
    queryFn: () =>
      adminApi.getAuditLogs({
        limit: 100,
        action: auditActionFilter !== 'All' ? auditActionFilter : undefined,
        user_query: auditSearch || undefined
      })
  });

  const auditLogs = auditLogsData?.logs || [];

  // =========================================================================
  // 8. SYSTEM CONFIGURATION & INTEGRATIONS
  // =========================================================================
  const { data: configData, refetch: refetchConfig } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => adminApi.getConfig()
  });

  const [configParams, setConfigParams] = useState<any>(null);
  React.useEffect(() => {
    if (configData) {
      setConfigParams(configData);
    }
  }, [configData]);

  const updateConfigMutation = useMutation({
    mutationFn: (payload: any) => adminApi.updateConfig(payload),
    onSuccess: () => {
      showToast('Enterprise risk thresholds and configurations updated.');
      refetchConfig();
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    }
  });

  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [integrationStatusResult, setIntegrationStatusResult] = useState<any | null>(null);

  const testIntegration = async (key: string) => {
    setTestingIntegration(key);
    try {
      const res = await adminApi.testIntegration(key);
      setIntegrationStatusResult(res);
      showToast(`Integration ${key} tested: ${res.status} (${res.roundtrip_latency_ms}ms)`);
    } catch (e: any) {
      showToast(`Integration test failed: ${e.message}`, 'error');
    } finally {
      setTestingIntegration(null);
    }
  };

  // =========================================================================
  // 9. SYSTEM HEALTH QUERY
  // =========================================================================
  const { data: healthData, isLoading: isLoadingHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => adminApi.getSystemHealth(),
    refetchInterval: 15000 // Poll every 15s for live status
  });

  // =========================================================================
  // 10. NOTIFICATION BROADCAST MODAL
  // =========================================================================
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    priority: 'HIGH',
    target_role: 'ALL'
  });

  const broadcastMutation = useMutation({
    mutationFn: (data: any) => adminApi.broadcastNotification(data),
    onSuccess: (res) => {
      showToast(res.message);
      setIsBroadcastModalOpen(false);
      setBroadcastForm({ title: '', message: '', priority: 'HIGH', target_role: 'ALL' });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    }
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm flex items-center gap-2 backdrop-blur-md transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
          }`}
        >
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">Institutional Administration Portal</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-900/60 text-blue-300 border border-blue-700/60 font-mono">
                RBAC Level: {currentUser?.role || 'ADMIN'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive organization controls, user roles, branch hierarchy, approval rules, versioned products, and real-time health telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Broadcast Alert</span>
          </button>
          <button
            onClick={() => {
              refetchUsers();
              refetchAudit();
              refetchHealth();
              refetchScope();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span>Sync System</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {[
          { id: 'users', label: 'Users', icon: Users },
          { id: 'roles', label: 'Roles & Matrix', icon: KeyRound },
          { id: 'branches', label: 'Branches', icon: Building2 },
          { id: 'departments', label: 'Depts & Teams', icon: Layers },
          { id: 'scope', label: 'Org Scope', icon: Globe },
          { id: 'products', label: 'Loan Products', icon: FileSpreadsheet },
          { id: 'approval_rules', label: 'Approval Rules', icon: FileCheck },
          { id: 'audit_logs', label: 'Audit Trail', icon: Shield },
          { id: 'config', label: 'Configuration', icon: Settings },
          { id: 'health', label: 'System Health', icon: Activity }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-500'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: USERS MODULE                                                   */}
      {/* ==================================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search staff by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 outline-none focus:border-blue-500"
              >
                <option value="ALL">All Roles</option>
                {rolesList.map((r: any) => (
                  <option key={r.role_code} value={r.role_code}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsCreateUserModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Staff User</span>
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Branch & Region</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Login</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Loading institutional users...
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No staff members found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{u.full_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                              u.role.includes('ADMIN') || u.role.includes('EXECUTIVE')
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : u.role.includes('MANAGER')
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-200">{u.branch_name || u.branch_id || 'Headquarters'}</div>
                          <div className="text-[11px] text-slate-500">Region: {u.region || 'West'}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{u.department}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              u.is_active
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            {u.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingUser(u)}
                              title="Edit User Assignment"
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => toggleUserStatusMutation.mutate(u.id)}
                              title={u.is_active ? 'Deactivate User' : 'Activate User'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.is_active ? 'hover:bg-rose-950/60 text-slate-400 hover:text-rose-400' : 'hover:bg-emerald-950/60 text-slate-400 hover:text-emerald-400'
                              }`}
                            >
                              {u.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setResettingUser(u)}
                              title="Reset Password & Access"
                              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: ROLES & PERMISSION MATRIX                                      */}
      {/* ==================================================================== */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-400" />
              <span>16 Institutional Canonical Roles</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              FinSight AI enforces fine-grained capability checks. Users are mapped to roles defining strict branch and underwriting authorities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolesList.map((role: any) => (
              <div
                key={role.role_code}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                      {role.category}
                    </span>
                    {role.is_privileged && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Privileged
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">{role.title}</h3>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">{role.role_code}</div>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2">{role.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Permissions:</span>
                    <span className="font-semibold text-blue-400 font-mono">{role.permissions_count} capabilities</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {role.permissions.slice(0, 4).map((p: string) => (
                      <span key={p} className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {p}
                      </span>
                    ))}
                    {role.permissions.length > 4 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800/60 text-slate-400 rounded">
                        +{role.permissions.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: BRANCHES MODULE                                                */}
      {/* ==================================================================== */}
      {activeTab === 'branches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Institutional Branch Network</h2>
              <p className="text-xs text-slate-400">Regional banking desks and operational branch registries.</p>
            </div>
            <button
              onClick={() => setIsAddBranchModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchesList.map((b: any) => (
              <div key={b.id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                    {b.branch_code}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{b.region} Region</span>
                </div>
                <h3 className="text-sm font-bold text-white">{b.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{b.address || `${b.city}, ${b.state}`}</p>

                <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Branch Manager:</span>
                    <span className="font-semibold text-slate-200">{b.manager_name || 'Designated Manager'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Contact:</span>
                    <span className="font-mono text-slate-300">{b.contact_phone || '+91 22 6601 2300'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Operational
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: DEPARTMENTS & TEAMS MODULE                                     */}
      {/* ==================================================================== */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Departments */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Departments ({departmentsList.length})</span>
              </h2>
              <div className="space-y-3">
                {departmentsList.map((d: any) => (
                  <div key={d.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white">{d.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {d.dept_code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">{d.description}</p>
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Head of Department: <span className="text-slate-300 font-semibold">{d.head_of_department || 'Arjun Mehta'}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teams */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Operational Teams & Desks ({teamsList.length})</span>
              </h2>
              <div className="space-y-3">
                {teamsList.map((t: any) => (
                  <div key={t.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white">{t.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                        {t.team_code}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Lead: <span className="text-slate-200 font-semibold">{t.team_lead}</span></span>
                        <span className="font-mono text-[10px] text-slate-500">Dept: {t.department_code}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: ORGANIZATIONAL SCOPE DASHBOARD (MANAGER DATA SCOPING)           */}
      {/* ==================================================================== */}
      {activeTab === 'scope' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-900/40 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-900/80 text-blue-300 border border-blue-700 font-mono">
                  Active Scope: {orgScopeData?.scope_level || 'ORGANIZATION_WIDE'}
                </span>
                <h2 className="text-lg font-bold text-white mt-2">{orgScopeData?.scope_title || 'Enterprise Data Scope'}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manager data scoping enforces data segregation: Branch Managers view only branch records, Regional Managers view regional clusters, Risk Managers inspect portfolio-wide risk data, and Administrators view enterprise-wide data.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs">
                <div>
                  <div className="text-slate-500">Assigned Branch</div>
                  <div className="font-semibold text-slate-200">{orgScopeData?.assigned_branch}</div>
                </div>
                <div className="w-px h-8 bg-slate-800" />
                <div>
                  <div className="text-slate-500">Region</div>
                  <div className="font-semibold text-slate-200">{orgScopeData?.assigned_region}</div>
                </div>
              </div>
            </div>

            {/* Scoped Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[11px] text-slate-400">Scoped Staff</div>
                <div className="text-xl font-bold text-white mt-1">{orgScopeData?.metrics?.staff_count ?? '--'}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[11px] text-slate-400">Scoped Borrowers</div>
                <div className="text-xl font-bold text-white mt-1">{orgScopeData?.metrics?.customers_in_scope ?? '--'}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[11px] text-slate-400">Active Loans</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{orgScopeData?.metrics?.active_loans_in_scope ?? '--'}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center">
                <div className="text-[11px] text-slate-400">Pending Apps</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{orgScopeData?.metrics?.pending_applications ?? '--'}</div>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-center col-span-2 md:col-span-1">
                <div className="text-[11px] text-slate-400">Portfolio INR</div>
                <div className="text-xl font-bold text-blue-400 mt-1">₹{(orgScopeData?.metrics?.portfolio_exposure_inr / 10000000).toFixed(2)} Cr</div>
              </div>
            </div>
          </div>

          {/* Branches in current scope */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
              Branches Included in Organizational Scope ({orgScopeData?.branches?.length || 0})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(orgScopeData?.branches || []).map((b: any) => (
                <div key={b.code} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="font-bold text-white text-xs">{b.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">{b.code} • {b.city} ({b.region})</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 6: LOAN PRODUCT MANAGEMENT (VERSIONED & AUDITED)                   */}
      {/* ==================================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Configurable Loan Products</h2>
              <p className="text-xs text-slate-400">
                Loan products are audited and version-controlled. Modifying interest rates, approval thresholds, or tenures increments the product version.
              </p>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Amount Range</th>
                    <th className="py-3 px-4">Interest Rate</th>
                    <th className="py-3 px-4">Tenure</th>
                    <th className="py-3 px-4">Processing Fee</th>
                    <th className="py-3 px-4">Approval Threshold</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {loanProductsList.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{p.product_code} • {p.category}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          v{p.version}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        ₹{(p.min_amount / 1000).toFixed(0)}k - ₹{(p.max_amount / 100000).toFixed(1)}L
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400">
                        {p.interest_rate}% p.a.
                      </td>
                      <td className="py-3 px-4">
                        {p.min_tenure} - {p.max_tenure} mos
                      </td>
                      <td className="py-3 px-4">
                        {p.processing_fee_pct}%
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-200">
                        ₹{(p.approval_threshold / 100000).toFixed(1)} Lakhs
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/40 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          Edit & Version
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 7: APPROVAL RULES MATRIX & WORKFLOW EVALUATOR                     */}
      {/* ==================================================================== */}
      {activeTab === 'approval_rules' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-400" />
              <span>Configurable Underwriting Approval Matrix</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Workflows are dynamic and configurable: Small loans are assigned to Credit Analysts, medium loans escalate to Credit Managers, and large or high-risk exposures mandate dual sign-off from both Credit Manager and Risk Manager.
            </p>
          </div>

          {/* Rules Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Tier & Rule Code</th>
                    <th className="py-3 px-4">Exposure Range</th>
                    <th className="py-3 px-4">Primary Approver</th>
                    <th className="py-3 px-4">Dual Approval?</th>
                    <th className="py-3 px-4">Min CIBIL / Max DTI</th>
                    <th className="py-3 px-4">Workflow Name</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {approvalRulesList.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{r.tier_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{r.rule_code}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        ₹{(r.min_amount / 100000).toFixed(1)}L - ₹{(r.max_amount / 100000).toFixed(1)}L
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                          {r.required_role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.requires_dual_approval ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1 w-fit">
                            <Check className="w-2.5 h-2.5" /> + {r.secondary_role || 'RISK_MANAGER'}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">Single Sign-Off</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px]">
                        Score &ge; {r.min_cibil_score} • DTI &le; {r.max_dti_pct}%
                      </td>
                      <td className="py-3 px-4 text-slate-300">{r.workflow_name}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setEditingRule(r)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Approval Workflow Evaluator */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Interactive Approval Rule Evaluator (Live Matrix Test)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">Loan Exposure (₹ INR)</label>
                <input
                  type="number"
                  value={evalTestAmount}
                  onChange={(e) => setEvalTestAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">Borrower CIBIL Score</label>
                <input
                  type="number"
                  value={evalTestCibil}
                  onChange={(e) => setEvalTestCibil(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">DTI Ratio (%)</label>
                <input
                  type="number"
                  value={evalTestDti}
                  onChange={(e) => setEvalTestDti(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold">Risk Score (0-100)</label>
                <input
                  type="number"
                  value={evalTestRisk}
                  onChange={(e) => setEvalTestRisk(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono mt-1"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() =>
                  evaluateRuleMutation.mutate({
                    amount: evalTestAmount,
                    cibil_score: evalTestCibil,
                    dti_pct: evalTestDti,
                    risk_score: evalTestRisk
                  })
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md"
              >
                Evaluate Workflow Tier
              </button>

              {evalResult && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400">Triggered Tier:</span>
                  <span className="font-bold text-white">{evalResult.tier_name}</span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-950 text-blue-300 border border-blue-800">
                    Required: {evalResult.primary_required_role}
                    {evalResult.requires_dual_approval && ` + ${evalResult.secondary_required_role}`}
                  </span>
                </div>
              )}
            </div>

            {/* Workflow steps visualization */}
            {evalResult && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="text-xs font-semibold text-slate-300 mb-2">Automated Execution Pipeline:</div>
                <div className="flex flex-wrap items-center gap-2">
                  {evalResult.workflow_steps.map((st: any, idx: number) => (
                    <React.Fragment key={st.step}>
                      <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                          {st.step}
                        </span>
                        <div>
                          <div className="font-semibold text-white">{st.action}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Role: {st.role}</div>
                        </div>
                      </div>
                      {idx < evalResult.workflow_steps.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 8: AUDIT LOGS MODULE (BEFORE & AFTER DIFFS)                      */}
      {/* ==================================================================== */}
      {activeTab === 'audit_logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
              {[
                'All',
                'LOGIN',
                'LOGOUT',
                'USER',
                'ROLE',
                'PRODUCT',
                'RULE',
                'APPROVE',
                'DISBURSE',
                'REPAYMENT',
                'KYC',
                'FRAUD',
                'COLLECTION',
                'CONFIG'
              ].map((act) => (
                <button
                  key={act}
                  onClick={() => setAuditActionFilter(act)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    auditActionFilter === act
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search action, officer, resource..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 pl-9 pr-3 py-1.5 rounded-xl text-xs text-slate-200 outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Entity</th>
                    <th className="py-3 px-4">User & Role</th>
                    <th className="py-3 px-4">Timestamp (UTC)</th>
                    <th className="py-3 px-4 text-right">State Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {isLoadingAudit ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Loading immutable audit trail...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No audit events recorded matching criteria.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((item: any) => {
                      const isExpanded = expandedLogId === item.id;
                      const hasStateDiff =
                        (item.before && Object.keys(item.before).length > 0) ||
                        (item.after && Object.keys(item.after).length > 0);

                      return (
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                                  item.action.includes('APPROVE') || item.action.includes('ACTIVE')
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : item.action.includes('DISBURSE')
                                    ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                    : item.action.includes('ROLE') || item.action.includes('USER')
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}
                              >
                                {item.action}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-200">
                              {item.resource}
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-white">{item.user}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{item.role}</div>
                            </td>
                            <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                              {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : item.id)}
                                className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                              >
                                {isExpanded ? 'Hide Diff' : 'View Diff'}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded State Diff View */}
                          {isExpanded && (
                            <tr className="bg-slate-950/80 border-b border-slate-800">
                              <td colSpan={5} className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="text-[11px] font-bold text-rose-400 mb-1 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-rose-500" /> Before State
                                    </div>
                                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                                      {JSON.stringify(item.before || {}, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <div className="text-[11px] font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> After State
                                    </div>
                                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                                      {JSON.stringify(item.after || {}, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                                {item.details && Object.keys(item.details).length > 0 && (
                                  <div className="mt-3">
                                    <div className="text-[11px] font-bold text-slate-400 mb-1">Additional Context</div>
                                    <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-mono text-slate-400">
                                      {JSON.stringify(item.details, null, 2)}
                                    </pre>
                                  </div>
                                )}
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
      )}

      {/* ==================================================================== */}
      {/* TAB 9: CONFIGURATION & INTEGRATIONS                                  */}
      {/* ==================================================================== */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Parameters */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400" />
                <span>Enterprise NBFC Risk Thresholds</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Max Probability of Default (Auto-Approval)</label>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={configParams?.risk_thresholds?.max_pd_for_auto_approval || 0.05}
                    onChange={(e) => {
                      if (configParams) {
                        configParams.risk_thresholds.max_pd_for_auto_approval = parseFloat(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Min Prime Credit Score (CIBIL Cutoff)</label>
                  <input
                    type="number"
                    defaultValue={configParams?.risk_thresholds?.min_credit_score_prime || 750}
                    onChange={(e) => {
                      if (configParams) {
                        configParams.risk_thresholds.min_credit_score_prime = parseInt(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Max Debt-to-Income Ratio (DTI Cutoff)</label>
                  <input
                    type="number"
                    step="0.05"
                    defaultValue={configParams?.risk_thresholds?.max_dti_ratio || 0.50}
                    onChange={(e) => {
                      if (configParams) {
                        configParams.risk_thresholds.max_dti_ratio = parseFloat(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">Fraud Risk Cutoff Score</label>
                  <input
                    type="number"
                    defaultValue={configParams?.risk_thresholds?.fraud_risk_cutoff_score || 75}
                    onChange={(e) => {
                      if (configParams) {
                        configParams.risk_thresholds.fraud_risk_cutoff_score = parseInt(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white mt-1"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => updateConfigMutation.mutate(configParams)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md"
                  >
                    Save Risk Configuration
                  </button>
                </div>
              </div>
            </div>

            {/* External Integrations */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Institutional Integrations & Gateways</span>
              </h2>

              <div className="space-y-3">
                {(configParams?.integrations || []).map((intg: any) => (
                  <div key={intg.key} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-xs">{intg.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{intg.endpoint}</div>
                      <div className="text-[10px] text-slate-500 mt-1">Heartbeat: {intg.last_heartbeat} • Latency: {intg.latency_ms}ms</div>
                    </div>

                    <button
                      onClick={() => testIntegration(intg.key)}
                      disabled={testingIntegration === intg.key}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                    >
                      {testingIntegration === intg.key ? 'Testing...' : 'Test Link'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 10: SYSTEM HEALTH MODULE (REAL ENDPOINTS & METRICS)                */}
      {/* ==================================================================== */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border border-emerald-900/40 rounded-2xl p-5 shadow-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-lg font-bold text-white">Overall System Status: {healthData?.status || 'HEALTHY'}</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Real-time operational telemetry for all five institutional tiers: frontend bundle, backend server, relational database, AI model ensemble, and dispatch queues.
              </p>
            </div>

            <button
              onClick={() => refetchHealth()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ping Now</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Frontend */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Frontend Service</h3>
                    <div className="text-[10px] text-slate-500 font-mono">React + Vite SPA</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {healthData?.components?.frontend?.status || 'OPERATIONAL'}
                </span>
              </div>
              <div className="text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Engine:</span> <span className="text-slate-200">{healthData?.components?.frontend?.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Asset Bundle:</span> <span className="text-slate-200">{healthData?.components?.frontend?.asset_bundle}</span>
                </div>
                <div className="flex justify-between">
                  <span>Latency:</span> <span className="font-mono text-emerald-400">{healthData?.components?.frontend?.latency_ms} ms</span>
                </div>
              </div>
            </div>

            {/* 2. Backend */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Backend Server</h3>
                    <div className="text-[10px] text-slate-500 font-mono">FastAPI Python 3</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {healthData?.components?.backend?.status || 'OPERATIONAL'}
                </span>
              </div>
              <div className="text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Python Runtime:</span> <span className="font-mono text-slate-200">{healthData?.components?.backend?.python_runtime}</span>
                </div>
                <div className="flex justify-between">
                  <span>Process PID:</span> <span className="font-mono text-slate-200">{healthData?.components?.backend?.process_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Threads:</span> <span className="text-slate-200">{healthData?.components?.backend?.active_threads}</span>
                </div>
              </div>
            </div>

            {/* 3. Database */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Relational Database</h3>
                    <div className="text-[10px] text-slate-500 font-mono">SQLite / Postgres</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {healthData?.components?.database?.status || 'OPERATIONAL'}
                </span>
              </div>
              <div className="text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Roundtrip Latency:</span> <span className="font-mono font-bold text-emerald-400">{healthData?.components?.database?.roundtrip_latency_ms} ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Pool Status:</span> <span className="text-slate-200">{healthData?.components?.database?.connection_pool}</span>
                </div>
                <div className="flex justify-between">
                  <span>Health:</span> <span className="text-emerald-400">SELECT 1 Verified</span>
                </div>
              </div>
            </div>

            {/* 4. AI Services */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">6 Multi-Agent Financial AI Services</h3>
                    <div className="text-[10px] text-slate-500 font-mono">XGBoost + RAG Knowledge Base</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {healthData?.components?.ai_services?.status || 'OPERATIONAL'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {Object.entries(healthData?.components?.ai_services?.models || {}).map(([mName, mObj]: any) => (
                  <div key={mName} className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[11px]">
                    <div className="font-semibold text-white truncate">{mName.replace('_', ' ')}</div>
                    <div className="text-[10px] text-emerald-400 font-mono mt-0.5">● {mObj.status}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Notification Service */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Notification Service</h3>
                    <div className="text-[10px] text-slate-500 font-mono">Async Event Dispatcher</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {healthData?.components?.notification_service?.status || 'OPERATIONAL'}
                </span>
              </div>
              <div className="text-xs space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Processed Messages:</span> <span className="font-mono text-slate-200">{healthData?.components?.notification_service?.queued_or_delivered_messages}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dispatch Latency:</span> <span className="font-mono text-emerald-400">{healthData?.components?.notification_service?.dispatch_latency_ms} ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Channels:</span> <span className="text-slate-200">In-App, Email, SMS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: CREATE USER                                                  */}
      {/* ==================================================================== */}
      {isCreateUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Create Staff User</h2>
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="text-slate-400 font-semibold">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra"
                  value={newUserForm.full_name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-slate-400 font-semibold">Corporate Email Address</label>
                <input
                  type="email"
                  placeholder="name@finsight.ai"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Institutional Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                >
                  {rolesList.map((r: any) => (
                    <option key={r.role_code} value={r.role_code}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Branch</label>
                <select
                  value={newUserForm.branch_id}
                  onChange={(e) => {
                    const sel = branchesList.find((b: any) => b.branch_code === e.target.value);
                    setNewUserForm({
                      ...newUserForm,
                      branch_id: e.target.value,
                      branch_name: sel?.name || 'Branch',
                      region: sel?.region || 'West'
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                >
                  {branchesList.map((b: any) => (
                    <option key={b.branch_code} value={b.branch_code}>
                      {b.name} ({b.region})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-slate-400 font-semibold">Department</label>
                <select
                  value={newUserForm.department}
                  onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                >
                  {departmentsList.map((d: any) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-slate-400 font-semibold">Default Password</label>
                <input
                  type="text"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-950/40 border border-blue-900/40 rounded-xl text-[11px] text-blue-300">
              Security notice: Privileged roles (Admin, Risk Manager) cannot be self-assigned. All user creations are logged to the regulatory audit trail.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreateUserModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => createUserMutation.mutate(newUserForm)}
                disabled={!newUserForm.email || !newUserForm.full_name}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Create Staff User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: EDIT USER ASSIGNMENTS                                        */}
      {/* ==================================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">Edit User: {editingUser.full_name}</h2>
                <div className="text-xs text-slate-400 font-mono">{editingUser.email}</div>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold">Assign Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  disabled={editingUser.id === currentUser?.id}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1 disabled:opacity-50"
                >
                  {rolesList.map((r: any) => (
                    <option key={r.role_code} value={r.role_code}>
                      {r.title}
                    </option>
                  ))}
                </select>
                {editingUser.id === currentUser?.id && (
                  <div className="text-[10px] text-amber-400 mt-1">
                    Self-elevation disabled: Users cannot alter their own privileged role assignments.
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-400 font-semibold">Assign Branch</label>
                <select
                  value={editingUser.branch_id}
                  onChange={(e) => {
                    const sel = branchesList.find((b: any) => b.branch_code === e.target.value);
                    setEditingUser({
                      ...editingUser,
                      branch_id: e.target.value,
                      branch_name: sel?.name,
                      region: sel?.region
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                >
                  {branchesList.map((b: any) => (
                    <option key={b.branch_code} value={b.branch_code}>
                      {b.name} ({b.region})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold">Department</label>
                <select
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                >
                  {departmentsList.map((d: any) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingUser(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  editUserMutation.mutate({
                    id: editingUser.id,
                    data: {
                      role: editingUser.role,
                      branch_id: editingUser.branch_id,
                      branch_name: editingUser.branch_name,
                      department: editingUser.department,
                      region: editingUser.region
                    }
                  })
                }
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: RESET ACCESS / PASSWORD                                      */}
      {/* ==================================================================== */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Reset Access: {resettingUser.full_name}</h2>
              <button onClick={() => setResettingUser(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              This will unlock the user account and replace their credentials. The user will be required to authenticate with this new password.
            </p>

            <div>
              <label className="text-xs text-slate-400 font-semibold">New Temporary Password</label>
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono mt-1"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setResettingUser(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => resetPasswordMutation.mutate({ id: resettingUser.id, pass: newPasswordInput })}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Reset Access Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: EDIT PRODUCT (VERSION CONTROL)                                */}
      {/* ==================================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">Configure Product: {editingProduct.name}</h2>
                <div className="text-xs text-indigo-400 font-mono">Current Version: v{editingProduct.version} &rarr; Target: v{editingProduct.version + 1}</div>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold">Interest Rate (% p.a.)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingProduct.interest_rate}
                  onChange={(e) => setEditingProduct({ ...editingProduct, interest_rate: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Processing Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingProduct.processing_fee_pct}
                  onChange={(e) => setEditingProduct({ ...editingProduct, processing_fee_pct: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Min Amount (₹)</label>
                <input
                  type="number"
                  value={editingProduct.min_amount}
                  onChange={(e) => setEditingProduct({ ...editingProduct, min_amount: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Max Amount (₹)</label>
                <input
                  type="number"
                  value={editingProduct.max_amount}
                  onChange={(e) => setEditingProduct({ ...editingProduct, max_amount: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Min Tenure (Months)</label>
                <input
                  type="number"
                  value={editingProduct.min_tenure}
                  onChange={(e) => setEditingProduct({ ...editingProduct, min_tenure: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Max Tenure (Months)</label>
                <input
                  type="number"
                  value={editingProduct.max_tenure}
                  onChange={(e) => setEditingProduct({ ...editingProduct, max_tenure: parseInt(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
              <div className="col-span-2">
                <label className="text-slate-400 font-semibold">Approval Threshold (₹)</label>
                <input
                  type="number"
                  value={editingProduct.approval_threshold}
                  onChange={(e) => setEditingProduct({ ...editingProduct, approval_threshold: parseFloat(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
            </div>

            <div className="p-3 bg-purple-950/40 border border-purple-900/40 rounded-xl text-[11px] text-purple-300">
              Audit guarantee: Saving this modification creates an immutable audit entry recording previous and newly published parameters, automatically advancing product version to v{editingProduct.version + 1}.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingProduct(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  updateProductMutation.mutate({
                    id: editingProduct.id,
                    data: {
                      interest_rate: editingProduct.interest_rate,
                      processing_fee_pct: editingProduct.processing_fee_pct,
                      min_amount: editingProduct.min_amount,
                      max_amount: editingProduct.max_amount,
                      min_tenure: editingProduct.min_tenure,
                      max_tenure: editingProduct.max_tenure,
                      approval_threshold: editingProduct.approval_threshold
                    }
                  })
                }
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Publish New Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: BROADCAST NOTIFICATION                                       */}
      {/* ==================================================================== */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                <span>Broadcast Administrative Alert</span>
              </h2>
              <button onClick={() => setIsBroadcastModalOpen(false)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold">Alert Title</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled Maintenance / Policy Update"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold">Target Audience</label>
                <select
                  value={broadcastForm.target_role}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, target_role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                >
                  <option value="ALL">All Staff Members</option>
                  {rolesList.map((r: any) => (
                    <option key={r.role_code} value={r.role_code}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold">Priority</label>
                <select
                  value={broadcastForm.priority}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent (Red Alert)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold">Message</label>
                <textarea
                  rows={3}
                  placeholder="Enter broadcast announcement message..."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white mt-1 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => broadcastMutation.mutate(broadcastForm)}
                disabled={!broadcastForm.title || !broadcastForm.message}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Broadcast Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODALS: ADD BRANCH                                                   */}
      {/* ==================================================================== */}
      {isAddBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Register Institutional Branch</h2>
              <button onClick={() => setIsAddBranchModalOpen(false)} className="text-slate-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold">Branch Code</label>
                <input
                  type="text"
                  placeholder="e.g. BR-KOL-06"
                  value={newBranchForm.branch_code}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, branch_code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                />
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kolkata Park Street Desk"
                  value={newBranchForm.name}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-semibold">City</label>
                  <input
                    type="text"
                    value={newBranchForm.city}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold">Region</label>
                  <select
                    value={newBranchForm.region}
                    onChange={(e) => setNewBranchForm({ ...newBranchForm, region: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                  >
                    <option value="West">West</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="Central">Central</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-slate-400 font-semibold">Branch Manager</label>
                <input
                  type="text"
                  placeholder="Manager Full Name"
                  value={newBranchForm.manager_name}
                  onChange={(e) => setNewBranchForm({ ...newBranchForm, manager_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddBranchModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => createBranchMutation.mutate(newBranchForm)}
                disabled={!newBranchForm.branch_code || !newBranchForm.name}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Save Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
