// Rendu de l'avatar en SVG (string) — isole la librairie générée @dicebear.
// Ce fichier N'EST PAS chargé par Jest (node) car @dicebear est ESM-only ;
// la logique testable est dans ./avatar.ts. Côté app (Metro), l'ESM est OK.

import { createAvatar, type Style } from '@dicebear/core';
import { adventurer, avataaars, bigSmile, funEmoji, micah } from '@dicebear/collection';
import type { AvatarConfig, AvatarStyleKey } from './avatar';

const STYLE_MAP: Record<AvatarStyleKey, Style<any>> = {
  adventurer,
  avataaars,
  micah,
  'big-smile': bigSmile,
  'fun-emoji': funEmoji,
};

/** Construit le SVG (string) prêt pour SvgXml. */
export function buildAvatarSvg(cfg: AvatarConfig): string {
  const style = STYLE_MAP[cfg.style] ?? adventurer;
  const hasBg = !!cfg.backgroundColor && cfg.backgroundColor !== 'transparent';
  const gradient = hasBg && !!cfg.backgroundColor2;
  const colors = hasBg
    ? gradient
      ? [cfg.backgroundColor as string, cfg.backgroundColor2 as string]
      : [cfg.backgroundColor as string]
    : [];
  return createAvatar(style, {
    seed: cfg.seed,
    backgroundColor: colors,
    backgroundType: gradient ? ['gradientLinear'] : ['solid'],
    flip: cfg.flip ?? false,
    rotate: cfg.rotate ?? 0,
    scale: cfg.scale ?? 100,
    radius: 50,
  }).toString();
}
