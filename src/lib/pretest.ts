// Pré-test : 10 situations pour situer le porteur avant le parcours.
import type { Reponse } from './model';

export interface Option { k: Reponse; t: string; e: string }
export interface Question { id: number; sit: string; mod: string; q: string; o: Option[] }

export const QUESTIONS: Question[] = [
            { id: 1, sit: "1 — Génération d'idées", mod: "Market Fit Canvas — Idéation",
                q: "Vous cherchez à valider votre idée de projet. Que faites-vous en premier ?",
                o: [{ k: 'A', t: "Je discute avec mes proches et des clients potentiels pour tester l'idée à l'oral.",
                        e: "Bon réflexe terrain — l'enjeu sera de structurer ces retours dans un Canvas." }, { k: 'B',
                        t: "Je formalise déjà mes hypothèses dans un canvas et je m'appuie sur des outils/IA pour les challenger.",
                        e: "Vous avez une longueur d'avance sur la structuration." }, { k: 'C',
                        t: "Je n'ai pas encore une idée assez claire pour commencer à la tester.",
                        e: "C'est normal — Gemula Learn va vous aider à la structurer pas à pas." }] },
            { id: 2, sit: "2 — Données de marché", mod: "Market Fit Canvas — Problème/Segment",
                q: "Pour connaître votre marché cible, vous vous appuyez surtout sur…",
                o: [{ k: 'A', t: "Mon expérience personnelle et mes observations du terrain.",
                        e: "Précieux, mais à croiser avec des données chiffrées." }, { k: 'B',
                        t: "Des recherches en ligne, des enquêtes ou des données déjà chiffrées.",
                        e: "Approche déjà rigoureuse." }, { k: 'C',
                        t: "Je n'ai pas encore identifié précisément mon segment cible.",
                        e: "Le bloc 'Problème & Segment' du Canvas va vous y aider." }] },
            { id: 3, sit: "3 — Analyse concurrence", mod: "Business Probability Canvas — Concurrents",
                q: "Face à vos concurrents, votre approche est…",
                o: [{ k: 'A', t: "J'observe ce qu'ils font sur le terrain et j'ajuste mon offre à l'instinct.",
                        e: "Utile, à compléter par un tableau comparatif chiffré." }, { k: 'B',
                        t: "Je compare systématiquement leurs prix, forces et faiblesses dans un tableau.",
                        e: "Méthode déjà structurée — le bloc Marché du BPC vous ira comme un gant." }, { k: 'C',
                        t: "Je n'ai pas encore identifié qui sont mes concurrents directs.",
                        e: "Le Master Prompt 'Concurrents' du BPC peut vous donner un premier panorama." }] },
            { id: 4, sit: "4 — Hypothèses business", mod: "Market Fit Canvas — Hypothèses",
                q: "Vos hypothèses de prix et de coûts sont aujourd'hui…",
                o: [{ k: 'A', t: "Estimées à la main, sur la base de ce que je vois autour de moi.",
                        e: "Bon point de départ à chiffrer plus finement." }, { k: 'B',
                        t: "Déjà posées avec des chiffres précis et des scénarios alternatifs.",
                        e: "Vous êtes prêt pour le BPC directement." }, { k: 'C',
                        t: "Je n'ai pas encore d'hypothèse de prix ni de coûts.",
                        e: "Les blocs 4 et 5 du Canvas vous guideront." }] },
            { id: 5, sit: "5 — Modèle économique", mod: "Business Probability Canvas — MRR",
                q: "Votre projet est-il plutôt basé sur un abonnement récurrent (MRR) ou des ventes ponctuelles ?",
                o: [{ k: 'A', t: "Ventes ponctuelles — chaque client paie à l'acte.",
                        e: "Le BPC en mode Vente unique est fait pour vous." }, { k: 'B',
                        t: "Abonnement mensuel — revenu récurrent, avec un taux de churn à surveiller.",
                        e: "Le mode MRR du BPC vous aidera à calculer LTV et CAC." }, { k: 'C',
                        t: "Je ne sais pas encore quel modèle correspond le mieux.",
                        e: "Le BPC propose les deux modèles : testez-les pour comparer." }] },
            { id: 6, sit: "6 — Croissance & fidélisation", mod: "Simulateur — Hypothèses croissance",
                q: "Pour anticiper l'évolution de vos ventes sur 6 mois, vous…",
                o: [{ k: 'A', t: "Avez une intuition sur le rythme, sans l'avoir formalisé en chiffres mois par mois.",
                        e: "Le simulateur va transformer cette intuition en projection chiffrée." }, { k: 'B',
                        t: "Avez déjà réfléchi à plusieurs scénarios de croissance chiffrés.",
                        e: "Vous pourrez choisir votre scénario en connaissance de cause." }, { k: 'C',
                        t: "N'avez pas encore réfléchi à ce à quoi ressembleront vos 6 premiers mois.",
                        e: "Le simulateur propose 4 scénarios-types pour vous aider à démarrer." }] },
            { id: 7, sit: "7 — Lecture de résultats", mod: "Simulateur — Lecture résultats",
                q: "Face à un tableau de cash-flow mensuel et cumulé, vous…",
                o: [{ k: 'A', t: "Comprenez globalement mais devez y réfléchir un moment.",
                        e: "Le simulateur commente automatiquement chaque résultat pour vous aider." }, { k: 'B',
                        t: "Savez immédiatement interpréter et en tirer des décisions.",
                        e: "Vous pourrez aller vite sur cette étape." }, { k: 'C',
                        t: "N'êtes pas très à l'aise avec ce type de tableau.",
                        e: "Chaque case du simulateur est expliquée en langage simple." }] },
            { id: 8, sit: "8 — Pivot stratégique", mod: "Simulateur — Pivot",
                q: "Si votre projection montre un cash-flow négatif, votre premier réflexe est de…",
                o: [{ k: 'A', t: "Chercher à vendre plus, sans forcément revoir mes charges.",
                        e: "Le simulateur vous montrera que réduire les charges est souvent le levier le plus rapide." },
                    { k: 'B',
                        t: "Comparer immédiatement le levier 'réduire les charges' et le levier 'augmenter les prix/volumes'.",
                        e: "C'est exactement la méthode recommandée." }, { k: 'C',
                        t: "Je ne saurais pas par où commencer pour corriger le tir.",
                        e: "Le BPC et le simulateur proposent des pistes concrètes en cas de déficit." }] },
            { id: 9, sit: "9 — Anticipation des risques", mod: "Simulateur — Stress-test",
                q: "Face à un imprévu (perte de clients, hausse des coûts), vous…",
                o: [{ k: 'A', t: "Réagissez au moment où ça arrive, sans l'avoir anticipé en amont.",
                        e: "Le stress-test du simulateur permet de s'y préparer avant que ça n'arrive." }, { k: 'B',
                        t: "Avez déjà une réserve de trésorerie et un plan B pensés à l'avance.",
                        e: "Vous pourrez utiliser le stress-test pour valider vos marges de sécurité." }, { k: 'C',
                        t: "N'y avez pas encore réfléchi.",
                        e: "Les 10 chocs du simulateur couvrent les imprévus les plus courants." }] },
            { id: 10, sit: "10 — Présentation", mod: "Pitch — Présentation",
                q: "Pour présenter votre projet à un jury ou une banque, vous disposez…",
                o: [{ k: 'A', t: "D'une présentation orale, mais pas encore d'un dossier écrit structuré.",
                        e: "L'export PDF de Gemula Learn va vous fournir ce dossier." }, { k: 'B',
                        t: "D'un dossier déjà structuré avec chiffres et argumentaire.",
                        e: "Le rapport vous permettra de le formaliser encore mieux." }, { k: 'C',
                        t: "Je n'ai encore rien de formalisé par écrit.",
                        e: "À la fin du parcours, vous aurez trois documents PDF prêts à présenter." }] }
        ];

