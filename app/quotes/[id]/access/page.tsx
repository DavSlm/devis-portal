import { requestAccessLink } from '../actions';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}

export default async function QuoteAccessPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { sent, error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://oshiboriconcept.com/cdn/shop/files/oshiboriconcept-logo-1599554503_e03c2a56-3050-444f-871a-61225ec6cf3e.png"
            alt="Oshibori Concept"
            className="h-12 w-auto mx-auto"
          />
          <h1 className="text-xl font-semibold text-ink">Accéder à votre devis</h1>
          <p className="text-sm text-ink-soft">
            Entrez l&apos;email qui a reçu le devis pour recevoir un nouveau lien
            d&apos;accès sécurisé.
          </p>
        </div>

        {sent === '1' ? (
          <div
            className="rounded-[var(--qw-card-radius)] border p-5 text-sm text-center"
            style={{
              background: 'var(--qw-cream)',
              borderColor: 'var(--qw-cream-strong)',
              color: 'var(--qw-gold-dark)',
            }}
          >
            <strong className="block mb-1">Vérifiez votre boîte mail</strong>
            <span className="text-ink-soft">
              Si l&apos;email correspond à ce devis, un lien sécurisé vient d&apos;y
              être envoyé.
            </span>
          </div>
        ) : (
          <form action={requestAccessLink} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <label className="block">
              <span className="qw-label">Email</span>
              <input
                type="email"
                name="email"
                required
                autoFocus
                autoComplete="email"
                className="qw-input"
                placeholder="vous@entreprise.com"
              />
            </label>
            {error && (
              <p className="text-sm text-[var(--qw-error)]">
                {error === 'invalid'
                  ? 'Email requis.'
                  : `Erreur : ${decodeURIComponent(error)}`}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-[var(--qw-btn-radius)] text-sm font-semibold bg-[var(--qw-gold)] hover:bg-[var(--qw-gold-dark)] text-white shadow-[var(--qw-shadow-md)] transition-all"
            >
              Recevoir mon lien d&apos;accès
            </button>
            <p className="text-xs text-center text-ink-soft">
              Le lien précédent a peut-être expiré. Demandez-en un nouveau ici.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
