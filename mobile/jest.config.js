// Tests unitaires de la LOGIQUE PURE (géométrie, territoire, monde procédural).
// Environnement Node : aucune dépendance React Native / Expo n'est chargée.
// Les écrans, stores branchés sur React et le BotEngine (qui importe
// react-native) ne sont pas couverts ici — voir le plan de tests Notion pour
// la partie manuelle / device.
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  // h3-js est livré en CommonJS : pas besoin de le transformer.
  transformIgnorePatterns: ['/node_modules/'],
  clearMocks: true,
};
