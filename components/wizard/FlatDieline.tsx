'use client';

import { useEffect, useRef, useState } from 'react';

// =====================================================
// Dieline « à plat » des emballages semi-perso.
// Recreée en SVG depuis le PDF technique fourni par David :
//   - Packaging : 174 × 132 mm
//   - 5 bandes : 12.5 / 25 / 8.5 / 40 / 8.5 / 25 / 12.5 (total 132)
//   - Zone d'impression : 17 × 100 mm, centrée dans la bande de 40 mm
//
// On dessine la dieline en SVG (rectangles + dashed) plutôt qu'un PNG
// extrait du PDF : plus léger, scalable, et la zone d'impression est
// pixel-perfect par construction.
// =====================================================

export interface DielineConfig {
  /** Largeur en mm */
  widthMm: number;
  /** Hauteur en mm */
  heightMm: number;
  /** Couleur de fond du packaging */
  bgColor: string;
  /** Couleur du texte fictif des bandes */
  textColor: string;
  /** Zone d'impression : position + dimensions en mm */
  printZone: { xMm: number; yMm: number; wMm: number; hMm: number };
  /** Si true, le logo est forcé en blanc (impression encre blanche). */
  whiteInk?: boolean;
  /** Label sous la dieline */
  label: string;
}

// 15g semi-perso blanc — d'après 15g Thé Blanc - Maquette.pdf
export const DIELINE_SEMI_15G_BLANC: DielineConfig = {
  widthMm: 174,
  heightMm: 132,
  bgColor: '#ffffff',
  textColor: '#252525',
  // Print zone : 17mm × 100mm centrée dans la bande de 40mm
  // x = 12 + (150 - 100) / 2 = 37mm
  // y = 12.5 + 25 + 8.5 + (40 - 17) / 2 = 57.5mm
  printZone: { xMm: 37, yMm: 57.5, wMm: 100, hMm: 17 },
  label: 'Maquette 15g semi-perso · packaging blanc · zone 100×17 mm',
};

// 15g semi-perso noir — même dieline mais fond noir + encre blanche
export const DIELINE_SEMI_15G_NOIR: DielineConfig = {
  ...DIELINE_SEMI_15G_BLANC,
  bgColor: '#0d0d0d',
  textColor: '#e9e9e9',
  whiteInk: true,
  label: 'Maquette 15g semi-perso · packaging noir · encre blanche · zone 100×17 mm',
};

// 15g semi-perso transparent — fond clear translucide
export const DIELINE_SEMI_15G_TRANSPARENT: DielineConfig = {
  ...DIELINE_SEMI_15G_BLANC,
  bgColor: '#f3f4f6',
  textColor: '#252525',
  label: 'Maquette 15g semi-perso · packaging transparent · zone 100×17 mm',
};

interface FlatDielineProps {
  config: DielineConfig;
  logoUrl: string | null;
}

/**
 * Rend la dieline à plat avec le logo client positionné dans la zone
 * d'impression. SVG natif pour le dieline + canvas off-screen pour
 * compositer un logo en blanc si whiteInk=true.
 */
