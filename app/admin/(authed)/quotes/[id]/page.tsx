import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatEuro } from '@/lib/pricing';
import {
  archiveRequest,
  generateOdooDraft,
  regenerateClientLink,
  sendQuoteToClient,
  syncFromOdoo,
  updateBilling,
  updateContact,
  updateInternalNotes,
  updateProductConfig,
  updateShipping,
} from './actions';
import { LinkPanel } from './LinkPanel';
import { resolveProductVariant } from '@/lib/odoo/products';
import type { WizardState } from '@/types/wizard';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    sent?: string;
    emailOk?: string;
    link?: string;
    emailError?: string;
    quote?: string;
    odooError?: string;
    odooName?: string;
    vatRejected?: string;
    edit?: string;
  }>;
}

export default async function QuoteRequestDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  const {
    sent,
    emailOk,
    link,
    emailError,
    quote: quoteId,
    odooError,
    vatRejected,
    edit,
  } = await searchParams;
  const odooBaseUrl = (process.env.ODOO_URL ?? '').replace(/\/$/, '');
  const editingContact = edit === 'contact';
  const editingShipping = edit === 'shipping';
  const editingBilling = edit === 'billing';
  const editingConfig = edit === 'config';
  const cancelHref = `/admin/quotes/${id}`;

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

  // Produit Odoo auto-résolu depuis la configuration du wizard — même règles
  // que le script Python gmail_to_odoo. Affiché pour info, jamais modifiable
  // depuis cette UI (modifier la demande si la config est fausse).
  const wizardLike: WizardState = {
    ...request,
    productType: request.product_type,
    persoLevel: request.perso_level,
    grammage: request.grammage,
    matiere: request.matiere,
    packaging: request.packaging,
    packagingId: request.packaging,
    scenteur: null,
  } as WizardState;
  const suggested = resolveProductVariant(wizardLike);

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

      {odooError && (
        <div
          className="rounded-[var(--qw-card-radius)] border p-4 text-sm"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
            color: 'var(--qw-error)',
          }}
        >
          <strong className="block mb-1">Erreur Odoo</strong>
          <span>{decodeURIComponent(odooError)}</span>
        </div>
      )}

      {vatRejected === '1' && (
        <div
          className="rounded-[var(--qw-card-radius)] border p-4 text-sm"
          style={{
            background: 'rgba(234, 179, 8, 0.10)',
            borderColor: 'rgba(234, 179, 8, 0.35)',
            color: '#92400e',
          }}
        >
          <strong className="block mb-1">TVA refusée par Odoo</strong>
          <span>
            Le numéro de TVA fourni{request.vat_number ? ` (${request.vat_number})` : ''} a
            été refusé par Odoo (échec de validation VIES). Le partner a été créé
            <strong> sans TVA</strong> — si le numéro est correct, ajoute-le manuellement
            sur la fiche société dans Odoo.
          </span>
        </div>
      )}

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
          <Card
            title="Contact"
            action={
              editingContact ? (
                <Link
                  href={cancelHref}
                  className="text-xs uppercase tracking-[0.06em] text-ink-soft hover:text-ink transition-colors"
                >
                  Annuler
                </Link>
              ) : (
                <Link
                  href={`${cancelHref}?edit=contact`}
                  className="text-xs uppercase tracking-[0.06em] text-gold-dark hover:text-ink transition-colors"
                >
                  Modifier
                </Link>
              )
            }
          >
            {editingContact ? (
              <form action={updateContact} className="space-y-2">
                <input type="hidden" name="requestId" value={request.id} />
                <Field label="Société" name="company_name" defaultValue={request.company_name ?? ''} />
                <Field label="Nom complet" name="full_name" defaultValue={request.full_name ?? ''} />
                <Field label="Email" name="email" type="email" required defaultValue={request.email ?? ''} />
                <Field label="Téléphone" name="phone" defaultValue={request.phone ?? ''} />
                <Field label="SIRET" name="siret" defaultValue={request.siret ?? ''} />
                <Field label="N° TVA" name="vat_number" defaultValue={request.vat_number ?? ''} />
                <SaveButton>Enregistrer le contact</SaveButton>
                {request.odoo_order_id && (
                  <p className="text-[11px] text-ink-soft text-center pt-1">
                    Synchronisé automatiquement avec le partner Odoo lié à {request.odoo_order_name}.
                  </p>
                )}
              </form>
            ) : (
              <>
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
              </>
            )}
          </Card>

          <Card
            title="Configuration produit"
            action={
              editingConfig ? (
                <Link
                  href={cancelHref}
                  className="text-xs uppercase tracking-[0.06em] text-ink-soft hover:text-ink transition-colors"
                >
                  Annuler
                </Link>
              ) : (
                <Link
                  href={`${cancelHref}?edit=config`}
                  className="text-xs uppercase tracking-[0.06em] text-gold-dark hover:text-ink transition-colors"
                >
                  Modifier
                </Link>
              )
            }
          >
            {editingConfig ? (
              <form action={updateProductConfig} className="space-y-2">
                <input type="hidden" name="requestId" value={request.id} />
                <SelectField label="Produit" name="product_type" defaultValue={request.product_type} options={PRODUCT_TYPES} allowEmpty={false} />
                <SelectField label="Personnalisation" name="perso_level" defaultValue={request.perso_level} options={PERSO_LEVELS} />
                <Field label="Catégorie" name="category" defaultValue={request.category ?? ''} />
                <SelectField label="Grammage" name="grammage" defaultValue={request.grammage} options={GRAMMAGES} />
                <SelectField label="Matière" name="matiere" defaultValue={request.matiere} options={MATIERES} />
                <Field label="Emballage" name="packaging" defaultValue={request.packaging ?? ''} />
                <Field label="Quantité" name="quantity" type="number" step="1" min="1" defaultValue={request.quantity ?? ''} />
                <SaveButton>Enregistrer la configuration</SaveButton>
                <p className="text-[11px] text-ink-soft text-center pt-1">
                  Plateaux : laisse Personnalisation / Grammage / Matière vides.
                  {request.odoo_order_id && ' Si le variant change, la ligne Odoo est recréée pour relancer les onchange prix/taxes.'}
                </p>
              </form>
            ) : (
            <div className="space-y-2">
              <KV label="Produit" value={request.product_type} />
              {request.perso_level && (
                <KV label="Personnalisation" value={request.perso_level} />
              )}
              {request.category && <KV label="Catégorie" value={request.category} />}
              {request.grammage && <KV label="Grammage" value={request.grammage} />}
              {request.matiere && <KV label="Matière" value={request.matiere} />}
              {request.packaging && <KV label="Emballage" value={request.packaging} />}

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

              {suggested && (
                <p className="text-[11px] text-ink-soft pt-2">
                  → Produit Odoo : <code className="text-ink">{suggested.description}</code>
                  {suggested.fallback && (
                    <span className="text-[var(--qw-error)] ml-1">(fallback)</span>
                  )}
                </p>
              )}

              {request.odoo_order_name ? (
                /* ── Étape 2 : devis déjà créé dans Odoo → accès + envoyer ── */
                <div className="space-y-3 pt-2">
                  <div className="rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] bg-[var(--qw-cream)] p-3">
                    <p className="text-xs text-ink-soft uppercase tracking-[0.06em] mb-1">
                      Devis Odoo créé
                    </p>
                    <p className="font-mono text-sm text-ink">
                      {request.odoo_order_name}
                    </p>
                    <p className="text-[11px] text-ink-soft mt-1">
                      Vérifie et ajuste dans Odoo (prix, taxes, transport) avant
                      d&apos;envoyer le devis au client.
                    </p>
                  </div>

                  {request.odoo_order_id && odooBaseUrl && (
                    <a
                      href={`${odooBaseUrl}/odoo/sales/${request.odoo_order_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold border border-[var(--qw-gold)] text-gold-dark hover:bg-[var(--qw-gold-light)] transition-all"
                    >
                      Accéder au devis dans Odoo ↗
                    </a>
                  )}

                  <form action={sendQuoteToClient}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] transition-all"
                    >
                      Envoyer le devis au client
                    </button>
                    <p className="text-[11px] text-ink-soft text-center pt-1">
                      Snapshot du devis Odoo + magic link envoyé au client.
                    </p>
                  </form>
                </div>
              ) : (
                /* ── Étape 1 : pas encore créé dans Odoo ── */
                <form action={generateOdooDraft} className="space-y-2 pt-2">
                  <input type="hidden" name="requestId" value={request.id} />

                  <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3 items-center">
                    <label
                      htmlFor="quantity"
                      className="text-xs uppercase tracking-[0.06em] text-ink-soft"
                    >
                      Quantité
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      name="quantity"
                      step="1"
                      min="1"
                      required
                      className="qw-input"
                      defaultValue={request.quantity ?? ''}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-3 py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] transition-all"
                  >
                    Créer dans Odoo
                  </button>
                  <p className="text-[11px] text-ink-soft text-center pt-1">
                    Crée la sale.order, attache le transport et le partner.
                    Le client n&apos;est PAS encore notifié — étape 2 ensuite.
                  </p>
                </form>
              )}
            </div>
            )}
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

          <Card
            title="Livraison"
            action={
              editingShipping ? (
                <Link
                  href={cancelHref}
                  className="text-xs uppercase tracking-[0.06em] text-ink-soft hover:text-ink transition-colors"
                >
                  Annuler
                </Link>
              ) : (
                <Link
                  href={`${cancelHref}?edit=shipping`}
                  className="text-xs uppercase tracking-[0.06em] text-gold-dark hover:text-ink transition-colors"
                >
                  Modifier
                </Link>
              )
            }
          >
            {editingShipping ? (
              <form action={updateShipping} className="space-y-2">
                <input type="hidden" name="requestId" value={request.id} />
                <Field
                  label="Contact"
                  name="contact"
                  defaultValue={(request.shipping_address?.contact as string) ?? ''}
                />
                <Field
                  label="Rue"
                  name="street1"
                  defaultValue={(request.shipping_address?.street1 as string) ?? ''}
                />
                <Field
                  label="Complément"
                  name="street2"
                  defaultValue={(request.shipping_address?.street2 as string) ?? ''}
                />
                <Field
                  label="Code postal"
                  name="postal_code"
                  defaultValue={(request.shipping_address?.postal_code as string) ?? ''}
                />
                <Field
                  label="Ville"
                  name="city"
                  defaultValue={(request.shipping_address?.city as string) ?? ''}
                />
                <Field
                  label="État/Région"
                  name="state"
                  defaultValue={(request.shipping_address?.state as string) ?? ''}
                />
                <Field
                  label="Pays"
                  name="country"
                  defaultValue={(request.shipping_address?.country as string) ?? ''}
                />
                <Field
                  label="Tél transporteur"
                  name="carrier_phone"
                  type="tel"
                  defaultValue={(request.shipping_address?.carrier_phone as string) ?? ''}
                />
                <SaveButton>Enregistrer la livraison</SaveButton>
                {request.odoo_order_id && (
                  <p className="text-[11px] text-ink-soft text-center pt-1">
                    Met à jour le contact delivery + le partner Odoo + la position fiscale.
                  </p>
                )}
              </form>
            ) : (
              request.shipping_address && (
                <KV
                  label="Adresse"
                  value={
                    <pre className="whitespace-pre-wrap font-sans text-sm">
                      {formatAddress(request.shipping_address)}
                    </pre>
                  }
                />
              )
            )}
          </Card>

          <Card
            title="Facturation"
            action={
              editingBilling ? (
                <Link
                  href={cancelHref}
                  className="text-xs uppercase tracking-[0.06em] text-ink-soft hover:text-ink transition-colors"
                >
                  Annuler
                </Link>
              ) : (
                <Link
                  href={`${cancelHref}?edit=billing`}
                  className="text-xs uppercase tracking-[0.06em] text-gold-dark hover:text-ink transition-colors"
                >
                  Modifier
                </Link>
              )
            }
          >
            {editingBilling ? (
              <form action={updateBilling} className="space-y-2">
                <input type="hidden" name="requestId" value={request.id} />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="same_as_shipping"
                    value="1"
                    defaultChecked={!request.billing_address}
                  />
                  Même adresse que la livraison
                </label>
                <Field
                  label="Rue"
                  name="street1"
                  defaultValue={(request.billing_address?.street1 as string) ?? ''}
                />
                <Field
                  label="Complément"
                  name="street2"
                  defaultValue={(request.billing_address?.street2 as string) ?? ''}
                />
                <Field
                  label="Code postal"
                  name="postal_code"
                  defaultValue={(request.billing_address?.postal_code as string) ?? ''}
                />
                <Field
                  label="Ville"
                  name="city"
                  defaultValue={(request.billing_address?.city as string) ?? ''}
                />
                <Field
                  label="Pays"
                  name="country"
                  defaultValue={(request.billing_address?.country as string) ?? ''}
                />
                <SaveButton>Enregistrer la facturation</SaveButton>
                {request.odoo_order_id && (
                  <p className="text-[11px] text-ink-soft text-center pt-1">
                    Crée ou met à jour le contact invoice Odoo et la position fiscale.
                  </p>
                )}
              </form>
            ) : request.billing_address ? (
              <KV
                label="Adresse"
                value={
                  <pre className="whitespace-pre-wrap font-sans text-sm">
                    {formatAddress(request.billing_address)}
                  </pre>
                }
              />
            ) : (
              <p className="text-sm text-ink-soft italic">
                Identique à la livraison
              </p>
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

        {/* Right column — Odoo actions */}
        <aside className="lg:sticky lg:top-6 h-fit space-y-6">
          <Card title="Lier à un devis Odoo existant">
            <p className="text-xs text-ink-soft mb-4">
              Si tu as déjà créé le devis dans Odoo (ou via ton automatisation Python),
              colle son numéro ici pour le récupérer.
            </p>
            <form action={syncFromOdoo} className="space-y-3">
              <input type="hidden" name="requestId" value={request.id} />

              <label className="block">
                <span className="qw-label">N° de commande Odoo</span>
                <input
                  type="text"
                  name="odooOrderName"
                  required
                  className="qw-input font-mono"
                  placeholder="ex. S06736"
                  autoComplete="off"
                />
              </label>

              <button
                type="submit"
                className="w-full py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] transition-all"
              >
                Récupérer depuis Odoo et envoyer au client
              </button>
              <p className="text-[11px] text-ink-soft text-center">
                Le client recevra un email avec un lien sécurisé vers son devis.
              </p>
            </form>
          </Card>

          <p className="text-[11px] text-ink-soft px-1">
            Tip : ton automatisation Python peut aussi appeler{' '}
            <code className="font-mono">POST /api/odoo/sync</code> pour déclencher
            ce flux sans passer par cette UI.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
          {title}
        </h3>
        {action}
      </div>
      <dl className="space-y-2 text-sm">{children}</dl>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
  step,
  min,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: 'text' | 'email' | 'number' | 'tel';
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3 items-center">
      <label htmlFor={name} className="text-xs uppercase tracking-[0.06em] text-ink-soft">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        required={required}
        step={step}
        min={min}
        className="qw-input"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  allowEmpty = true,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: ReadonlyArray<string>;
  /** Si true, ajoute une option "—" en tête (par défaut, utile pour Plateaux). */
  allowEmpty?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-1 sm:gap-3 items-center">
      <label htmlFor={name} className="text-xs uppercase tracking-[0.06em] text-ink-soft">
        {label}
      </label>
      <select id={name} name={name} defaultValue={defaultValue ?? ''} className="qw-input">
        {allowEmpty && <option value="">—</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

const PRODUCT_TYPES = ['Oshibori', 'Plateaux'] as const;
const PERSO_LEVELS = ['Neutre', 'Semi-perso', 'Full perso'] as const;
const GRAMMAGES = ['6 grammes', '10 grammes', '15 grammes'] as const;
const MATIERES = ['100% Coton', '80% Bambou - 20% Coton'] as const;

function SaveButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full mt-3 py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] transition-all"
    >
      {children}
    </button>
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

