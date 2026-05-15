'use client';

import { useRef } from 'react';
import { useWizard } from '../WizardProvider';
import { StepHeader } from './StepHeader';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.ai,.eps,.svg,.zip';
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function StepBrief() {
  const { state, set } = useWizard();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      set({ attachmentFile: null, fileName: '' });
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      alert('Fichier trop volumineux (max 10 Mo).');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    set({ attachmentFile: file, fileName: file.name });
  };

  const hasFile = !!state.fileName;
  const briefRequired = !hasFile;

  return (
    <div className="space-y-8">
      <StepHeader
        title="Décrivez votre projet"
        subtitle="Joignez votre logo / charte ou décrivez ce que vous souhaitez"
      />

      <div className="space-y-2">
        <label className="qw-label">
          Fichier à joindre <span className="font-normal normal-case text-ink-soft">— logo, charte, visuel</span>
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
              <span aria-hidden="true">↑</span> Choisir un fichier
            </span>
            <span className="text-sm text-ink-soft truncate">
              {state.fileName || 'Aucun fichier sélectionné'}
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
                Retirer
              </button>
            )}
          </label>
          <p className="text-xs text-ink-soft mt-3">
            Formats acceptés : PDF, PNG, JPG, AI, EPS, SVG, ZIP — jusqu&apos;à 10 Mo.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="qw-label">
          Description du marquage ou du packaging souhaité
          {briefRequired && <span className="qw-req" />}
          {!briefRequired && (
            <span className="font-normal normal-case text-ink-soft"> — optionnel si fichier joint</span>
          )}
        </label>
        <textarea
          className="qw-input min-h-32"
          rows={6}
          placeholder="Couleurs souhaitées, positionnement du logo, références, ambiance…"
          value={state.brief}
          onChange={(e) => set({ brief: e.target.value })}
        />
      </div>
    </div>
  );
}