export function FlatDieline({ config, logoUrl }: FlatDielineProps) {
  const W = config.widthMm;
  const H = config.heightMm;
  const pz = config.printZone;

  // Bandes verticales (en mm depuis le haut) selon le PDF :
  // 12.5 (marge top) | 25 (bande info) | 8.5 (gap) | 40 (middle) | 8.5 (gap) | 25 (footer) | 12.5 (marge bot)
  const bands = [
    { y: 12.5, h: 25 },
    { y: 12.5 + 25 + 8.5, h: 40 },
    { y: 12.5 + 25 + 8.5 + 40 + 8.5, h: 25 },
  ];

  // Marges horizontales : 12mm de chaque côté
  const marginX = 12;
  const contentW = W - 2 * marginX;

  // Logo couleur ou blancifié si encre blanche.
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  const cleanupRef = useRef<string | null>(null);

  useEffect(() => {
    if (cleanupRef.current) {
      URL.revokeObjectURL(cleanupRef.current);
      cleanupRef.current = null;
    }
    if (!logoUrl) {
      setProcessedLogoUrl(null);
      return;
    }
    if (!config.whiteInk) {
      setProcessedLogoUrl(logoUrl);
      return;
    }
    // Whiten the logo via canvas → silhouette blanche pure.
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const off = document.createElement('canvas');
      off.width = img.naturalWidth;
      off.height = img.naturalHeight;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, off.width, off.height);
      off.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        cleanupRef.current = url;
        setProcessedLogoUrl(url);
      }, 'image/png');
    };
    img.onerror = () => setProcessedLogoUrl(null);
    img.src = logoUrl;
    return () => {
      if (cleanupRef.current) {
        URL.revokeObjectURL(cleanupRef.current);
        cleanupRef.current = null;
      }
    };
  }, [logoUrl, config.whiteInk]);

  return (
    <figure className="space-y-2">
      <div
        className="w-full rounded-[var(--qw-input-radius)] overflow-hidden bg-white border border-[var(--qw-cream-strong)]"
        style={{ padding: '8px' }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={config.label}
        >
          {/* Fond packaging */}
          <rect
            x={0}
            y={0}
            width={W}
            height={H}
            fill={config.bgColor}
            stroke="#cccccc"
            strokeWidth={0.3}
          />

          {/* Bandes texte (rectangles fictifs pour suggérer les zones imprimées) */}
          {bands.map((b, i) => (
            <g key={i}>
              {/* Top band : texte dermato gauche + best before centre + arabe droite */}
              {i === 0 && (
                <>
                  {/* black square top-left (sealing mark, ~5mm) */}
                  <rect x={marginX} y={b.y} width={5} height={5} fill={config.textColor} />
                  {/* lignes texte suggérées */}
                  <rect
                    x={marginX + 1}
                    y={b.y + 8}
                    width={32}
                    height={1.2}
                    fill={config.textColor}
                    opacity={0.55}
                  />
                  <rect
                    x={marginX + 1}
                    y={b.y + 11}
                    width={28}
                    height={0.8}
                    fill={config.textColor}
                    opacity={0.4}
                  />
                  <rect
                    x={marginX + 1}
                    y={b.y + 16}
                    width={32}
                    height={1.2}
                    fill={config.textColor}
                    opacity={0.55}
                  />
                  <rect
                    x={marginX + 1}
                    y={b.y + 19}
                    width={28}
                    height={0.8}
                    fill={config.textColor}
                    opacity={0.4}
                  />
                  {/* Best before centré */}
                  <text
                    x={W / 2}
                    y={b.y + 7}
                    fontSize={2.2}
                    fontWeight="600"
                    textAnchor="middle"
                    fill={config.textColor}
                  >
                    Best before :
                  </text>
                  <rect
                    x={W / 2 - 14}
                    y={b.y + 9}
                    width={28}
                    height={6}
                    fill="none"
                    stroke={config.textColor}
                    strokeWidth={0.25}
                    strokeDasharray="0.8,0.5"
                  />
                  <text
                    x={W / 2}
                    y={b.y + 22}
                    fontSize={2}
                    fontWeight="600"
                    textAnchor="middle"
                    fill={config.textColor}
                  >
                    Testé sous contrôle dermatologique
                  </text>
                  {/* Texte arabe + texte allemand à droite */}
                  <rect
                    x={W - marginX - 32}
                    y={b.y + 8}
                    width={32}
                    height={1.2}
                    fill={config.textColor}
                    opacity={0.55}
                  />
                  <rect
                    x={W - marginX - 28}
                    y={b.y + 11}
                    width={28}
                    height={0.8}
                    fill={config.textColor}
                    opacity={0.4}
                  />
                  <rect
                    x={W - marginX - 32}
                    y={b.y + 16}
                    width={32}
                    height={1.2}
                    fill={config.textColor}
                    opacity={0.55}
                  />
                </>
              )}
              {/* Bottom band : footer infos */}
              {i === 2 && (
                <>
                  {/* QR code carré */}
                  <rect
                    x={marginX + 2}
                    y={b.y + 3}
                    width={10}
                    height={10}
                    fill={config.textColor}
                    opacity={0.55}
                  />
                  {/* Lignes texte */}
                  <rect
                    x={marginX + 16}
                    y={b.y + 3}
                    width={90}
                    height={1}
                    fill={config.textColor}
                    opacity={0.55}
                  />
                  <rect
                    x={marginX + 16}
                    y={b.y + 5.5}
                    width={80}
                    height={0.8}
                    fill={config.textColor}
                    opacity={0.4}
                  />
                  <rect
                    x={marginX + 16}
                    y={b.y + 7.5}
                    width={70}
                    height={0.8}
                    fill={config.textColor}
                    opacity={0.4}
                  />
                  <rect
                    x={marginX + 16}
                    y={b.y + 9.5}
                    width={75}
                    height={0.8}
                    fill={config.textColor}
                    opacity={0.4}
                  />
                  {/* Oshibori brand mark + made in france */}
                  <text
                    x={marginX + 16}
                    y={b.y + 16}
                    fontSize={2.5}
                    fontWeight="600"
                    fill={config.textColor}
                  >
                    ⌒oshibori.
                  </text>
                  <text
                    x={marginX + 40}
                    y={b.y + 16}
                    fontSize={2.2}
                    fill={config.textColor}
                  >
                    Made In France
                  </text>
                  {/* Code produit à droite */}
                  <text
                    x={W - marginX - 1}
                    y={b.y + 16}
                    fontSize={2.2}
                    textAnchor="end"
                    fontWeight="600"
                    fill={config.textColor}
                  >
                    OSH-0135
                  </text>
                </>
              )}
            </g>
          ))}

          {/* Cadre dashed des bandes (signalétique technique discrète) */}
          {bands.map((b, i) => (
            <rect
              key={`bf-${i}`}
              x={marginX}
              y={b.y}
              width={contentW}
              height={b.h}
              fill="none"
              stroke="#d0494e"
              strokeWidth={0.15}
              strokeDasharray="1,0.8"
              opacity={0.5}
            />
          ))}

          {/* Zone d'impression : rectangle dashed gold prominent */}
          <rect
            x={pz.xMm}
            y={pz.yMm}
            width={pz.wMm}
            height={pz.hMm}
            fill="none"
            stroke="#b89456"
            strokeWidth={0.5}
            strokeDasharray="1.5,1"
          />

          {/* Logo positionné dans la zone d'impression (clip strict) */}
          {processedLogoUrl && (
            <>
              <defs>
                <clipPath id={`pz-clip-${config.label.replace(/\s/g, '')}`}>
                  <rect
                    x={pz.xMm}
                    y={pz.yMm}
                    width={pz.wMm}
                    height={pz.hMm}
                  />
                </clipPath>
              </defs>
              <image
                href={processedLogoUrl}
                x={pz.xMm}
                y={pz.yMm}
                width={pz.wMm}
                height={pz.hMm}
                preserveAspectRatio="xMidYMid meet"
                clipPath={`url(#pz-clip-${config.label.replace(/\s/g, '')})`}
              />
            </>
          )}

          {/* Label dimensions zone d'impression (sous la zone) */}
          <text
            x={pz.xMm + pz.wMm / 2}
            y={pz.yMm + pz.hMm + 3.5}
            fontSize={2}
            fontStyle="italic"
            textAnchor="middle"
            fill="#b89456"
          >
            Zone d&apos;impression : {pz.wMm} × {pz.hMm} mm
          </text>
        </svg>
      </div>
      <figcaption className="text-[11px] text-ink-soft text-center">
        {config.label}
      </figcaption>
    </figure>
  );
}
