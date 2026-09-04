'use client';

import { useState, useMemo } from 'react';
import { discardJob, updateJobStatus } from '@/app/actions';
import { useRouter } from 'next/navigation';
import {
  Cpu,
  ThumbsDown,
  DollarSign,
  SlidersHorizontal,
  Search,
  X,
} from 'lucide-react';
import JobModal from './JobModal';
import RefreshFeedsButton from './RefreshFeedsButton';
import { Job } from '@prisma/client';

type QuickFilter = 'pending' | 'high_rate' | 'high_match' | 'analyzed';

interface Props {
  jobs: Job[];
  minHourlyRate: number;
}

// Parse a free-form salary string to an hourly-rate equivalent
function parseSalaryToHourly(salaryRange: string | null): number | null {
  if (!salaryRange) return null;
  const hrMatch = salaryRange.match(/\$?([\d,]+)\s*\/\s*hr/i);
  if (hrMatch) return parseInt(hrMatch[1].replace(',', ''));
  const yearMatch = salaryRange.match(/\$?([\d,]+)k?\s*\/?\s*year/i);
  if (yearMatch) return Math.round((parseInt(yearMatch[1].replace(',', '')) * 1000) / 2080);
  const kStandalone = salaryRange.match(/\$?([\d,]+)k\b/i);
  if (kStandalone) return Math.round((parseInt(kStandalone[1].replace(',', '')) * 1000) / 2080);
  const monthMatch = salaryRange.match(/\$?([\d,]+)\s*\/\s*mo/i);
  if (monthMatch) return Math.round(parseInt(monthMatch[1].replace(',', '')) / 160);
  return null;
}

function getMatchStyle(score: number) {
  if (score >= 90) return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  if (score >= 70) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (score >= 50) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-slate-400 bg-slate-800 border-slate-700';
}

function getMatchLabel(score: number) {
  if (score >= 90) return '🔥 Excelente Match';
  if (score >= 70) return '✓ Buen Match';
  return 'Analizado';
}

