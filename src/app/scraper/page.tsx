'use client';
import { useState } from 'react';
import { Link as LinkIcon, Cpu } from 'lucide-react';
import Link from 'next/link';

interface JobResult {
  title: string;
  company: string;
  matchScore: number;
  salaryRange: string;
  aiInsight: string;
}

export default function Scraper() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JobResult | null>(null);

  const handleAnalyze = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error(error);
      alert('Error connecting to the scraper API');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 bg-black text-slate-200 p-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Web Scraper & AI Analyst</h1>
        <p className="text-sm text-slate-400">Pega el enlace de una vacante (LinkedIn, Wellfound, etc.) para extraer los datos, evadir bloqueos y calcular el % de Match.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">URL de la Vacante</label>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input 
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.linkedin.com/jobs/view/..." 
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={loading || !url}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
          >
            <Cpu className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Analizando...' : 'Analizar con IA'}
          </button>
        </div>
      </div>

      {result ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{result.title}</h2>
              <p className="text-lg text-slate-400">{result.company}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-cyan-400">{result.matchScore}%</div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Match</div>
            </div>
          </div>
          
          <div className="mb-6">
            <span className="bg-emerald-500/10 text-emerald-400 font-bold px-3 py-1 rounded-md text-sm border border-emerald-500/20">
              {result.salaryRange || 'Salario no revelado'}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-6">
            <h3 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-500" />
              AI Insight / Veredicto
            </h3>
            <div className="text-sm text-slate-400 space-y-4 whitespace-pre-wrap leading-relaxed">
              {result.aiInsight}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-4">
            <button className="text-sm font-medium text-slate-400 hover:text-white" onClick={() => {setUrl(''); setResult(null)}}>
              Escanear otra
            </button>
            <Link 
              href="/postulaciones"
              className="bg-slate-800 text-cyan-400 border border-slate-700 px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors"
            >
              Ir al Tablero (Postulaciones)
            </Link>
          </div>
        </div>
      ) : (
        /* Empty State for results */
        <div className="bg-slate-950 border border-dashed border-slate-700 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
            <Cpu className="w-8 h-8 text-cyan-500/50" />
          </div>
          <h3 className="text-lg font-bold text-slate-300 mb-2">Esperando URL</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Al analizar, la IA extraerá el rol, la tarifa, el stack técnico y generará un &quot;Veredicto&quot; evaluando si conviene aplicar según tus red flags.
          </p>
        </div>
      )}
    </div>
  );
}
