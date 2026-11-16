# Gemula Learn

**De l'idée au dossier bancable.**
Outil d'analyse stratégique pour les porteurs de projets, ingénieurs, chercheurs, consultants et incubateurs.
Structurez, chiffrez avec la fiscalité camerounaise, éprouvez votre projet face aux imprévus et imprimez un dossier de financement professionnel.

Un outil [Gemula](https://gemula.org). Aucune donnée n'est envoyée sur un serveur : tout reste dans le navigateur.

---

## Le parcours

| Étape | Module | Ce qu'il apporte |
|---|---|---|
| 1 | **Pré-test** | Dix situations pour situer le porteur (terrain, analytique, à construire) et personnaliser les conseils. |
| 2 | **Market Fit Canvas** | Problème, cible, solution, valeur, canaux, prix, coûts et indicateur de succès, avec un Master Prompt par bloc. |
| 3 | **Business Probability Canvas** | Revenus (vente unique, abonnement, boîtier + abonnement), coûts variables, équipements, personnel, charges fixes, marché, financement et fiscalité. |
| 4 | **Simulateur** | Trois scénarios sur 36 mois, trésorerie mois par mois, analyse de sensibilité et dix chocs combinables. |
| 5 | **Stratégie** | SWOT, matrice des risques avec parades, feuille de route des douze premiers mois. |
| 6 | **Dossier** | Score de bancabilité, plan de financement, lecture rédigée des résultats et quatre documents PDF. |

## Le moteur de calcul

Le calcul vit dans `src/lib/engine.ts`, en fonctions pures, sans lien avec l'interface. Il est couvert par des tests (`tests/engine.test.ts`).

- **Horizon de 36 mois** : douze mois détaillés, puis les années 2 et 3 avec un taux de croissance annuel.
- **Résultat et trésorerie séparés** : l'achat d'un équipement sort de la trésorerie le mois de l'achat ; son amortissement est réparti dans le résultat.
- **Besoin de financement** : calculé sans les apports ni le prêt, pour vérifier que les ressources prévues le couvrent. Le mois du creux est indiqué.
- **Prêt** : différé en intérêts seuls, puis annuités constantes. Les intérêts sont dans le résultat, le capital dans la trésorerie.
- **Fiscalité camerounaise (valeurs indicatives, modifiables)** :
  - TVA à 19,25 %, reversée le mois suivant, avec report du crédit de TVA ;
  - cotisations CNPS patronales plafonnées ;
  - impôt général synthétique (IGS), ou impôt sur les sociétés avec minimum de perception et report des déficits.
- **Abonnements** : abonnés de départ, nouveaux abonnés qui suivent la croissance, attrition. La LTV est calculée sur la marge et non sur le prix. Le CAC est tiré du budget marketing réel.
- **Scénarios** : prudent, base et ambitieux, avec des coefficients de volume et de coût réglables.
- **Chocs** : mois sans vente, perte de clients, hausse des coûts, nouvelle charge, mois difficile, recrutement, panne, retard d'encaissement, grosse commande, hausse de prix. Ils peuvent être combinés.
- **Sensibilité** : effet de ±10 % sur le prix, les volumes, les coûts variables et les charges fixes.
- **Bancabilité** : grille pondérée (trésorerie, apport, capacité de remboursement, résultat de l'année 2, point mort, marge) et alertes de cohérence.

> Les taux fiscaux et sociaux sont indicatifs. Ils doivent être confirmés par un expert-comptable ou par le centre des impôts de rattachement.

## Les documents imprimables

La page `/imprimer?doc=…` met en page le document avec [Paged.js](https://pagedjs.org) dans le style éditorial Gemula : fond ivoire, terracotta, Cormorant Garamond, Lora et Montserrat. Chaque document comprend une page de garde, une fiche du document, un sommaire paginé, des en-têtes courants et des graphiques vectoriels. On l'enregistre en PDF depuis la fenêtre d'impression du navigateur.

| Paramètre `doc` | Document |
|---|---|
| `complet` | Dossier de financement complet |
| `financier` | Plan financier |
| `bpc` | Business Probability Canvas |
| `simulation` | Simulation et stress-tests |

## Plusieurs projets

Le sélecteur en haut à droite permet de créer, dupliquer, supprimer, importer et exporter des projets (JSON). Les exports JSON de l'ancien outil DATAIKOS LEARN sont reconnus à l'import.

---

## Développement

Prérequis : Node.js 22.12 ou plus récent.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

Le site est statique : le dossier `dist/` se déploie tel quel sur Vercel, Netlify ou tout hébergement de fichiers.

## Structure

```
src/
├── lib/            # Modèle de données, moteur, analyse, fiscalité, prompts (TypeScript pur)
├── islands/        # Composants interactifs Preact (formulaires, simulateur, document)
├── components/     # En-tête, pied de page, logo Gemula
├── layouts/        # Mise en page du site
├── pages/          # Une page Astro par étape, plus /imprimer
└── styles/         # site.css (thème gemula.org) et doc.css (documents imprimés)
tests/              # Tests du moteur de calcul (Vitest)
```

## Technologies

Astro, Preact, TypeScript, Paged.js et Vitest. Polices auto-hébergées : Inter et Poppins pour le site, Cormorant Garamond, Lora et Montserrat pour les documents.

## Licence

MIT. Développé par **Gemula**, collectif d'étudiants polytechniciens et de chercheurs basé à Douala. *Pour nous les gems.*
