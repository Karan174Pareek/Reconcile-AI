import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Loader2,
  Wrench,
  CheckCircle2,
  Bot,
  User,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_SERVER_URL
  ? `${import.meta.env.VITE_SERVER_URL}/api`
  : 'http://localhost:5000/api';

const QUICK_PROMPTS = [
  'Why does settlement batch setl_... have a batch imbalance?',
  'What is our total claimable GST Input Tax Credit (18%) this cycle?',
  'List all unrecorded Razorpay orders settled without ledger entries',
  'Show MDR fee breakdown across all balanced settlement batches',
];

export default function AgentChat({ runId, isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your **ReconcileAI Forensic Settlement Auditor**. I have real-time read-only access to inspect Razorpay settlement batches, batch integrity statuses, unpacked order line items, MDR fee variances, and GST Input Tax Credits (ITC) for **Run ${runId || 'N/A'}**.\n\nHow can I assist your settlement audit?`,
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
          />

          {/* Slide-over drawer with spring transition */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-y-0 right-0 w-full sm:w-[480px] bg-navy-950/95 border-l border-white/10 shadow-glass flex flex-col backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-glow-teal">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold text-text-primary">Forensic Agent Chat</h3>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                      Claude 3.5 Sonnet
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary font-mono">Scoped to Run {runId}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
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
                    <div className="flex items-center space-x-1.5 text-[10px] text-text-muted font-mono">
                      {isUser ? (
                        <>
                          <span>You</span>
                          <User className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          <Bot className="h-3 w-3 text-teal-400" />
                          <span>Claude Auditor</span>
                        </>
                      )}
                    </div>

                    {/* Tool Execution Tags (Restrained, Muted) */}
                    {msg.tools && msg.tools.length > 0 && (
                      <div className="w-full space-y-1 my-1">
                        {msg.tools.map((tool, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] font-mono bg-white/[0.02] border border-white/5 rounded-lg p-2 text-text-secondary space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5 text-text-primary font-medium">
                                <Wrench className="h-3 w-3 text-teal-400" />
                                <span>Tool: {tool.name}</span>
                              </div>
                              {tool.status === 'running' ? (
                                <Loader2 className="h-3 w-3 text-teal-400 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3 text-teal-400" />
                              )}
                            </div>
                            <div className="text-[10px] text-text-muted truncate font-mono">
                              Input: {JSON.stringify(tool.input)}
                            </div>
                            {tool.result && (
                              <div className="text-[10px] text-teal-400/90 truncate font-mono">
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
                            ? 'bg-teal-500 text-navy-950 font-medium rounded-br-none shadow-glow-teal'
                            : 'glass-panel-subtle border border-white/10 text-text-primary rounded-bl-none shadow-glass-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    )}
                  </div>
                );
              })}

              {isStreaming && (
                <div className="flex items-center space-x-2 text-xs text-teal-400 font-mono italic">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Claude is inspecting reconciliation database...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length <= 2 && (
              <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/5 space-y-1.5">
                <div className="text-[10px] font-mono text-text-muted uppercase">Suggested Prompts:</div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p)}
                      className="text-[11px] bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary border border-white/5 rounded-lg px-2.5 py-1 text-left transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <div className="p-3.5 border-t border-white/10 bg-white/[0.02]">
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
                  className="flex-1 bg-white/5 border border-white/10 text-text-primary text-xs rounded-lg px-3.5 py-2.5 placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-teal-500/50 focus:border-teal-500 disabled:opacity-50 font-sans"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !inputValue.trim()}
                  className="p-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-navy-950 shadow-glow-teal disabled:opacity-50 transition-all active:scale-98"
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin text-navy-950" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
