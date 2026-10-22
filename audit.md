# Audit — chargement paresseux du contexte et orchestration

Date : 2026-10-22 · Version auditée : `ants-kit@0.2.0` (`main` après la PR #5)

Périmètre : comment le kit limite le contexte chargé par l'assistant (index, pointeurs, chargement
à la demande), la qualité des 32 skills livrés vis-à-vis de ce principe, et la capacité de
l'orchestrateur `project-workflow` à s'adapter aux modules choisis par l'utilisateur.
Remarques annexes sur la publication npm en fin de document.

Légende : 🔴 problème structurel · 🟠 écart à corriger · 🟡 amélioration · ✅ conforme

---

## 1. Synthèse

| # | Constat | Gravité |
|---|---|---|
| 1 | `project-workflow` est un fichier statique identique pour tous les projets ; il n'est pas adapté aux modules installés | 🔴 |
| 2 | Un module personnalisé ne peut pas s'insérer dans l'orchestrateur | 🔴 |
| 3 | Le chargement paresseux repose sur des consignes, pas sur un mécanisme automatique (hors skills natifs) | 🟠 |
| 4 | `code-simplification` charge 13,5 KB d'un bloc, dont une section Python | 🟠 |
| 5 | 6 skills ont une description sans déclencheur (« Use when… ») | 🟠 |
| 6 | `wayfinder` est routé par l'orchestrateur mais désactivé pour l'invocation automatique | 🟠 |
| 7 | `GLOSSARY-FORMAT.md` (teach) est livré mais jamais référencé | 🟠 |
| 8 | Aucun module pour documenter le projet et sa stack technique | 🟡 |
| 9 | Seuls 2 index ont une taille maximale vérifiée ; fichiers de thème non bornés | 🟡 |
| 10 | Seuls les hooks `session-start` sont acceptés pour les modules | 🟡 |
| 11 | `project-workflow`, `write-task` : sections conditionnelles chargées systématiquement | 🟡 |

---

## 2. Ce qui est conforme ✅

- **Règle générale** posée dans `templates/project/.workflow/base-rules.md` :
  *« Load the smallest relevant context. »*
- **Pointeurs à la racine** : `CLAUDE.md` / `AGENTS.md` ne reçoivent qu'un bloc de trois lignes
  vers `tasks/.workflow/` (`pointerBlock`, `runtime/layout.mjs`) ; le contenu du kit n'y est pas copié.
- **Mémoire en « lazy index »** (module Memory) :
  - `tasks/PROJECT_MEMORY.md` : tableau `Thème | Lire quand | Fichier`, contenu dans `tasks/memory/<thème>.md` ;
  - `tasks/DECISIONS.md` : une ligne par sujet vers `decisions/<thème>.md`, *« Do not preload every theme »* ;
  - la mémoire pointe vers la tâche ou le bug d'origine au lieu de recopier les preuves ;
  - `memory-report` : `NO_PROMOTION` par défaut, remplacement des règles obsolètes plutôt qu'empilement.
- **Tailles maximales vérifiées par l'outil** (`modules/memory/module.json`, `checks.maxBytes`) :
  `PROJECT_MEMORY.md` ≤ 8 KiB, `DECISIONS.md` ≤ 32 KiB ; contrôlées par `ants doctor`, `init` et
  `update` (`runtime/doctor.mjs:32`, `manage.mjs:102`, `update.mjs:138`).
- **Index de tâches et de bugs** : *« Read only its index and selected task »*
  (`modules/tasks/rules/main.md`) ; ledger de bugs par thème (`modules/bugs/files/README.md`).
- **Skills qui appliquent eux-mêmes la règle** : `memory-report` (*« Never scan all memories or
  bugs »*), `bug-triage`, `branch-router` (*« Read the index first »*).
- **Taille des skills** : les 32 `SKILL.md` sont sous 500 lignes ; médiane ≈ 45 lignes / 2 KB.
- **Divulgation progressive bien utilisée** : `tdd` (5 fichiers liés), `teach` (3 sur 4),
  `weekly-report` (`references/`), avec des liens conditionnels.
