/** Normaliza o que a ONG digitou (número, @handle ou URL) em links clicáveis. */

function stripHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(instagram|facebook)\.com\//i, "").replace(/\/$/, "");
}

/** Assume Brasil quando o número não vem com código de país (10-11 dígitos locais). */
export function buildWhatsAppUrl(raw: string, text?: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length <= 11) digits = `55${digits}`;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${digits}${query}`;
}

export function buildInstagramUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw.trim())) return raw.trim();
  return `https://instagram.com/${stripHandle(raw)}`;
}

export function buildFacebookUrl(raw: string): string {
  if (/^https?:\/\//i.test(raw.trim())) return raw.trim();
  return `https://facebook.com/${stripHandle(raw)}`;
}

/** Compartilhar um link (não é o mesmo que abrir conversa com a ONG). */
export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
