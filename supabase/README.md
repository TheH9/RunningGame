# Bornes — Base de données (Supabase / Postgres)

Schéma, sécurité (RLS), fonctions serveur, temps réel et tâches planifiées du
jeu. Le client (`mobile/`) reste utilisable **hors-ligne** : sans variables
Supabase, il tourne en mode démo local et ne synchronise rien.

## Contenu

| Fichier | Rôle |
|---|---|
| `migrations/0001_init.sql` | Schéma initial : villes, équipes, profils, runs, points, territoire H3, méta-jeu (partenaires, défis, drops, lots), scoring de base, RLS partielle. |
| `migrations/0002_meta_social_security.sql` | **Le complément complet** : saisons, social (amis, duels), feed, succès, vues de classement, scoring v2 (capture + feed), `claim_drop`/`start_duel`/`settle_duels`/`rollover_seasons`, trigger de création de profil, **RLS sur TOUTES les tables**, Realtime, cron. |
| `migrations/0003_seed_demo.sql` | Données de démarrage Asnières (saison live, partenaire, défi, drop). |
| `functions/score-run/` | Edge function : `validate_run` puis `score_run` (service_role). |

## Installation

### Avec la CLI Supabase (recommandé)

```bash
supabase link --project-ref <ref>
supabase db push                  # applique 0001 → 0002 → 0003 dans l'ordre
supabase functions deploy score-run
```

### Ou via l'éditeur SQL (dashboard)

Exécuter les fichiers **dans l'ordre** : `0001`, puis `0002`, puis `0003`.
Les migrations 0002/0003 sont **idempotentes** (ré-exécutables sans casse).

### Extensions requises

`postgis`, `h3`, `pgcrypto` (activées par 0001). `pg_cron` est **optionnel** :
si présent, 0002 planifie les jobs ; sinon, utiliser des *Scheduled Edge
Functions* pour `decay_territory`, `settle_duels`, `rollover_seasons`.

## Variables d'environnement

| Côté | Variable | Usage |
|---|---|---|
| App (Expo) | `EXPO_PUBLIC_SUPABASE_URL` | URL du projet |
| App (Expo) | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | clé publique (anon) — sûre, protégée par la RLS |
| Edge fn | `SUPABASE_URL` | injectée automatiquement |
| Edge fn | `SUPABASE_SERVICE_ROLE_KEY` | **secrète** — contourne la RLS, jamais côté client |

## Modèle de sécurité (RLS)

> ⚠️ Une table du schéma `public` **sans RLS** est entièrement ouverte
> (lecture **et écriture**) à quiconque possède la clé anon. La migration
> 0002 active la RLS sur **toutes** les tables et ferme les trous laissés
> par 0001 (`cities`, `teams`, `challenges`, `drops`, `partners`).

Principes :

- **Référentiel** (`cities`, `teams`, `partners`, `challenges`, `drops`,
  `seasons`, `season_results`) : lecture publique, **aucune écriture client**
  (réservée au `service_role` / back-office).
- **Profils & runs** : lecture publique (pseudo, équipe, traces) ; écriture
  uniquement par leur propriétaire (`auth.uid()`).
- **Points privés** (`run_points.is_private = true`) : **ne sortent jamais**
  en lecture publique (Privacy Zone, ADR-002 §5).
- **Territoire & feed** : lecture publique ; écriture **uniquement** par les
  fonctions `SECURITY DEFINER` (le scoring serveur), jamais par le client.
- **Lots** (`prizes_won`) : lecture par le gagnant ; **aucun insert client** —
  un lot ne peut être créé que par `claim_drop()` (qui vérifie la
  qualification et la fenêtre). Impossible de « se forger » un lot.
- **Duels** : créés via `start_duel()` (definer), réglés par `settle_duels()`
  (cron) ; le client ne peut pas trafiquer les scores.

Les vues de classement (`runner_scores`, `duel_live`) sont en
`security_invoker` : elles **respectent** la RLS des tables sous-jacentes.

## Fonctions exposées (RPC)

| Fonction | Appelée par | Effet |
|---|---|---|
| `claim_drop(uuid)` | client (authenticated) | réclame un lot si qualifié + fenêtre ouverte (idempotent) |
| `start_duel(uuid)` | client (authenticated) | lance un duel 7 jours contre un rival |
| `score_run(uuid)` | edge `score-run` (service_role) | agrège la trace en cellules H3, émet les captures |
| `validate_run(uuid)` | edge `score-run` (service_role) | anti-triche v1 (> 40 km/h → invalidé) |
| `settle_duels()` | cron | fige les scores des duels échus, désigne le vainqueur |
| `decay_territory()` | cron | libère les cellules inactives > 30 j |
| `rollover_seasons()` | cron | clôture les saisons échues, fige le palmarès, ouvre la suivante, remet la carte à zéro |

## Temps réel

`0002` ajoute `territory_cells`, `feed_events` et `duels` à la publication
`supabase_realtime`. Le client peut s'abonner :

```ts
supabase.channel('city')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'territory_cells' }, onCell)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_events' }, onFeed)
  .subscribe();
```

## Tâches planifiées (cron)

| Job | Fréquence | Fonction |
|---|---|---|
| `decay-territory` | tous les jours 04:00 | `decay_territory()` |
| `settle-duels` | toutes les 30 min | `settle_duels()` |
| `rollover-seasons` | tous les jours 00:15 | `rollover_seasons()` |

## Flux d'un run

1. `runs` insert (`status = 'active'`, `started_at` = horodatage **serveur**).
2. `uploadRunPoints()` → batch dans `run_points` (EWKT `SRID=4326;POINT…`).
3. `finishRun()` → `runs.status = 'finished'` + invoque l'edge `score-run`.
4. `score-run` : `validate_run()` puis `score_run()` (source de vérité).
5. Realtime pousse les cellules mises à jour + les events de capture.
