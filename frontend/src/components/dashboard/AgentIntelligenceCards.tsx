import React from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  ShieldAlert,
  Users,
  PiggyBank,
  Activity,
  Coins,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { AgentCardData } from '../../types';
import { Badge } from '../common/Badge';

interface AgentIntelligenceCardsProps {
  agents: AgentCardData[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  CreditCard,
  ShieldAlert,
  Users,
  PiggyBank,
  Activity,
  Coins,
};

export const AgentIntelligenceCards: React.FC<AgentIntelligenceCardsProps> = ({ agents }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Coordinated AI Intelligence Network</h2>
          <span className="text-[11px] font-semibold text-slate-500">(6 Autonomous Agents Active)</span>
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Continuous Real-time Evaluation</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const Icon = ICON_MAP[agent.icon_name] || Activity;
          const isElevated = agent.status_type === 'elevated';
          const isPositive = agent.status_type === 'positive';
          const isWarning = agent.status_type === 'warning';

          return (
            <div
              key={agent.id}
              className={`finsight-card p-4.5 flex flex-col justify-between relative overflow-hidden transition-all ${
                isElevated ? 'border-orange-300 bg-orange-50/10' : ''
              }`}
            >
              {/* Card Header: Agent Name, Icon & Status */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isElevated
                          ? 'bg-orange-100 text-orange-700'
                          : isPositive
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                        {agent.short_name}
                      </h3>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{agent.last_updated}</span>
                        <span>•</span>
                        <span>{agent.execution_time_ms}ms</span>
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant={
                      isElevated
                        ? 'elevated'
                        : isPositive
                        ? 'positive'
                        : isWarning
                        ? 'warning'
                        : 'neutral'
                    }
                    pulse={isElevated}
                  >
                    {agent.status}
                  </Badge>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-slate-50/80 rounded-md border border-slate-100">
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-600 truncate">
                      {agent.key_metric_label}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                      {agent.key_metric_value}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-semibold text-slate-600 truncate">
                      {agent.secondary_metric_label}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5 truncate">
                      {agent.secondary_metric_value}
                    </div>
                  </div>
                </div>

                {/* Trend Note */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-3 px-0.5">
                  <span className="font-medium text-slate-600">Model Trend:</span>
                  <span
                    className={`font-semibold flex items-center gap-1 ${
                      agent.trend_direction === 'up' && !isElevated
                        ? 'text-emerald-600'
                        : agent.trend_direction === 'down' && !isElevated
                        ? 'text-blue-600'
                        : 'text-orange-600'
                    }`}
                  >
                    {agent.trend}
                  </span>
                </div>
              </div>

              {/* Action Button: View intelligence */}
              <Link
                to={agent.route}
                className="w-full mt-1 py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-md text-xs font-semibold text-slate-800 flex items-center justify-between transition-all group-hover:shadow-2xs"
              >
                <span>{agent.action_label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};
