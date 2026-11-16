import { modifier, useProjet } from '../lib/store';
import type { Canvas, Modele } from '../lib/model';
import { prompt } from '../lib/prompts';
import { avancement } from '../lib/analyse';
import { Area, Bloc, Progress, PromptBox, Text } from './ui';

export const MODELES: { v: Modele; t: string; d: string }[] = [
  { v: 'vente', t: 'Vente unique', d: 'Chaque client paie à l’acte.' },
  { v: 'mrr', t: 'Abonnement mensuel', d: 'Revenu récurrent, avec attrition.' },
  { v: 'mrr_boitier', t: 'Boîtier + abonnement', d: 'Un équipement vendu, puis un abonnement.' }
];

export function ChoixModele() {
  const p = useProjet();
  return (
    <div class="grid-3">
      {MODELES.map((m) => (
        <button type="button" class="choice" aria-pressed={p.modele === m.v} onClick={() => modifier((d) => { d.modele = m.v; })}>
          <div class="c-title">{m.t}</div>
          <div class="c-sub">{m.d}</div>
        </button>
      ))}
    </div>
  );
}

export default function CanvasForm() {
  const p = useProjet();
  const c = p.canvas;
  const set = (k: keyof Canvas) => (v: string) => modifier((d) => { d.canvas[k] = v; });
  const setId = (k: keyof typeof p.identite) => (v: string) => modifier((d) => { (d.identite as any)[k] = v; });
  return (
    <div class="stack" style="--gap: 20px">
      <div class="card" style="padding: 16px 20px">
        <div class="row between"><span class="label">Canvas renseigné</span><span class="small muted">{Math.round(avancement(p).canvas * 100)} %</span></div>
        <div style="margin-top: 10px"><Progress value={avancement(p).canvas} /></div>
      </div>

      <Bloc idx="00" titre="Identité du projet" sous="Ces informations figurent sur la page de garde du dossier.">
        <div class="grid-2">
          <Text label="Nom du projet" value={p.identite.projet} onInput={setId('projet')} placeholder="Ex. Les Délices d'Aïcha" />
          <Text label="Porteur du projet" value={p.identite.promoteur} onInput={setId('promoteur')} placeholder="Nom et prénom" />
          <Text label="Secteur d'activité" value={p.identite.secteur} onInput={setId('secteur')} placeholder="Ex. Restauration" />
          <Text label="Localisation" value={p.identite.localisation} onInput={setId('localisation')} placeholder="Ex. Bonamoussadi, Douala" />
        </div>
        <div style="margin-top: 20px"><span class="label">Modèle économique</span><div style="margin-top: 8px"><ChoixModele /></div></div>
      </Bloc>

      <Bloc idx="01" titre="Problème et segment cible">
        <div class="grid-2">
          <Area label="Problème" value={c.probleme} onInput={set('probleme')} placeholder="Quel problème concret vivent vos futurs clients aujourd'hui ?" />
          <Area label="Segment cible" value={c.segment} onInput={set('segment')} placeholder="Qui sont-ils précisément : lieu, âge, revenu, situation ?" />
        </div>
        <PromptBox titre="Problème et segment" texte={prompt('probleme').texte(p)} />
      </Bloc>

      <Bloc idx="02" titre="Solution et proposition de valeur">
        <div class="grid-2">
          <Area label="Solution" value={c.solution} onInput={set('solution')} placeholder="Que proposez-vous concrètement ?" />
          <Area label="Proposition de valeur" value={c.valeur} onInput={set('valeur')} placeholder="En quoi est-ce différent ou meilleur que l'existant ?" />
        </div>
        <PromptBox titre="Solution et valeur" texte={prompt('solution').texte(p)} />
      </Bloc>

      <Bloc idx="03" titre="Canaux de distribution">
        <div class="grid-2">
          <Text label="Canal principal" value={c.canalPrincipal} onInput={set('canalPrincipal')} placeholder="Ex. WhatsApp Business" />
          <Text label="Canal secondaire" value={c.canalSecondaire} onInput={set('canalSecondaire')} placeholder="Ex. Partenariats" />
        </div>
        <PromptBox titre="Canaux" texte={prompt('canaux').texte(p)} />
      </Bloc>

      <Bloc idx="04" titre="Hypothèse de prix" sous="Une première intuition : le chiffrage précis se fait à l'étape suivante.">
        <div class="grid-2">
          <Text label="Prix envisagé" value={c.prixHypothese} onInput={set('prixHypothese')} placeholder="Ex. 3 000 FCFA la portion" />
          <Text label="Fréquence d'achat" value={c.frequence} onInput={set('frequence')} placeholder="Ex. 2 fois par mois" />
        </div>
        <PromptBox titre="Prix" texte={prompt('prix').texte(p)} />
      </Bloc>

      <Bloc idx="05" titre="Structure de coûts">
        <Area label="Principaux coûts" value={c.couts} onInput={set('couts')} placeholder="Matières premières, transport, loyer, communication…" />
        <PromptBox titre="Coûts" texte={prompt('couts').texte(p)} />
      </Bloc>

      <Bloc idx="06" titre="Indicateur de succès">
        <div class="grid-2">
          <Text label="Indicateur suivi" value={c.metrique} onInput={set('metrique')} placeholder="Ex. Nombre de commandes par mois" />
          <Text label="Objectif à un mois" value={c.objectif1Mois} onInput={set('objectif1Mois')} placeholder="Ex. 180 portions vendues" />
        </div>
      </Bloc>

      <div class="row" style="justify-content: flex-end">
        <a href="/bpc" class="btn btn-primary">Continuer vers le chiffrage</a>
      </div>
    </div>
  );
}
