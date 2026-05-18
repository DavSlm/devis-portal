'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { WizardState } from '@/types/wizard';
import { CDN } from '@/lib/pricing/data';

// =====================================================
// Compositeur de prévisualisation logo (niveau 1).
//
// Charge un fond d'emballage Oshibori, dessine le logo uploadé par
// dessus dans la zone de marquage approximative (rectangle relatif
// `logoBox` exprimé en pourcentage de l'image). Donne une idée du
// rendu — pas du photoréalisme.
//
// Backgrounds disponibles : on choisit selon (persoLevel, grammage,
// packagingId). Si le combo n'a pas de mockup défini → on n'affiche rien.
// =====================================================

interface MockupBackground {
  url: string;
  alt: string;
  /** Rectangle de marquage en coordonnées relatives (0..1). */
  logoBox: { x: number; y: number; w: number; h: number };
  /** Si true, le logo s'imprime en blanc sur fond foncé (encres claires uniquement). */
  whiteInkOnly?: boolean;
}

const SEMI_15G_BLANC: MockupBackground = {
  url: `${CDN}oshiboripersonnalisable4_aedcffbf-7e56-42ac-8ecb-1458ea26c870.png?v=1704812853`,
  alt: 'Emballage semi-perso 15g blanc',
  logoBox: { x: 0.28, y: 0.42, w: 0.44, h: 0.22 },
};

const SEMI_15G_NOIR: MockupBackground = {
  url: `${CDN}oshiboripersonnalisable3_787af666-ab22-457c-a60d-6db48eecaeaf.png?v=1704813143`,
  alt: 'Emballage semi-perso 15g noir',
  logoBox: { x: 0.28, y: 0.42, w: 0.44, h: 0.22 },
  whiteInkOnly: true,
};

const SEMI_15G_TRANSPARENT: MockupBackground = {
  url: `${CDN}oshiboripersoclear.png?v=1704818907`,
  alt: 'Emballage semi-perso 15g transparent',
  logoBox: { x: 0.28, y: 0.42, w: 0.44, h: 0.22 },
};

/**
 * Sélectionne 1 ou 2 fonds selon le contexte. Pour le MVP : on couvre
 * surtout la semi-perso 15g (où on a déjà les visuels). Pour full perso
 * et 10g semi, on remontera des mockups plus tard quand David aura
 * fourni les visuels packaging dédiés.
 */
function selectBackgrounds(state: WizardState): MockupBackground[] {
  if (state.persoLevel !== 'Semi-perso' && state.persoLevel !== 'Full perso') {
    return [];
  }
  // Semi 15g : on choisit selon le packaging sélectionné (sinon les 3 par défaut).
  if (state.persoLevel === 'Semi-perso' && state.grammage === '15 grammes') {
    if (state.packagingId === 'semi-15g-noir') return [SEMI_15G_NOIR];
    if (state.packagingId === 'semi-15g-transparent') return [SEMI_15G_TRANSPARENT];
    if (state.packagingId === 'semi-15g-blanc') return [SEMI_15G_BLANC];
    // Pas encore de packaging choisi → on montre les 3 vues.
    return [SEMI_15G_BLANC, SEMI_15G_NOIR, SEMI_15G_TRANSPARENT];
  }
  // Full perso : on reuse les fonds semi en attendant que David fournisse
  // de vrais templates full perso. Visuellement proche.
  if (state.persoLevel === 'Full perso') {
    return [SEMI_15G_BLANC, SEMI_15G_NOIR];
  }
  return [];
}

/**
 * Vérifie qu'un fichier est rendable par <canvas>. PDF / AI / EPS / ZIP
 * → pas de preview (le serveur s'en chargera lors du devis).
 */
function isRenderableLogo(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  const name = file.name.toLowerCase();
  return /\.(png|jpe?g|svg|webp|gif)$/i.test(name);
}

