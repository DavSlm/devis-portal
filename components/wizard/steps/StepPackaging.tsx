'use client';

import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { PickCard, type InfoChip } from '../PickCard';
import { PACKAGINGS } from '@/lib/pricing/data';
import { useT } from '@/lib/i18n/Provider';
import { SparkleIcon, LeafIcon, PackageIcon } from '../icons';
import type { Packaging } from '@/types/wizard';

function chipsFromSub(sub: string): InfoChip[] {
  return sub.split(' · ').map((seg, i) => {
    const s = seg.trim();
    const isParfum = /^Parfum\b/i.test(s);
    const isMatiere = /coton|bambou|%/i.test(s);
    const icon = isParfum ? <SparkleIcon /> : isMatiere ? <LeafIcon /> : <PackageIcon />;
    const label = isParfum ? s.replace(/^Parfum\s+/i, '') : s;
    return { icon, label, variant: i === 0 ? 'cream' : 'white' };
  });
}

export function StepPackaging() {
  const { state, pick } = useWizard();
  const { t } = useT();

  let items: Packaging[] = [];
  let title = t('packaging.title_neutre');
  let subtitle = t('packaging.subtitle_neutre');

  if (state.persoLevel === 'Neutre' && state.category) {
    items = PACKAGINGS.neutre[state.category] ?? [];
    title = t('packaging.title_neutre');
  } else if (state.persoLevel === 'Semi-perso' && state.grammage) {
    items = PACKAGINGS.semi[state.grammage] ?? [];
    title = t('packaging.title_semi');
    subtitle = t('packaging.subtitle_semi');
  }

  return (
    <div className="space-y-8">
      <StepHeader title={title} subtitle={subtitle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <PickCard
            key={item.id}
            imageUrl={item.img || undefined}
            icon={item.img ? undefined : '◯'}
            imageAlt={item.label}
            title={item.label}
            infoChips={chipsFromSub(item.sub)}
            ghostChips={item.note ? [item.note] : undefined}
            selected={state.packagingId === item.id}
            onClick={() =>
              pick({
                packagingId: item.id,
                packaging: `${item.label} — ${item.sub}`,
              })
            }
          />
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-center text-ink-soft text-sm">{t('packaging.empty')}</p>
      )}
    </div>
  );
}
