export type JobLiveStatus = 'ACTIVE' | 'CLOSED' | 'UNKNOWN' | 'ERROR';

export interface VerificationResult {
  status: JobLiveStatus;
  code?: number;
  reason?: string;
}

export async function verifyJobUrl(url: string): Promise<VerificationResult> {
  if (!url) {
    return { status: 'UNKNOWN', reason: 'Sin URL provista' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);

    if (res.status === 404 || res.status === 410) {
      return { status: 'CLOSED', code: res.status, reason: 'Página no encontrada (HTTP 404/410)' };
    }

    if (res.status >= 200 && res.status < 400) {
      const html = await res.text();
      const lower = html.toLowerCase();

      const closedPhrases = [
        'this job is no longer available',
        'this position has been closed',
        'no longer accepting applications',
        'job posting is no longer active',
        'this job posting has expired',
        'the job you are looking for has closed',
        'position closed',
        'this role is no longer accepting',
        'este puesto ya no está disponible',
        'oferta finalizada',
        'posicion cerrada'
      ];

      for (const phrase of closedPhrases) {
        if (lower.includes(phrase)) {
          return { status: 'CLOSED', code: res.status, reason: 'El portal indica que la posición está cerrada o expirada' };
        }
      }

      // Strong active signals
      if (
        lower.includes('apply for this job') ||
        lower.includes('application') ||
        lower.includes('submit application') ||
        lower.includes('first name') ||
        lower.includes('postularse') ||
        html.length > 4000
      ) {
        return { status: 'ACTIVE', code: res.status };
      }

      return { status: 'UNKNOWN', code: res.status, reason: 'Respuesta HTTP 200 pero contenido no concluyente' };
    }

    if (res.status === 403) {
      // 403 Forbidden usually means Cloudflare/Bot protection on Himalayas/LinkedIn, not necessarily closed
      return { status: 'UNKNOWN', code: 403, reason: 'Protección antibot en portal de origen' };
    }

    return { status: 'UNKNOWN', code: res.status };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: 'ERROR', reason: message };
  }
}
