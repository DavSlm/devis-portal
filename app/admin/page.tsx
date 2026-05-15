import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatEuro } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

interface QuoteRequestRow {
  id: string;
  created_at: string;
  email: string;
  company_name: string | null;
  full_name: string | null;
  product_type: string;
  perso_level: string | null;
  grammage: string | null;
  quantity: number | null;
  estimated_total: number | null;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'À traiter',
  reviewed: 'Examiné',
  converted: 'Devis envoyé',
  archived: 'Archivé',
};

const STATUS_TONE: Record<string, string> = {
  pending_review: 'bg-[var(--qw-gold-light)] text-[var(--qw-gold-dark)]',
  reviewed: 'bg-blue-50 text-blue-700',
  converted: 'bg-green-50 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

export default async function AdminDashboard() {
  const supabase = createAdminClient();
  const { data: requests, error } = await supabase
    .from('quote_requests')
    .select(
      'id, created_at, email, company_name, full_name, product_type, perso_level, grammage, quantity, estimated_total, status',
    )
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="text-sm text-[var(--qw-error)]">
        Erreur de chargement : {error.message}
      </div>
    );
  }

  const rows = (requests ?? []) as QuoteRequestRow[];
  const pending = rows.filter((r) => r.status === 'pending_review').length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Demandes de devis</h1>
        <p className="text-sm text-ink-soft">
          {rows.length} demande{rows.length > 1 ? 's' : ''} ·{' '}
          <strong className="text-gold-dark">{pending}</strong> à traiter
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] p-12 text-center text-ink-soft">
          Aucune demande pour le moment.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {rows.map((r) => (
              <RequestCard key={r.id} row={r} />
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[var(--qw-cream)]/50 text-xs uppercase tracking-[0.06em] text-ink-soft">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Reçu le</th>
                  <th className="text-left px-4 py-3 font-semibold">Client</th>
                  <th className="text-left px-4 py-3 font-semibold">Projet</th>
                  <th className="text-right px-4 py-3 font-semibold">Quantité</th>
                  <th className="text-right px-4 py-3 font-semibold">Total est.</th>
                  <th className="text-center px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`border-t border-[var(--qw-cream-strong)] hover:bg-[var(--qw-cream)]/30 transition-colors ${
                      i === 0 ? 'border-t-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/quotes/${r.id}`}
                        className="block hover:text-gold-dark transition-colors"
                      >
                        <div className="font-medium text-ink">
                          {r.company_name ?? r.full_name ?? '—'}
                        </div>
                        <div className="text-xs text-ink-soft">{r.email}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {[r.product_type, r.perso_level, r.grammage]
                        .filter(Boolean)
                        .join(' · ')}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {r.quantity ? r.quantity.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-medium">
                      {r.estimated_total ? `${formatEuro(r.estimated_total)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          STATUS_TONE[r.status] ?? STATUS_TONE.archived
                        }`}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function RequestCard({ row }: { row: QuoteRequestRow }) {
  return (
    <Link
      href={`/admin/quotes/${row.id}`}
      className="block bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] p-4 hover:border-gold transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-medium text-ink truncate">
            {row.company_name ?? row.full_name ?? '—'}
          </div>
          <div className="text-xs text-ink-soft truncate">{row.email}</div>
        </div>
        <span
          className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${
            STATUS_TONE[row.status] ?? STATUS_TONE.archived
          }`}
        >
          {STATUS_LABEL[row.status] ?? row.status}
        </span>
      </div>
      <div className="text-xs text-ink-soft mb-2">
        {[row.product_type, row.perso_level, row.grammage].filter(Boolean).join(' · ')}
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-ink-soft">{formatDate(row.created_at)}</span>
        <span className="font-medium text-ink">
          {row.quantity ? `${row.quantity.toLocaleString('fr-FR')} u.` : '—'}
          {' · '}
          {row.estimated_total ? formatEuro(row.estimated_total) : '—'}
        </span>
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
