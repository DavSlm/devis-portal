import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatEuro } from '@/lib/pricing';
import { CDN, PACKAGINGS } from '@/lib/pricing/data';
import { QuoteActions } from './QuoteActions';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface QuoteConfig {
  category?: string | null;
  perso_level?: string | null;
  grammage?: string | null;
  matiere?: string | null;
  packaging?: string | null;
  brief?: string | null;
  file_url?: string | null;
}

interface OdooLineSnapshot {
  id: number;
  name: string;
  product_id: [number, string] | false;
  quantity: number;
  price_unit: number;
  price_subtotal: number;
  price_total: number;
  is_delivery: boolean;
  display_type: string | false;
}

interface OdooSnapshot {
  order?: {
    name: string;
    state: string;
    amount_untaxed: number;
    amount_tax: number;
    amount_total: number;
    fiscal_position_id?: [number, string] | false;
    payment_term_id?: [number, string] | false;
    currency_id?: [number, string] | false;
    validity_date?: string | false;
  };
  productLines?: OdooLineSnapshot[];
  deliveryLine?: OdooLineSnapshot | null;
}

interface QuoteRow {
  id: string;
  quote_number: string;
  email: string;
  full_name: string | null;
  company_name: string | null;
  product_type: string;
  config: QuoteConfig;
  unit_price: number;
  quantity: number;
  subtotal_ht: number;
  vat_rate: number | null;
  vat_amount: number | null;
  total_ttc: number | null;
  conditions: string | null;
  delivery_delay_days: number | null;
  sent_at: string | null;
  expires_at: string | null;
  status: string;
  odoo_sale_order_id: number | null;
  odoo_order_name: string | null;
  odoo_snapshot: OdooSnapshot | null;
}

const STATUS_META: Record<string, { label: string; tone: string; bg: string }> = {
  draft: { label: 'Brouillon', tone: '#888', bg: '#f5f5f5' },
  sent: { label: 'En attente', tone: 'var(--qw-gold-dark)', bg: 'var(--qw-gold-light)' },
  accepted: { label: 'Accepté', tone: 'var(--qw-success)', bg: 'rgba(25,135,84,0.10)' },
  rejected: { label: 'Refusé', tone: 'var(--qw-error)', bg: 'rgba(239,68,68,0.10)' },
  expired: { label: 'Expiré', tone: '#888', bg: '#f5f5f5' },
};