- **Bonnes descriptions** (déclencheurs explicites, y compris phrases de l'utilisateur) :
  `explain-simply`, `done-check`, `consistency-check`, `type-honesty`, `novice-lens`,
  `failure-containment`.
- **Handoff borné** : `project-handoff` < 120 lignes.
- **Coût permanent des descriptions** : ≈ 6,8 k caractères pour les 32 skills, ce qui reste raisonnable.

---

## 3. Orchestrateur `project-workflow` 🔴

Fichier : `core/skills/project-workflow/SKILL.md` (96 lignes, 7,8 KB).

### 3.1 Statique, non adapté aux choix de l'utilisateur

Le fichier est copié tel quel pour tous les projets et décrit les 8 modules. L'assistant doit
filtrer à la lecture :

- tableau des routes avec conditions entre parenthèses (« `review-gate` … (Quality) ») ;
- sections « Design gates » et « Implementation gates » marquées *« only when Quality is installed »*
  (6 occurrences de « Quality ») ;
- section 3 « Handle missing capabilities » entièrement consacrée aux modules absents ;
- l'état réel des modules est dans `kit.json`, que l'assistant doit lire en plus.

**Conséquences**

1. Contexte gaspillé : en profil `minimal` (Tasks + Memory), les 7,8 KB sont chargés, dont toutes
   les règles Quality, Bugs, Exploration, Learning et Reporting, sans objet.
2. Raisonnement fragile : chaque demande impose de croiser chaque condition « (Module) » avec
   `kit.json` ; risque d'appeler un skill absent ou de sauter une étape.
3. Le fichier est chargé à chaque demande non triviale : c'est le skill qui coûte le plus en pratique.

### 3.2 Les modules personnalisés sont invisibles pour l'orchestrateur

Un module ne peut contribuer qu'à `PROJECT_RULES.md` via les points `session-start`,
`task-validation` et `before-handoff` (`runtime/compose.mjs`, `composeRules`). Il n'existe aucun
point d'intégration pour le routeur : un module comme `examples/modules/project-notes` (ou un
futur module `stack`) n'est trouvé que par la description de son skill, jamais par l'orchestrateur.

### 3.3 Recommandation : générer le routeur à l'installation

Le kit possède déjà la mécanique nécessaire (`composeRules` recompose `PROJECT_RULES.md` à chaque
`init` / `add` / `update`, avec conditions `when`). L'appliquer au routeur :

1. **Squelette fixe dans le core** : étapes stables (résoudre le contexte → choisir la route →
   étapes → enregistrer le résultat) et **emplacements nommés** par route, par exemple
   `implementation: branch → design-gate → contract → before-edit → edit → verify → close`.
2. **Nouveau champ `routes` dans `module.json`** :
   ```json
   "routes": [
     { "intent": "implementation", "slot": "before-edit", "skill": "reuse",
       "when": "before any code change" },
     { "intent": "merge", "slot": "before-merge", "skill": "review-gate",
       "when": "merge into DEFAULT_BRANCH or review requested" }
   ]
   ```
3. **Génération** du `SKILL.md` final (Claude et Codex) par `ants init` / `add` / `update`, ne
   contenant que les skills installés. Exemple attendu en profil `minimal` :
   `| Implementation | branch-router → ants → write-task → edits → verification |`.
4. **Effets** : section « missing capabilities » réduite à deux lignes ; modules personnalisés
   routés comme les officiels ; `ants doctor` vérifie que chaque skill routé est installé ;
   `kit.env` reste lu pour `BRANCH_STRATEGY`, `REQUIRE_PRECOMMIT`, commandes de test, etc.

**Points à trancher**

- Granularité des emplacements : partir des étapes déjà écrites (≈ 4 à 6 par route).
- Règles de jugement non tabulaires (*« an isolated change skips inapplicable gates »*) : rester
  en texte, fournies par le module concerné.
- Migration : routeur généré non éditable, distribué via `ants update` ; justifie une 0.3.0.

Ampleur estimée : ~3 fichiers runtime (`compose.mjs`, `manage.mjs`, `update.mjs`), les 8
`module.json`, `docs/modules.md`, tests. Commencer par une tâche ANTS décrivant le contrat, puis
valider le `SKILL.md` généré pour `minimal` et `complete` avant d'écrire le moteur.

---

## 4. Chargement paresseux : consignes vs mécanismes 🟠

Hors des tailles maximales (§ 2), tout repose sur des consignes : rien n'empêche techniquement un
assistant de tout lire, et la colonne « Lire quand » des index dépend de la qualité de sa rédaction.
Le README le reconnaît (*« do not guarantee that the assistant follows every instruction »*).

Mécanismes disponibles pour rendre le chargement automatique, par ordre de préférence :

