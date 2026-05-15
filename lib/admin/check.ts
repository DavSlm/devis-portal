// =====================================================
// Admin allowlist — emails authorized to access /admin routes.
// Configured via the ADMIN_EMAILS env var (comma-separated).
// Falls back to the project owner's email if unset.
// =====================================================

const FALLBACK = ['dasalama@icloud.com'];

function getAllowlist(): string[] {
  const raw = process.env.ADMIN_EMAILS;
  if (!raw) return FALLBACK;
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = getAllowlist();
  return list.includes(email.trim().toLowerCase());
}
