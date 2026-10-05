# Diagnostic de personnalisation — Agent Workflow Kit

Observation du 2026-10-05, par lecture locale uniquement.
Projet : /home/pierre/projets/agent-workflow-kit.
Branche : feat/agent-customization.
HEAD : 10a27d691c46a4db36f4c70dea18101aab91bb36.
Version lue : 0.1.0-dev.
Le contrat et ce diagnostic sont des changements non committés ; HEAD ne les contient pas.

## Instructions et périmètre

Le contrat est [agent-customization.md](agent-customization.md).
Les droits ont été confirmés par l’utilisateur : catalogue autonome, skills externes et créés
soumis à approbation, modifications des règles et étapes soumises à approbation.
Le plan propriétaire est local dans tasks/todo/agent-customization/.

AGENTS.md et CLAUDE.md sont absents à la racine observée.
.workflow-kit.json, .workflow-kit.env et .workflow/PROJECT_RULES.md sont absents.
Les répertoires locaux .claude/skills et .codex/skills sont également absents.
Il n’y a donc aucune installation du kit démontrée dans ce checkout.
Les skills accessibles dans cette conversation ne démontrent pas une activation dans le projet.

Lecture ciblée : entrée README, scripts d’installation, catalogue, composition, transaction,
manifeste Tasks, Memory, Quality et exemple externe, puis manifeste des huit modules.
Les tests ont été lus pour leurs conventions ; aucun code du projet ni test n’a été exécuté.

## Technologies et conventions observées

| Fait | Preuve |
|---|---|
| Entrée Linux/Bash, Node.js 18+, outils GNU et rsync | [install.sh](../install.sh) |
| Runtime JavaScript ESM, bibliothèques natives Node.js | [manage.mjs](../templates/project/.workflow/runtime/manage.mjs) |
| Contrats déclaratifs JSON, un propriétaire par composant | [modules.md](modules.md) et [catalog.mjs](../templates/project/.workflow/runtime/catalog.mjs) |
| Core commun ; capacités optionnelles sous modules/ | [project-workflow](../core/skills/project-workflow/SKILL.md) et [tasks/module.json](../modules/tasks/module.json) |
| Génération des miroirs Claude et Codex | [compose.mjs](../templates/project/.workflow/runtime/compose.mjs) |
| Tests Node natifs et fixtures temporaires avec espaces | [modules.test.mjs](../tests/modules.test.mjs) |
| Suite Bash : syntaxe, modules et reporting | [tests/run.sh](../tests/run.sh) |
| Tâches locales exclues du package public | [.gitignore](../.gitignore) |

## Catalogue disponible dans les sources

Comptage statique des manifestes ; disponibilité ne vaut ni installation ni usage.

| Module | Skills | Fragments de règles | Dépendances déclarées |
|---|---:|---:|---|
| tasks | 2 | 1 | Aucune |
| memory | 1 | 1 | Aucune |
| continuity | 2 | 1 | tasks, memory |
| quality | 18 | 1 | tasks |
| bugs | 2 | 1 | Aucune |
| reporting | 1 | 2 | Aucune |
| exploration | 2 | 1 | tasks, continuity |
| learning | 2 | 1 | Aucune |

Preuve : les huit module.json sous modules/, sans exécuter le chargeur du projet.
Le core déclare également branch-router, project-workflow et workflow-doctor.
Aucune sélection effective de ces modules n’est enregistrée dans le checkout.

## Besoins et candidats réutilisables

| Besoin | Candidat et preuve | Écart à traiter |
|---|---|---|
| Comprendre les obligations déjà activées | [project-workflow](../core/skills/project-workflow/SKILL.md) | Ajouter le parcours de personnalisation après preuve des droits |
| Choisir des modules et leurs dépendances | [catalog.mjs](../templates/project/.workflow/runtime/catalog.mjs) | Relier les besoins du diagnostic aux skills ; pas de sélection individuelle actuelle |
| Préparer un plan et préserver les fichiers | [manage.mjs](../templates/project/.workflow/runtime/manage.mjs), [transaction.mjs](../templates/project/.workflow/runtime/transaction.mjs) | Réutiliser le moteur ; prouver le parcours réel à la tâche 03 |
| Décrire un skill externe comme module local | [project-notes](../examples/modules/project-notes/module.json) | Récupération, inspection et accord externe non fournis par cet exemple |
| Vérifier la cohérence de l’installation | [workflow-doctor](../core/skills/workflow-doctor/SKILL.md) | Ne démontre pas la découverte ni l’usage par un agent |
| Créer un skill soumis à approbation | Contrat utilisateur et recherche ciblée dans scripts/runtime | Aucun circuit de proposition et d’accord exact identifié dans le chemin d’installation lu |
| Récupérer une révision du kit depuis un projet | Clone manuel dans [README](../README.md) | Entrée agent reproductible et preuve distante à fournir en tâche 02 |

Le besoin de Quality pour l’implémentation peut s’appuyer sur reuse, architect, validate-task,
explicit-naming et done-check déjà présents dans modules/quality/skills/.
Il s’agit de candidats à la sélection, pas d’une activation de Quality ici.

## Point de décision pour la tâche 03

Les huit modules officiels fournissent des règles ; le moteur installe le module complet.
Installer un module pour un seul skill peut donc ajouter d’autres skills et modifier les règles.
L’autonomie d’installation du catalogue ne doit pas contourner l’accord requis sur ces modifications.
La tâche 03 devra prouver comment sélectionner les skills avec la granularité retenue,
ou présenter les changements de règles et attendre l’accord avant l’activation du module.
Ce diagnostic n’autorise pas à changer les manifestes ni à créer un second installateur.

## Inconnues et limites

- Capacités globales de l’utilisateur : non inventoriées ; aucune activation projet déduite.
- Prérequis effectivement présents et versions des outils : non vérifiés.
- Réseau, bootstrap distant et provenance d’un skill externe : N.C.
- Installation, doctor, préservation, rollback et répétition : pas exécutés dans cette étape.
- Découverte native et respect de l’approbation par Claude, Codex ou Copilot : N.C.
- Le code contient des contrôles et les tests décrivent leurs cas ; ce diagnostic ne dit pas qu’ils passent.

## Résultat de cette étape

Chaque besoin possède une preuve locale ou un écart explicitement formulé.
La lecture distingue les skills sources, les capacités installées et les usages observés.
Les tâches 02 à 06 portent les frontières restantes ; aucun skill créé ni externe n’a été activé.
