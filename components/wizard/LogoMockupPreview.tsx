'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { WizardState } from '@/types/wizard';
import { CDN } from '@/lib/pricing/data';
import { useT } from '@/lib/i18n/Provider';

type PreviewMode = '3d' | 'flat';

// =====================================================
// Compositeur de prévisualisation logo.
//
// Charge la maquette technique du packaging Oshibori et dessine le logo
// uploadé par dessus.
//   - Vue 3D       : 1 logo au centre de l'oshibori (centerBox).
//   - Vue Maquette : 2 logos — dans l'encadré "Zone d'impression"
//                    (printZoneBox) + duplicate au centre (centerBox).
// Le contenu hors-zone est rogné (ctx.clip) pour empêcher tout
// débordement même si la calibration est imparfaite.
// =====================================================

interface BoxRel {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MaquetteConfig {
  url: string;
  altKey: string;
  /** Cadre dashed "Zone d'impression" sur la fiche (étroit et long). */
  printZoneBox: BoxRel;
  /** Centre du packaging (carré approx. au milieu de la bande centrale). */
  centerBox: BoxRel;
  /** Si true, impression encre blanche uniquement (packaging noir). */
  whiteInkOnly?: boolean;
}

// Coords calibrées sur les fiches techniques fournies (≈3342×2002 px,
// packaging à droite de la fiche).
const SEMI_15G_BLANC: MaquetteConfig = {
  url: `${CDN}15gBlanc.png?v=1688637933`,
  altKey: 'preview.canvas_alt_15g_blanc',
  printZoneBox: { x: 0.479, y: 0.459, w: 0.366, h: 0.106 },
  centerBox: { x: 0.571, y: 0.418, w: 0.183, h: 0.187 },
};

const SEMI_15G_NOIR: MaquetteConfig = {
  ...SEMI_15G_BLANC,
  url: `${CDN}15gNoir.png?v=1688640569`,
  altKey: 'preview.canvas_alt_15g_noir',
  whiteInkOnly: true,
};

const SEMI_15G_TRANSPARENT: MaquetteConfig = {
  ...SEMI_15G_BLANC,
  url: `${CDN}oshiboripersoclear.png?v=1704818907`,
  altKey: 'preview.canvas_alt_15g_transparent',
};

const SEMI_10G_BLANC: MaquetteConfig = {
  url: `${CDN}10gBlanc.png?v=1688722926`,
  altKey: 'preview.maquette_10g_blanc',
  printZoneBox: { x: 0.5, y: 0.45, w: 0.32, h: 0.105 },
  centerBox: { x: 0.575, y: 0.415, w: 0.17, h: 0.18 },
};

const SEMI_10G_NOIR: MaquetteConfig = {
  ...SEMI_10G_BLANC,
  url: `${CDN}10gNoir.png?v=1688722925`,
  altKey: 'preview.maquette_10g_noir',
  whiteInkOnly: true,
};

function selectConfigs(state: WizardState): MaquetteConfig[] {
  if (state.persoLevel !== 'Semi-perso' && state.persoLevel !== 'Full perso') {
    return [];
  }
  if (state.grammage === '15 grammes') {
    if (state.packagingId === 'semi-15g-noir') return [SEMI_15G_NOIR];
    if (state.packagingId === 'semi-15g-transparent') return [SEMI_15G_TRANSPARENT];
    if (state.packagingId === 'semi-15g-blanc') return [SEMI_15G_BLANC];
    return [SEMI_15G_BLANC, SEMI_15G_NOIR];
  }
  if (state.grammage === '10 grammes') {
    if (state.packagingId === 'semi-10g-noir-tv') return [SEMI_10G_NOIR];
    if (state.packagingId === 'semi-10g-blanc-tb') return [SEMI_10G_BLANC];
    return [SEMI_10G_BLANC, SEMI_10G_NOIR];
  }
  if (state.persoLevel === 'Full perso') {
    return [SEMI_15G_BLANC, SEMI_15G_NOIR];
  }
  return [];
}

function isRenderableLogo(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('image/')) return true;
  const name = file.name.toLowerCase();
  return /\.(png|jpe?g|svg|webp|gif)$/i.test(name);
}

export function LogoMockupPreview({ state }: { state: WizardState }) {
  const file = state.attachmentFile;
  const { t } = useT();
  const configs = useMemo(() => selectConfigs(state), [state]);

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
  if (configs.length === 0) return null;

  if (!isRenderableLogo(file)) {
    return (
      <section className="space-y-2 pt-4 border-t border-[var(--qw-cream-strong)]">
        <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
          {t('preview.non_renderable_title')}
        </h3>
        <p className="text-sm text-ink-soft">
          {t('preview.non_renderable_body', {
            ext: file.name.split('.').pop()?.toUpperCase() ?? '',
          })}
        </p>
      </section>
    );
  }

  return <MockupPreviewBody configs={configs} logoUrl={logoUrl} />;
}

