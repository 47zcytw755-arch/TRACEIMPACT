import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 blur-[120px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            TraceImpact Cloud SaaS Platform
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            Turn messy data into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-200 to-emerald-400">clear, trustworthy answers.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
            Upload your data, automatically understand its structure and quality, explore personalized dashboards, and ask questions about your data in plain English.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/app" className="w-full sm:w-auto">
              <Button size="lg" variant="primary" className="w-full sm:w-auto text-base font-semibold px-8 py-3.5 shadow-lg shadow-indigo-600/25">
                Get started
                <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Button>
            </Link>
            <a href="#how-it-works" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base">
                See how it works
              </Button>
            </a>
          </div>

          {/* Workflow Visualization */}
          <div id="product" className="mt-16 sm:mt-20">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-6">
              Autonomous End-to-End Data Pipeline
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
              {/* Step 1: Upload */}
              <div className="glass-panel p-5 rounded-xl text-left border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-semibold text-indigo-400">01</span>
                  <Badge variant="info">Input</Badge>
                </div>
                <h2 className="text-sm font-semibold text-white mb-1">Upload</h2>
                <p className="text-xs text-slate-400">Drop CSV, XLSX, JSON, or TXT datasets directly.</p>
              </div>

              {/* Step 2: Analyze */}
              <div className="glass-panel p-5 rounded-xl text-left border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-semibold text-indigo-400">02</span>
                  <Badge variant="default">Engine</Badge>
                </div>
                <h2 className="text-sm font-semibold text-white mb-1">Analyze</h2>
                <p className="text-xs text-slate-400">Automated type inference, schema discovery & statistical profiling.</p>
              </div>

              {/* Step 3: Clean */}
              <div className="glass-panel p-5 rounded-xl text-left border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-semibold text-emerald-400">03</span>
                  <Badge variant="success">Quality</Badge>
                </div>
                <h2 className="text-sm font-semibold text-white mb-1">Clean</h2>
                <p className="text-xs text-slate-400">Detect anomalies, missing values, duplicates & drift.</p>
              </div>

              {/* Step 4: Visualize */}
              <div className="glass-panel p-5 rounded-xl text-left border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-semibold text-indigo-400">04</span>
                  <Badge variant="warning">Insight</Badge>
                </div>
                <h2 className="text-sm font-semibold text-white mb-1">Visualize</h2>
                <p className="text-xs text-slate-400">Auto-generated personalized dashboard & key distributions.</p>
              </div>

              {/* Step 5: Ask */}
              <div className="glass-panel p-5 rounded-xl text-left border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-semibold text-cyan-400">05</span>
                  <Badge variant="info">AI SQL</Badge>
                </div>
                <h2 className="text-sm font-semibold text-white mb-1">Ask</h2>
                <p className="text-xs text-slate-400">Conversational natural-language query with controlled SQL execution.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-20 border-t border-slate-800/80 bg-[#080c14]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="default" className="mb-3">Core Platform Capabilities</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered for data clarity and operational trust
            </h2>
            <p className="mt-4 text-slate-400 text-base">
              Everything you need to convert raw tabular data into validated insights and interactive intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <Card className="hover:border-slate-700 transition-all">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle>Automatic Data Profiling</CardTitle>
                <CardDescription>
                  Instant column cardinality, distributions, null percentages, min/max statistics, and structural classification.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 2 */}
            <Card className="hover:border-slate-700 transition-all">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <CardTitle>Data Quality Detection</CardTitle>
                <CardDescription>
                  Identifies anomalies, out-of-range records, type mismatches, missing values, and calculates a holistic quality score.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 3 */}
            <Card className="hover:border-slate-700 transition-all">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <CardTitle>Personalized Dashboards</CardTitle>
                <CardDescription>
                  Tailored chart widgets, KPIs, distributions, and relationship graphs tailored to your dataset schema.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 4 */}
            <Card className="hover:border-slate-700 transition-all">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <CardTitle>Natural-Language Data Chat</CardTitle>
                <CardDescription>
                  Ask questions in plain English. The engine interprets intent and computes exact aggregations on your dataset.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 5 */}
            <Card className="hover:border-slate-700 transition-all">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <CardTitle>Traceable Results</CardTitle>
                <CardDescription>
                  Every answer provides the underlying SQL query and explanation, guaranteeing complete visibility into how metrics are derived.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Feature 6 */}
            <Card className="hover:border-slate-700 transition-all">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <CardTitle>Secure Data Isolation</CardTitle>
                <CardDescription>
                  Strict workspace-level isolation ensuring your datasets and query results remain private and protected from cross-tenant access.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 border-t border-slate-800/80 bg-[#090d16]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="info" className="mb-3">Simplified Experience</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              How TraceImpact Cloud Works
            </h2>
            <p className="mt-4 text-slate-400 text-base">
              Four intuitive steps from raw files to verified intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="flex flex-col space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-lg">
                01
              </div>
              <h3 className="text-lg font-semibold text-white">Upload Dataset</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Provide your CSV, XLSX, JSON, or TXT file through our secure web interface or drag-and-drop uploader.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-lg">
                02
              </div>
              <h3 className="text-lg font-semibold text-white">Analyze & Profile</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                The automated pipeline infers data types, detects formatting anomalies, and computes comprehensive quality metrics.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-lg">
                03
              </div>
              <h3 className="text-lg font-semibold text-white">Explore Dashboard</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Interact with auto-configured ECharts visualizations, trend lines, categorical distributions, and statistical summaries.
              </p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-lg">
                04
              </div>
              <h3 className="text-lg font-semibold text-white">Ask in Plain English</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Chat with your dataset naturally. The AI translator generates validated, read-only SQL queries with verifiable output.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Security Section */}
      <section id="security" className="py-20 border-t border-slate-800/80 bg-[#070a12]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="warning" className="mb-3">Security & Trust</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Architected with strict boundaries and data control
            </h2>
            <p className="mt-4 text-slate-400 text-base">
              We uphold defensive engineering standards to protect your datasets and queries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="glass-panel p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <h3 className="text-base font-semibold text-white">Workspace Isolation</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Datasets belong strictly to their designated workspace boundary. Data is logically segmented to prevent cross-tenant exposure.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-2 w-2 rounded-full bg-indigo-400" />
                <h3 className="text-base font-semibold text-white">Controlled SQL Execution</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                AI queries pass through a strict server-side validation layer. Only read-only queries against permitted tables are executed.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-2 w-2 rounded-full bg-cyan-400" />
                <h3 className="text-base font-semibold text-white">Server-Side Confidentiality</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                All sensitive API keys, database credentials, and execution logic remain server-side. No client-side database exposure.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <h3 className="text-base font-semibold text-white">Prohibited Mutation Vectors</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                Mutation statements (such as DROP, DELETE, INSERT, UPDATE) and multi-statement SQL are prohibited and rejected before execution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-slate-800/80 bg-gradient-to-b from-[#080c14] to-[#090d16] text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4">
            Ready to understand your data?
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto mb-8">
            Experience automated profiling, proactive data quality, and natural language analytics in your workspace.
          </p>
          <Link href="/app">
            <Button size="lg" variant="primary" className="text-base font-semibold px-8 py-3.5 shadow-xl shadow-indigo-600/30">
              Create your workspace
              <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
