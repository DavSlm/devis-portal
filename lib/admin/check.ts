// =====================================================
// Admin allowlist — emails authorized to access /admin routes.
// Configured via the ADMIN_EMAILS env var (comma-separated).
// Falls back to the project owner's email if unset.
// =====================================================

// Hardcoded fallback used when ADMIN_EMAILS env var isn't set on the
// deployment. For long-term management, prefer setting ADMIN_EMAILS
// in Vercel (one comma-separated list) so the team can be edited
// without a redeploy.
const FALLBACK = [
  'dasalama@icloud.com',
  'david@oshibori-concept.com',
  'marketing@oshibori-concept.com',
];

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
