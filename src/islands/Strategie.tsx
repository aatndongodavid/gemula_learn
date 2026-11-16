import { modifier, useProjet } from '../lib/store';
import { uid, type Rapport, type Risque } from '../lib/model';
import { prompt } from '../lib/prompts';
import { libelleMois } from '../lib/format';
import { AddBtn, Area, Bloc, DelBtn, PromptBox, Text } from './ui';

export const criticite = (r: Risque) => r.probabilite * r.impact;
export const niveauRisque = (c: number) => (c >= 6 ? 'Élevé' : c >= 3 ? 'Moyen' : 'Faible');

export default function Strategie() {
  const p = useProjet();
  const r = p.rapport;
  const set = (k: keyof Rapport) => (v: string) => modifier((d) => { d.rapport[k] = v; });
  const majR = (id: string, k: keyof Risque, v: unknown) => modifier((d) => { const x = d.risques.find((y) => y.id === id); if (x) (x as any)[k] = v; });
  const majJ = (id: string, k: string, v: unknown) => modifier((d) => { const x = d.jalons.find((y) => y.id === id); if (x) (x as any)[k] = v; });
  const tries = [...p.risques].sort((a, b) => criticite(b) - criticite(a));
  return (
    <div class="stack" style="--gap: 20px">
      <Bloc idx="01" titre="Objectif et cadre" sous="Ce que le projet veut atteindre et ce qui le contraint.">
        <div class="grid-2">
          <Area label="Objectif principal" value={r.objectif} onInput={set('objectif')} placeholder="Ex. Devenir le traiteur de référence de Douala-Nord en 18 mois" rows={2} />
          <Area label="Contraintes légales et réglementaires" value={r.contraintes} onInput={set('contraintes')} placeholder="Autorisations, normes, certificats…" rows={2} />
          <Text label="Délai de lancement" value={r.delaiLancement} onInput={set('delaiLancement')} placeholder="Ex. 2 mois" />
          <Text label="Forme juridique envisagée" value={p.identite.formeJuridique} onInput={(v) => modifier((d) => { d.identite.formeJuridique = v; })} placeholder="Ex. Établissement individuel, SARL, SAS" />
        </div>
      </Bloc>

      <Bloc idx="02" titre="Analyse SWOT" sous="Forces et faiblesses internes, opportunités et menaces de l'environnement.">
        <div class="grid-2 swot">
          <Area label="Forces" value={r.forces} onInput={set('forces')} placeholder="Compétences, réseau, coûts…" />
          <Area label="Faiblesses" value={r.faiblesses} onInput={set('faiblesses')} placeholder="Ce qui vous manque aujourd'hui" />
          <Area label="Opportunités" value={r.opportunites} onInput={set('opportunites')} placeholder="Tendances favorables du marché" />
          <Area label="Menaces" value={r.menaces} onInput={set('menaces')} placeholder="Concurrence, réglementation, prix…" />
        </div>
      </Bloc>

      <Bloc idx="03" titre="Matrice des risques" sous="Probabilité et impact de 1 (faible) à 3 (fort). Les risques sont triés par criticité dans le dossier.">
        <div class="layout-risques">
          <div>
            <div class="table-wrap">
              <table class="t">
                <thead><tr><th>Risque</th><th class="num">Prob.</th><th class="num">Impact</th><th>Parade</th><th></th></tr></thead>
                <tbody>
                  {p.risques.map((x) => (
                    <tr>
                      <td style="min-width: 160px"><input class="field" value={x.risque} placeholder="Risque" aria-label="Risque" onInput={(e) => majR(x.id, 'risque', (e.target as HTMLInputElement).value)} /></td>
                      {(['probabilite', 'impact'] as const).map((k) => (
                        <td style="width: 76px">
                          <select class="field" value={String(x[k])} aria-label={k} onChange={(e) => majR(x.id, k, Number((e.target as HTMLSelectElement).value))}>
                            <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                          </select>
                        </td>
                      ))}
                      <td style="min-width: 200px"><input class="field" value={x.parade} placeholder="Comment le prévenir ou y répondre" aria-label="Parade" onInput={(e) => majR(x.id, 'parade', (e.target as HTMLInputElement).value)} /></td>
                      <td><DelBtn onClick={() => modifier((d) => { d.risques = d.risques.filter((y) => y.id !== x.id); })} /></td>
                    </tr>
                  ))}
                  {!p.risques.length && <tr><td colSpan={5} class="muted small">Aucun risque identifié. Inspirez-vous des stress-tests du simulateur.</td></tr>}
                </tbody>
              </table>
            </div>
            <AddBtn onClick={() => modifier((d) => { d.risques.push({ id: uid(), risque: '', probabilite: 2, impact: 2, parade: '' }); })}>Ajouter un risque</AddBtn>
          </div>
          <div class="heat" aria-label="Carte des risques">
            <div class="heat-y">Impact</div>
            <div class="heat-grid">
              {[3, 2, 1].map((imp) => [1, 2, 3].map((prob) => {
                const ici = tries.filter((x) => x.impact === imp && x.probabilite === prob);
                const c = imp * prob;
                return <div class={`cell c${c >= 6 ? 'h' : c >= 3 ? 'm' : 'l'}`} title={ici.map((x) => x.risque).join(', ')}>{ici.length || ''}</div>;
              }))}
            </div>
            <div class="heat-x">Probabilité</div>
          </div>
        </div>
        <PromptBox titre="Risques et parades" texte={prompt('risques').texte(p)} />
      </Bloc>

      <Bloc idx="04" titre="Feuille de route" sous="Les jalons des douze premiers mois et l'indicateur qui prouve qu'ils sont atteints.">
        <div class="table-wrap">
          <table class="t">
            <thead><tr><th>Mois</th><th>Jalon</th><th>Indicateur de réussite</th><th></th></tr></thead>
            <tbody>
              {[...p.jalons].sort((a, b) => a.mois - b.mois).map((x) => (
                <tr>
                  <td style="width: 110px">
                    <select class="field" value={String(x.mois)} aria-label="Mois" onChange={(e) => majJ(x.id, 'mois', Number((e.target as HTMLSelectElement).value))}>
                      {Array.from({ length: 24 }, (_, k) => <option value={String(k + 1)}>{libelleMois(p.identite.debut, k + 1)}</option>)}
                    </select>
                  </td>
                  <td style="min-width: 200px"><input class="field" value={x.jalon} placeholder="Jalon" aria-label="Jalon" onInput={(e) => majJ(x.id, 'jalon', (e.target as HTMLInputElement).value)} /></td>
                  <td style="min-width: 160px"><input class="field" value={x.indicateur} placeholder="Indicateur" aria-label="Indicateur" onInput={(e) => majJ(x.id, 'indicateur', (e.target as HTMLInputElement).value)} /></td>
                  <td><DelBtn onClick={() => modifier((d) => { d.jalons = d.jalons.filter((y) => y.id !== x.id); })} /></td>
                </tr>
              ))}
              {!p.jalons.length && <tr><td colSpan={4} class="muted small">Aucun jalon.</td></tr>}
            </tbody>
          </table>
        </div>
        <AddBtn onClick={() => modifier((d) => { const last = d.jalons.reduce((m, x) => Math.max(m, x.mois), 0); d.jalons.push({ id: uid(), mois: Math.min(24, last + 1 || 1), jalon: '', indicateur: '' }); })}>Ajouter un jalon</AddBtn>
      </Bloc>

      <div class="row" style="justify-content: flex-end"><a href="/dossier" class="btn btn-primary">Continuer vers le dossier</a></div>
      <style>{`
        .layout-risques { display: grid; gap: 20px; align-items: start; grid-template-columns: minmax(0, 1fr); }
        .heat { max-width: 220px; }
        @media (min-width: 900px) { .layout-risques { grid-template-columns: minmax(0, 1fr) 200px; } }
        .heat { display: grid; grid-template-columns: 18px 1fr; grid-template-rows: 1fr 20px; gap: 6px; }
        .heat-y { writing-mode: vertical-rl; transform: rotate(180deg); font-size: .75rem; color: var(--muted); text-align: center; }
        .heat-x { grid-column: 2; font-size: .75rem; color: var(--muted); text-align: center; }
        .heat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
        .cell { aspect-ratio: 1; border-radius: 6px; display: grid; place-items: center; font-weight: 600; font-size: .9rem; }
        .cl { background: var(--success-soft); color: var(--success); }
        .cm { background: var(--warning-soft); color: var(--warning); }
        .ch { background: var(--danger-soft); color: var(--danger); }
      `}</style>
    </div>
  );
}
