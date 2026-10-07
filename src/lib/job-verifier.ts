export type JobLiveStatus = 'ACTIVE' | 'CLOSED' | 'UNKNOWN' | 'ERROR';

export interface VerificationResult {
  status: JobLiveStatus;
  code?: number;
  reason?: string;
  isTtlExpired?: boolean;
  daysElapsed?: number;
  businessDaysElapsed?: number;
}

/**
 * Calculates the number of business days (Monday to Friday) between two dates.
 */
export function calculateBusinessDays(startDate: Date, endDate: Date = new Date()): number {
  let count = 0;
  const curDate = new Date(startDate.getTime());
  while (curDate < endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
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

    if (res.url.includes('expired_jd_redirect') || res.url.includes('trk=expired')) {
      return { status: 'CLOSED', code: res.status, reason: 'LinkedIn redirigió porque la vacante expiró' };
    }

    if (res.status >= 200 && res.status < 400) {
      const html = await res.text();
      const lower = html.toLowerCase();

      // Check Ashby closed jobs: Ashby renders a generic <title>Jobs</title> when closed
      if (url.includes('ashbyhq.com')) {
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        const titleText = titleMatch ? titleMatch[1].trim() : '';
        if (titleText === 'Jobs' || !titleText.includes('@')) {
          return { status: 'CLOSED', code: res.status, reason: 'Ashby indica que la vacante ya no está disponible' };
        }
      }

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
        'posicion cerrada',
        'job has been closed',
        'listing has expired'
      ];

      for (const phrase of closedPhrases) {
        if (lower.includes(phrase)) {
          return { status: 'CLOSED', code: res.status, reason: 'El portal indica que la posición está cerrada o expirada' };
        }
      }

      // Strong active signals
      if (
        lower.includes('apply for this job') ||
        lower.includes('submit application') ||
        lower.includes('first name') ||
        lower.includes('postularse') ||
        (url.includes('ashbyhq.com') && html.includes('jobPostingId'))
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
