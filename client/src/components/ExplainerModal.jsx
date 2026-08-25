import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bot,
  UserCheck,
} from 'lucide-react';

export default function ExplainerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-[2px]"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className="relative w-full max-w-2xl bg-white rounded-xl shadow-modal border border-gray-200 overflow-hidden z-10 my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">How ReconcileAI Works</h3>
                <p className="text-xs text-gray-500">A clear, simple guide to automated reconciliation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 text-sm text-gray-600 max-h-[75vh] overflow-y-auto">
            {/* What is this tool? */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900">What is this tool?</h4>
              <p className="leading-relaxed">
                ReconcileAI matches your bank statements against your internal accounting ledger automatically. It replaces tedious spreadsheet comparison with deterministic matching and transparent AI forensics.
              </p>
            </div>

            {/* The Problem & 90/10 Rule */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 space-y-2">
              <div className="flex items-center space-x-2 text-blue-900 font-semibold text-xs uppercase tracking-wider">
                <Zap className="h-4 w-4 text-blue-600" />
                <span>The 90/10 Principle</span>
              </div>
              <p className="text-xs text-blue-950 leading-relaxed">
                Manual reconciliation is slow and prone to human oversight. ReconcileAI automatically clears the straightforward <strong>90%</strong> of standard matches and isolates the complex <strong>10%</strong> (payment gateway fees, GST credits, timing lags, and refunds) into a structured queue for human review — rather than pretending everything matched.
              </p>
            </div>

            {/* 3 Step Workflow */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-900">3 Simple Steps to Reconcile</h4>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block text-xs">Upload Statements & Ledger</span>
                    <span className="text-xs text-gray-500">
                      Upload your bank CSV and ledger CSV, or click "Generate Seed" to test with a realistic 500-record benchmark batch.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block text-xs">Run Automated Reconciliation</span>
                    <span className="text-xs text-gray-500">
                      The engine verifies batch integrity, matches net amounts to bank deposits, unpacks order line items, and categorizes 2% MDR fees and 18% GST tax credits.
                    </span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 bg-white">
                  <div className="h-6 w-6 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900 block text-xs">Review Exceptions & Approve Actions</span>
                    <span className="text-xs text-gray-500">
                      Inspect flagged variances in plain English, accept or reject explanations, and approve AI-drafted vendor emails or journal corrections.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Security and Human Control Note */}
            <div className="flex items-start space-x-3 p-3.5 rounded-lg bg-gray-50 border border-gray-200">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600 space-y-1">
                <span className="font-semibold text-gray-900 block">You are always in complete control</span>
                <span>
                  The AI assistant suggests actions, but never modifies your actual bank accounts or executes financial transfers without explicit human approval. All actions are logged permanently to the Audit Trail.
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
            <button
              onClick={onClose}
              className="btn-primary text-xs"
            >
              Got it, let's reconcile
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
