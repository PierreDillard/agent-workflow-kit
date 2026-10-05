# Personnalisation du workflow par un agent LLM

État : contrat de conception en cours, 2026-10-05.
Ce document définit la fonctionnalité à implémenter ; il ne constitue pas une preuve de comportement.
La sélection actuelle des modules est décrite dans [modules.md](modules.md).

## Objectif et parcours

Depuis un projet Git, un agent récupère une version identifiée du kit, examine le projet,
sélectionne les skills utiles et prépare une personnalisation locale.
Si les capacités déjà disponibles et le catalogue ne couvrent pas un besoin, l’agent privilégie
un skill créé localement avec write-a-skill. Une source externe vient en dernier recours justifié.

Parcours cible : récupérer → analyser → sélectionner → compléter → activer → utiliser.
Une demande de personnalisation n’autorise pas à modifier le produit du projet.

## Décisions validées

- Priorité confirmée le 2026-10-05 : réutiliser les capacités disponibles, puis créer localement
  le skill manquant ; une source externe vient en dernier recours justifié.
- La création locale doit privilégier un SKILL.md minimal et les outils natifs du kit, sans paquet,
  script ou fichier externe ajouté sans besoin établi.
- Toute création reste soumise à examen du contenu exact et accord utilisateur avant activation.
- Tout skill créé doit être soumis à l’utilisateur avant installation ou utilisation.
- L’accord doit porter sur le contenu complet proposé et sa cible d’installation.
- La fonctionnalité s’appuie sur le moteur de modules existant ; aucun profil ne change implicitement.
- Les tâches et données du projet restent préservées ; les sorties gérées gardent leur propriétaire.

## Droits confirmés le 2026-10-05

| Action | Droit retenu |
|---|---|
| Installer des skills du catalogue du repo | Autonome, dans le cadre de la personnalisation demandée |
| Installer un skill externe | Approbation utilisateur préalable du paquet et de sa cible |
| Installer ou utiliser un skill créé | Approbation utilisateur préalable du paquet et de sa cible |
| Modifier les règles ou étapes du workflow | Approbation utilisateur préalable des changements proposés |

L’agent peut proposer des skills et des règles adaptés au projet.
L’autonomie du catalogue ne couvre pas les changements de règles : si un module sélectionné
ajoute ou modifie des règles ou étapes, présenter ces changements et obtenir leur approbation
avant cette activation. Une installation identique sans changement reste un no-op.
Un accord sur les règles ne remplace pas l’approbation d’un skill externe ou créé.
Le silence et un changement de contenu après accord ne valent pas approbation.

## Diagnostic attendu

Lire les instructions du projet avant d’analyser un échantillon ciblé de configuration et de sources.
Ne pas exécuter du code du projet pendant cette analyse.
Le diagnostic expose :

- Le projet et la révision examinés, les instructions applicables et les limites de lecture.
- Technologies et conventions, avec chemins des fichiers servant de preuves.
- Besoins concrets, résultat attendu et skills susceptibles de les couvrir.
- Skills déjà disponibles, modules réellement installés et capacités effectivement activées.
- Inconnues, conflits et besoins non couverts, sans fabriquer de conclusion.

Un skill globalement disponible n’active pas un module du projet.
Un besoin doit être relié à une preuve ou explicitement présenté comme une hypothèse à confirmer.
Le [diagnostic local du kit](agent-customization-diagnostic.md) fournit la première observation
de tâche 01 E2, séparément de ce contrat ; il ne prouve ni installation ni usage natif.

## Sélection et installation

Relier chaque besoin à un skill puis à son module propriétaire.
Présenter les dépendances et les autres skills installés avec ce module.
La granularité individuelle par skill n’est pas encore promise : le moteur installe des modules.

Réutiliser le manifeste module.json, les catalogues locaux, le dry-run, l’inventaire installé,
les contrôles de collision, les miroirs et le doctor.
La découverte d’un module ne l’active pas.
L’ajout doit respecter les droits retenus ci-dessus et les instructions du projet cible.

