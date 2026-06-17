// <Avatar> — rend la config DiceBear en SVG, avec cache (le coût est le parse
// SvgXml, pas le rendu React) et anneau d'équipe optionnel. Réutilisé partout :
// profil, classement, amis, et pastille de carte (Phase 3).

import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { AvatarConfig } from '@/lib/avatar';
import { buildAvatarSvg } from '@/lib/avatarSvg';
import { TEAMS, type TeamSlug } from '@/theme/tokens';

// Cache module : un SVG construit une seule fois par config (clé stable).
const _svgCache = new Map<string, string>();

function svgFor(config: AvatarConfig): string {
  const key = `${config.style}|${config.seed}|${config.backgroundColor ?? ''}|${config.backgroundColor2 ?? ''}|${config.flip ? 1 : 0}|${config.rotate ?? 0}|${config.scale ?? 100}`;
  let svg = _svgCache.get(key);
  if (!svg) {
    svg = buildAvatarSvg(config);
    _svgCache.set(key, svg);
  }
  return svg;
}

type Props = {
  config: AvatarConfig;
  team?: TeamSlug | null;
  size?: number;
  /** anneau coloré d'équipe (pastille de carte / mise en avant) */
  ring?: boolean;
};

export const Avatar = memo(function Avatar({ config, team, size = 48, ring = false }: Props) {
  const xml = useMemo(
    () => svgFor(config),
    [config.style, config.seed, config.backgroundColor, config.backgroundColor2, config.flip, config.rotate, config.scale],
  );
  const ringWidth = ring ? Math.max(2, Math.round(size * 0.06)) : 0;
  const inner = size - ringWidth * 2;
  const ringColor = team ? TEAMS[team].color : 'rgba(255,255,255,0.18)';

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: ringWidth,
        borderColor: ringColor,
      }}
    >
      <SvgXml xml={xml} width={inner} height={inner} />
    </View>
  );
});
