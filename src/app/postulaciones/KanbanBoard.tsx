'use client';

import { useState } from 'react';
import { Trash2, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, XCircle, ArrowRightCircle, Ban } from 'lucide-react';
import { Job } from '@prisma/client';
import JobModal from '@/components/JobModal';
import { updateJobStatus, discardJob, moveClosedJobs } from '@/app/actions';
import { VerificationResult } from '@/lib/job-verifier';

export default function KanbanBoard({ initialJobs }: { initialJobs: Job[] }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [verificationMap, setVerificationMap] = useState<Record<string, VerificationResult>>({});
  const [closedIdsDetected, setClosedIdsDetected] = useState<string[]>([]);
  const [verificationSummary, setVerificationSummary] = useState<{
    total: number;
    active: number;
    closed: number;
  } | null>(null);

  const columns = [
    { 
      id: 'APPLIED', 
      title: 'Postulación Enviada', 
      color: 'text-cyan-400', 
      borderColor: 'border-cyan-500/20', 
      bg: 'bg-cyan-500/10',
      filter: (j: Job) => j.status === 'APPLIED'
    },
    { 
      id: 'INTERVIEWING', 
      title: 'En Entrevista', 
      color: 'text-warning', 
      borderColor: 'border-warning/20', 
      bg: 'bg-warning/10',
      filter: (j: Job) => j.status === 'INTERVIEWING'
    },
    { 
      id: 'OFFER_RECEIVED', 
      title: 'Oferta Recibida', 
      color: 'text-success', 
      borderColor: 'border-success/20', 
      bg: 'bg-success/10',
      filter: (j: Job) => j.status === 'OFFER_RECEIVED'
    },
    { 
      id: 'REJECTED_CLOSED', 
      title: 'Cerradas / Rechazadas', 
      color: 'text-slate-400', 
      borderColor: 'border-slate-700/50', 
      bg: 'bg-slate-800/40',
      filter: (j: Job) => j.status === 'REJECTED' || j.status === 'CLOSED'
    },
  ];

  const handleVerifyAll = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/jobs/verify-applied');
      const data = await res.json();
      if (data.success && data.results) {
        const newMap: Record<string, VerificationResult> = {};
        const closed: string[] = [];
        for (const item of data.results) {
          newMap[item.id] = item.verification;
          if (item.verification.status === 'CLOSED') {
            closed.push(item.id);
          }
        }
        setVerificationMap(newMap);
        setClosedIdsDetected(closed);
        setVerificationSummary({
          total: data.total,
          active: data.active,
          closed: data.closed
        });
      }
    } catch (e) {
      console.error('Error during verification:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleMoveClosedToRejected = async () => {
    if (closedIdsDetected.length === 0) return;
    setIsMoving(true);
    try {
      await moveClosedJobs(closedIdsDetected);
      setClosedIdsDetected([]);
    } catch (e) {
      console.error('Error moving closed jobs:', e);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <>
      {/* Action & Verification Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-zinc-900/60 border border-zinc-800 p-4 rounded-xl">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleVerifyAll}
            disabled={isVerifying}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800/50 text-white text-xs font-semibold rounded-lg transition-all shadow-md shadow-cyan-950/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
            {isVerifying ? 'Verificando enlaces...' : 'Verificar Estado Online de Postulaciones'}
          </button>

          {verificationSummary && (
            <div className="flex items-center gap-3 text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-slate-400">
                Verificadas: <strong className="text-white">{verificationSummary.total}</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> {verificationSummary.active} Activas
              </span>
              {verificationSummary.closed > 0 ? (
                <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-950/50 px-2 py-0.5 rounded border border-red-800/40">
                  <AlertTriangle className="w-3.5 h-3.5" /> {verificationSummary.closed} Cerradas
                </span>
              ) : (
                <span className="text-slate-500">· 0 cerradas</span>
              )}
            </div>
          )}
        </div>

        {closedIdsDetected.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleMoveClosedToRejected}
              disabled={isMoving}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-200 bg-amber-950/60 hover:bg-amber-900/60 border border-amber-700/50 px-3 py-1.5 rounded-lg transition-all"
            >
              <ArrowRightCircle className="w-3.5 h-3.5 text-amber-400" />
              {isMoving ? 'Moviendo...' : `Mover ${closedIdsDetected.length} vacantes cerradas a Cerradas/Rechazadas`}
            </button>
          </div>
        )}
      </div>

      {/* Kanban Board Columns */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {columns.map(col => {
          const columnJobs = initialJobs.filter(col.filter);
          
          return (
            <div key={col.id} className={`flex-1 min-w-[320px] bg-zinc-900 border ${col.borderColor} rounded-xl p-4 flex flex-col`}>
              
              <div className={`flex justify-between items-center px-3 py-1.5 rounded-full ${col.bg} w-max mb-6`}>
                <h2 className={`text-sm font-bold ${col.color}`}>{col.title}</h2>
              </div>
              
              <div className="flex justify-end -mt-10 mb-4">
                <span className="text-sm font-medium text-slate-500">{columnJobs.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {columnJobs.length === 0 ? (
                  <div className="h-24 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center text-slate-600 text-sm">
                    Sin vacantes
                  </div>
                ) : (
                  columnJobs.map(job => {
                    const verification = verificationMap[job.id];
                    const isClosed = job.status === 'CLOSED';
                    const isRejected = job.status === 'REJECTED';

                    return (
                      <div 
                        key={job.id} 
                        onClick={() => setSelectedJob(job)}
                        className={`bg-slate-950 border ${
                          isClosed
                            ? 'border-amber-900/50 bg-amber-950/10'
                            : isRejected
                            ? 'border-red-900/40 bg-red-950/10'
                            : verification?.status === 'CLOSED'
                            ? 'border-red-500/50 bg-red-950/10'
                            : verification?.status === 'ACTIVE'
                            ? 'border-slate-800 hover:border-emerald-500/40'
                            : 'border-slate-800 hover:border-slate-600'
                        } rounded-lg p-4 transition-all cursor-pointer flex flex-col shadow-sm`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-slate-400 truncate max-w-[60%]">{job.company}</span>
                          <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">{job.salaryRange || 'N/A'}</span>
                        </div>
                        <h3 className="font-bold text-slate-200 mb-2 text-sm leading-tight">
                          {job.title}
                        </h3>

                        {/* Status Badges for Column 4 differentiation */}
                        <div className="flex flex-wrap items-center gap-1.5 mb-3">
                          {isClosed && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/50 border border-amber-800/50 px-2 py-0.5 rounded">
                              <Ban className="w-3 h-3 text-amber-400" /> Vacante Cerrada en Origen
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 bg-red-950/50 border border-red-800/50 px-2 py-0.5 rounded">
                              <XCircle className="w-3 h-3" /> Rechazada
                            </span>
                          )}

                          {/* Live Online Verification Badges for active applications */}
                          {!isClosed && !isRejected && verification && (
                            <>
                              {verification.status === 'ACTIVE' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                                  <CheckCircle2 className="w-3 h-3" /> Online en Portal
                                </span>
                              )}
                              {verification.status === 'CLOSED' && (
                                <div className="w-full flex flex-col gap-1 p-2 bg-red-950/40 border border-red-800/50 rounded text-red-300 text-[11px]">
                                  <div className="flex items-center gap-1 font-semibold text-red-400">
                                    <XCircle className="w-3.5 h-3.5" /> Oferta Cerrada en Portal
                                  </div>
                                  {verification.reason && (
                                    <p className="text-[10px] text-red-400/80 leading-tight">{verification.reason}</p>
                                  )}
                                </div>
                              )}
                              {verification.status === 'UNKNOWN' && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                                  ⚪ {verification.reason || 'Estado no concluyente'}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {job.analyzed && (
                          <div className="flex justify-between items-center text-[10px] text-slate-500 mb-4">
                            <span>Match: {job.matchScore}%</span>
                            <span className="flex items-center gap-1">
                              {job.source}
                              {job.url && (
                                <a 
                                  href={job.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-cyan-400 hover:text-cyan-300"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </span>
                          </div>
                        )}
                        
                        <div 
                          className="flex gap-2 items-center border-t border-slate-800 pt-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                            value={job.status}
                            onChange={async (e) => {
                              await updateJobStatus(job.id, e.target.value);
                            }}
                          >
                            <option value="APPLIED">Postulación Enviada</option>
                            <option value="INTERVIEWING">En Entrevista</option>
                            <option value="OFFER_RECEIVED">Oferta Recibida</option>
                            <option value="REJECTED">Rechazada por Empresa</option>
                            <option value="CLOSED">Cerrada en Origen</option>
                          </select>
                          <button 
                            onClick={async () => {
                              await discardJob(job.id);
                            }}
                            title="Descartar"
                            className="text-slate-500 hover:text-red-400 p-1.5 bg-slate-900 border border-slate-800 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedJob && (
        <JobModal
          selectedJob={selectedJob}
          setSelectedJob={setSelectedJob}
          footerButtons={
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-400">Mover a:</span>
              <select 
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
                value={selectedJob.status}
                onChange={async (e) => {
                  await updateJobStatus(selectedJob.id, e.target.value);
                  setSelectedJob(null);
                }}
              >
                <option value="APPLIED">Postulación Enviada</option>
                <option value="INTERVIEWING">En Entrevista</option>
                <option value="OFFER_RECEIVED">Oferta Recibida</option>
                <option value="REJECTED">Rechazada por Empresa</option>
                <option value="CLOSED">Cerrada en Origen</option>
              </select>
            </div>
          }
        />
      )}
    </>
  );
}