Le profil Minimal reste Tasks + Memory. Les essais utilisent des projets isolés, un user-root
temporaire et des exports globaux désactivés.
Retrait, upgrade automatique et registre distant sont hors du périmètre initial.

## Skills externes

Avant de proposer un import, expliquer pourquoi la création locale privilégiée ne couvre pas
raisonnablement le besoin. Ne pas importer un paquet uniquement pour compléter un scénario de test.
Avant activation, figer l’origine et la révision du paquet, examiner sa licence et inspecter
SKILL.md, scripts, références, dépendances et hooks sans les exécuter.
Présenter les modifications nécessaires pour satisfaire le contrat des modules.
Une empreinte identifie le contenu ; elle ne prouve pas à elle seule la confiance dans la source.

L’activation exige l’approbation utilisateur du paquet externe exact et de sa cible,
puis applique les contrôles existants du moteur.
Une origine inconnue ou une dépendance non examinable empêche de déclarer le paquet prêt.
Le téléchargement distant reste une frontière à prouver dans les tâches 02 et 04.

## Skill créé : proposition et approbation

Le brouillon complet reste hors des chemins de découverte des agents jusqu’à approbation.
L’agent présente le besoin non couvert, le nom, l’objectif, SKILL.md et tous les fichiers annexes,
les actions possibles, la cible d’installation et une version ou empreinte du paquet proposé.

| État du paquet proposé | Action permise |
|---|---|
| Proposé, réponse absente | Présenter ou réviser le brouillon ; aucune installation ni utilisation |
| Refusé | Conserver la décision ; aucune activation |
| Approuvé explicitement | Installer le paquet exact sur la cible approuvée |
| Contenu ou cible modifié après accord | Solliciter un nouvel accord avant activation |

Ces états concernent la proposition de skill et ne remplacent pas les statuts des tâches.
Une autorisation générale de personnaliser ne remplace pas l’approbation individuelle d’un skill créé.
Ni silence, ni reprise de session, ni accord sur un autre paquet ne valent approbation.
Ne pas utiliser le brouillon pour accomplir le travail avant la décision.
Installation et usage restent deux preuves distinctes après accord.

Conserver besoin, paquet, décision et version activée dans le support propriétaire retenu à la tâche 05.
Ne pas introduire un registre parallèle à l’inventaire d’installation.
La première tranche E1 conserve les paquets dans `.workflow/skill-proposals/` et lie la décision
à leur empreinte et à la cible. Voir [la procédure](created-skill-approval.md). E2 vérifie refus,
silence, altérations, état obsolète et nouvel accord en fixtures. E3 vérifie la reprise par processus
frais du runtime installé, la répétition identique et les conflits sans écrasement ; les sessions
natives restent à observer en tâche 06. Pour review-local-skill, présentation complète, accord humain
réel sur paquet/cible et activation en fixture sont vérifiés ; ce skill n’a pas été utilisé par un agent natif.

## Frontières et preuves

| Frontière | Preuve nécessaire | Tâche |
|---|---|---|
| Acquisition depuis le repo | Récupération réelle d’une révision exacte puis dry-run sans mutation | 02 |
| Diagnostic vers modules | Besoin justifié puis installation réelle ciblée et préservation | 03 |
| Source externe | Source réelle figée, inspection et activation autorisée | 04 |
| Proposition vers accord | Échange utilisateur, paquet exact, refus et altération exercés | 05 |
| Installation vers usage | Découverte et action observable en session native par agent | 06 |

Le doctor vérifie l’installation et les fichiers ; il ne prouve pas qu’un LLM suit les instructions.
Une preuve locale ou simulée ne remplace pas une frontière réseau ou native.
Conserver N.C. pour les parcours non observés et distinguer les résultats de chaque agent.
Un lancement de session native nécessite l’autorisation explicite prévue dans les tâches.

## Source de vérité et limites

Ce document possède le contrat de personnalisation. Les tâches décrivent les étapes et leurs preuves.
Le catalogue et les manifestes possèdent les composants ; l’inventaire possède l’installation effective.
Les règles applicables du projet cible restent prioritaires ; aucun fichier géré n’est modifié à la main.
La personnalisation n’autorise ni commit, push, merge, publication ni suppression de données.