export default function DashboardJobs({ jobs, minHourlyRate }: Props) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<QuickFilter>>(new Set());
  const router = useRouter();

  const toggleFilter = (f: QuickFilter) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  const clearFilters = () => {
    setSearchText('');
    setActiveFilters(new Set());
  };

  const hasActiveFilters =
    searchText.trim() !== '' || activeFilters.size > 0;

  // Client-side filtering — fast for the expected volume of jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // --- Text search ---
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        const inTitle = job.title.toLowerCase().includes(q);
        const inCompany = job.company.toLowerCase().includes(q);
        const inDesc = (job.description ?? '').toLowerCase().includes(q);
        if (!inTitle && !inCompany && !inDesc) return false;
      }

      // --- Quick filters (OR logic: show if job matches ANY active filter) ---
      if (activeFilters.size > 0) {
        const isPending = activeFilters.has('pending') && !job.analyzed;
        const isAnalyzed = activeFilters.has('analyzed') && job.analyzed;
        const isHighMatch = activeFilters.has('high_match') && (job.matchScore ?? 0) >= 90;
        const isHighRate = activeFilters.has('high_rate') && (() => {
          const hr = parseSalaryToHourly(job.salaryRange);
          return hr !== null && hr >= minHourlyRate;
        })();
        if (!isPending && !isAnalyzed && !isHighMatch && !isHighRate) return false;
      }

      return true;
    });
  }, [jobs, searchText, activeFilters, minHourlyRate]);

  const handleAnalyze = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalyzingIds((prev) => new Set(prev).add(jobId));
    try {
      const res = await fetch(`/api/jobs/analyze/${jobId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (selectedJob?.id === jobId) setSelectedJob(data.data);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const quickFilterConfig: { id: QuickFilter; label: string; activeClass: string }[] = [
    {
      id: 'pending',
      label: '⏳ Sin Analizar',
      activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      id: 'high_rate',
      label: `💰 Alta Rem. (≥$${minHourlyRate}/hr)`,
      activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      id: 'high_match',
      label: '✨ Match ≥ 90%',
      activeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    },
    {
      id: 'analyzed',
      label: '✅ Analizados',
      activeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        {/* Top row: search · source · rate badge */}
        <div className="flex gap-3 flex-wrap">
          {/* Search input */}
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar rol (React, Next.js, Design Systems), empresa o skill..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Rate display — reads from ProfileSettings (passed as prop) */}
          <div className="bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 flex items-center gap-3 min-w-[210px]">
            <DollarSign className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Tarifa Mínima USD</span>
                <span className="text-white font-bold">${minHourlyRate} USD/hr</span>
              </div>
              <div className="h-1 bg-slate-800 rounded-full">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all"
                  style={{ width: `${Math.min(((minHourlyRate - 30) / 70) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick-filter toggle buttons */}
        <div className="flex gap-2 items-center flex-wrap">
          {quickFilterConfig.map((f) => {
            const isActive = activeFilters.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  isActive
                    ? f.activeClass
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            );
          })}

          {/* Static badge showing active profile rate */}
          <div className="flex items-center gap-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded-md text-xs font-medium">
            <SlidersHorizontal className="w-3 h-3" />
            Filtros de Mi Perfil (${minHourlyRate}/hr)
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-200 text-xs font-medium px-2 transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* ── Results summary + refresh ────────────────────────────────── */}
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h2 className="text-sm text-slate-300">
          Mostrando{' '}
          <strong className="text-white">{filteredJobs.length}</strong> de {jobs.length} vacantes
          disponibles sin aplicar
          {hasActiveFilters && (
            <span className="text-cyan-400 ml-1">(filtradas)</span>
          )}
        </h2>
        <RefreshFeedsButton />
      </div>

      {/* ── Empty state ──────────────────────────────────────────────── */}
      {filteredJobs.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <DollarSign className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No se encontraron vacantes</h3>
          <p className="text-sm text-slate-400 max-w-md">
            {hasActiveFilters
              ? 'Probá ajustando los filtros activos o hacé clic en "Limpiar Filtros".'
              : 'Prueba bajando el requerimiento de tarifa mínima o usa el botón de buscar vacantes reales.'}
          </p>
        </div>
      ) : (
        /* ── Job cards grid ─────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredJobs.map((job) => {
            const isHighMatch = job.analyzed && (job.matchScore ?? 0) >= 90;
            const isPending = !job.analyzed;

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`bg-slate-950 border cursor-pointer rounded-lg p-4 transition-all flex flex-col h-full
                  ${isHighMatch
                    ? 'border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.07)] hover:shadow-[0_0_22px_rgba(6,182,212,0.14)]'
                    : isPending
                    ? 'border-amber-500/15 hover:border-amber-400/35'
                    : 'border-slate-800 hover:border-slate-600'
                  }
                `}
              >
                {/* Company + salary */}
                <div className="flex justify-between items-start mb-2 gap-2">
                  <span className="text-xs text-slate-400 font-medium truncate">{job.company}</span>
                  {job.salaryRange && (
                    <span className="text-xs font-bold text-emerald-400 whitespace-nowrap shrink-0">
                      {job.salaryRange}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-slate-200 text-sm mb-3 leading-tight flex-1">
                  {job.title}
                </h3>

                {/* Status badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {isPending && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      ⏳ Sin analizar
                    </span>
                  )}
                  {job.analyzed && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getMatchStyle(job.matchScore ?? 0)}`}>
                      Match: {job.matchScore}%
                    </span>
                  )}
                  {job.source && (
                    <span className="text-[10px] text-slate-600 px-1 py-0.5 truncate max-w-[100px]">
                      {job.source}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <div className="border-t border-slate-800 pt-3 mt-auto w-full">
                  {isPending ? (
                    <button
                      onClick={(e) => handleAnalyze(job.id, e)}
                      disabled={analyzingIds.has(job.id)}
                      className="w-full bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/60 border border-cyan-500/30 rounded-md py-2 font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm"
                    >
                      {analyzingIds.has(job.id) ? (
                        <><Cpu className="w-4 h-4 animate-spin" /> Analizando...</>
                      ) : (
                        <><Cpu className="w-4 h-4" /> Analizar con IA</>
                      )}
                    </button>
                  ) : (
                    <span className={`inline-flex text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${getMatchStyle(job.matchScore ?? 0)}`}>
                      {getMatchLabel(job.matchScore ?? 0)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Job Modal ────────────────────────────────────────────────── */}
      {selectedJob && (
        <JobModal
          selectedJob={selectedJob}
          setSelectedJob={setSelectedJob}
          footerButtons={
            <>
              <button
                onClick={async () => {
                  const res = await discardJob(selectedJob.id);
                  if (res.success) setSelectedJob(null);
                }}
                className="flex items-center gap-2 bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                <ThumbsDown className="w-4 h-4" /> Descartar
              </button>

              <button
                onClick={async () => {
                  const res = await updateJobStatus(selectedJob.id, 'APPLIED');
                  if (res.success) setSelectedJob(null);
                }}
                className="flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-600/30 transition-colors"
              >
                Marcar como Aplicada
              </button>

              {!selectedJob.analyzed && (
                <button
                  onClick={(e) => handleAnalyze(selectedJob.id, e)}
                  disabled={analyzingIds.has(selectedJob.id)}
                  className="flex items-center gap-2 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {analyzingIds.has(selectedJob.id) ? (
                    <><Cpu className="w-4 h-4 animate-spin" /> Analizando...</>
                  ) : (
                    <><Cpu className="w-4 h-4" /> Analizar con IA</>
                  )}
                </button>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
