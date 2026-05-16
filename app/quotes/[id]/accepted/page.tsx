import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuoteAcceptedPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect(`/quotes/${id}/access`);

  const admin = createAdminClient();
  const { data: quote } = await admin
    .from('quotes')
    .select('id, quote_number, status, email')
    .eq('id', id)
    .single();

  if (!quote) notFound();
  if (quote.email.toLowerCase() !== user.email.toLowerCase()) {
    redirect(`/quotes/${id}/access`);
  }

  const isAccepted = quote.status === 'accepted';
  const isRejected = quote.status === 'rejected';

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md text-center space-y-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png"
          alt="Oshibori Concept"
          className="h-12 w-auto mx-auto"
        />

        <div
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{
            background: isAccepted ? 'rgba(25, 135, 84, 0.10)' : 'var(--qw-cream)',
            color: isAccepted ? 'var(--qw-success)' : 'var(--qw-gold-dark)',
          }}
          aria-hidden="true"
        >
          {isAccepted ? '✓' : '✕'}
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold text-ink">
          {isAccepted
            ? 'Devis accepté, merci !'
            : isRejected
              ? 'Devis refusé'
              : "C'est noté"}
        </h1>

        <p className="text-ink-soft leading-relaxed">
          {isAccepted ? (
            <>
              Notre équipe vous recontacte sous{' '}
              <strong className="text-ink">24 h ouvrées</strong> pour confirmer les
              modalités et lancer la production.
            </>
          ) : isRejected ? (
            <>
              Nous avons bien enregistré votre refus. N&apos;hésitez pas à nous
              écrire si vos besoins évoluent.
            </>
          ) : (
            <>Votre réponse a été enregistrée.</>
          )}
        </p>

        <p className="text-xs text-ink-soft">
          Référence&nbsp;:{' '}
          <code
            className="px-2 py-1 rounded font-mono"
            style={{ background: 'var(--qw-cream)', color: 'var(--qw-gold-dark)' }}
          >
            {quote.quote_number}
          </code>
        </p>

        <div className="pt-4 space-y-2">
          <a
            href={`/quotes/${id}`}
            className="inline-block px-6 py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-medium border border-[var(--qw-gold)] text-gold-dark hover:bg-[var(--qw-cream)] transition-colors"
          >
            Revoir le devis
          </a>
        </div>
      </div>
    </div>
  );
}
