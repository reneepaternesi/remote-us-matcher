import { X, Cpu, ExternalLink, Save, Check } from 'lucide-react';
import { Job } from '@prisma/client';
import React, { useState, useTransition } from 'react';
import { updateJobNotes } from '@/app/actions';

interface JobModalProps {
  selectedJob: Job;
  setSelectedJob: (job: Job | null) => void;
  footerButtons?: React.ReactNode;
}

export default function JobModal({ selectedJob, setSelectedJob, footerButtons }: JobModalProps) {
  const [notes, setNotes] = useState(selectedJob.notes || '');
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const handleSaveNote = () => {
    startTransition(async () => {
      await updateJobNotes(selectedJob.id, notes);
      
      // Update local state copy to match
      selectedJob.notes = notes;
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={() => setSelectedJob(null)}
    >
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={() => setSelectedJob(null)}
          className="absolute right-4 top-4 text-slate-400 hover:text-white bg-slate-800 rounded-full p-2"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="p-8 border-b border-zinc-800">
          <div className="flex justify-between items-start mb-4 pr-10">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{selectedJob.title}</h2>
              <p className="text-lg text-slate-400">{selectedJob.company}</p>
            </div>
            {selectedJob.analyzed && (
              <div className="text-right flex-shrink-0">
                <div className="text-4xl font-black text-cyan-400">{selectedJob.matchScore}%</div>
                <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Match</div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <span className="bg-emerald-500/10 text-emerald-400 font-bold px-3 py-1 rounded-md text-sm border border-emerald-500/20">
              {selectedJob.salaryRange || 'Salario no revelado'}
            </span>
            <span className="text-sm text-slate-500">Origen: {selectedJob.source}</span>
          </div>
        </div>

        <div className="p-8 bg-black/40 flex-1 space-y-6">
          {selectedJob.analyzed && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
              <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2 text-lg">
                <Cpu className="w-6 h-6 text-cyan-500" />
                AI Insight / Veredicto de Renée
              </h3>
              <div className="text-sm text-slate-300 space-y-4 whitespace-pre-wrap leading-relaxed">
                {selectedJob.aiInsight || 'Análisis no disponible.'}
              </div>
            </div>
          )}

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-200 text-lg">Mis Notas / Feedback</h3>
              <button 
                onClick={handleSaveNote}
                disabled={isPending || notes === (selectedJob.notes || '')}
                className="flex items-center gap-1.5 bg-slate-800 text-cyan-400 hover:text-white px-3 py-1.5 rounded text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isPending ? <Cpu className="w-3.5 h-3.5 animate-spin" /> : (saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />)}
                {saved ? 'Guardado' : 'Guardar'}
              </button>
            </div>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Hablé con el recruiter, me piden experiencia en Nx. La entrevista técnica es el viernes..."
              className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-cyan-500 resize-none min-h-[100px]"
            />
          </div>
          
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
            <h3 className="font-bold text-slate-200 mb-4 text-lg">Descripción del Puesto</h3>
            <div 
              className="text-sm text-slate-300 space-y-4 whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none prose-headings:text-white prose-a:text-cyan-400 prose-a:underline hover:prose-a:text-cyan-300 prose-strong:text-white prose-ul:list-disc prose-ul:pl-4 prose-ol:list-decimal prose-ol:pl-4"
              dangerouslySetInnerHTML={{ 
                __html: (() => {
                  if (!selectedJob.description) return 'No hay descripción disponible para esta vacante.';
                  if (typeof window === 'undefined') return selectedJob.description;
                  const txt = document.createElement('textarea');
                  txt.innerHTML = selectedJob.description;
                  return txt.value;
                })()
              }}
            />
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 flex justify-between items-center bg-zinc-900 rounded-b-2xl gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {footerButtons}
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <a 
              href={selectedJob.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-cyan-500 transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Ver / Aplicar Original
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
