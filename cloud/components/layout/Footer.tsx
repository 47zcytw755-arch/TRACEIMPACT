import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#070a12] text-slate-400 text-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
                T
              </div>
              <span className="font-bold text-white text-base">TraceImpact Cloud</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Autonomous data quality, continuous profiling, personalized dashboards, and controlled AI SQL chat.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Product</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/app" className="hover:text-white transition-colors">Workspace</Link></li>
              <li><Link href="/app/upload" className="hover:text-white transition-colors">Dataset Ingestion</Link></li>
              <li><Link href="/app/dashboard" className="hover:text-white transition-colors">Data Profiling</Link></li>
              <li><Link href="/app/chat" className="hover:text-white transition-colors">AI Data Chat</Link></li>
            </ul>
          </div>

          {/* Architecture & Trust */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Trust & Architecture</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/#security" className="hover:text-white transition-colors">Security Architecture</Link></li>
              <li><Link href="/#security" className="hover:text-white transition-colors">Workspace Isolation</Link></li>
              <li><Link href="/#security" className="hover:text-white transition-colors">Controlled SQL Engine</Link></li>
              <li><span className="text-slate-500 cursor-not-allowed">Privacy Policy (Planned)</span></li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="https://github.com/traceimpact/traceimpact-cloud" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub Repository</a></li>
              <li><Link href="/docs" className="hover:text-white transition-colors">System Documentation</Link></li>
              <li><a href="#how-it-works" className="hover:text-white transition-colors">Platform Workflow</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} TraceImpact Cloud. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Next.js 16 • React 19 • Tailwind CSS</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              SaaS Foundation v1.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
