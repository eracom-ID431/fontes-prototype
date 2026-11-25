// Filtrage des fontes côté navigateur : aucune requête serveur.
// Toutes les cartes sont déjà dans la page ; on bascule simplement l'attribut `hidden`.
//
// Règle de filtrage (identique au filtre « case à cocher » de Bricks) :
// - à l'intérieur d'un groupe (ex. Squelette) : OU  → Dynamique OU Statique
// - entre les groupes : ET                         → (Squelette) ET (Graisse) ET …

const cartes = [...document.querySelectorAll('.carte')];
const boutons = [...document.querySelectorAll('.filtre__bouton')];
const actifs = new Map(); // groupe → Set des slugs cochés

// Termes d'une carte pour une taxonomie, ex. carte.dataset.historique → ['serifs', 'garaldes']
const termes = (carte, taxo) => (carte.dataset[taxo] || '').split(' ');

// Une carte correspond si, pour chaque groupe actif, elle possède au moins un des termes cochés.
// `sauf` : groupe à ignorer (utile pour les compteurs, voir plus bas).
function correspond(carte, sauf = null) {
  for (const [groupe, slugs] of actifs) {
    if (groupe === sauf) continue;
    const taxo = document.querySelector(`[data-groupe="${groupe}"]`).dataset.taxo;
    if (!termes(carte, taxo).some((t) => slugs.has(t))) return false;
  }
  return true;
}

function appliquer() {
  for (const carte of cartes) carte.hidden = !correspond(carte);

  const visibles = cartes.filter((c) => !c.hidden);
  document.querySelector('.aucun').hidden = visibles.length > 0;
  document.querySelector('.resultat').textContent =
    `${visibles.length} fonte${visibles.length > 1 ? 's' : ''} sur ${cartes.length}`;

  // Compteurs : combien de fontes on obtiendrait en cochant ce terme.
  // On ignore la sélection du groupe du bouton (sinon le OU interne serait bloqué).
  for (const b of boutons) {
    const { taxo, groupe } = b.closest('.filtre').dataset;
    const n = cartes.filter((c) => correspond(c, groupe) && termes(c, taxo).includes(b.dataset.term)).length;
    b.querySelector('.filtre__compte').textContent = `(${n})`;
    b.disabled = n === 0 && b.getAttribute('aria-pressed') !== 'true';
  }
}

// Animation : View Transitions si disponible, sinon changement direct.
function avecTransition(maj) {
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.startViewTransition || reduit) return maj();
  document.startViewTransition(maj);
}

// État ↔ URL (?historique=serifs,garaldes&graisse=lineaire) : une sélection peut être partagée.
function versUrl() {
  const p = new URLSearchParams();
  for (const [groupe, slugs] of actifs) p.set(groupe, [...slugs].join(','));
  history.replaceState(null, '', p.size ? `?${p}` : location.pathname);
}

function depuisUrl() {
  for (const [groupe, valeur] of new URLSearchParams(location.search)) {
    for (const slug of valeur.split(',')) basculer(groupe, slug, true);
  }
}

function basculer(groupe, slug, etat) {
  const set = actifs.get(groupe) ?? new Set();
  etat ? set.add(slug) : set.delete(slug);
  set.size ? actifs.set(groupe, set) : actifs.delete(groupe);
  document
    .querySelector(`[data-groupe="${groupe}"] [data-term="${slug}"]`)
    ?.setAttribute('aria-pressed', etat);
}

// Clic sur un bouton de filtre (délégation : un seul écouteur pour tous les boutons)
document.querySelector('.filtres').addEventListener('click', (e) => {
  const b = e.target.closest('.filtre__bouton');
  if (!b) return;
  const groupe = b.closest('.filtre').dataset.groupe;
  basculer(groupe, b.dataset.term, b.getAttribute('aria-pressed') !== 'true');
  avecTransition(appliquer);
  versUrl();
});

document.querySelector('.reinitialiser').addEventListener('click', () => {
  for (const [groupe, slugs] of [...actifs]) for (const s of [...slugs]) basculer(groupe, s, false);
  avecTransition(appliquer);
  versUrl();
});

// Boutons d'affichage : montrer/masquer les étiquettes de taxonomie sur les cartes
document.querySelector('.affichage').addEventListener('click', (e) => {
  const b = e.target.closest('.bascule');
  if (!b) return;
  const etat = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', etat);
  avecTransition(() =>
    document.querySelector('.fontes').classList.toggle(`affiche-${b.dataset.affiche}`, etat)
  );
});

depuisUrl();
appliquer();
