'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { useT } from '@/lib/i18n/Provider';
import type { Profile } from '@/types/wizard';

// Valeurs FR canoniques : stockées telles quelles dans le state pour
// rester compatibles avec Odoo / pricing / fiscalPosition.
const EU_COUNTRIES = [
  'Allemagne', 'Autriche', 'Belgique', 'Bulgarie', 'Chypre', 'Croatie',
  'Danemark', 'Espagne', 'Estonie', 'Finlande', 'Grèce', 'Hongrie',
  'Irlande', 'Italie', 'Lettonie', 'Lituanie', 'Luxembourg', 'Malte',
  'Pays-Bas', 'Pologne', 'Portugal', 'République tchèque', 'Roumanie',
  'Slovaquie', 'Slovénie', 'Suède',
];
const NON_EU_COUNTRIES = [
  'Royaume-Uni', 'Suisse', 'Norvège', 'États-Unis', 'Canada',
  'Émirats Arabes Unis', 'Arabie Saoudite', 'Qatar', 'Japon', 'Corée du Sud',
  'Singapour', 'Autre',
];

// Map FR canonique → label EN affiché (state reste en FR).
const COUNTRY_EN: Record<string, string> = {
  Allemagne: 'Germany', Autriche: 'Austria', Belgique: 'Belgium',
  Bulgarie: 'Bulgaria', Chypre: 'Cyprus', Croatie: 'Croatia',
  Danemark: 'Denmark', Espagne: 'Spain', Estonie: 'Estonia',
  Finlande: 'Finland', Grèce: 'Greece', Hongrie: 'Hungary',
  Irlande: 'Ireland', Italie: 'Italy', Lettonie: 'Latvia',
  Lituanie: 'Lithuania', Luxembourg: 'Luxembourg', Malte: 'Malta',
  'Pays-Bas': 'Netherlands', Pologne: 'Poland', Portugal: 'Portugal',
  'République tchèque': 'Czech Republic', Roumanie: 'Romania',
  Slovaquie: 'Slovakia', Slovénie: 'Slovenia', Suède: 'Sweden',
  'Royaume-Uni': 'United Kingdom', Suisse: 'Switzerland',
  Norvège: 'Norway', 'États-Unis': 'United States', Canada: 'Canada',
  'Émirats Arabes Unis': 'United Arab Emirates',
  'Arabie Saoudite': 'Saudi Arabia', Qatar: 'Qatar', Japon: 'Japan',
  'Corée du Sud': 'South Korea', Singapour: 'Singapore', Autre: 'Other',
  France: 'France',
};

export function StepProfile() {
  const { state, set } = useWizard();
  const { t, locale } = useT();
  const isEntreprise = state.profile === 'professionnel';

  const labelFor = (fr: string) => (locale === 'en' ? COUNTRY_EN[fr] ?? fr : fr);

  return (
    <div className="space-y-8">
      <StepHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProfileCard
          value="particulier"
          icon="⌂"
          title={t('profile.particulier')}
          desc={t('profile.particulier_desc')}
          selected={state.profile === 'particulier'}
          onClick={() => set({ profile: 'particulier' })}
        />
        <ProfileCard
          value="professionnel"
          icon="▦"
          title={t('profile.pro')}
          desc={t('profile.pro_desc')}
          selected={state.profile === 'professionnel'}
          onClick={() => set({ profile: 'professionnel' })}
        />
      </div>

      {state.profile && (
        <section className="rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] bg-[var(--qw-cream)]/40 p-6 sm:p-8 space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gold-dark">
            {t('profile.your_info')}
          </h3>

          {isEntreprise && (
            <Field label={t('profile.company_name')} required>
              <input
                type="text"
                className="qw-input"
                autoComplete="organization"
                value={state.entrepriseName}
                onChange={(e) => set({ entrepriseName: e.target.value })}
              />
            </Field>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('profile.first_name')} required>
              <input
                type="text"
                className="qw-input"
                autoComplete="given-name"
                value={state.firstName}
                onChange={(e) => set({ firstName: e.target.value })}
              />
            </Field>
            <Field label={t('profile.last_name')} required>
              <input
                type="text"
                className="qw-input"
                autoComplete="family-name"
                value={state.lastName}
                onChange={(e) => set({ lastName: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={t('profile.email')} required>
              <input
                type="email"
                className="qw-input"
                autoComplete="email"
                value={state.email}
                onChange={(e) => set({ email: e.target.value })}
              />
            </Field>
            <Field label={t('profile.phone')} required>
              <input
                type="tel"
                className="qw-input"
                autoComplete="tel"
                value={state.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </Field>
          </div>

          {isEntreprise && (
            <Field label={t('profile.country')} required>
              <select
                className="qw-input"
                value={state.country ?? ''}
                onChange={(e) => set({ country: e.target.value || null })}
              >
                <option value="">{t('profile.country_placeholder')}</option>
                <option value="France">{labelFor('France')}</option>
                <optgroup label={t('profile.eu')}>
                  {EU_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {labelFor(c)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t('profile.non_eu')}>
                  {NON_EU_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {labelFor(c)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </Field>
          )}
        </section>
      )}
    </div>
  );
}

interface ProfileCardProps {
  value: Profile;
  icon: string;
  title: string;
  desc: string;
  selected: boolean;
  onClick: () => void;
}

function ProfileCard({ icon, title, desc, selected, onClick }: ProfileCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`qw-card-pick ${selected ? 'is-selected' : ''}`}
    >
      <span
        aria-hidden="true"
        className="text-3xl"
        style={{ color: 'var(--qw-gold-dark)' }}
      >
        {icon}
      </span>
      <span className="font-semibold text-ink">{title}</span>
      <span className="text-sm text-ink-soft">{desc}</span>
    </button>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, required, children }: FieldProps) {
  return (
    <label className="block">
      <span className="qw-label">
        {label}
        {required && <span className="qw-req" />}
      </span>
      {children}
    </label>
  );
}