export const PROFILS: Record<Reponse | 'mixte', { tag: string; titre: string; texte: string; conseil: string }> = {
  A: {
    tag: 'Profil opérationnel',
    titre: 'Vous savez agir, Gemula Learn va accélérer vos actions',
    texte: 'Vous avez déjà de bons réflexes de terrain. L\u2019enjeu est d\u2019utiliser le canvas, le chiffrage et le simulateur pour gagner en précision.',
    conseil: 'Passez vite sur le canvas et consacrez votre temps au chiffrage et aux stress-tests.'
  },
  B: {
    tag: 'Profil analytique',
    titre: 'Vous avez une longueur d\u2019avance',
    texte: 'Vous maîtrisez déjà le raisonnement chiffré. Concentrez-vous sur les scénarios, la sensibilité et les chocs pour éprouver votre modèle.',
    conseil: 'Allez directement au chiffrage, puis exploitez l\u2019analyse de sensibilité et le score de bancabilité.'
  },
  C: {
    tag: 'Profil en construction',
    titre: 'Vous démarrez : Gemula Learn structure votre départ',
    texte: 'Investissez-vous pleinement dans le Market Fit Canvas et le chiffrage avant le simulateur : sans cette base, la simulation n\u2019aura rien de solide à analyser.',
    conseil: 'Suivez le parcours dans l\u2019ordre et utilisez les Master Prompts à chaque bloc.'
  },
  mixte: {
    tag: 'Profil mixte',
    titre: 'Un profil équilibré',
    texte: 'Vos réponses se partagent entre plusieurs profils. Avancez sur plusieurs fronts : structuration (canvas, chiffrage) et approfondissement (simulateur, chocs).',
    conseil: 'Suivez le parcours dans l\u2019ordre en vous attardant sur les modules où vous avez répondu C.'
  }
};

export function profil(reponses: Partial<Record<number, Reponse>>) {
  const counts: Record<Reponse, number> = { A: 0, B: 0, C: 0 };
  Object.values(reponses).forEach((v) => { if (v) counts[v]++; });
  const max = Math.max(counts.A, counts.B, counts.C);
  const dominants = (Object.keys(counts) as Reponse[]).filter((k) => counts[k] === max);
  const cle: Reponse | 'mixte' = dominants.length === 1 ? dominants[0] : 'mixte';
  return { counts, cle, ...PROFILS[cle], complet: Object.keys(reponses).length === QUESTIONS.length };
}
