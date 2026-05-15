'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import type { Profile } from '@/types/wizard';

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

export function StepProfile() {
  const { state, set } = useWizard();
  const isEntreprise = state.profile === 'professionnel';

  return (
    <div className="space-y-8">
      <StepHeader
        title="Vous êtes…"
        subtitle="Quelques informations pour personnaliser votre devis"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProfileCard
          value="particulier"
          icon="⌂"
          title="Particulier"
          desc="Pour un usage personnel ou un événement privé."
          selected={state.profile === 'particulier'}
          onClick={() => set({ profile: 'particulier' })}
        />
        <ProfileCard
          value="professionnel"
          icon="▦"
          title="Entreprise"
          desc="Restauration, hôtellerie, événementiel, retail, aviation…"
          selected={state.profile === 'professionnel'}
          onClick={() => set({ profile: 'professionnel' })}
        />
      </div>

      {state.profile && (
        <section className="rounded-[var(--qw-card-radius)] border border-[var(--qw-cream-strong)] bg-[var(--qw-cream)]/40 p-6 sm:p-8 space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-gold-dark">
            Vos informations
          </h3>

          {isEntreprise && (
            <Field label="Nom de l'entreprise" required>
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
            <Field label="Prénom" required>
              <input
                type="text"
                className="qw-input"
                autoComplete="given-name"
                value={state.firstName}
                onChange={(e) => set({ firstName: e.target.value })}
              />
            </Field>
            <Field label="Nom" required>
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
            <Field label="Email" required>
              <input
                type="email"
                className="qw-input"
                autoComplete="email"
                value={state.email}
                onChange={(e) => set({ email: e.target.value })}
              />
            </Field>
            <Field label="Téléphone" required>
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
            <Field label="Pays" required>
              <select
                className="qw-input"
                value={state.country ?? ''}
                onChange={(e) => set({ country: e.target.value || null })}
              >
                <option value="">— Sélectionnez —</option>
                <option value="France">France</option>
                <optgroup label="Union européenne">
                  {EU_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Hors UE">
                  {NON_EU_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
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
