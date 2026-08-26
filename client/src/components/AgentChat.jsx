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
  : '/api';

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
      content: `Hello! I am your **ReconcileAI Forensic Assistant**. I have read-only access to inspect your settlement batches, batch balance integrity, unpacked order line items, MDR fee variances, and GST tax credits for **Run ${runId || 'N/A'}**.\n\nWhat would you like to inspect?`,
      tools: [],
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  // Dynamically synchronize welcome message with the active runId
  useEffect(() => {
    if (runId && runId !== 'N/A') {
      setMessages((prev) => {
        const hasUserMessage = prev.some((m) => m.role === 'user');
        if (!hasUserMessage) {
          return [
            {
              id: 'welcome',
              role: 'assistant',
              content: `Hello! I am your **ReconcileAI Forensic Assistant**. I have read-only access to inspect your settlement batches, batch balance integrity, unpacked order line items, MDR fee variances, and GST tax credits for **Run ${runId}**.\n\nWhat would you like to inspect?`,
              tools: [],
            },
          ];
        }
        return prev;
      });
    }
  }, [runId]);

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
    const targetRunId = (runId && runId !== 'N/A') ? runId : 'run-seed-razorpay-001';
    if (!text.trim() || isStreaming || !targetRunId) return;

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
      const response = await fetch(`${API_BASE}/runs/${targetRunId}/chat`, {
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
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]"
          />

          {/* Slide-over drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-y-0 right-0 w-full sm:w-[460px] bg-white border-l border-gray-200 shadow-modal flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="flex items-center space-x-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Ask a question about this reconciliation</h3>
                  <p className="text-xs text-gray-500 font-mono">Scoped to Run {runId || 'N/A'}</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}>
                    <div className="flex items-center space-x-1.5 text-[10px] text-gray-400 font-mono">
                      {isUser ? (
                        <>
                          <span>You</span>
                          <User className="h-3 w-3" />
                        </>
                      ) : (
                        <>
                          <Bot className="h-3 w-3 text-blue-600" />
                          <span>Claude AI Auditor</span>
                        </>
                      )}
                    </div>

                    {/* Tool Execution Tags */}
                    {msg.tools && msg.tools.length > 0 && (
                      <div className="w-full space-y-1 my-1">
                        {msg.tools.map((tool, idx) => (
                          <div
                            key={idx}
                            className="text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-600 space-y-0.5"
                          >
                            <div className="flex items-center justify-between font-semibold text-gray-800">
                              <div className="flex items-center space-x-1.5">
                                <Wrench className="h-3.5 w-3.5 text-blue-600" />
                                <span>Tool: {tool.name}</span>
                              </div>
                              {tool.status === 'running' ? (
                                <Loader2 className="h-3.5 w-3.5 text-blue-600 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate font-mono">
                              Input: {JSON.stringify(tool.input)}
                            </div>
                            {tool.result && (
                              <div className="text-[10px] text-emerald-700 truncate font-mono">
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
                        className={`p-3 rounded-xl text-xs leading-relaxed max-w-[90%] whitespace-pre-wrap ${
                          isUser
                            ? 'bg-blue-600 text-white font-medium rounded-br-none shadow-sm'
                            : 'bg-gray-50 border border-gray-200 text-gray-900 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    )}
                  </div>
                );
              })}

              {isStreaming && (
                <div className="flex items-center space-x-2 text-xs text-blue-600 font-mono italic">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Inspecting reconciliation database...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length <= 2 && (
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 space-y-1.5">
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Suggested Questions:</div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(p)}
                      className="text-[11px] bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-md px-2.5 py-1 text-left transition-colors cursor-pointer"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Form */}
            <div className="p-3.5 border-t border-gray-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder="Ask about batches, MDR fees, or GST credits..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isStreaming}
                  className="flex-1 bg-white border border-gray-200 text-gray-900 text-xs rounded-lg px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !inputValue.trim()}
                  className="btn-primary p-2 text-xs"
                >
                  {isStreaming ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
