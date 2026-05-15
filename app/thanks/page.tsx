interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function ThanksPage({ searchParams }: Props) {
  const { id } = await searchParams;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b border-[var(--qw-border-soft)] bg-white">
        <div className="mx-auto max-w-3xl px-6 py-5 flex items-center justify-between">
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
              className="h-12 w-auto"
            />
          </a>
          <span className="text-xs uppercase tracking-[0.08em] text-gold-dark">
            Devis personnalisé
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-xl w-full text-center space-y-6">
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{
              background: 'var(--qw-cream)',
              color: 'var(--qw-gold-dark)',
            }}
            aria-hidden="true"
          >
            ✓
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-ink">
            Demande reçue, merci&nbsp;!
          </h1>

          <p className="text-ink-soft leading-relaxed">
            Nous avons bien reçu votre demande de devis. Notre équipe vous revient
            <strong className="text-ink"> sous 24 h ouvrées </strong>
            avec un devis détaillé adapté à votre projet.
          </p>

          {id && (
            <p className="text-xs text-ink-soft">
              Référence&nbsp;:{' '}
              <code
                className="px-2 py-1 rounded"
                style={{ background: 'var(--qw-cream)', color: 'var(--qw-gold-dark)' }}
              >
                {id}
              </code>
            </p>
          )}

          <div className="pt-4">
            <a
              href="https://oshiboriconcept.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2.5 rounded-[var(--qw-btn-radius)] text-sm font-semibold border border-[var(--qw-gold)] text-gold-dark hover:bg-[var(--qw-cream)] transition-colors"
            >
              Retour sur oshibori-concept.com
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