| Mécanisme | Automatique ? | Support dans le kit | Remarque |
|---|---|---|---|
| **Skills** (nom + description en contexte, `SKILL.md` chargé à la demande, fichiers liés au besoin) | Oui, natif Claude Code et Codex | Oui | Solution recommandée ; dépend de descriptions précises (§ 5.2) |
| **`CLAUDE.md` / `AGENTS.md` imbriqués** dans les sous-dossiers | Oui, chargés quand l'assistant travaille dans le dossier | Non (le kit n'écrit qu'à la racine) | Fichiers ordinaires à commiter dans le projet |
| **Hook `UserPromptSubmit`** injectant un pointeur selon des mots-clés | Oui | Non : seuls les hooks `session-start` sont acceptés (`docs/modules.md`, *Integration points*) | Fragile ; les skills font mieux |

---

## 5. Skills

### 5.1 Taille et découpage

| Skill | Taille | Fichiers liés | Remarque | Gravité |
|---|---|---|---|---|
| `quality/code-simplification` | 331 lignes, 13,5 KB | 0 | Plus gros skill ; sections TypeScript, **Python**, React, « Common Rationalizations », « Red Flags » chargées d'un bloc. Garder les 5 principes et le processus ; sortir `typescript.md`, `react.md`, `python.md`, `rationalizations.md`. Gain ≈ 13 KB → ~4 KB dans le cas courant. | 🟠 |
| `core/project-workflow` | 96 lignes, 7,8 KB | 0 | Voir § 3. À défaut de génération, sortir « Handle missing capabilities » et « Integration proof before expansion » dans des fichiers liés. | 🟡 |
| `tasks/write-task` | 116 lignes, 5,5 KB | 0 | Gabarit complet de tâche (`# NN — Title`, `## Why`…) dans le `SKILL.md` ; le déplacer dans `TEMPLATE.md` lu à la création. | 🟡 |
| `quality/novice-lens` | 117 lignes, 4,7 KB | 0 | Grilles de score extractibles. | 🟡 |
| `quality/reuse` | 113 lignes, 2,5 KB | 0 | Commandes d'exemple extractibles. | 🟡 |

### 5.2 Descriptions sans déclencheur 🟠

La description est le seul texte toujours en contexte ; sans « quand », le chargement automatique
devient aléatoire hors du routeur.

| Skill | Description actuelle (début) | Manque |
|---|---|---|
| `tasks/ants` | « Structure implementation as small, atomic, traceable changes… » | Quand l'utiliser |
| `tasks/write-task` | « Create or restructure ANTS task files… » | Quand l'utiliser |
| `memory/memory-report` | « Promote only proven reusable findings… » | À quel moment (après un fix ? une validation ?) |
| `continuity/project-handoff` | « Create or update the current branch handoff… » | Fin de session ? demande explicite ? |
| `bugs/bug-fix-trace` | « Confirm a bug hypothesis at runtime… » | Déclencheur (après `bug-triage`) |
| `exploration/wayfinder` | « Map a multi-session initiative… » | Voir § 5.3 |

Modèle à suivre : `explain-simply`, `done-check`, `consistency-check`, `type-honesty`.

### 5.3 Incohérence `wayfinder` 🟠

`modules/exploration/skills/wayfinder/SKILL.md` porte `disable-model-invocation: true` (invocation
manuelle uniquement), mais `project-workflow` le route automatiquement pour la planification
multi-session. Le routeur contourne la restriction en faisant lire le `SKILL.md` directement.
Décider : soit le skill est invocable par le modèle (retirer le flag), soit le routeur indique de
proposer `/wayfinder` à l'utilisateur au lieu de l'appliquer.

`teach` porte aussi ce flag, ce qui est cohérent : il n'est routé que sur demande d'apprentissage
explicite, et sa description vague n'a alors pas d'effet.

### 5.4 Fichier orphelin 🟠

`modules/learning/skills/teach/GLOSSARY-FORMAT.md` est livré, mais le `SKILL.md` ne le référence
pas (il lie `MISSION-FORMAT.md`, `RESOURCES-FORMAT.md`, `LEARNING-RECORD-FORMAT.md`). Seul
`LEARNING-RECORD-FORMAT.md` mentionne `[[GLOSSARY.md]]`. Ajouter dans la liste du workspace une
entrée `GLOSSARY.md` avec un lien vers `GLOSSARY-FORMAT.md`.

### 5.5 Couverture du routeur ✅

Tous les skills livrés sont cités par `project-workflow` (hors lui-même), et tous les skills qu'il
cite existent.

---

## 6. Documentation du projet et de la stack 🟡

Aucun module officiel ne couvre la documentation du projet ou de ses technologies. Existant proche :

