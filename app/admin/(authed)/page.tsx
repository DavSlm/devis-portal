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
  product_type: string | null;
  perso_level: string | null;
  grammage: string | null;
  quantity: number | null;
  estimated_total: number | null;
  status: string;
  odoo_order_name: string | null;
  last_saved_at: string | null;
}

type TabKey = 'new' | 'processed' | 'sent' | 'drafts' | 'all';

const TABS: Array<{ key: TabKey; label: string; statuses: string[] | null }> = [
  { key: 'new', label: 'Nouveaux', statuses: ['pending_review'] },
  { key: 'processed', label: 'Traités', statuses: ['reviewed'] },
  { key: 'sent', label: 'Envoyés', statuses: ['converted'] },
  { key: 'drafts', label: 'Brouillons', statuses: ['draft'] },
  { key: 'all', label: 'Tous', statuses: null },
];

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  pending_review: 'Nouveau',
  reviewed: 'Traité',
  converted: 'Envoyé',
  archived: 'Archivé',
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700',
  pending_review: 'bg-[var(--qw-gold-light)] text-[var(--qw-gold-dark)]',
  reviewed: 'bg-blue-50 text-blue-700',
  converted: 'bg-green-50 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminDashboard({ searchParams }: PageProps) {
  const { tab: tabParam } = await searchParams;
  const activeTab: TabKey =
    (TABS.find((t) => t.key === tabParam)?.key as TabKey | undefined) ?? 'new';

  const supabase = createAdminClient();
  const { data: requests, error } = await supabase
    .from('quote_requests')
    .select(
      'id, created_at, email, company_name, full_name, product_type, perso_level, grammage, quantity, estimated_total, status, odoo_order_name, last_saved_at',
    )
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="text-sm text-[var(--qw-error)]">
        Erreur de chargement : {error.message}
      </div>
    );
  }

  const all = (requests ?? []) as QuoteRequestRow[];

  // Counts par tab (pour les badges).
  const counts = TABS.reduce<Record<TabKey, number>>(
    (acc, t) => {
      acc[t.key] = t.statuses
        ? all.filter((r) => t.statuses!.includes(r.status)).length
        : all.length;
      return acc;
    },
    {} as Record<TabKey, number>,
  );

  // Filtre actif.
  const activeStatuses = TABS.find((t) => t.key === activeTab)?.statuses ?? null;
  const rows = activeStatuses
    ? all.filter((r) => activeStatuses.includes(r.status))
    : all;

  // Insights commerciaux.
  const insights = computeInsights(all);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Demandes de devis</h1>
        <p className="text-sm text-ink-soft">
          {all.length} demande{all.length > 1 ? 's' : ''} active
          {all.length > 1 ? 's' : ''}
        </p>
      </header>

      <InsightsRow insights={insights} />

      <Tabs counts={counts} active={activeTab} />

      {rows.length === 0 ? (
        <div className="bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] p-12 text-center text-ink-soft">
          Aucune demande dans cet onglet.
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
                      {r.odoo_order_name && (
                        <span className="ml-2 font-mono text-[11px] text-ink-soft">
                          ({r.odoo_order_name})
                        </span>
                      )}
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

// =====================================================
// Tabs (Nouveaux / Traités / Envoyés / Brouillons / Tous)
// =====================================================

function Tabs({
  counts,
  active,
}: {
  counts: Record<TabKey, number>;
  active: TabKey;
}) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-[var(--qw-cream-strong)]">
      {TABS.map((t) => {
        const isActive = t.key === active;
        const href = `/admin?tab=${t.key}`;
        return (
          <Link
            key={t.key}
            href={href}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              isActive
                ? 'border-[var(--qw-gold)] text-gold-dark'
                : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
            <span
              className={`ml-2 inline-block min-w-5 px-1.5 rounded-full text-[10px] font-semibold ${
                isActive
                  ? 'bg-[var(--qw-gold-light)] text-[var(--qw-gold-dark)]'
                  : 'bg-[var(--qw-cream)] text-ink-soft'
              }`}
            >
              {counts[t.key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// =====================================================
// Insights commerciaux
// =====================================================

interface Insights {
  newThisWeek: number;
  newLastWeek: number;
  sentEstimatedTotal: number;
  sentCount: number;
  conversionRate: number; // 0..1
  staleDrafts: number; // brouillons > 7j
  pendingValue: number; // € en attente de traitement / envoi (pending_review + reviewed)
}

function computeInsights(rows: QuoteRequestRow[]): Insights {
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const newThisWeek = rows.filter(
    (r) => now - new Date(r.created_at).getTime() < WEEK,
  ).length;
  const newLastWeek = rows.filter((r) => {
    const age = now - new Date(r.created_at).getTime();
    return age >= WEEK && age < 2 * WEEK;
  }).length;

  const sent = rows.filter((r) => r.status === 'converted');
  const sentCount = sent.length;
  const sentEstimatedTotal = sent.reduce(
    (s, r) => s + (r.estimated_total ?? 0),
    0,
  );

  const submitted = rows.filter((r) => r.status !== 'draft').length;
  const conversionRate = submitted > 0 ? sentCount / submitted : 0;

  const staleDrafts = rows.filter(
    (r) => r.status === 'draft' && now - new Date(r.created_at).getTime() > WEEK,
  ).length;

  const pending = rows.filter(
    (r) => r.status === 'pending_review' || r.status === 'reviewed',
  );
  const pendingValue = pending.reduce((s, r) => s + (r.estimated_total ?? 0), 0);

  return {
    newThisWeek,
    newLastWeek,
    sentEstimatedTotal,
    sentCount,
    conversionRate,
    staleDrafts,
    pendingValue,
  };
}

function InsightsRow({ insights }: { insights: Insights }) {
  const trend =
    insights.newLastWeek === 0
      ? null
      : (insights.newThisWeek - insights.newLastWeek) / insights.newLastWeek;
  const trendLabel =
    trend === null
      ? null
      : `${trend > 0 ? '+' : ''}${Math.round(trend * 100)}% vs semaine précédente`;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi
        label="Nouveaux (7 j)"
        value={String(insights.newThisWeek)}
        sub={trendLabel ?? `${insights.newLastWeek} la semaine précédente`}
        tone={trend !== null && trend < 0 ? 'down' : 'up'}
      />
      <Kpi
        label="Devis envoyés"
        value={String(insights.sentCount)}
        sub={`${formatEuro(insights.sentEstimatedTotal)} estimés`}
      />
      <Kpi
        label="En attente de traitement"
        value={formatEuro(insights.pendingValue)}
        sub="Estimation HT des nouveaux + traités non envoyés"
      />
      <Kpi
        label="Taux de conversion"
        value={`${Math.round(insights.conversionRate * 100)}%`}
        sub={
          insights.staleDrafts > 0
            ? `${insights.staleDrafts} brouillon${insights.staleDrafts > 1 ? 's' : ''} > 7 j à relancer`
            : 'Soumissions → devis envoyés'
        }
        tone={insights.staleDrafts > 0 ? 'down' : undefined}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'up' | 'down';
}) {
  const subColor =
    tone === 'down'
      ? 'text-[var(--qw-error)]'
      : tone === 'up'
        ? 'text-green-700'
        : 'text-ink-soft';
  return (
    <div className="bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] p-4">
      <div className="text-xs uppercase tracking-[0.06em] text-ink-soft mb-1">
        {label}
      </div>
      <div className="text-2xl font-semibold text-ink">{value}</div>
      {sub && <div className={`text-[11px] mt-1 ${subColor}`}>{sub}</div>}
    </div>
  );
}

// =====================================================
// Mobile card + helpers
// =====================================================

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
        {row.odoo_order_name && (
          <span className="ml-2 font-mono">({row.odoo_order_name})</span>
        )}
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
