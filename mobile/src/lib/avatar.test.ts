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

  it('rejette un fond hex invalide → transparent', () => {
    expect(normalizeAvatar({ style: 'micah', seed: 'x', backgroundColor: 'zzz' }).backgroundColor).toBe('transparent');
    expect(normalizeAvatar({ style: 'micah', seed: 'x', backgroundColor: '#b6e3f4' }).backgroundColor).toBe('transparent');
  });

  it('borne le zoom à [50,150] et omet le défaut 100', () => {
    expect(normalizeAvatar({ style: 'micah', seed: 'x', scale: 999 }).scale).toBe(150);
    expect(normalizeAvatar({ style: 'micah', seed: 'x', scale: 10 }).scale).toBe(50);
    expect(normalizeAvatar({ style: 'micah', seed: 'x', scale: 100 })).not.toHaveProperty('scale');
    expect(normalizeAvatar({ style: 'micah', seed: 'x', scale: 'big' })).not.toHaveProperty('scale');
  });

  it('ramène la rotation dans [0,360) et omet 0', () => {
    expect(normalizeAvatar({ style: 'micah', seed: 'x', rotate: 370 }).rotate).toBe(10);
    expect(normalizeAvatar({ style: 'micah', seed: 'x', rotate: -10 }).rotate).toBe(350);
    expect(normalizeAvatar({ style: 'micah', seed: 'x', rotate: 0 })).not.toHaveProperty('rotate');
  });

  it('flip uniquement quand true', () => {
    expect(normalizeAvatar({ style: 'micah', seed: 'x', flip: true }).flip).toBe(true);
    expect(normalizeAvatar({ style: 'micah', seed: 'x', flip: 'yes' })).not.toHaveProperty('flip');
  });

  it('dégradé ignoré si fond transparent, gardé si fond coloré', () => {
    expect(normalizeAvatar({ style: 'micah', seed: 'x', backgroundColor2: 'ffd5dc' })).not.toHaveProperty('backgroundColor2');
    expect(normalizeAvatar({ style: 'micah', seed: 'x', backgroundColor: 'b6e3f4', backgroundColor2: 'ffd5dc' }).backgroundColor2).toBe('ffd5dc');
    expect(normalizeAvatar({ style: 'micah', seed: 'x', backgroundColor: 'b6e3f4', backgroundColor2: 'bad' })).not.toHaveProperty('backgroundColor2');
  });

  it('est idempotent', () => {
    const raw = { style: 'avataaars', seed: 'Karim', backgroundColor: 'B6E3F4', backgroundColor2: 'FFD5DC', flip: true, rotate: 730, scale: 200 };
    const once = normalizeAvatar(raw);
    expect(normalizeAvatar(once)).toEqual(once);
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
