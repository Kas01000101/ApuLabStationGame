import { createHmac, pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';

export function normalizeStudyCode(raw: string): string {
  const code = raw.trim().toUpperCase();
  const match = code.match(/^(QT|AP)-(\d{3})$/);
  if (!match) throw new Error('study_code_invalid');
  const n = Number(match[2]);
  if (match[1] === 'QT' && (n < 1 || n > 10)) throw new Error('qa_code_out_of_range');
  if (match[1] === 'AP' && (n < 1 || n > 50)) throw new Error('official_code_out_of_range');
  return code;
}

export function codeHmac(code: string, pepper: string): string {
  if (!pepper) throw new Error('APULAB_AUTH_PEPPER_required');
  return createHmac('sha256', pepper).update(normalizeStudyCode(code), 'utf8').digest('base64url');
}

export function temporaryCredential(): string {
  return randomBytes(18).toString('base64url');
}

export function credentialHash(credential: string, iterations = 210_000): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(credential, salt, iterations, 32, 'sha256');
  return `pbkdf2_sha256$${iterations}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function participantId(): string { return randomUUID(); }
export function sqlLiteral(value: string): string { return `'${value.replaceAll("'", "''")}'`; }
