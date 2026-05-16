import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatEuro } from '@/lib/pricing';
import {
  archiveRequest,
  createAndSendQuote,
  regenerateClientLink,
  updateInternalNotes,
} from './actions';
import { LinkPanel } from './LinkPanel';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    sent?: string;
    emailOk?: string;
    link?: string;
    emailError?: string;
    quote?: string;
  }>;
}

export default async function QuoteRequestDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { sent, emailOk, link, emailError, quote: quoteId } = await searchParams;

  const supabase = createAdminClient();

  const [{ data: request, error }, { data: quotes }] = await Promise.all([
    supabase.from('quote_requests').select('*').eq('id', id).single(),
    supabase
      .from('quotes')
      .select('id, quote_number, status, total_ttc, subtotal_ht, sent_at, expires_at')
      .eq('quote_request_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (error || !request) notFound();

  const isProductionReady = !!(request.quantity && request.estimated_unit_price);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <Link
            href="/admin"
            className="text-xs uppercase tracking-[0.06em] text-ink-soft hover:text-ink transition-colors"
          >
            ← Toutes les demandes
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold text-ink mt-1">
            {request.company_name ?? request.full_name ?? request.email}
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            Reçue le {formatDate(request.created_at)} · réf{' '}
            <code className="text-ink">{request.id.slice(0, 8)}</code>
          </p>
        </div>
        <form action={archiveRequest}>
          <input type="hidden" name="id" value={request.id} />
          <button
            type="submit"
            className="text-xs uppercase tracking-[0.06em] text-ink-soft hover:text-[var(--qw-error)] transition-colors"
          >
            Archiver
          </button>
        </form>
      </div>

      {sent === '1' && (
        <LinkPanel
          requestId={request.id}
          quoteId={quoteId}
          emailOk={emailOk === '1'}
          emailError={emailError}
          magicLink={link}
          clientEmail={request.email}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,420px)] gap-6">
        {/* Left column — request data */}
        <div className="space-y-6 min-w-0">
          <Card title="Contact">
            <KV
              label="Profil"
              value={
                request.company_name
                  ? `Entreprise — ${request.company_name}`
                  : 'Particulier'
              }
            />
            <KV label="Nom" value={request.full_name ?? '—'} />
            <KV
              label="Email"
              value={
                <a
                  href={`mailto:${request.email}`}
                  className="text-gold-dark hover:underline"
                >
                  {request.email}
                </a>
              }
            />
            <KV label="Téléphone" value={request.phone ?? '—'} />
            {request.siret && <KV label="SIRET" value={request.siret} />}
            {request.vat_number && <KV label="N° TVA" value={request.vat_number} />}
          </Card>

          <Card title="Configuration produit">
            <KV label="Produit" value={request.product_type} />
            {request.perso_level && (
              <KV label="Personnalisation" value={request.perso_level} />
            )}
            {request.category && <KV label="Catégorie" value={request.category} />}
            {request.grammage && <KV label="Grammage" value={request.grammage} />}
            {request.matiere && <KV label="Matière" value={request.matiere} />}
            {request.packaging && <KV label="Emballage" value={request.packaging} />}
            <KV
              label="Quantité"
              value={
                request.quantity ? request.quantity.toLocaleString('fr-FR') : '—'
              }
            />
            <KV
              label="Estimation HT"
              value={
                request.estimated_total
                  ? `${formatEuro(request.estimated_total)} (${
                      request.estimated_unit_price
                        ? formatEuro(request.estimated_unit_price) + '/u'
                        : '—'
                    })`
                  : '—'
              }
            />
          </Card>

          {(request.brief || request.file_url) && (
            <Card title="Brief">
              {request.file_url && <KV label="Fichier" value={request.file_url} />}
              {request.brief && (
                <KV
                  label="Description"
                  value={
                    <span className="whitespace-pre-wrap">{request.brief}</span>
                  }
                />
              )}
            </Card>
          )}

          <Card title="Livraison">
            {request.shipping_address && (
              <KV
                label="Adresse"
                value={
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {formatAddress(request.shipping_address)}
                  </pre>
                }
              />
            )}
            {request.billing_address && (
              <KV
                label="Facturation différente"
                value={
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {formatAddress(request.billing_address)}
                  </pre>
                }
              />
            )}
          </Card>

          {request.internal_notes !== null &&
            request.internal_notes !== undefined && (
              <Card title="Message du client">
                <p className="whitespace-pre-wrap text-sm">
                  {request.internal_notes || (
                    <span className="text-ink-soft italic">Aucun message</span>
                  )}
                </p>
              </Card>
            )}

          <Card title="Notes internes">
            <form
              action={updateInternalNotes}
              className="space-y-3"
            >
              <input type="hidden" name="id" value={request.id} />
              <textarea
                name="internal_notes"
                className="qw-input min-h-20"
                rows={3}
                placeholder="Notes internes…"
                defaultValue={request.internal_notes ?? ''}
              />
              <button
                type="submit"
                className="text-xs uppercase tracking-[0.06em] text-gold-dark hover:text-ink transition-colors"
              >
                Enregistrer
              </button>
            </form>
          </Card>

          {quotes && quotes.length > 0 && (
            <Card title="Devis envoyés">
              <ul className="space-y-2 text-sm">
                {quotes.map((q) => (
                  <li
                    key={q.id}
                    className="flex items-center justify-between gap-3 border-b border-[var(--qw-cream-strong)] pb-2 last:border-0 last:pb-0"
                  >
                    <Link
                      href={`/quotes/${q.id}`}
                      className="font-mono text-xs text-gold-dark hover:underline"
                    >
                      {q.quote_number}
                    </Link>
                    <span className="text-xs text-ink-soft">
                      {q.sent_at ? formatDate(q.sent_at) : '—'}
                    </span>
                    <span className="font-medium">
                      {q.total_ttc ? formatEuro(q.total_ttc) + ' TTC' : '—'}
                    </span>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[11px] font-medium"
                      style={{
                        background: 'var(--qw-gold-light)',
                        color: 'var(--qw-gold-dark)',
                      }}
                    >
                      {q.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Right column — quote creation form */}
        <aside className="lg:sticky lg:top-6 h-fit space-y-6">
          <Card title="Créer le devis final">
            {!isProductionReady && (
              <p
                className="text-xs mb-4 p-3 rounded"
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: 'var(--qw-error)',
                }}
              >
                Quantité ou prix estimé manquant. Vérifiez la demande avant d&apos;émettre
                un devis.
              </p>
            )}
            <form action={createAndSendQuote} className="space-y-3">
              <input type="hidden" name="requestId" value={request.id} />

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="qw-label">Prix unitaire HT</span>
                  <input
                    type="number"
                    name="unitPrice"
                    step="0.01"
                    min="0"
                    required
                    className="qw-input"
                    defaultValue={request.estimated_unit_price ?? ''}
                  />
                </label>
                <label className="block">
                  <span className="qw-label">Quantité</span>
                  <input
                    type="number"
                    name="quantity"
                    step="1"
                    min="1"
                    required
                    className="qw-input"
                    defaultValue={request.quantity ?? ''}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="qw-label">TVA %</span>
                  <input
                    type="number"
                    name="vatRate"
                    step="0.5"
                    min="0"
                    max="100"
                    className="qw-input"
                    defaultValue="20"
                  />
                </label>
                <label className="block">
                  <span className="qw-label">Délai jours</span>
                  <input
                    type="number"
                    name="deliveryDelayDays"
                    step="1"
                    min="0"
                    className="qw-input"
                    placeholder="20"
                  />
                </label>
              </div>

              <label className="block">
                <span className="qw-label">Validité (jours)</span>
                <input
                  type="number"
                  name="expiresInDays"
                  step="1"
                  min="1"
                  className="qw-input"
                  defaultValue="30"
                />
              </label>

              <label className="block">
                <span className="qw-label">Conditions / remarques</span>
                <textarea
                  name="conditions"
                  rows={3}
                  className="qw-input min-h-20"
                  placeholder="Conditions commerciales, modalités de paiement, transport…"
                />
              </label>

              <button
                type="submit"
                disabled={!isProductionReady}
                className="w-full py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                Créer le devis et envoyer au client
              </button>
              <p className="text-[11px] text-ink-soft text-center">
                Le client recevra un email avec un lien magique vers son devis.
              </p>
            </form>
          </Card>
        </aside>
      </div>
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
    <section className="bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] p-5">
      <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark mb-3">
        {title}
      </h3>
      <dl className="space-y-2 text-sm">{children}</dl>
    </section>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3">
      <dt className="text-xs uppercase tracking-[0.06em] text-ink-soft">{label}</dt>
      <dd className="text-ink break-words">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

interface Address {
  contact?: string | null;
  street1?: string | null;
  street2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  carrier_phone?: string | null;
}

function formatAddress(addr: Address | null): string {
  if (!addr) return '—';
  const lines = [
    addr.contact,
    addr.street1,
    addr.street2,
    [addr.postal_code, addr.city].filter(Boolean).join(' '),
    addr.state,
    addr.country,
  ].filter(Boolean);
  let s = lines.join('\n');
  if (addr.carrier_phone) s += `\nTél. : ${addr.carrier_phone}`;
  return s;
}