export default async function ClientQuotePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) redirect(`/quotes/${id}/access`);

  const admin = createAdminClient();
  const { data: rawQuote } = await admin
    .from('quotes')
    .select('*')
    .eq('id', id)
    .single();

  if (!rawQuote) notFound();
  const quote = rawQuote as QuoteRow;

  // Authorisation: signed-in email must match the quote's email.
  if (quote.email.toLowerCase() !== user.email.toLowerCase()) {
    redirect(`/quotes/${id}/access`);
  }

  const expired = isExpired(quote.expires_at);
  const isTerminal =
    quote.status === 'accepted' ||
    quote.status === 'rejected' ||
    quote.status === 'expired';
  const canAct = quote.status === 'sent' && !expired && !isTerminal;

  const status = STATUS_META[quote.status] ?? STATUS_META.draft;
  const productImg = pickProductImage(quote);

  return (
    <div className="min-h-screen bg-[var(--qw-cream)]/30">
      {/* Header */}
      <header
        className="bg-white border-b border-[var(--qw-border-soft)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div
          className="mx-auto max-w-3xl py-3 sm:py-4 flex items-center justify-between"
          style={{
            paddingLeft: 'max(1rem, env(safe-area-inset-left))',
            paddingRight: 'max(1rem, env(safe-area-inset-right))',
          }}
        >
          <a
            href="https://oshiboriconcept.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png"
              alt="Oshibori Concept"
              className="h-9 sm:h-11 w-auto"
            />
          </a>
          <span
            className="px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.06em]"
            style={{ color: status.tone, background: status.bg }}
          >
            {status.label}
          </span>
        </div>
      </header>

      <main
        className="mx-auto max-w-3xl py-6 sm:py-10 space-y-6"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left))',
          paddingRight: 'max(1rem, env(safe-area-inset-right))',
        }}
      >
        {/* Hero */}
        <section
          className="rounded-[var(--qw-card-radius)] p-6 sm:p-8 text-center"
          style={{ background: 'var(--qw-cream)' }}
        >
          <p className="text-[11px] uppercase tracking-[0.08em] text-gold-dark font-semibold mb-2">
            Votre devis
          </p>
          <h1 className="font-mono text-xl sm:text-2xl font-semibold text-ink mb-4">
            {quote.quote_number}
          </h1>
          <p className="text-xs uppercase tracking-[0.06em] text-ink-soft mb-1">
            Total
          </p>
          <p className="text-3xl sm:text-4xl font-semibold text-ink">
            {formatEuro(quote.subtotal_ht)} <span className="text-base font-normal text-ink-soft">HT</span>
          </p>
          {quote.total_ttc != null && (
            <p className="text-sm text-ink-soft mt-1">
              {formatEuro(quote.total_ttc)} TTC
            </p>
          )}
          {(quote.company_name || quote.full_name) && (
            <p className="text-xs text-ink-soft mt-4">
              Pour {quote.company_name ?? quote.full_name}
            </p>
          )}
        </section>

        {/* Expiry / status notices */}
        {expired && quote.status === 'sent' && (
          <Notice tone="error">
            Ce devis a expiré le {formatDate(quote.expires_at)}. Contactez-nous pour
            obtenir une nouvelle proposition.
          </Notice>
        )}
        {quote.status === 'accepted' && (
          <Notice tone="success">
            ✓ Devis accepté. Notre équipe vous recontacte pour la suite.
          </Notice>
        )}
        {quote.status === 'rejected' && (
          <Notice tone="muted">
            Ce devis a été refusé. Vous pouvez nous écrire si vos besoins évoluent.
          </Notice>
        )}

        {/* Configuration */}
        <Card title="Votre configuration">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
            {productImg && (
              <div
                className="shrink-0 w-full sm:w-40 aspect-square rounded-[var(--qw-input-radius)] overflow-hidden"
                style={{ background: 'var(--qw-cream)' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImg}
                  alt=""
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <div className="font-semibold text-ink">
                {quote.product_type}
                {quote.config.perso_level && ` · ${quote.config.perso_level}`}
              </div>
              <ul className="text-sm text-ink-soft space-y-1">
                {quote.config.grammage && (
                  <li>Grammage : {quote.config.grammage}</li>
                )}
                {quote.config.matiere && <li>Matière : {quote.config.matiere}</li>}
                {quote.config.category && quote.config.category !== quote.product_type && (
                  <li>Catégorie : {quote.config.category}</li>
                )}
                {quote.config.packaging && <li>Emballage : {quote.config.packaging}</li>}
              </ul>
              {quote.config.brief && (
                <details className="text-sm mt-3">
                  <summary className="cursor-pointer text-gold-dark font-medium">
                    Voir le brief
                  </summary>
                  <p className="whitespace-pre-wrap text-ink-soft mt-2 text-sm">
                    {quote.config.brief}
                  </p>
                </details>
              )}
            </div>
          </div>
        </Card>

        {/* Pricing breakdown — Odoo-driven when available */}
        <Card title="Détail du prix">
          <dl className="space-y-2 text-sm">
            {quote.odoo_snapshot?.productLines &&
            quote.odoo_snapshot.productLines.length > 0 ? (
              <>
                {quote.odoo_snapshot.productLines.map((line) => (
                  <Row
                    key={line.id}
                    label={
                      <span className="block">
                        <span className="block">
                          {line.quantity.toLocaleString('fr-FR')} × {formatEuro(line.price_unit)}
                        </span>
                        <span className="block text-[11px] text-ink-soft">
                          {truncate(line.name, 90)}
                        </span>
                      </span>
                    }
                    value={formatEuro(line.price_subtotal)}
                  />
                ))}
                {quote.odoo_snapshot.deliveryLine && (
                  <Row
                    label={
                      <span className="block">
                        <span className="block">Transport</span>
                        <span className="block text-[11px] text-ink-soft">
                          {truncate(quote.odoo_snapshot.deliveryLine.name, 80)}
                        </span>
                      </span>
                    }
                    value={formatEuro(quote.odoo_snapshot.deliveryLine.price_subtotal)}
                  />
                )}
              </>
            ) : (
              <Row
                label={`Quantité × prix unitaire`}
                value={`${quote.quantity.toLocaleString('fr-FR')} × ${formatEuro(quote.unit_price)}`}
              />
            )}
            <Row
              label="Sous-total HT"
              value={<strong>{formatEuro(quote.subtotal_ht)}</strong>}
            />
            {quote.vat_amount != null && (
              <Row
                label={
                  quote.odoo_snapshot?.order?.fiscal_position_id
                    ? `TVA — ${quote.odoo_snapshot.order.fiscal_position_id[1]}`
                    : quote.vat_rate != null
                      ? `TVA ${quote.vat_rate}%`
                      : 'TVA'
                }
                value={formatEuro(quote.vat_amount)}
              />
            )}
            {quote.total_ttc != null && (
              <Row
                label="Total TTC"
                value={
                  <strong className="text-gold-dark text-base">
                    {formatEuro(quote.total_ttc)}
                  </strong>
                }
                highlight
              />
            )}
          </dl>
          {quote.odoo_snapshot?.order?.payment_term_id && (
            <p className="text-xs text-ink-soft mt-4">
              Conditions de paiement&nbsp;:{' '}
              <strong className="text-ink">
                {quote.odoo_snapshot.order.payment_term_id[1]}
              </strong>
            </p>
          )}
          <p className="text-xs italic text-ink-soft mt-2">
            Prix HT.
            {quote.delivery_delay_days && ` Délai indicatif : ${quote.delivery_delay_days} jours ouvrés.`}
          </p>

          {quote.odoo_sale_order_id && (
            <a
              href={`/api/quotes/${quote.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-medium border border-[var(--qw-border-soft)] hover:border-[var(--qw-gold)] hover:bg-[var(--qw-cream)] transition-colors"
            >
              <span aria-hidden="true">⇩</span>
              Télécharger le devis (PDF)
            </a>
          )}
        </Card>

        {/* Conditions */}
        {quote.conditions && (
          <Card title="Conditions">
            <p className="whitespace-pre-wrap text-sm text-ink-soft leading-relaxed">
              {quote.conditions}
            </p>
          </Card>
        )}

        {/* Validity */}
        {quote.expires_at && (
          <p className="text-center text-xs text-ink-soft">
            Devis valable jusqu&apos;au <strong>{formatDate(quote.expires_at)}</strong>
          </p>
        )}

        {/* Actions */}
        {canAct ? (
          <div className="bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] p-5 sm:p-6">
            <QuoteActions quoteId={quote.id} />
          </div>
        ) : null}

        <footer className="text-center text-xs text-ink-soft pt-6">
          Une question&nbsp;?{' '}
          <a
            href="mailto:contact@oshibori-concept.com"
            className="text-gold-dark hover:underline"
          >
            contact@oshibori-concept.com
          </a>
        </footer>
      </main>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] p-5 sm:p-6">
      <h2 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${
        highlight ? 'pt-3 border-t border-[var(--qw-cream-strong)]' : ''
      }`}
    >
      <dt className="text-ink-soft">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: 'success' | 'error' | 'muted';
  children: React.ReactNode;
}) {
  const styles = {
    success: {
      background: 'rgba(25, 135, 84, 0.08)',
      borderColor: 'rgba(25, 135, 84, 0.25)',
      color: 'var(--qw-success)',
    },
    error: {
      background: 'rgba(239, 68, 68, 0.08)',
      borderColor: 'rgba(239, 68, 68, 0.25)',
      color: 'var(--qw-error)',
    },
    muted: {
      background: 'var(--qw-cream)',
      borderColor: 'var(--qw-cream-strong)',
      color: 'var(--qw-ink-soft)',
    },
  }[tone];

  return (
    <div
      className="rounded-[var(--qw-card-radius)] border p-4 text-sm text-center"
      style={styles}
    >
      {children}
    </div>
  );
}

function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

function pickProductImage(quote: QuoteRow): string | null {
  // Try to look up the exact packaging in PACKAGINGS by id.
  const pid = quote.config.packaging;
  if (pid) {
    for (const branch of Object.values(PACKAGINGS)) {
      for (const list of Object.values(branch)) {
        const match = list.find((p) => p.id === pid);
        if (match?.img) return match.img;
      }
    }
  }
  // Fallback: grammage-based generic image.
  switch (quote.config.grammage) {
    case '15 grammes':
      return `${CDN}Oshibori_15_grammes_2026.png?v=1765206540`;
    case '10 grammes':
      return `${CDN}10groshi.png?v=1765206540`;
    case '6 grammes':
      return `${CDN}6g.png?v=1765206540`;
    default:
      return `${CDN}plateaux10.webp?v=1703089738`;
  }
}
