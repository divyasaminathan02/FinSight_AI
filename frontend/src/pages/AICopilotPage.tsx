import React, { useState } from 'react';
import { Bot, Send, Sparkles, User, ShieldCheck, Activity, CreditCard, ChevronRight } from 'lucide-react';

interface CopilotMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  agentCoordination?: string[];
  timestamp: string;
}

export const AICopilotPage: React.FC = () => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello Arjun. I am FinSight AI Copilot, your coordinated portfolio intelligence partner. I synchronize live intelligence across all 6 NBFC agents (Credit, Fraud, Customer, Collections, Risk, and Liquidity). How can I assist your portfolio analysis today?',
      agentCoordination: ['Credit Intelligence', 'Risk Intelligence', 'Fraud Intelligence'],
      timestamp: '10:15 AM',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim()) return;

    const userMsg: CopilotMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let responseText = '';
      let coordination = ['Risk Intelligence', 'Collections Intelligence'];

      if (prompt.toLowerCase().includes('south') || prompt.toLowerCase().includes('delinquency')) {
        responseText = 'South Region vehicle loan delinquency spiked +4.2% (mainly in Tamil Nadu and Karnataka). In response, Collections Agent deployed automated digital voice bots to Bucket 1 borrowers, while Credit Agent lowered LTV approval threshold by 5% for incoming vehicle applications.';
        coordination = ['Collections Intelligence', 'Credit Intelligence', 'Risk Intelligence'];
      } else if (prompt.toLowerCase().includes('fraud') || prompt.toLowerCase().includes('device')) {
        responseText = 'Fraud Intelligence Agent isolated 12 loan applications sharing hardware fingerprint `DEV-SHR-FINGERPRINT-8492`. Total intercepted exposure is ₹84.5 Lakhs. Downstream agents have flagged associated applicant PANs for syndicate review.';
        coordination = ['Fraud Intelligence', 'Credit Intelligence'];
      } else if (prompt.toLowerCase().includes('liquidity') || prompt.toLowerCase().includes('alm')) {
        responseText = 'Liquidity position is ₹126.4 Cr with an LCR buffer ratio of 1.45x. Inflows for the next 30 days are forecasted at ₹94.8 Cr against equal debt/disbursement commitments. The portfolio remains resilient under a 30% stress shock scenario.';
        coordination = ['Liquidity Intelligence', 'Finance Manager'];
      } else {
        responseText = `Portfolio health is currently Optimal. AUM stands at ₹842.6 Cr (+8.4% YoY), active loan portfolio at ₹718.2 Cr (+6.1%), and collection efficiency at 94.7%. 6 autonomous agents are continuously collaborating to optimize recovery and prevent fraud.`;
      }

      const botMsg: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: responseText,
        agentCoordination: coordination,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 900);
  };

  const SUGGESTIONS = [
    'Explain the vehicle delinquency spike in South Region',
    'Summarize active fraud syndicate alerts and device collisions',
    'What is our 30-day ALM liquidity forecast and stress buffer?',
    'Show top at-risk MSME borrowers in the textile cluster',
  ];

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col finsight-card overflow-hidden bg-white">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              FinSight Coordinated AI Copilot
              <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-200">
                Multi-Agent Synced
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">Autonomous reasoning across 6 intelligence domains</p>
          </div>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-2xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0 ${
                msg.sender === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-3.5 rounded-lg text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-50 text-slate-900 border border-slate-200 shadow-2xs'
              }`}
            >
              <p>{msg.text}</p>

              {msg.agentCoordination && (
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Coordinated:
                  </span>
                  {msg.agentCoordination.map((ag) => (
                    <span
                      key={ag}
                      className="text-[10px] bg-blue-100/70 text-blue-800 font-semibold px-1.5 py-0.2 rounded border border-blue-200/60"
                    >
                      {ag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 bg-slate-50 text-slate-500 rounded-lg text-xs border border-slate-200 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span>Synthesizing multi-agent intelligence telemetry...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions Strip */}
      <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[11px]">
        <span className="text-slate-400 font-medium shrink-0">Quick Queries:</span>
        {SUGGESTIONS.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSend(sug)}
            className="px-2.5 py-1 bg-white border border-slate-200 hover:border-blue-400 hover:text-blue-700 text-slate-700 rounded-full shrink-0 transition-colors cursor-pointer"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask FinSight AI Copilot about portfolio risk, collections, fraud collisions..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md outline-none focus:border-blue-500"
        />
        <button
          onClick={() => handleSend()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
