import { avatarFromSeed, normalizeAvatar, type AvatarConfig } from './avatar';

describe('normalizeAvatar', () => {
  it('garde une config valide', () => {
    const cfg: AvatarConfig = { style: 'avataaars', seed: 'Karim', backgroundColor: 'b6e3f4' };
    expect(normalizeAvatar(cfg)).toEqual(cfg);
  });

  it('retombe sur un défaut déterministe si null/garbage', () => {
    const a = normalizeAvatar(null, 'Maya');
    const b = normalizeAvatar({ style: 'inconnu', seed: 42 }, 'Maya');
    expect(a).toEqual(b); // même seed → même fallback
    expect(a.seed).toBe('Maya');
  });

  it('défaut backgroundColor = transparent', () => {
    expect(normalizeAvatar({ style: 'micah', seed: 'x' }).backgroundColor).toBe('transparent');
  });
});

describe('avatarFromSeed', () => {
  it('est déterministe', () => {
    expect(avatarFromSeed('Léa')).toEqual(avatarFromSeed('Léa'));
  });
  it('varie selon la graine', () => {
    const seeds = ['a', 'b', 'c', 'd', 'e'].map((s) => avatarFromSeed(s).style);
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
});
