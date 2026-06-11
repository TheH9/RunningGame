// Crée mobile/.env depuis .env.default s'il n'existe pas (lancé en postinstall).
// Ne touche jamais à un .env existant — vos réglages locaux sont préservés.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const env = path.join(root, '.env');
const def = path.join(root, '.env.default');

if (!fs.existsSync(env) && fs.existsSync(def)) {
  fs.copyFileSync(def, env);
  console.log('[ensure-env] .env créé depuis .env.default (mode connecté Supabase).');
}