export function LogoMockupPreview({ state }: { state: WizardState }) {
  const file = state.attachmentFile;
  const backgrounds = useMemo(() => selectBackgrounds(state), [state]);

  // Object URL stable pour la durée du fichier (révoqué quand le fichier change).
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !isRenderableLogo(file)) {
      setLogoUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file) return null;
  if (backgrounds.length === 0) return null;

  if (!isRenderableLogo(file)) {
    return (
      <section className="space-y-2 pt-4 border-t border-[var(--qw-cream-strong)]">
        <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
          Aperçu du marquage
        </h3>
        <p className="text-sm text-ink-soft">
          La prévisualisation automatique est disponible pour les fichiers
          <strong> PNG, JPG ou SVG</strong>. Le format {file.name.split('.').pop()?.toUpperCase()}
          que tu as joint sera traité directement par notre studio.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3 pt-4 border-t border-[var(--qw-cream-strong)]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
          Aperçu de votre marquage
        </h3>
        <span className="text-[11px] text-ink-soft italic">
          Maquette indicative — le rendu final dépend de la matière et de l&apos;impression.
        </span>
      </div>
      <div
        className={`grid gap-3 ${
          backgrounds.length === 1
            ? 'grid-cols-1 sm:max-w-sm'
            : backgrounds.length === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-3'
        }`}
      >
        {backgrounds.map((bg) => (
          <MockupCanvas key={bg.url} bg={bg} logoUrl={logoUrl} />
        ))}
      </div>
    </section>
  );
}

function MockupCanvas({
  bg,
  logoUrl,
}: {
  bg: MockupBackground;
  logoUrl: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!logoUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setReady(false);
    setErr(null);

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = bg.url;

    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = logoUrl;

    const both = Promise.all([
      new Promise<void>((res, rej) => {
        bgImg.onload = () => res();
        bgImg.onerror = () => rej(new Error('Fond non chargeable'));
      }),
      new Promise<void>((res, rej) => {
        logoImg.onload = () => res();
        logoImg.onerror = () => rej(new Error('Logo non lisible'));
      }),
    ]);

    both
      .then(() => {
        if (cancelled) return;
        // Cap la taille canvas à 800px de large pour rester léger.
        const MAX_W = 800;
        const scale = Math.min(1, MAX_W / bgImg.naturalWidth);
        const W = Math.round(bgImg.naturalWidth * scale);
        const H = Math.round(bgImg.naturalHeight * scale);
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(bgImg, 0, 0, W, H);

        // Boîte de marquage en pixels.
        const boxX = bg.logoBox.x * W;
        const boxY = bg.logoBox.y * H;
        const boxW = bg.logoBox.w * W;
        const boxH = bg.logoBox.h * H;

        // Si encre blanche uniquement (emballage noir), on inverse le logo
        // en blanc via destination-in. Hack visuel basique.
        if (bg.whiteInkOnly) {
          // Crée un canvas off-screen pour appliquer le filtre.
          const off = document.createElement('canvas');
          const ratio =
            logoImg.naturalWidth / logoImg.naturalHeight || 1;
          let lW = boxW;
          let lH = lW / ratio;
          if (lH > boxH) {
            lH = boxH;
            lW = lH * ratio;
          }
          off.width = Math.round(lW);
          off.height = Math.round(lH);
          const octx = off.getContext('2d');
          if (octx) {
            octx.drawImage(logoImg, 0, 0, lW, lH);
            // Tout ce qui est non-transparent devient blanc.
            octx.globalCompositeOperation = 'source-in';
            octx.fillStyle = '#ffffff';
            octx.fillRect(0, 0, lW, lH);
          }
          const dx = boxX + (boxW - lW) / 2;
          const dy = boxY + (boxH - lH) / 2;
          ctx.drawImage(off, dx, dy);
        } else {
          // Logo couleur, scale to fit (contain).
          const ratio =
            logoImg.naturalWidth / logoImg.naturalHeight || 1;
          let lW = boxW;
          let lH = lW / ratio;
          if (lH > boxH) {
            lH = boxH;
            lW = lH * ratio;
          }
          const dx = boxX + (boxW - lW) / 2;
          const dy = boxY + (boxH - lH) / 2;
          ctx.drawImage(logoImg, dx, dy, lW, lH);
        }

        setReady(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr((e as Error).message);
      });

    return () => {
      cancelled = true;
    };
  }, [bg, logoUrl]);

  return (
    <figure className="space-y-1.5">
      <div className="aspect-square w-full rounded-[var(--qw-input-radius)] overflow-hidden bg-white border border-[var(--qw-cream-strong)] relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          aria-label={bg.alt}
        />
        {!ready && !err && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-ink-soft">
            Génération de l&apos;aperçu…
          </span>
        )}
        {err && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-[var(--qw-error)] px-3 text-center">
            {err}
          </span>
        )}
      </div>
      <figcaption className="text-[11px] text-ink-soft text-center">
        {bg.alt}
        {bg.whiteInkOnly && ' (impression en blanc uniquement)'}
      </figcaption>
    </figure>
  );
}
