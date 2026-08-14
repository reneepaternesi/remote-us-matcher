'use client';

import { useState } from 'react';
import { discardJob, updateJobStatus } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { Cpu, ThumbsDown, DollarSign } from 'lucide-react';
import JobModal from './JobModal';
import { Job } from '@prisma/client';

export default function DashboardJobs({ jobs }: { jobs: Job[] }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const handleAnalyze = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalyzingIds(prev => new Set(prev).add(jobId));
    try {
      const res = await fetch(`/api/jobs/analyze/${jobId}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (selectedJob?.id === jobId) {
          setSelectedJob(data.data);
        }
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-16 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <DollarSign className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No se encontraron vacantes</h3>
        <p className="text-sm text-slate-400 max-w-md">Prueba bajando el requerimiento de tarifa mínima o usa el botón de buscar vacantes reales.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Grid of Small Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {jobs.map((job) => (
          <div 
            key={job.id} 
            onClick={() => setSelectedJob(job)}
            className="bg-slate-950 border border-slate-800 hover:border-slate-600 cursor-pointer rounded-lg p-4 transition-colors flex flex-col h-full"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs text-slate-400 font-medium truncate max-w-[60%]">{job.company}</span>
              <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">{job.salaryRange || 'N/A'}</span>
            </div>
            <h3 className="font-bold text-slate-200 text-sm mb-4 leading-tight flex-1">
              {job.title}
            </h3>
            
            {job.analyzed && (
              <div className="flex justify-between items-center text-[10px] text-slate-500 mb-4">
                <span>Match: {job.matchScore}%</span>
                <span>Analizado</span>
              </div>
            )}
            
            <div className="border-t border-slate-800 pt-3 mt-auto w-full">
              {!job.analyzed && (
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
              )}
              {job.analyzed && (
                <div className="flex justify-between items-center">
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                    {job.status === 'AVAILABLE' ? 'Analizado' : job.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
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
