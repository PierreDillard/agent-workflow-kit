# Collecte ciblée

1. Résoudre les sources depuis `${TASKS_DIR}/reports/config.json` : chemins relatifs à la racine projet,
   remplaçables par `path_env` sur chaque poste. Source absente = couverture incomplète explicite.
2. Lire carnet cible, objectifs, bilan précédent et tâches référencées ; au premier usage,
   cibler les tâches actives via leur index. Un mtime de fichier n'est pas une date de travail.
3. Lire les commits locaux de chaque dépôt, SHA complets, auteur/email, dates auteur/committer,
   sujet. Exemple read-only : `git -C <source> log --all --since-as-filter=<lundi> --until=<lundi-suivant> --format=...`.
   Bornes explicites dans le fuseau configuré, changement d'heure compris ; filtrer l'intervalle semi-ouvert
   [lundi, lundi suivant[. Une date de commit ne date pas toute la réalisation.
4. Filtrer par les `author_emails` exacts. Si vides, lire les identités Git locales et faire
   confirmer une seule fois avant sauvegarde en config. Coauteurs, merges et auteur ambigu :
   clarifier au besoin. Dédupliquer dépôt+SHA, et cherry-picks par provenance/diff si nécessaire.
5. Statut/diff ciblé pour travail non committé, sans supposer qu'il est de cette semaine.
   Ne pas lire les gros artefacts de build ni les fichiers secrets.
6. Handoffs et documents donnent des candidats, pas une preuve que tout leur contenu est nouveau.
7. Liens depuis les remotes : GitHub `commit/SHA`, GitLab `-/commit/SHA`. Une branche remote
   locale peut être périmée : vérifier l'accès distant en lecture seule si possible, sinon
   marquer « publication non vérifiée ». Aucun push pour rendre un lien valide. Supprimer tout
   token des URLs ; fichiers non versionnés = locaux.
8. Regrouper candidats nouveaux et questions ; aucune approbation implicite des faits collectés.
   Préserver notes approuvées, refus, corrections. Une relance ne crée aucun doublon.

## Volume et couverture

- Sources : commits, tâches, bugs, documents, résultats, artefacts nommés. Pas de scan global de
  conversations ni de tous les documents à chaque session ; le rappel lit seulement des états.
- Volume élevé : collecter par dépôt/jour, conserver références des preuves dans le carnet,
  signaler les limites. Ne jamais annoncer une couverture exhaustive supposée.
- Une recherche sans résolution reste du travail ; distinguer hypothèse et constat.
- Poser une question groupée sur les travaux manquants ; une journée vide n'est pas une absence.
- Deux postes : dernière copie de `${TASKS_DIR}/` avant reprise. Le MVP ne synchronise pas Drive et
  ne peut détecter une version plus récente sur une autre machine.

## Vérification avant remise

- Chaque activité a une attribution, une période connue ou inconnue explicitement et une source.
- Exclure `pending`, `rejected`, `internal` et toute paraphrase de leur contenu.
- Corrections préservées à la relance ; références stables ; questions ouvertes et reports expliqués.
- Rapport finalisé : proposer les compléments sans remplacer le texte.
- Relecture cible de 5–10 minutes, preuves détaillées dans le carnet.
