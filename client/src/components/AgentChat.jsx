import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Loader2,
  Wrench,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Bot,
  User,
  Zap,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : 'http://localhost:5000/api';

const QUICK_PROMPTS = [
  'Show high-confidence exceptions and their rationales',
  'What bank fee charges were identified without ledger records?',
  'Give me a breakdown of verified exact vs fuzzy matches',
  'Inspect recent audit trail log entries for this run',
];

export default function AgentChat({ runId, isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **ReconcileAI Forensic Assistant**. I have live read-only access to query matches, exceptions, and audit logs for **Run ${runId || 'N/A'}**.\n\nHow can I assist your reconciliation audit?`,
      tools: [],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isStreaming || !runId) return;

    const userMessageId = `msg-${Date.now()}`;
    const assistantMessageId = `msg-assistant-${Date.now()}`;

    const newMessages = [
      ...messages,
      { id: userMessageId, role: 'user', content: text },
    ];

    setMessages(newMessages);
    setInputValue('');
    setIsStreaming(true);

    // Placeholder assistant message for incoming stream
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        tools: [],
      },
    ]);

    try {
      const response = await fetch(`${API_BASE}/runs/${runId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.body) {
        throw new Error('No response stream available');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace(/^data: /, '').trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === 'text') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + event.content }
                      : msg
                  )
                );
              } else if (event.type === 'tool_start') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          tools: [
                            ...msg.tools,
                            {
                              id: event.tool_use_id,
                              name: event.tool_name,
                              input: event.input,
                              status: 'running',
                            },
                          ],
                        }
                      : msg
                  )
                );
              } else if (event.type === 'tool_result') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          tools: msg.tools.map((t) =>
                            t.name === event.tool_name
                              ? { ...t, result: event.result, status: 'complete' }
                              : t
                          ),
                        }
                      : msg
                  )
                );
              } else if (event.type === 'error') {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + `\n\n*Error: ${event.message}*` }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error('SSE JSON parse error:', e, jsonStr);
            }
          }
        }
      }
    } catch (err) {
      console.error('[AgentChat Error]:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: msg.content + `\n\n*Failed to connect to agent: ${err.message}*` }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-slideLeft">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-850/80 backdrop-blur-md">
        <div className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-600 to-brand-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-white">Forensic Agent Chat</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-400 border border-purple-800/60">
                Claude 3.5 Sonnet
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Scoped to Run {runId}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}>
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 font-mono">
                {isUser ? (
                  <>
                    <span>You</span>
                    <User className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    <Bot className="h-3 w-3 text-purple-400" />
                    <span>Claude Auditor</span>
                  </>
                )}
              </div>

              {/* Tool Execution Badges */}
              {msg.tools && msg.tools.length > 0 && (
                <div className="w-full space-y-1.5 my-1">
                  {msg.tools.map((tool, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] font-mono bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-slate-300 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-purple-300 font-semibold">
                          <Wrench className="h-3 w-3" />
                          <span>Tool: {tool.name}</span>
                        </div>
                        {tool.status === 'running' ? (
                          <Loader2 className="h-3 w-3 text-brand-400 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        Input: {JSON.stringify(tool.input)}
                      </div>
                      {tool.result && (
                        <div className="text-[10px] text-emerald-400/90 truncate">
                          Result: {tool.result.count !== undefined ? `${tool.result.count} records returned` : JSON.stringify(tool.result)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message Content Bubble */}
              {msg.content && (
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[92%] whitespace-pre-wrap ${
                    isUser
                      ? 'bg-brand-600 text-white rounded-br-none shadow-md shadow-brand-600/10'
                      : 'bg-slate-850 border border-slate-750 text-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center space-x-2 text-xs text-purple-400 font-mono italic">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Claude is inspecting reconciliation database...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 space-y-1.5">
          <div className="text-[10px] font-mono text-slate-500 uppercase">Suggested Prompts:</div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                className="text-[11px] bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 rounded-lg px-2.5 py-1 text-left transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-850/60">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask anything about transactions, exceptions, or audit logs..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isStreaming}
            className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !inputValue.trim()}
            className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all"
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
