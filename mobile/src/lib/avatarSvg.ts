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
  const bg = cfg.backgroundColor && cfg.backgroundColor !== 'transparent' ? [cfg.backgroundColor] : [];
  return createAvatar(style, {
    seed: cfg.seed,
    backgroundColor: bg,
    radius: 50,
  }).toString();
}
