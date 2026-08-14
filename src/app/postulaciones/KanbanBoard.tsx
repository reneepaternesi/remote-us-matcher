'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Job } from '@prisma/client';
import JobModal from '@/components/JobModal';
import { updateJobStatus, discardJob } from '@/app/actions';

export default function KanbanBoard({ initialJobs }: { initialJobs: Job[] }) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const columns = [
    { id: 'APPLIED', title: 'Postulación Enviada', color: 'text-cyan-400', borderColor: 'border-cyan-500/20', bg: 'bg-cyan-500/10' },
    { id: 'INTERVIEWING', title: 'En Entrevista', color: 'text-warning', borderColor: 'border-warning/20', bg: 'bg-warning/10' },
    { id: 'OFFER_RECEIVED', title: 'Oferta Recibida', color: 'text-success', borderColor: 'border-success/20', bg: 'bg-success/10' },
    { id: 'REJECTED', title: 'Descartadas / Rechazadas', color: 'text-destructive', borderColor: 'border-destructive/20', bg: 'bg-destructive/10' },
  ];

  return (
    <>
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {columns.map(col => {
          const columnJobs = initialJobs.filter(j => j.status === col.id);
          
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
                  columnJobs.map(job => (
                    <div 
                      key={job.id} 
                      onClick={() => setSelectedJob(job)}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-colors cursor-pointer flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs text-slate-400 truncate max-w-[60%]">{job.company}</span>
                        <span className="text-xs font-bold text-emerald-400 whitespace-nowrap">{job.salaryRange || 'N/A'}</span>
                      </div>
                      <h3 className="font-bold text-slate-200 mb-4 text-sm leading-tight">
                        {job.title}
                      </h3>
                      
                      {job.analyzed && (
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-4">
                          <span>Match: {job.matchScore}%</span>
                          <span>{job.source}</span>
                        </div>
                      )}
                      
                      <div 
                        className="flex gap-2 items-center border-t border-slate-800 pt-3"
                        onClick={(e) => e.stopPropagation()} // Prevent opening modal when clicking controls
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
                          <option value="REJECTED">Rechazada</option>
                        </select>
                        <button 
                          onClick={async () => {
                            await discardJob(job.id);
                          }}
                          className="text-slate-500 hover:text-red-400 p-1.5 bg-slate-900 border border-slate-800 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
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
                  setSelectedJob(null); // Close modal on status change to refresh layout smoothly
                }}
              >
                <option value="APPLIED">Postulación Enviada</option>
                <option value="INTERVIEWING">En Entrevista</option>
                <option value="OFFER_RECEIVED">Oferta Recibida</option>
                <option value="REJECTED">Rechazada</option>
              </select>
            </div>
          }
        />
      )}
    </>
  );
}
