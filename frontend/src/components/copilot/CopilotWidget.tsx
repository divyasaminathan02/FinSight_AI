import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, Sparkles, User, ShieldCheck, Activity, CreditCard, 
  ChevronRight, Database, BookOpen, Layers, Terminal, AlertCircle, 
  ExternalLink, Copy, Check, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { copilotApi } from '../../services/api';
import { Badge } from '../common/Badge';

export interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  toolsCalled?: Array<{ tool: string; args?: any; status: string }>;
  financialData?: {
    category: string;
    metrics: Array<{ label: string; value: string }>;
  };
  evidenceBreakdown?: Array<{ agent: string; signal: string }>;
  policyReferences?: Array<{ title: string; source: string; snippet: string }>;
  suggestedFollowups?: string[];
  timestamp: string;
  providerUsed?: string;
}

interface CopilotWidgetProps {
  isFloating?: boolean;
  onClose?: () => void;
}

export const CopilotWidget: React.FC<CopilotWidgetProps> = ({ isFloating = false, onClose }) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello, I am FinSight AI Copilot. I coordinate across all 6 specialized domain agents (Credit, Fraud, Customer 360, Collections, Portfolio Risk, and Liquidity). I query actual ML models, database states, and RAG regulatory guidelines rather than generating ungrounded responses.",
      financialData: {
        category: "Institutional Synchronized State",
        metrics: [
          { label: "Active ML Agents", value: "6 Production Pipelines" },
          { label: "Policy Knowledge Base", value: "RAG Ingested" },
          { label: "Decision Engine", value: "Rules Separated from LLM" },
        ]
      },
      evidenceBreakdown: [
        { agent: "System Architecture", signal: "LLM operates as an explanatory synthesizer; mathematical underwriting is executed by deterministic models." }
      ],
      suggestedFollowups: [
        "What is driving portfolio risk?",
        "Why was customer CUST-00001 flagged?",
        "What is the 30-day liquidity outlook?",
        "Which regions have worsening collection performance?",
        "Explain the latest loan decision."
      ],
      timestamp: "Live",
      providerUsed: "Gemini / Multi-Agent Hybrid"
    }
  ]);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<{ [msgId: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isTyping) return;

    const userMsg: CopilotMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await copilotApi.chat(query);
      const assistantMsg: CopilotMessage = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: res.text,
        toolsCalled: res.tools_called,
        financialData: res.financial_data,
        evidenceBreakdown: res.evidence_breakdown,
        policyReferences: res.policy_references,
        suggestedFollowups: res.suggested_followups,
        timestamp: res.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        providerUsed: res.provider_used
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `Error connecting to Copilot service: ${err?.message || 'Server timeout'}. Please verify backend FastAPI is running.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleEvidence = (id: string) => {
    setExpandedEvidence(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className={`flex flex-col bg-white overflow-hidden ${
      isFloating 
        ? 'h-[640px] w-[460px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl border border-slate-300' 
        : 'h-[calc(100vh-8.5rem)] finsight-card'
    }`}>
      {/* Copilot Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">FinSight AI Copilot</span>
              <Badge variant="positive">Multi-Agent Synced</Badge>
            </div>
            <span className="text-[10px] text-slate-300">Ground-truth reasoning via 6 ML agents & RAG</span>
          </div>
        </div>

        {isFloating && onClose && (
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[92%] rounded-xl p-3.5 space-y-2.5 ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white shadow-xs rounded-br-none' 
                : 'bg-slate-50 border border-slate-200/90 text-slate-800 shadow-xs rounded-bl-none'
            }`}>
              
              {/* Message Header for Assistant */}
              {msg.sender === 'assistant' && (
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 text-[10px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    FinSight Intelligence Engine
                  </span>
                  <span>{msg.timestamp}</span>
                </div>
              )}

              {/* Text Body */}
              <div className="leading-relaxed whitespace-pre-wrap font-normal">
                {msg.text}
              </div>

              {/* Financial Metric Card (Ground Truth DB/Model Data) */}
              {msg.financialData && (
                <div className="mt-2 p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-xs space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                    <span className="flex items-center gap-1 text-blue-700">
                      <Database className="w-3 h-3" />
                      {msg.financialData.category}
                    </span>
                    <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Actual Data
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    {msg.financialData.metrics.map((m, idx) => (
                      <div key={idx} className="bg-slate-50 p-1.5 rounded">
                        <div className="text-[9px] text-slate-500">{m.label}</div>
                        <div className="text-xs font-bold text-slate-900 font-mono">{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tools Called Badge Bar */}
              {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[9px] text-slate-400 font-mono flex items-center gap-0.5">
                    <Terminal className="w-2.5 h-2.5" /> Tools:
                  </span>
                  {msg.toolsCalled.map((t, idx) => (
                    <span key={idx} className="text-[9px] bg-slate-200/70 text-slate-700 font-mono px-1.5 py-0.5 rounded">
                      {t.tool}()
                    </span>
                  ))}
                </div>
              )}

              {/* Expandable Reasoning Evidence Drawer */}
              {msg.evidenceBreakdown && msg.evidenceBreakdown.length > 0 && (
                <div className="border-t border-slate-200/60 pt-1.5">
                  <button 
                    onClick={() => toggleEvidence(msg.id)}
                    className="flex items-center justify-between w-full text-[10px] text-slate-500 hover:text-slate-800 font-semibold"
                  >
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-indigo-500" />
                      Agent Evidence Breakdown ({msg.evidenceBreakdown.length})
                    </span>
                    {expandedEvidence[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {expandedEvidence[msg.id] && (
                    <div className="mt-2 space-y-1.5 text-[10px]">
                      {msg.evidenceBreakdown.map((ev, idx) => (
                        <div key={idx} className="p-1.5 bg-slate-100/70 rounded border border-slate-200">
                          <span className="font-bold text-slate-800">{ev.agent}: </span>
                          <span className="text-slate-600">{ev.signal}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* RAG Policy References */}
              {msg.policyReferences && msg.policyReferences.length > 0 && (
                <div className="p-2 bg-indigo-50/60 rounded border border-indigo-100 text-[10px] space-y-1">
                  <div className="font-bold text-indigo-900 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-indigo-600" />
                    Regulatory Policy Citation (RAG)
                  </div>
                  {msg.policyReferences.map((ref, idx) => (
                    <div key={idx} className="text-indigo-800">
                      <span className="font-semibold">{ref.title}: </span>
                      <span className="text-indigo-950 font-normal">{ref.snippet}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Bar */}
              {msg.sender === 'assistant' && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 text-[10px] text-slate-400">
                  <button 
                    onClick={() => copyToClipboard(msg.text, msg.id)}
                    className="hover:text-slate-700 flex items-center gap-1"
                  >
                    {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                  </button>
                  <span className="text-[9px] font-mono">{msg.providerUsed || 'Hybrid'}</span>
                </div>
              )}

            </div>

            {/* Suggested Followups */}
            {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
              <div className="mt-2 space-y-1 max-w-[92%]">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider pl-1">Suggested Follow-ups</div>
                <div className="flex flex-wrap gap-1.5">
                  {msg.suggestedFollowups.map((sug, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleSendMessage(sug)}
                      className="text-[11px] bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 px-2.5 py-1 rounded-full border border-slate-200 hover:border-blue-300 transition-colors text-left"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-500 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 w-fit">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Consulting ML agents & RAG policy context...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/80 shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input 
            type="text"
            placeholder="Ask Copilot about portfolio risk, customer CUST-00001, liquidity, or loan decisions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
            className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isTyping}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2 rounded-lg transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
