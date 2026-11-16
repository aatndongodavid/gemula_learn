import type { TypeChoc } from './model';

export interface DefChoc {
  type: TypeChoc;
  titre: string;
  gravite: 'Sévère' | 'Modéré' | 'Opportunité';
  declencheur: string;
  effet: string;
  observer: string[];
  /** Libellé et valeur par défaut du paramètre chiffré, absent si le choc n'en a pas */
  valeur?: { label: string; defaut: number; unite: '%' | 'FCFA' | 'unités' };
  moisDefaut: number;
  dureeDefaut: number;
  /** La durée est-elle réglable ? Sinon le choc s'applique à partir du mois choisi. */
  duree: 'reglable' | 'permanent' | 'ponctuel';
}

export const CHOCS: DefChoc[] = [
  {
    type: 'zeroVente', titre: 'Mois sans aucune vente', gravite: 'Sévère',
    declencheur: 'Crise qui paralyse votre zone, maladie, inondation qui coupe les routes.',
    effet: 'Les revenus tombent à zéro. Les charges fixes, les salaires et les remboursements restent dus.',
    observer: ['La perte de ce mois-là', 'Multipliez-la par 3 : c’est votre réserve minimale', 'Les charges fixes que vous pourriez suspendre'],
    moisDefaut: 2, dureeDefaut: 1, duree: 'reglable'
  },
  {
    type: 'perteClients', titre: 'Perte massive de clients', gravite: 'Sévère',
    declencheur: 'Concurrent agressif, rumeur négative, problème de qualité.',
    effet: 'Les volumes baissent fortement pendant plusieurs mois. Pour un abonnement, une partie des abonnés part définitivement.',
    observer: ['Le nombre de mois dans le rouge', 'La perte cumulée de trésorerie', 'L’effet d’une hausse de prix pour compenser'],
    valeur: { label: 'Baisse', defaut: 50, unite: '%' }, moisDefaut: 3, dureeDefaut: 2, duree: 'reglable'
  },
  {
    type: 'hausseCouts', titre: 'Explosion des coûts variables', gravite: 'Sévère',
    declencheur: 'Pénurie de matières premières, carburant qui double, dévaluation.',
    effet: 'Chaque unité coûte plus cher à produire : la marge unitaire se réduit durablement.',
    observer: ['La hausse du seuil de rentabilité', 'La hausse de prix nécessaire pour compenser'],
    valeur: { label: 'Hausse', defaut: 30, unite: '%' }, moisDefaut: 3, dureeDefaut: 1, duree: 'permanent'
  },
  {
    type: 'nouvelleCharge', titre: 'Nouvelle charge fixe lourde', gravite: 'Sévère',
    declencheur: 'Location d’un local, nouvelle taxe municipale, abonnement logiciel.',
    effet: 'Une charge fixe s’ajoute chaque mois et relève le point mort.',
    observer: ['Les unités supplémentaires à vendre', 'Le mois où le cash-flow revient au niveau d’avant'],
    valeur: { label: 'Montant mensuel', defaut: 50000, unite: 'FCFA' }, moisDefaut: 1, dureeDefaut: 1, duree: 'permanent'
  },
  {
    type: 'moisDifficile', titre: 'Mois difficile ponctuel', gravite: 'Modéré',
    declencheur: 'Ramadan, rentrée scolaire, promotion agressive d’un concurrent.',
    effet: 'Les volumes chutent sur une courte période puis reviennent.',
    observer: ['Si ce mois isolé fait basculer la trésorerie', 'Le temps nécessaire pour récupérer'],
    valeur: { label: 'Baisse', defaut: 40, unite: '%' }, moisDefaut: 3, dureeDefaut: 1, duree: 'reglable'
  },
  {
    type: 'recrutement', titre: 'Recrutement d’un employé', gravite: 'Modéré',
    declencheur: 'Les volumes augmentent et vous avez besoin d’aide.',
    effet: 'Un salaire brut et ses charges sociales s’ajoutent à partir du mois de recrutement.',
    observer: ['Le mois où le recrutement devient soutenable', 'La marge supplémentaire nécessaire'],
    valeur: { label: 'Salaire brut mensuel', defaut: 60000, unite: 'FCFA' }, moisDefaut: 4, dureeDefaut: 1, duree: 'permanent'
  },
  {
    type: 'panne', titre: 'Panne d’un équipement majeur', gravite: 'Modéré',
    declencheur: 'Congélateur, groupe électrogène ou ordinateur irréparable.',
    effet: 'Une dépense imprévue sort de la trésorerie en une fois.',
    observer: ['L’effet sur la trésorerie du mois', 'Le nombre de mois pour reconstituer la somme'],
    valeur: { label: 'Coût de la panne', defaut: 150000, unite: 'FCFA' }, moisDefaut: 2, dureeDefaut: 1, duree: 'ponctuel'
  },
  {
    type: 'retardEncaissement', titre: 'Retard de paiement des clients', gravite: 'Modéré',
    declencheur: 'Clients institutionnels qui paient à 30 jours, panne de mobile money.',
    effet: 'Le chiffre d’affaires est réalisé mais encaissé un mois plus tard : la trésorerie se tend.',
    observer: ['Le creux de trésorerie', 'L’intérêt de demander un acompte'],
    moisDefaut: 2, dureeDefaut: 3, duree: 'reglable'
  },
  {
    type: 'commandeGroupe', titre: 'Grosse commande', gravite: 'Opportunité',
    declencheur: 'Une entreprise commande pour ses employés, une école vous choisit.',
    effet: 'Les volumes augmentent pendant quelques mois sans hausse des charges fixes.',
    observer: ['Le gain de trésorerie', 'Si ce volume demande du matériel en plus'],
    valeur: { label: 'Unités ou abonnés en plus par mois', defaut: 40, unite: 'unités' }, moisDefaut: 2, dureeDefaut: 3, duree: 'reglable'
  },
  {
    type: 'haussePrix', titre: 'Hausse du prix de vente', gravite: 'Opportunité',
    declencheur: 'Position de force, clients fidèles, liste d’attente.',
    effet: 'La marge augmente directement sans travail supplémentaire.',
    observer: ['Comparer +5 % de prix et +5 % de volume', 'Combien de clients vous pouvez perdre en restant gagnant'],
    valeur: { label: 'Hausse', defaut: 10, unite: '%' }, moisDefaut: 1, dureeDefaut: 1, duree: 'permanent'
  }
];

export const defChoc = (t: TypeChoc) => CHOCS.find((c) => c.type === t)!;
