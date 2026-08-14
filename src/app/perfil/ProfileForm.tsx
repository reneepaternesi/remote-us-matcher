'use client';

import { useState, useTransition } from 'react';
import { SlidersHorizontal, Info, Save } from 'lucide-react';
import { updateProfileSettings } from './actions';
export default function ProfileForm({ initialData }: { initialData: {
  minHourlyRate: number;
  minMonthlySalary: number;
  directHireOnly: boolean;
  minContractDuration: string;
  targetRoles: string;
  techStack: string;
  excludedKeywords: string;
  professionalSummary: string;
} }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Local state for sliders
  const [rate, setRate] = useState(initialData.minHourlyRate);
  const [salary, setSalary] = useState(initialData.minMonthlySalary);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateProfileSettings(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      
      {/* Left Column: Criterios */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <SlidersHorizontal className="text-cyan-400 w-5 h-5" />
          Criterios de Filtrado & Precisión de Búsqueda
        </h2>
        <p className="text-sm text-slate-400 mb-8">
          Parámetros configurados para priorizar contrataciones directas en EE. UU. con alto rate por hora y contratos sostenibles de larga duración.
        </p>

        <div className="space-y-8">
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-sm font-bold text-slate-200">Tarifa Mínima por Hora (USD)</label>
              <span className="text-lg font-black text-cyan-400">${rate} USD / hr</span>
            </div>
            <input 
              type="range" min="30" max="100" step="1" 
              name="minHourlyRate"
              value={rate} 
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-slate-500 mt-2">Filtra puestos por debajo de ${rate}/hr o ${(rate * 160).toLocaleString('en-US')}/mes.</p>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-sm font-bold text-slate-200">Piso Salarial Mensual Objetivo (USD)</label>
              <span className="text-lg font-black text-cyan-400">${salary.toLocaleString('en-US')} USD / mes</span>
            </div>
            <input 
              type="range" min="4000" max="15000" step="500" 
              name="minMonthlySalary"
              value={salary} 
              onChange={(e) => setSalary(Number(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">Exclusivo Contratación Directa EE. UU.</div>
              <div className="text-xs text-slate-500 mt-1">Omite agencias intermediarias locales y retenciones de terceros.</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="directHireOnly" defaultChecked={initialData.directHireOnly} className="sr-only peer" />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">Duración Mínima de Contrato Requerida</label>
            <select name="minContractDuration" defaultValue={initialData.minContractDuration} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-cyan-500">
              <option value="12+ meses">12+ meses (Contrato de Larga Duración / Renovable)</option>
              <option value="6-12 meses">6 a 12 meses</option>
              <option value="3-6 meses">3 a 6 meses</option>
              <option value="Cualquiera">Cualquiera</option>
            </select>
          </div>
        </div>
      </div>

      {/* Right Column: Perfil */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <Info className="text-cyan-400 w-5 h-5" />
          Información de Perfil para IA
        </h2>
        <p className="text-sm text-slate-400 mb-8">
          Detalles y palabras clave ingresados para afinar la evaluación automática de Gemini en cada vacante.
        </p>

        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2">
              📄 Resumen Profesional / Experiencia
            </h3>
            <textarea 
              name="professionalSummary"
              defaultValue={initialData.professionalSummary}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
              rows={4}
            />
            <p className="text-xs text-slate-500 mt-2">La IA utilizará esto para verificar los años de experiencia y expectativas (ej: Individual Contributor vs Manager).</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
              🎯 Roles y Puestos Objetivo
            </h3>
            <textarea 
              name="targetRoles"
              defaultValue={initialData.targetRoles}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
              rows={2}
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
              🚀 Tech Stack (Palabras Clave)
            </h3>
            <textarea 
              name="techStack"
              defaultValue={initialData.techStack}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
              rows={3}
            />
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
              🚩 Exclusiones (Red Flags)
            </h3>
            <textarea 
              name="excludedKeywords"
              defaultValue={initialData.excludedKeywords}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-red-500"
              rows={3}
            />
            <p className="text-xs text-slate-500 mt-2">La IA descartará vacantes o bajará el % de Match si encuentra esto.</p>
          </div>
          
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button 
              type="submit" 
              disabled={isPending}
              className="flex items-center gap-2 bg-cyan-600 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-cyan-500 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Guardando...' : (
                <>
                  <Save className="w-4 h-4" /> Guardar Configuraciones
                </>
              )}
            </button>
          </div>
          
          {saved && (
            <div className="text-emerald-400 text-sm text-right font-medium animate-pulse">
              ¡Perfil guardado correctamente!
            </div>
          )}

        </div>
      </div>
    </form>
  );
}
