'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RefreshFeedsButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleRefresh = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/jobs/fetch-feeds', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        if (data.processedCount > 0) {
          setMessage(`¡${data.processedCount} nuevas vacantes encontradas!`);
          router.refresh();
        } else {
          setMessage('');
          router.refresh();
        }
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Error al conectar con la API.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {message && <span className="text-sm font-medium text-cyan-400">{message}</span>}
      <button 
      onClick={handleRefresh}
      disabled={loading}
      className={`flex items-center gap-2 bg-slate-800 text-cyan-400 border border-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 hover:border-cyan-500/50 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`text-lg leading-none ${loading ? 'animate-spin' : ''}`}>↺</span> 
      {loading ? 'Analizando con Gemini...' : 'Buscar / Refrescar Vacantes Reales'}
    </button>
    </div>
  );
}
