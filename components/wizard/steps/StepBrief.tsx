'use client';

import { useRef } from 'react';
import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';
import { LogoMockupPreview } from '../LogoMockupPreview';
import { useT } from '@/lib/i18n/Provider';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.ai,.eps,.svg,.zip';
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function StepBrief() {
  const { state, set } = useWizard();
  const { t } = useT();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      set({ attachmentFile: null, fileName: '' });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      alert(t('brief.file_too_large'));
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    set({ attachmentFile: file, fileName: file.name });
  };

  const hasFile = !!state.fileName;
  const briefRequired = !hasFile;

  return (
    <div className="space-y-8">
      <StepHeader title={t('brief.title')} subtitle={t('brief.subtitle')} />

      <div className="space-y-2">
        <label className="qw-label">
          {t('brief.file_label')}{' '}
          <span className="font-normal normal-case text-ink-soft">
            {t('brief.file_label_extra')}
          </span>
        </label>
        <div className="rounded-[var(--qw-card-radius)] border border-dashed border-[var(--qw-cream-strong)] bg-[var(--qw-cream)]/30 p-6">
          <label className="flex flex-col sm:flex-row items-start sm:items-center gap-3 cursor-pointer">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
            <span
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--qw-btn-radius)] text-sm font-medium"
              style={{ background: 'var(--qw-gold)', color: '#fff' }}
            >
              <span aria-hidden="true">↑</span> {t('brief.file_choose')}
            </span>
            <span className="text-sm text-ink-soft truncate">
              {state.fileName || t('brief.file_none')}
            </span>
            {hasFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleFile(null);
                }}
                className="text-xs text-ink-soft hover:text-[var(--qw-error)] underline"
              >
                {t('brief.file_remove')}
              </button>
            )}
          </label>
          <p className="text-xs text-ink-soft mt-3">{t('brief.file_formats')}</p>
        </div>
      </div>

      <LogoMockupPreview state={state} />

      <div className="space-y-2">
        <label className="qw-label">
          {t('brief.description_label')}
          {briefRequired && <span className="qw-req" />}
          {!briefRequired && (
            <span className="font-normal normal-case text-ink-soft">
              {' '}
              {t('brief.description_optional')}
            </span>
          )}
        </label>
        <textarea
          className="qw-input min-h-32"
          rows={6}
          placeholder={t('brief.description_placeholder')}
          value={state.brief}
          onChange={(e) => set({ brief: e.target.value })}
        />
      </div>
    </div>
  );
}
