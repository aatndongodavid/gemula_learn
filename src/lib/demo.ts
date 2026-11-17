import { projetVide, uid, type Projet } from './model';

/** Projet d'exemple : un traiteur événementiel à Douala. */
export function projetDemo(): Projet {
  const p = projetVide();
  p.identite = {
    projet: 'Les Délices d’Aïcha', promoteur: 'Aïcha M.', secteur: 'Restauration événementielle',
    localisation: 'Bonamoussadi, Douala', formeJuridique: 'Établissement individuel', contact: '', debut: p.identite.debut
  };
  p.pretest = { 1: 'A', 2: 'A', 3: 'A', 4: 'A', 5: 'A', 6: 'C', 7: 'A', 8: 'A', 9: 'C', 10: 'A' };
  p.canvas = {
    probleme: 'Les familles et les PME de Douala manquent de temps pour organiser la restauration de leurs événements, et les traiteurs de quartier tiennent mal les délais.',
    segment: 'Familles urbaines et PME de Douala qui organisent 1 à 4 événements par an.',
    solution: 'Traiteur événementiel avec des menus camerounais sur mesure, commandés via WhatsApp et livrés à l’heure.',
    valeur: 'Cuisine camerounaise authentique, devis en 24 h, ponctualité garantie et meilleur rapport qualité-prix.',
    canalPrincipal: 'WhatsApp Business et recommandations', canalSecondaire: 'Stands lors d’événements partenaires',
    prixHypothese: '3 000 FCFA la portion', frequence: '1 à 2 commandes par mois et par client',
    couts: 'Ingrédients ~1 200 FCFA par portion, gaz et transport ~60 000 FCFA par mois, communication 20 000 FCFA par mois.',
    metrique: 'Nombre de portions vendues par mois', objectif1Mois: '180 portions vendues'
  };
  p.modele = 'vente';
  p.produits = [
    { id: uid(), nom: 'Repas événementiel (portion)', prix: 3000, coutUnitaire: 1300, quantiteM1: 110 },
    { id: uid(), nom: 'Plateau cocktail (10 pièces)', prix: 6500, coutUnitaire: 3000, quantiteM1: 8 }
  ];
  p.coutsVariables = [
    { id: uid(), libelle: 'Livraison (par unité)', montant: 150 },
    { id: uid(), libelle: 'Emballage (par unité)', montant: 100 }
  ];
  p.equipements = [
    { id: uid(), libelle: 'Marmites et ustensiles professionnels', quantite: 1, prixUnitaire: 180000, dureeMois: 36, moisAchat: 1 },
    { id: uid(), libelle: 'Glacières de transport', quantite: 2, prixUnitaire: 45000, dureeMois: 24, moisAchat: 1 },
    { id: uid(), libelle: 'Congélateur', quantite: 1, prixUnitaire: 250000, dureeMois: 48, moisAchat: 1 }
  ];
  p.personnel = [
    { id: uid(), poste: 'Promotrice (cuisine et ventes)', effectif: 1, salaireBrut: 80000, moisDebut: 1 },
    { id: uid(), poste: 'Aide-cuisinière', effectif: 1, salaireBrut: 60000, moisDebut: 4 }
  ];
  p.chargesFixes = [
    { id: uid(), libelle: 'Loyer de la cuisine', montant: 50000, moisDebut: 1, soumisTVA: false },
    { id: uid(), libelle: 'Gaz, électricité et eau', montant: 40000, moisDebut: 1, soumisTVA: true },
    { id: uid(), libelle: 'Internet et téléphone', montant: 10000, moisDebut: 1, soumisTVA: true },
    { id: uid(), libelle: 'Patente et taxes communales', montant: 5000, moisDebut: 1, soumisTVA: false }
  ];
  p.marketingMensuel = 20000;
  p.concurrents = [
    { id: uid(), nom: 'Traiteurs indépendants de quartier', positionPrix: 'Prix similaire', pointFaible: 'Peu fiables sur les délais' },
    { id: uid(), nom: 'Restaurants avec service traiteur', positionPrix: 'Plus cher que moi', pointFaible: 'Menus peu personnalisables' }
  ];
  p.cibles = [
    { id: uid(), profil: 'Familles (mariages, deuils, anniversaires)', nombreMois: 15, frequence: 'Achat unique' },
    { id: uid(), profil: 'PME (séminaires, fins d’année)', nombreMois: 6, frequence: '1 fois/mois' }
  ];
  p.croissance = { profil: 'perso', tauxPerso: 7, an2Pct: 20, an3Pct: 12 };
  p.financement = { apport: 700000, subvention: 0, pretMontant: 500000, pretTauxAnnuelPct: 14, pretDureeMois: 24, pretDiffereMois: 3 };
  p.salaireCible = 150000;
  p.rapport = {
    objectif: 'Devenir le traiteur de référence des familles et PME de Douala-Nord en 18 mois.',
    delaiLancement: '2 mois',
    contraintes: 'Certificat d’hygiène, déclaration d’établissement, respect de la chaîne du froid.',
    forces: 'Savoir-faire culinaire reconnu, réseau familial et associatif étendu, coûts fixes faibles.',
    faiblesses: 'Dépendance à la promotrice, capacité de production limitée sans second cuisinier.',
    opportunites: 'Hausse des événements d’entreprise, usage massif de WhatsApp pour commander.',
    menaces: 'Hausse du prix des denrées, concurrents informels moins chers.'
  };
  p.risques = [
    { id: uid(), risque: 'Hausse du prix des denrées', probabilite: 3, impact: 2, parade: 'Contrats d’achat groupé et révision trimestrielle des prix.' },
    { id: uid(), risque: 'Maladie de la promotrice', probabilite: 1, impact: 3, parade: 'Former l’aide-cuisinière aux recettes phares.' },
    { id: uid(), risque: 'Retards de paiement des PME', probabilite: 2, impact: 2, parade: 'Acompte de 50 % à la commande.' }
  ];
  p.jalons = [
    { id: uid(), mois: 1, jalon: 'Lancement de la page WhatsApp Business', indicateur: '100 contacts' },
    { id: uid(), mois: 3, jalon: 'Recrutement de l’aide-cuisinière', indicateur: '250 portions par mois' },
    { id: uid(), mois: 6, jalon: 'Premier contrat récurrent avec une PME', indicateur: '2 PME clientes' },
    { id: uid(), mois: 12, jalon: 'Ouverture d’une seconde zone de livraison', indicateur: '500 portions par mois' }
  ];
  return p;
}
