# Documents et états

Dans `${TASKS_DIR}/reports/`, deux Markdown par semaine : `AAAA-WNN.carnet.md` interne et
`AAAA-WNN.md` transmissible. Création à la demande, pas par le hook. Carnet sans rapport possible.

## Carnet

Bloc JSON strict en tête, lu par le rappel (adapter semaine et dates) :

```md
<!-- weekly-report
{"week":"2026-W38","goals_status":"proposed","snoozed_until":null,"absence":false,"skip_report":false}
-->
# Carnet interne — 2026-W38

## Objectifs initiaux
Proposition datée, liens vers objectifs/tâches ; validation utilisateur datée.

## Changements de priorités
Date, objectif, raison et validation ; préserver le plan initial.

## Activités
### N001 — Titre
Validation: pending
Visibilité: report
Travail: 2026-09-18 (ou période / jour inconnu dans la semaine)
Saisie: 2026-09-18T14:00:00+02:00
Axe: objectif-produit (ou hors objectifs prévus)
Source: note utilisateur / handoff / tâche / git
Référence: chemin relatif, URL ou dépôt + SHA complet
Fait: activité, résultat ou incertitude ; attribution explicite.
Durée: seulement si fournie

## Questions au responsable
Identifiant stable, date initiale, question, impact, destinataire, état ouvert/répondu,
réponse datée et provenance.

## Collecte et corrections
Sources consultées, couverture, sources indisponibles et limites.
Corrections utilisateur à préserver aux futures synthèses.
```

- `goals_status`: `proposed` ou `approved` (accord explicite).
- `snoozed_until`: date locale `YYYY-MM-DD`, exclusive : rappels actifs ce jour-là.
- `absence`, `skip_report`: booléens, uniquement sur demande.
- Identifiant stable d'activité `N001`, `N002`… dans sa semaine.
- `Validation`: `pending`, `approved`, `rejected` sur une ligne séparée exacte.
- `Visibilité`: `report` ou `internal` ; inconnue = exclure avant clarification.
- Dédupliquer par provenance + fait + période. Même dépôt+SHA sur plusieurs branches = une
  preuve. Évolution de résultat = nouvelle entrée liée ; reformulation seule = aucune nouveauté.
- Les données collectées deviennent approuvées après validation groupée ; une note explicitement
  dictée est directement approuvée. Préserver les refus pour éviter leur réintroduction.
- Questions ouvertes référencées depuis l'entrée d'origine dans les semaines suivantes ;
  mettre à jour leur état à cet endroit et suivre les références lors du bilan.
- Pas de compteur pending dupliqué : le rappel compte les lignes `Validation: pending`.

## Rapport

```md
<!-- weekly-report
{"week":"2026-W38","status":"draft"}
-->
# Bilan hebdomadaire — 2026-W38

## Synthèse
Quelques lignes de résultats et situation globale.

## Travail jour par jour
### Lundi
Activité — axe ; résultat, preuve utile et durée si connue.
### Date non précisée dans la semaine
Seulement si nécessaire, sans inventer de journée.

## Blocages et questions au responsable
Réponse/décision attendue, date initiale, impact.

## Objectifs de la semaine suivante
Priorités proposées, reports expliqués, à valider au début de semaine.
```

`status`: `draft` ou `finalized`. Finalisation explicite : ajouter `finalized_at` ISO.
Correction explicitement demandée après finalisation : conserver cet état et ajouter `revised_at`.
Ne pas changer le rapport seulement parce qu'une collecte a eu lieu. Avant finalisation, signaler
les candidats encore en attente sans exposer de notes internes ; l'utilisateur peut les laisser exclus.
Français, factuel, technique sans détail de code ; développé ≠ testé ≠ intégré ≠ livré.
Liens GitLab/GitHub intelligibles ; éléments locaux résumés « disponible sur demande ».
Pas de chemin absolu destiné au responsable, de durée ni répartition quotidienne inventée.
Les rapports passés finalisés restent des instantanés, pas l'état courant des tâches.
