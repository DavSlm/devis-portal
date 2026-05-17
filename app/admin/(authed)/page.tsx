import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatEuro } from '@/lib/pricing';
import { RequestsList, type QuoteRequestRow } from './RequestsList';

export const dynamic = 'force-dynamic';

type TabKey = 'new' | 'processed' | 'sent' | 'drafts' | 'archived' | 'all';

const TABS: Array<{ key: TabKey; label: string; statuses: string[] | null }> = [
  { key: 'new', label: 'Nouveaux', statuses: ['pending_review'] },
  { key: 'processed', label: 'Traités', statuses: ['reviewed'] },
  { key: 'sent', label: 'Envoyés', statuses: ['converted'] },
  { key: 'drafts', label: 'Brouillons', statuses: ['draft'] },
  { key: 'archived', label: 'Archivés', statuses: ['archived'] },
  { key: 'all', label: 'Tous', statuses: null },
];

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminDashboard({ searchParams }: PageProps) {
  const { tab: tabParam } = await searchParams;
  const activeTab: TabKey =
    (TABS.find((t) => t.key === tabParam)?.key as TabKey | undefined) ?? 'new';

  const supabase = createAdminClient();
  // On charge TOUT (y compris archived) — l'onglet Archivés y a accès,
  // les autres tabs filtrent les archived eux-mêmes.
  const { data: requests, error } = await supabase
    .from('quote_requests')
    .select(
      'id, created_at, email, company_name, full_name, product_type, perso_level, grammage, quantity, estimated_total, status, odoo_order_name',
    )
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="text-sm text-[var(--qw-error)]">
        Erreur de chargement : {error.message}
      </div>
    );
  }

  const all = (requests ?? []) as QuoteRequestRow[];
  // Pour les compteurs de tabs et les insights, on exclut les archivés
  // (sinon ils gonflent artificiellement les chiffres).
  const active = all.filter((r) => r.status !== 'archived');

  // Counts par tab (pour les badges).
  const counts = TABS.reduce<Record<TabKey, number>>(
    (acc, t) => {
      if (t.key === 'all') acc[t.key] = active.length;
      else if (t.key === 'archived')
        acc[t.key] = all.filter((r) => r.status === 'archived').length;
      else acc[t.key] = active.filter((r) => t.statuses!.includes(r.status)).length;
      return acc;
    },
    {} as Record<TabKey, number>,
  );

  // Filtre actif.
  const activeStatuses = TABS.find((t) => t.key === activeTab)?.statuses ?? null;
  const rows = activeStatuses
    ? all.filter((r) => activeStatuses.includes(r.status))
    : active;

  // Insights commerciaux (basés sur les non-archivés).
  const insights = computeInsights(active);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-ink">Demandes de devis</h1>
        <p className="text-sm text-ink-soft">
          {active.length} demande{active.length > 1 ? 's' : ''} active
          {active.length > 1 ? 's' : ''}
        </p>
      </header>

      <InsightsRow insights={insights} />

      <Tabs counts={counts} active={activeTab} />

      {rows.length === 0 ? (
        <div className="bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] p-12 text-center text-ink-soft">
          Aucune demande dans cet onglet.
        </div>
      ) : (
        <RequestsList rows={rows} />
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

// Mobile cards + table sont rendus par <RequestsList> (client component
// pour la sélection bulk + actions Archiver / Supprimer).
