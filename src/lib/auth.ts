export async function hashPassword(password: string): Promise<string> {
  const secret = process.env.AUTH_SECRET || 'remote-us-matcher-secret-salt-2026';
  const msgBuffer = new TextEncoder().encode(password + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const AUTH_COOKIE_NAME = 'remote_us_auth_session';
