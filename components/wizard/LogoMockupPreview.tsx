'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { WizardState } from '@/types/wizard';
import { CDN } from '@/lib/pricing/data';
import { useT } from '@/lib/i18n/Provider';

type PreviewMode = '3d' | 'flat';

// =====================================================
// Compositeur de prévisualisation logo.
//
// Vue 3D       : photo produit (packaging réaliste) + 1 logo composé
//                au centre de l'oshibori (centerBox).
// Vue Maquette : fiche technique (cotes + cadre dashed) + 2 logos —
//                dans la zone d'impression (printZoneBox) + duplicate
//                au centre (centerBox).
// Le contenu hors-zone est rogné (ctx.clip) pour empêcher tout
// débordement même si la calibration est imparfaite.
// =====================================================

interface BoxRel {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PhotoConfig {
  url: string;
  centerBox: BoxRel;
}

interface FicheConfig {
  url: string;
  printZoneBox: BoxRel;
  centerBox: BoxRel;
}

interface VariantConfig {
  altKey: string;
  whiteInkOnly?: boolean;
  /** Photo produit utilisée pour la Vue 3D. */
  threeD?: PhotoConfig;
  /** Fiche technique utilisée pour la Vue Maquette. */
  maquette?: FicheConfig;
}

// Coords calibrées sur les fiches techniques (≈3342×2002 px,
// packaging dessiné à droite de la fiche).
const FICHE_15G_BLANC: FicheConfig = {
  url: `${CDN}15gBlanc.png?v=1688637933`,
  printZoneBox: { x: 0.479, y: 0.459, w: 0.366, h: 0.106 },
  centerBox: { x: 0.571, y: 0.418, w: 0.183, h: 0.187 },
};

const FICHE_15G_NOIR: FicheConfig = {
  url: `${CDN}15gNoir.png?v=1688640569`,
  printZoneBox: { x: 0.479, y: 0.459, w: 0.366, h: 0.106 },
  centerBox: { x: 0.571, y: 0.418, w: 0.183, h: 0.187 },
};

const FICHE_10G_BLANC: FicheConfig = {
  url: `${CDN}10gBlanc.png?v=1688722926`,
  printZoneBox: { x: 0.5, y: 0.45, w: 0.32, h: 0.105 },
  centerBox: { x: 0.575, y: 0.415, w: 0.17, h: 0.18 },
};

const FICHE_10G_NOIR: FicheConfig = {
  url: `${CDN}10gNoir.png?v=1688722925`,
  printZoneBox: { x: 0.5, y: 0.45, w: 0.32, h: 0.105 },
  centerBox: { x: 0.575, y: 0.415, w: 0.17, h: 0.18 },
};

// Coords calibrées sur les photos produit (1920×~1276 px, packaging
// horizontal centré). centerBox = bande plate au milieu de l'oshibori.
const PHOTO_15G_BLANC: PhotoConfig = {
  url: `${CDN}oshiboripersonnalisable4_aedcffbf-7e56-42ac-8ecb-1458ea26c870.png?v=1704812853`,
  centerBox: { x: 0.35, y: 0.48, w: 0.30, h: 0.14 },
};

const PHOTO_15G_NOIR: PhotoConfig = {
  url: `${CDN}oshiboripersonnalisable3_787af666-ab22-457c-a60d-6db48eecaeaf.png?v=1704813143`,
  centerBox: { x: 0.38, y: 0.47, w: 0.24, h: 0.12 },
};

const PHOTO_15G_TRANSPARENT: PhotoConfig = {
  url: `${CDN}oshiboripersoclear.png?v=1704818907`,
  centerBox: { x: 0.36, y: 0.42, w: 0.28, h: 0.18 },
};

const SEMI_15G_BLANC: VariantConfig = {
  altKey: 'preview.canvas_alt_15g_blanc',
  threeD: PHOTO_15G_BLANC,
  maquette: FICHE_15G_BLANC,
};

const SEMI_15G_NOIR: VariantConfig = {
  altKey: 'preview.canvas_alt_15g_noir',
  whiteInkOnly: true,
  threeD: PHOTO_15G_NOIR,
  maquette: FICHE_15G_NOIR,
};

const SEMI_15G_TRANSPARENT: VariantConfig = {
  altKey: 'preview.canvas_alt_15g_transparent',
  threeD: PHOTO_15G_TRANSPARENT,
};

const SEMI_10G_BLANC: VariantConfig = {
  altKey: 'preview.maquette_10g_blanc',
  maquette: FICHE_10G_BLANC,
};

const SEMI_10G_NOIR: VariantConfig = {
  altKey: 'preview.maquette_10g_noir',
  whiteInkOnly: true,
  maquette: FICHE_10G_NOIR,
};

function selectConfigs(state: WizardState): VariantConfig[] {
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
  configs: VariantConfig[];
  logoUrl: string | null;
}) {
  const { t } = useT();

  const has3d = configs.every((c) => c.threeD);
  const hasFlat = configs.every((c) => c.maquette);
  const [mode, setMode] = useState<PreviewMode>(has3d ? '3d' : 'flat');

  // Si l'utilisateur navigue vers un packaging sans le mode courant,
  // bascule sur le mode disponible.
  useEffect(() => {
    if (mode === '3d' && !has3d && hasFlat) setMode('flat');
    if (mode === 'flat' && !hasFlat && has3d) setMode('3d');
  }, [mode, has3d, hasFlat]);

  return (
    <section className="space-y-3 pt-4 border-t border-[var(--qw-cream-strong)]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-xs uppercase tracking-[0.08em] font-semibold text-gold-dark">
          {t('preview.section_title')}
        </h3>
        <span className="text-[11px] text-ink-soft italic">{t('preview.indicative')}</span>
      </div>

      {has3d && hasFlat && (
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
      )}

      <div
        className={`grid gap-3 ${
          configs.length === 1
            ? 'grid-cols-1 sm:max-w-md'
            : 'grid-cols-1 sm:grid-cols-2'
        }`}
      >
        {configs.map((cfg, i) => (
          <MockupCanvas
            key={`${cfg.altKey}-${i}`}
            config={cfg}
            mode={mode}
            logoUrl={logoUrl}
          />
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
  config: VariantConfig;
  mode: PreviewMode;
  logoUrl: string | null;
}) {
  const { t } = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Sélectionne l'image + les boîtes selon le mode courant.
  const active = useMemo(() => {
    if (mode === '3d' && config.threeD) {
      return { url: config.threeD.url, boxes: [config.threeD.centerBox] };
    }
    if (mode === 'flat' && config.maquette) {
      return {
        url: config.maquette.url,
        boxes: [config.maquette.printZoneBox, config.maquette.centerBox],
      };
    }
    // Fallback : prend ce qui est dispo.
    if (config.threeD) {
      return { url: config.threeD.url, boxes: [config.threeD.centerBox] };
    }
    if (config.maquette) {
      return {
        url: config.maquette.url,
        boxes: [config.maquette.printZoneBox, config.maquette.centerBox],
      };
    }
    return null;
  }, [mode, config]);

  useEffect(() => {
    if (!logoUrl || !active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setReady(false);
    setErr(null);

    const bgImg = new Image();
    bgImg.crossOrigin = 'anonymous';
    bgImg.src = active.url;

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

        for (const box of active.boxes) {
          drawLogoInBox(ctx, logoImg, toPx(box), config.whiteInkOnly);
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
  }, [active, logoUrl, config.whiteInkOnly, t]);

  if (!active) return null;

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