function MockupPreviewBody({
  configs,
  logoUrl,
}: {
  configs: MaquetteConfig[];
  logoUrl: string | null;
}) {
  const { t } = useT();
  const [mode, setMode] = useState<PreviewMode>('3d');

  return (
    <section className="space-y-3 pt-4 border-t border-[var(--qw-cream-strong)]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
          {t('preview.section_title')}
        </h3>
        <span className="text-[11px] text-ink-soft italic">{t('preview.indicative')}</span>
      </div>

      <div className="inline-flex rounded-full border border-[var(--qw-cream-strong)] bg-white p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setMode('3d')}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-colors ${
            mode === '3d'
              ? 'bg-[var(--qw-gold)] text-white'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          {t('preview.tab_3d')}
        </button>
        <button
          type="button"
          onClick={() => setMode('flat')}
          className={`px-3.5 py-1.5 rounded-full font-medium transition-colors ${
            mode === 'flat'
              ? 'bg-[var(--qw-gold)] text-white'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          {t('preview.tab_flat')}
        </button>
      </div>

      <div
        className={`grid gap-3 ${
          configs.length === 1
            ? 'grid-cols-1 sm:max-w-md'
            : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        {configs.map((cfg) => (
          <MockupCanvas key={cfg.url} config={cfg} mode={mode} logoUrl={logoUrl} />
        ))}
      </div>
    </section>
  );
}

function drawLogoInBox(
  ctx: CanvasRenderingContext2D,
  logoImg: HTMLImageElement,
  box: { x: number; y: number; w: number; h: number },
  whiteInkOnly: boolean | undefined,
) {
  const ratio = logoImg.naturalWidth / logoImg.naturalHeight || 1;
  let lW = box.w;
  let lH = lW / ratio;
  if (lH > box.h) {
    lH = box.h;
    lW = lH * ratio;
  }
  const dx = box.x + (box.w - lW) / 2;
  const dy = box.y + (box.h - lH) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();

  if (whiteInkOnly) {
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(lW));
    off.height = Math.max(1, Math.round(lH));
    const octx = off.getContext('2d');
    if (octx) {
      octx.drawImage(logoImg, 0, 0, lW, lH);
      octx.globalCompositeOperation = 'source-in';
      octx.fillStyle = '#ffffff';
      octx.fillRect(0, 0, lW, lH);
    }
    ctx.drawImage(off, dx, dy);
  } else {
    ctx.drawImage(logoImg, dx, dy, lW, lH);
  }
  ctx.restore();
}

function MockupCanvas({
  config,
  mode,
  logoUrl,
}: {
  config: MaquetteConfig;
  mode: PreviewMode;
  logoUrl: string | null;
}) {
  const { t } = useT();
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
    bgImg.src = config.url;

    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = logoUrl;

    Promise.all([
      new Promise<void>((res, rej) => {
        bgImg.onload = () => res();
        bgImg.onerror = () => rej(new Error(t('preview.bg_not_loadable')));
      }),
      new Promise<void>((res, rej) => {
        logoImg.onload = () => res();
        logoImg.onerror = () => rej(new Error(t('preview.logo_not_readable')));
      }),
    ])
      .then(() => {
        if (cancelled) return;
        const MAX_W = 900;
        const scale = Math.min(1, MAX_W / bgImg.naturalWidth);
        const W = Math.round(bgImg.naturalWidth * scale);
        const H = Math.round(bgImg.naturalHeight * scale);
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(bgImg, 0, 0, W, H);

        const toPx = (b: BoxRel) => ({
          x: b.x * W,
          y: b.y * H,
          w: b.w * W,
          h: b.h * H,
        });

        // 3D : un logo au centre de l'oshibori.
        // Maquette : zone d'impression + duplicate au centre.
        const boxes =
          mode === '3d'
            ? [toPx(config.centerBox)]
            : [toPx(config.printZoneBox), toPx(config.centerBox)];

        for (const box of boxes) {
          drawLogoInBox(ctx, logoImg, box, config.whiteInkOnly);
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
  }, [config, mode, logoUrl, t]);

  const alt = t(config.altKey);
  return (
    <figure className="space-y-1.5">
      <div className="w-full rounded-[var(--qw-input-radius)] overflow-hidden bg-white border border-[var(--qw-cream-strong)] relative">
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          aria-label={alt}
        />
        {!ready && !err && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-ink-soft">
            {t('preview.generating')}
          </span>
        )}
        {err && (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-[var(--qw-error)] px-3 text-center">
            {err}
          </span>
        )}
      </div>
      <figcaption className="text-[11px] text-ink-soft text-center">
        {alt}
        {config.whiteInkOnly && ` ${t('preview.white_ink_only')}`}
      </figcaption>
    </figure>
  );
}