| Élément | Couverture | Limite |
|---|---|---|
| `CLAUDE.md` / `AGENTS.md` générés (*Purpose, Architecture map, Persisted data…*) | Squelette d'architecture | Lus à chaque session : y détailler la stack contredit le chargement paresseux |
| Module Memory (`memory/<thème>.md`) | Thèmes possibles `react`, `gpac`… | Prévu pour des règles vérifiées, pas de la documentation |
| `examples/modules/project-notes` | Modèle de module personnalisé | Exemple, pas une fonctionnalité |

**Recommandation** : module `stack` (exemple ou 9ᵉ module officiel) :

1. index `tasks/stack/README.md` (`Techno | Version | Lire quand | Skill`) avec `maxBytes`
   vérifié par `ants doctor` ;
2. un skill par technologie (`stack-react`, `stack-gpac`…) avec une description précise
   « Use when… » — c'est ce qui rend le chargement automatique — et des fichiers liés pour le détail ;
3. une règle `session-start` d'une ligne : la stack est décrite dans `tasks/stack/README.md`,
   ne pas la recopier dans `CLAUDE.md`.

Dépend du § 3.3 pour que ces skills soient aussi connus de l'orchestrateur.

---

## 7. Index et tailles 🟡

- Seuls `PROJECT_MEMORY.md` (8 KiB) et `DECISIONS.md` (32 KiB) ont un `maxBytes`.
- Non bornés : fichiers de thème `memory/<thème>.md`, `decisions/<thème>.md`, index de tâches
  `tasks/todo/<effort>/README.md`, ledger de bugs `README.md` et ses thèmes.
- Aucune vérification que les pointeurs d'un index mènent à un fichier existant.

**Recommandations** : avertissement `ants doctor` (et non échec, ces fichiers étant éditables) pour
les thèmes au-delà d'un seuil, et pour les liens d'index cassés. Le schéma `checks` actuel ne
cible qu'un chemin fixe : il faudrait un motif (`memory/*.md`) ou un nouveau type de check.

---

## 8. Hooks 🟡

Les modules ne peuvent déclarer que des hooks `session-start` (timeout 10 s, vérification de hash).
C'est un choix de sécurité raisonnable. Un hook `UserPromptSubmit` permettrait d'injecter des
pointeurs selon la demande, mais il est fragile et redondant avec les skills : à ne pas prioriser.

---

## 9. Remarques annexes (publication)

| Constat | Gravité | Action |
|---|---|---|
| `actions/checkout@v4` et `actions/setup-node@v4` ciblent Node 20, déprécié sur les runners (avertissement dans le log de publication) | 🟡 | Passer `ci.yml` et `publish.yml` en `@v5` |
| Dist-tag npm `next` toujours sur `0.2.0-dev` | 🟡 | `npm dist-tag add ants-kit@0.2.0 next` ou attendre la prochaine pré-release |
| `PUBLISHING.md:56` mentionne encore `npx github:PierreDillard/agent-workflow-kit` (retiré du README) | 🟡 | Retirer ou garder comme note mainteneur |
| Token npm et secret `NPM_TOKEN` devenus inutiles (publication par trusted publisher) | 🟡 | Supprimer ; cocher « Require two-factor authentication and disallow bypass 2fa tokens » sur npm |

---

## 10. Plan proposé

| Priorité | Action | Effort | Version |
|---|---|---|---|
| 1 | Ajouter « Use when… » aux 6 descriptions (§ 5.2) | Faible | 0.2.x |
| 2 | Relier `GLOSSARY-FORMAT.md` (§ 5.4) ; trancher `wayfinder` (§ 5.3) | Faible | 0.2.x |
| 3 | Découper `code-simplification` (§ 5.1) | Moyen | 0.2.x |
| 4 | Sortir le gabarit de `write-task` (§ 5.1) | Faible | 0.2.x |
| 5 | Routeur généré à partir des modules installés (§ 3.3) | Élevé | 0.3.0 |
| 6 | Module `stack` (§ 6), après le 5 | Moyen | 0.3.0 |
| 7 | Avertissements `doctor` sur tailles de thèmes et liens cassés (§ 7) | Moyen | 0.3.0 |
| 8 | Workflows GitHub en `@v5`, nettoyage npm (§ 9) | Faible | indépendant |

Toute modification d'un skill ou d'un module doit passer `bash tests/run.sh` et
`bash tests/publication-candidate.sh`. `ants update` propage aussi un contenu modifié à version de
module identique (`checkVersion` n'exige qu'une version non décroissante) ; monter la version du
module reste recommandé pour tracer le changement dans `kit.json`.
