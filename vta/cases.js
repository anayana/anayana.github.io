/* ============================================================================
   TEACHING CASES

   A case is one example tree with the truth behind it written down: what the
   finding is, how bad it is, what it means for traffic safety, and what an
   inspector does next. The learner is asked those four things in turn and is
   told the reason for each, right or wrong - the reason is the teaching, the
   score is only what keeps anyone coming back.

   On the pictures. There are no photographs in here, and none are invented.
   Every case carries a schematic drawing made in code: a trunk, a crown, a
   root plate, and the finding marked on it where it belongs. A drawing is
   honest about being a drawing, and it is what a textbook uses for the same
   purpose - it shows the mechanism rather than one particular tree. A
   photograph of the real thing beats it, and that is what the field app's
   "keep as a teaching case" is for: your own bark, your own fruiting body,
   with your own findings already recorded against it. Those replace the
   drawings case by case.

   On the content. Everything here is the common ground of European tree
   inspection - VTA as Mattheck set it out, the body-language-of-trees
   reasoning, and the inspection practice the FLL guideline describes. Where a
   judgement is genuinely contested, the case says so instead of pretending
   there is one answer. No page numbers are quoted: naming a concept is honest,
   inventing a citation is not.
   ========================================================================= */

/* Families - a case belongs to one, and a badge is earned per family. */
const CASE_FAM = [
  { id: 'fungi', de: 'Pilze', en: 'Fungi', sym: '☘' },
  { id: 'base',  de: 'Stammfuß', en: 'Stem base', sym: '┳' },
  { id: 'stem',  de: 'Stamm & Rinde', en: 'Stem & bark', sym: '║' },
  { id: 'crown', de: 'Krone', en: 'Crown', sym: '☘' },
  { id: 'root',  de: 'Wurzel', en: 'Roots', sym: '⑂' }
];

/* The four questions every case asks, in this order. */
const CASE_STEPS = ['what', 'level', 'safety', 'action'];

/* The answer sets that repeat. Level is the app's own 0-3 assessment; the
   traffic-safety wording is the register's own. */
const LVL_OPTS = [
  { v: 0, de: '0 · ohne Befund', en: '0 · no findings' },
  { v: 1, de: '1 · geringfügig', en: '1 · minor findings' },
  { v: 2, de: '2 · erheblich', en: '2 · significant findings' },
  { v: 3, de: '3 · gefahrdrohend', en: '3 · dangerous' }
];
const SAFE_OPTS = [
  { v: 'given', de: 'gegeben', en: 'given' },
  { v: 'restricted', de: 'eingeschränkt', en: 'restricted' },
  { v: 'not given', de: 'nicht gegeben', en: 'not given' }
];
const ACT_OPTS = [
  { v: 'none', de: 'nichts, Regelkontrolle', en: 'nothing, routine inspection' },
  { v: 'sooner', de: 'Nachkontrolle vorziehen', en: 'bring the next inspection forward' },
  { v: 'prune', de: 'Kronenpflege / Schnitt', en: 'crown work / pruning' },
  { v: 'investigate', de: 'eingehende Untersuchung', en: 'detailed investigation' },
  { v: 'fell', de: 'Fällung prüfen', en: 'consider felling' }
];

/* ---- the drawings ------------------------------------------------------
   One function per shape of tree, with the finding painted on afterwards.
   Everything is in a 0..100 by 0..100 box so a case can say where its
   finding sits without knowing how big the picture will be drawn. */
/* show: false while the learner is being asked where the finding is - the
   ring is the answer to that question. A second ring can be passed in to
   show where they actually pressed. */
function caseSvg(c, show, at) {
  const mark = c.mark || {};
  let hot = (show !== false && mark.x != null)
    ? '<circle cx="' + mark.x + '" cy="' + mark.y + '" r="' + (mark.r || 7) +
      '" fill="none" stroke="#ffd27a" stroke-width="1.6" stroke-dasharray="3 2"/>'
    : '';
  if (at) hot += '<circle cx="' + at.x + '" cy="' + at.y + '" r="2.2" fill="#e2704a"/>' +
                 '<circle cx="' + at.x + '" cy="' + at.y + '" r="5" fill="none" ' +
                 'stroke="#e2704a" stroke-width="1"/>';
  const body = {
    broad: CASE_ART.broad, conifer: CASE_ART.conifer, pollard: CASE_ART.pollard
  }[c.art || 'broad'];
  return '<svg viewBox="0 0 100 100" width="100%" height="100%" ' +
         'xmlns="http://www.w3.org/2000/svg" role="img" aria-label="schematic">' +
         '<rect width="100" height="100" fill="#0e1712"/>' +
         '<rect y="86" width="100" height="14" fill="#1b2a20"/>' +
         body + (c.draw ? c.draw : '') + hot + '</svg>';
}
const CASE_ART = {
  broad:
    '<path d="M50 88 L46 40 L54 40 Z" fill="#3a2f22" stroke="#6b5a42" stroke-width="1"/>' +
    '<path d="M50 88 C38 88 34 87 30 86 C38 84 44 84 50 84 C56 84 62 84 70 86 C66 87 62 88 50 88 Z" fill="#33291d"/>' +
    '<ellipse cx="50" cy="28" rx="26" ry="18" fill="#2c4a33" opacity=".85"/>' +
    '<path d="M48 42 L34 30 M52 42 L66 30 M50 36 L50 22" stroke="#6b5a42" stroke-width="1.2" fill="none"/>',
  conifer:
    '<path d="M50 88 L47 30 L53 30 Z" fill="#3a2f22" stroke="#6b5a42" stroke-width="1"/>' +
    '<path d="M50 6 L34 40 L66 40 Z" fill="#26402d" opacity=".9"/>' +
    '<path d="M50 20 L28 56 L72 56 Z" fill="#2c4a33" opacity=".85"/>' +
    '<path d="M50 34 L24 72 L76 72 Z" fill="#2c4a33" opacity=".7"/>',
  pollard:
    '<path d="M50 88 L45 46 L55 46 Z" fill="#3a2f22" stroke="#6b5a42" stroke-width="1"/>' +
    '<ellipse cx="50" cy="44" rx="9" ry="5" fill="#4a3d2c" stroke="#6b5a42" stroke-width="1"/>' +
    '<path d="M44 44 L38 26 M50 43 L50 22 M56 44 L62 26" stroke="#6b5a42" stroke-width="1.6"/>' +
    '<ellipse cx="38" cy="24" rx="7" ry="5" fill="#2c4a33"/>' +
    '<ellipse cx="50" cy="20" rx="8" ry="5" fill="#2c4a33"/>' +
    '<ellipse cx="62" cy="24" rx="7" ry="5" fill="#2c4a33"/>'
};

/* small parts the cases paint on top */
const P = {
  bracket: (x, y, s) => '<path d="M' + x + ' ' + y + ' q' + (-7 * s) + ' ' + (-3 * s) +
    ' ' + (-9 * s) + ' ' + (3 * s) + ' q' + (4 * s) + ' ' + (3 * s) + ' ' + (9 * s) + ' ' +
    (-3 * s) + ' Z" fill="#a8703a" stroke="#d8a566" stroke-width=".8"/>',
  crust: (x, y) => '<path d="M' + x + ' ' + y + ' q-8 -2 -12 3 q6 4 12 2 z" fill="#15100c" stroke="#3b332b" stroke-width=".8"/>',
  crack: d => '<path d="' + d + '" stroke="#12100e" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  cavity: (x, y, r) => '<ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 1.3) +
    '" fill="#0a0806" stroke="#4a3d2c" stroke-width="1"/>',
  deadwood: d => '<path d="' + d + '" stroke="#8b8172" stroke-width="1.6" fill="none"/>',
  bulge: (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="7" ry="5" fill="#4a3d2c" opacity=".9"/>',
  lean: a => '<path d="M14 86 L86 86" stroke="#2f6b4a" stroke-width=".8" stroke-dasharray="2 2"/>' +
             '<path d="M50 86 L' + (50 + 26 * Math.sin(a * Math.PI / 180)) + ' ' +
             (86 - 26 * Math.cos(a * Math.PI / 180)) + '" stroke="#ffd27a" stroke-width="1.2"/>',
  soil: (x, y) => '<path d="M' + x + ' ' + y + ' q6 -5 13 0" stroke="#7a5a3a" stroke-width="1.6" fill="none"/>',
  cut: (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="4.5" fill="#6b5a42" stroke="#8b8172" stroke-width="1"/>'
};

/* ---- the cases ---------------------------------------------------------
   what.right is the index into what.opts. Keep the wrong answers plausible:
   a distractor nobody would pick teaches nothing. */
const CASES = [
  {
    id: 'kretzschmaria', fam: 'fungi', art: 'broad',
    de: 'Schwarze, verkrustete Beläge am Stammfuß einer alten Linde, stellenweise silbergrau berandet.',
    en: 'Black crust-like sheets at the base of an old lime, edged silver-grey in places.',
    draw: P.crust(46, 84) + P.crust(58, 85),
    mark: { x: 50, y: 84, r: 9 },
    what: {
      opts: [{ de: 'Brandkrustenpilz (Kretzschmaria deusta)', en: 'Brittle cinder (Kretzschmaria deusta)' },
             { de: 'Teerfleckenkrankheit', en: 'Tar spot' },
             { de: 'Rußrindenkrankheit', en: 'Sooty bark disease' },
             { de: 'Algenbelag', en: 'Algal growth' }],
      right: 0,
      de: 'Schwarz, hart, krustig am Stammfuß und im Wurzelanlauf: das ist die Fruchtform des Brandkrustenpilzes. Algen sind grün und abwischbar, die beiden Krankheiten sitzen an Blättern bzw. in der Krone.',
      en: 'Black, hard, crusted at the stem base and root flare: that is the fruiting form of brittle cinder. Algae are green and wipe off; the other two sit on leaves or in the crown.'
    },
    level: { right: 3,
      de: 'Der Pilz baut Lignin und Cellulose ab und macht das Holz spröde – ohne die äußere Aufwölbung, die andere Fäulen zeigen. Bruch kommt plötzlich, oft ohne Vorwarnung.',
      en: 'It breaks down both lignin and cellulose and leaves the wood brittle, without the outward bulge other decays produce. Failure comes suddenly, often with no warning.' },
    safety: { right: 'not given',
      de: 'Ein Stammfußbefall dieses Pilzes an einem Baum im Verkehrsraum ist der klassische Fall, in dem die Verkehrssicherheit nicht mehr gegeben ist.',
      en: 'Brittle cinder at the stem base of a tree over a used area is the textbook case for traffic safety no longer being given.' },
    action: { right: 'investigate',
      de: 'Eingehende Untersuchung, und bis dahin Absperrung erwägen. Die Restwandstärke lässt sich von außen nicht schätzen – dieser Pilz täuscht das Auge.',
      en: 'Detailed investigation, and consider closing the area meanwhile. Remaining wall thickness cannot be judged from outside; this fungus deceives the eye.' }
  },
  {
    id: 'meripilus', fam: 'fungi', art: 'broad',
    de: 'Große, fächerförmig überlappende Fruchtkörper am Fuß einer Rotbuche, auf Druck schwärzend.',
    en: 'Large overlapping fan-shaped brackets at the foot of a beech, blackening when pressed.',
    draw: P.bracket(44, 85, 1.2) + P.bracket(52, 86, 1.1) + P.bracket(58, 84, .9),
    mark: { x: 50, y: 85, r: 10 },
    what: {
      opts: [{ de: 'Riesenporling (Meripilus giganteus)', en: 'Giant polypore (Meripilus giganteus)' },
             { de: 'Zunderschwamm (Fomes fomentarius)', en: 'Hoof fungus (Fomes fomentarius)' },
             { de: 'Schwefelporling (Laetiporus sulphureus)', en: 'Chicken of the woods (Laetiporus sulphureus)' },
             { de: 'Austernseitling', en: 'Oyster mushroom' }],
      right: 0,
      de: 'Fächer am Fuß, weich, schwärzend auf Druck: Riesenporling. Der Zunderschwamm ist hart und hufförmig am Stamm, der Schwefelporling leuchtend gelborange.',
      en: 'Soft overlapping fans at the base that blacken when pressed: giant polypore. Hoof fungus is hard and hoof-shaped on the stem; chicken of the woods is bright yellow-orange.'
    },
    level: { right: 3,
      de: 'Der Riesenporling zersetzt die Grobwurzeln. Die Krone kann dabei lange unauffällig bleiben – der Baum kippt aus dem Wurzelteller, er bricht nicht am Stamm.',
      en: 'It decays the coarse roots. The crown can look sound for a long time; the tree goes over from the root plate rather than breaking at the stem.' },
    safety: { right: 'not given',
      de: 'Standsicherheit, nicht Bruchsicherheit, ist hier die Frage – und die ist an einer befahrenen Straße nicht mehr zu verantworten.',
      en: 'The question here is stability rather than fracture, and beside a used road that cannot be defended.' },
    action: { right: 'investigate',
      de: 'Eingehende Untersuchung, Zugversuch erwägen. Im Zweifel und bei starkem Befall ist die Fällung die ehrliche Antwort.',
      en: 'Detailed investigation, consider a pulling test. With heavy infection, felling is the honest answer.' }
  },
  {
    id: 'armillaria', fam: 'fungi', art: 'conifer',
    de: 'Honiggelbe Pilzbüschel am Stammfuß einer Fichte, darunter unter der Rinde weiße Myzelfächer.',
    en: 'Honey-coloured tufts at the foot of a spruce, with white mycelial fans under the bark.',
    draw: '<circle cx="44" cy="84" r="2.6" fill="#c9a24a"/><circle cx="48" cy="86" r="2.2" fill="#c9a24a"/>' +
          '<circle cx="53" cy="84" r="2.4" fill="#c9a24a"/><circle cx="57" cy="86" r="2" fill="#c9a24a"/>',
    mark: { x: 50, y: 85, r: 9 },
    what: {
      opts: [{ de: 'Hallimasch (Armillaria spec.)', en: 'Honey fungus (Armillaria spec.)' },
             { de: 'Stockschwämmchen', en: 'Sheathed woodtuft' },
             { de: 'Samtfußrübling', en: 'Velvet shank' },
             { de: 'Schwefelkopf', en: 'Sulphur tuft' }],
      right: 0,
      de: 'Entscheidend sind nicht die Hüte, sondern die weißen Myzelfächer unter der Rinde und die schwarzen Rhizomorphen. Die drei anderen wachsen auf totem Holz, ohne diese Fächer.',
      en: 'The caps are not what decides it: the white mycelial fans under the bark and the black rhizomorphs are. The other three grow on dead wood and make no such fans.'
    },
    level: { right: 2,
      de: 'Hallimasch tötet Kambium und Wurzeln. An der Fichte geht das oft schnell; die Stufe hängt daran, wie viel Wurzelwerk schon betroffen ist.',
      en: 'Honey fungus kills cambium and roots. On spruce it often moves fast; the level depends on how much of the root system is already affected.' },
    safety: { right: 'restricted',
      de: 'Solange die Krone noch trägt und der Befall auf einen Wurzelanlauf begrenzt scheint: eingeschränkt, mit kurzem Nachkontrollintervall.',
      en: 'While the crown still carries and the infection looks limited to one root flare: restricted, with a short re-inspection interval.' },
    action: { right: 'sooner',
      de: 'Nachkontrolle vorziehen und die Kronenentwicklung im Auge behalten. Bei Zuwachs des Befalls eingehend untersuchen.',
      en: 'Bring the next inspection forward and watch the crown. If the infection spreads, investigate in detail.' }
  },
  {
    id: 'fomes', fam: 'fungi', art: 'broad',
    de: 'Hufförmiger, harter, grau gezonter Fruchtkörper in vier Metern Höhe am Stamm einer Buche.',
    en: 'A hard, hoof-shaped, grey-zoned bracket four metres up the stem of a beech.',
    draw: P.bracket(46, 52, 1.1),
    mark: { x: 44, y: 51, r: 8 },
    what: {
      opts: [{ de: 'Zunderschwamm (Fomes fomentarius)', en: 'Hoof fungus (Fomes fomentarius)' },
             { de: 'Riesenporling', en: 'Giant polypore' },
             { de: 'Brandkrustenpilz', en: 'Brittle cinder' },
             { de: 'Birkenporling', en: 'Birch polypore' }],
      right: 0,
      de: 'Hart, hufförmig, grau gezont, am Stamm und mehrjährig: Zunderschwamm. Der Birkenporling sitzt an Birke und ist weich-weißlich.',
      en: 'Hard, hoof-shaped, grey-zoned, on the stem and perennial: hoof fungus. Birch polypore grows on birch and is soft and whitish.'
    },
    level: { right: 2,
      de: 'Weißfäule im Stamm. Die Stufe hängt an der Restwandstärke und daran, wie viel Krone darüber steht – nicht am Fruchtkörper allein.',
      en: 'White rot in the stem. The level depends on remaining wall thickness and how much crown stands above it, not on the bracket alone.' },
    safety: { right: 'restricted',
      de: 'Ein einzelner Fruchtkörper ohne weitere Anzeichen ist noch kein Fall für "nicht gegeben" – aber er ist auch nicht mehr "gegeben".',
      en: 'One bracket with no other signs is not yet a case for "not given" - but it is no longer "given" either.' },
    action: { right: 'investigate',
      de: 'Restwandstärke bestimmen lassen. Faustregel t/R ≥ 0,3 als erste Orientierung – eine Faustregel, kein Urteil.',
      en: 'Have the residual wall measured. The t/R >= 0.3 rule of thumb is a first orientation, not a verdict.' }
  },
  {
    id: 'inonotus', fam: 'fungi', art: 'broad',
    de: 'Rostbrauner, samtiger Fruchtkörper am Wurzelanlauf einer Eiche, einjährig, zerfällt im Winter.',
    en: 'A rust-brown, velvety bracket on the root flare of an oak, annual, decaying over winter.',
    draw: P.bracket(56, 84, 1),
    mark: { x: 54, y: 84, r: 8 },
    what: {
      opts: [{ de: 'Schiefer Schillerporling (Inonotus spec.)', en: 'Shaggy bracket (Inonotus spec.)' },
             { de: 'Lackporling (Ganoderma spec.)', en: 'Ganoderma spec.' },
             { de: 'Zunderschwamm', en: 'Hoof fungus' },
             { de: 'Judasohr', en: 'Jelly ear' }],
      right: 0,
      de: 'Rostbraun, samtig, einjährig, am Anlauf: Schillerporling. Lackporlinge haben eine harte, oft lackartige Kruste und einen weißen Porenboden, der auf Druck braun anläuft.',
      en: 'Rust-brown, velvety, annual, at the flare: Inonotus. Ganoderma has a hard, often lacquered crust and a white pore surface that bruises brown.'
    },
    level: { right: 2,
      de: 'Weißfäule im unteren Stamm und Anlauf. Wichtig ist, wie weit der Anlauf betroffen ist – dort entscheidet sich die Standsicherheit.',
      en: 'White rot in the lower stem and flare. What matters is how much of the flare is involved; stability is decided there.' },
    safety: { right: 'restricted',
      de: 'Eingeschränkt, bis die Ausdehnung bekannt ist.',
      en: 'Restricted until the extent is known.' },
    action: { right: 'investigate',
      de: 'Eingehende Untersuchung des Wurzelanlaufs.',
      en: 'Detailed investigation of the root flare.' }
  },
  {
    id: 'ribbing', fam: 'base', art: 'broad',
    de: 'Eine längliche Wulst zieht sich über den Stammfuß, die Rinde darüber ist ungestört.',
    en: 'A long bulge runs over the stem base; the bark over it is undisturbed.',
    draw: P.bulge(46, 78) + P.bulge(48, 70),
    mark: { x: 47, y: 74, r: 9 },
    what: {
      opts: [{ de: 'Reaktionsholz über einem Defekt (Rippenbildung)', en: 'Reaction wood over a defect (ribbing)' },
             { de: 'Veredelungsstelle', en: 'Graft union' },
             { de: 'Frostplatte', en: 'Frost plate' },
             { de: 'Mechanische Verletzung', en: 'Mechanical wound' }],
      right: 0,
      de: 'Der Baum legt dort Holz zu, wo er Spannung spürt. Eine Rippe ist keine Krankheit, sondern die Antwort auf etwas darunter – ein Hinweis, kein Urteil.',
      en: 'A tree adds wood where it feels stress. A rib is not a disease but an answer to something underneath: a pointer, not a verdict.'
    },
    level: { right: 1,
      de: 'Für sich genommen geringfügig. Die Rippe sagt: hier hat der Baum reagiert – sie sagt nicht, worauf.',
      en: 'On its own, minor. The rib says the tree has reacted; it does not say to what.' },
    safety: { right: 'given',
      de: 'Solange nichts weiter dazukommt, ist die Verkehrssicherheit gegeben. Der Baum hat den Defekt selbst kompensiert.',
      en: 'With nothing else present, traffic safety is given: the tree has compensated for the defect itself.' },
    action: { right: 'none',
      de: 'Regelkontrolle, aber notieren und beim nächsten Mal vergleichen. Wächst die Rippe, wächst auch das, was darunter liegt.',
      en: 'Routine inspection, but record it and compare next time. If the rib grows, so does whatever lies under it.' }
  },
  {
    id: 'cavity-base', fam: 'base', art: 'broad',
    de: 'Offene Höhlung am Stammfuß, etwa ein Drittel des Umfangs, Ränder überwallt.',
    en: 'An open cavity at the stem base, about a third of the circumference, with callus rolls at the edges.',
    draw: P.cavity(50, 80, 5),
    mark: { x: 50, y: 80, r: 9 },
    what: {
      opts: [{ de: 'Überwallte Stammfußhöhlung', en: 'Occluding stem-base cavity' },
             { de: 'Frischer Anfahrschaden', en: 'Fresh vehicle impact' },
             { de: 'Tierhöhle ohne Holzbezug', en: 'Animal hole with no wood involvement' },
             { de: 'Blitzrinne', en: 'Lightning scar' }],
      right: 0,
      de: 'Die Überwallungswülste sagen, dass der Schaden alt ist und der Baum darauf antwortet. Ein frischer Anfahrschaden hat scharfe, helle Ränder.',
      en: 'The callus rolls say the damage is old and the tree is answering it. A fresh impact has sharp, pale edges.'
    },
    level: { right: 2,
      de: 'Eine Höhlung allein ist kein Urteil – entscheidend ist die verbleibende Wandstärke und ob der Querschnitt noch geschlossen ist.',
      en: 'A cavity alone is not a verdict: what decides is the residual wall and whether the section is still closed.' },
    safety: { right: 'restricted',
      de: 'Ein offener Querschnitt über einem Drittel des Umfangs ist ein Fall für Messen, nicht für Schätzen.',
      en: 'An open section over a third of the circumference is a case for measuring, not for estimating.' },
    action: { right: 'investigate',
      de: 'Restwandstärke messen. Die Überwallung zeigt Vitalität – sie ersetzt aber keine Messung.',
      en: 'Measure the residual wall. The callus shows vitality; it does not replace a measurement.' }
  },
  {
    id: 'soil-heave', fam: 'root', art: 'broad',
    de: 'Auf der windabgewandten Seite ist der Boden aufgewölbt und gerissen, auf der anderen Seite eingesunken.',
    en: 'The soil is raised and cracked on the lee side and sunken on the other.',
    draw: P.soil(62, 86) + '<path d="M30 88 q8 3 14 0" stroke="#3a2b1c" stroke-width="1.6" fill="none"/>' + P.lean(9),
    mark: { x: 66, y: 86, r: 9 },
    what: {
      opts: [{ de: 'Wurzelteller in Bewegung', en: 'Root plate moving' },
             { de: 'Maulwurfshügel', en: 'Molehill' },
             { de: 'Bodenverdichtung', en: 'Soil compaction' },
             { de: 'Frosthebung', en: 'Frost heave' }],
      right: 0,
      de: 'Die Kombination aus Hebung auf der einen und Senkung auf der anderen Seite ist das Kippen des Wurzeltellers. Ein Maulwurfshügel ist locker und einseitig.',
      en: 'Raised on one side and sunken on the other is the root plate tipping. A molehill is loose and on one side only.'
    },
    level: { right: 3,
      de: 'Das ist ein Standsicherheitsproblem im Gang. Es muss nichts faulen und nichts sichtbar sein – der Boden hat es verraten.',
      en: 'This is a stability failure in progress. Nothing needs to be rotten or visible; the ground gave it away.' },
    safety: { right: 'not given',
      de: 'Nicht gegeben. Bei diesem Bild wird gesperrt, bevor irgendetwas anderes passiert.',
      en: 'Not given. With this picture you close the area before anything else.' },
    action: { right: 'fell',
      de: 'Sofortmaßnahme, Fällung oder Sicherung prüfen. Ein kippender Wurzelteller wartet nicht auf den nächsten Kontrolltermin.',
      en: 'Immediate action: consider felling or securing. A tipping root plate does not wait for the next inspection date.' }
  },
  {
    id: 'root-cut', fam: 'root', art: 'broad',
    de: 'Ein Leitungsgraben verläuft in anderthalb Metern Abstand am Stamm vorbei, Wurzeln sind glatt durchtrennt.',
    en: 'A service trench runs a metre and a half from the stem; roots are cut off cleanly.',
    draw: '<rect x="68" y="80" width="6" height="16" fill="#0a0806" stroke="#4a3d2c" stroke-width=".8"/>' +
          '<path d="M56 88 L68 88 M58 90 L68 90" stroke="#6b5a42" stroke-width="1.4"/>',
    mark: { x: 70, y: 88, r: 8 },
    what: {
      opts: [{ de: 'Wurzelkappung durch Grabenaushub', en: 'Root severance from a trench' },
             { de: 'Natürliche Wurzelalterung', en: 'Natural root ageing' },
             { de: 'Wühlmausfraß', en: 'Vole damage' },
             { de: 'Trockenschaden', en: 'Drought damage' }],
      right: 0,
      de: 'Glatte Schnittflächen in einer Linie sind ein Werkzeug, kein Prozess. Alles Natürliche endet ausgefranst.',
      en: 'Clean cut faces in a straight line are a tool, not a process. Anything natural ends frayed.'
    },
    level: { right: 2,
      de: 'Entscheidend ist der Abstand zum Stamm im Verhältnis zum Stammdurchmesser und wie viel des Wurzeltellers auf dieser Seite weg ist.',
      en: 'What decides it is the distance from the stem relative to stem diameter, and how much of the root plate on that side is gone.' },
    safety: { right: 'restricted',
      de: 'Eingeschränkt: Die Standsicherheit ist auf dieser Seite messbar geschwächt, der Baum weiß es noch nicht.',
      en: 'Restricted: stability on that side is measurably weakened and the tree does not know it yet.' },
    action: { right: 'investigate',
      de: 'Eingehende Untersuchung, bei großen Bäumen Zugversuch. Und den Vorgang dokumentieren – das ist auch eine Haftungsfrage.',
      en: 'Detailed investigation, a pulling test on large trees. And document it: this is a liability matter as well.' }
  },
  {
    id: 'crack-long', fam: 'stem', art: 'broad',
    de: 'Ein durchgehender Längsriss über zwei Meter Stammlänge, die Ränder stehen leicht auf.',
    en: 'A continuous longitudinal crack over two metres of stem, the edges slightly open.',
    draw: P.crack('M50 78 L49 60 L51 46'),
    mark: { x: 50, y: 62, r: 10 },
    what: {
      opts: [{ de: 'Längsriss', en: 'Longitudinal crack' },
             { de: 'Frostriss, überwallt', en: 'Frost crack, occluded' },
             { de: 'Blitzrinne', en: 'Lightning scar' },
             { de: 'Rindenriss ohne Holzbezug', en: 'Bark fissure, no wood involved' }],
      right: 0,
      de: 'Aufstehende Ränder heißen: der Riss ist offen und bewegt sich. Ein überwallter Frostriss ist geschlossen und wulstig.',
      en: 'Open edges mean the crack is live and moving. An occluded frost crack is closed and ridged.'
    },
    level: { right: 3,
      de: 'Ein offener Längsriss trennt den Querschnitt mechanisch. Was als Rohr trug, trägt dann als zwei Schalen – erheblich weniger.',
      en: 'An open longitudinal crack separates the section. What carried as a tube now carries as two shells, which is much less.' },
    safety: { right: 'not given',
      de: 'Nicht gegeben, solange der Riss nicht beurteilt ist.',
      en: 'Not given until the crack has been assessed.' },
    action: { right: 'investigate',
      de: 'Eingehende Untersuchung; Kronensicherung oder Einkürzung können die Antwort sein, die Fällung auch.',
      en: 'Detailed investigation; a crown brace or reduction may be the answer, so may felling.' }
  },
  {
    id: 'included-bark', fam: 'crown', art: 'broad',
    de: 'Zwiesel in vier Metern Höhe, die Rinde zieht als dunkle Naht tief zwischen beide Stämmlinge.',
    en: 'A fork four metres up, with bark drawn deep between the two stems as a dark seam.',
    draw: '<path d="M50 60 L40 34 M50 60 L60 34" stroke="#3a2f22" stroke-width="4"/>' +
          '<path d="M50 60 L50 44" stroke="#12100e" stroke-width="1.6"/>',
    mark: { x: 50, y: 50, r: 8 },
    what: {
      opts: [{ de: 'Zwiesel mit eingewachsener Rinde', en: 'Fork with included bark' },
             { de: 'Gesunder Zwiesel mit Astkragen', en: 'Sound fork with a branch collar' },
             { de: 'Blitzschaden', en: 'Lightning damage' },
             { de: 'Schnittwunde', en: 'Pruning wound' }],
      right: 0,
      de: 'Entscheidend ist die Naht: Wo Rinde zwischen den Stämmlingen liegt, gibt es keine Holzverbindung. Ein gesunder Zwiesel zeigt eine Wulst, keine Naht.',
      en: 'The seam decides it: where bark lies between the stems there is no wood connection. A sound fork shows a ridge, not a seam.'
    },
    level: { right: 2,
      de: 'Eingewachsene Rinde ist eine Sollbruchstelle. Ob Stufe 2 oder 3, entscheidet die Größe der Kronenteile und ob schon ein Riss sichtbar ist.',
      en: 'Included bark is a designed breaking point. Whether it is level 2 or 3 depends on the size of the crown parts and whether a crack is already visible.' },
    safety: { right: 'restricted',
      de: 'Eingeschränkt, solange kein Riss zu sehen ist.',
      en: 'Restricted while no crack is visible.' },
    action: { right: 'prune',
      de: 'Kronensicherung oder Einkürzung des schwächeren Stämmlings. Das Ziel ist, das Hebelmoment zu verkleinern.',
      en: 'A crown brace or reduction of the weaker stem. The aim is to cut the lever arm.' }
  },
  {
    id: 'deadwood', fam: 'crown', art: 'broad',
    de: 'Mehrere starke Totäste in der Oberkrone einer Eiche über einem Gehweg.',
    en: 'Several heavy dead limbs in the upper crown of an oak over a footpath.',
    draw: P.deadwood('M50 30 L34 20 M50 26 L64 18'),
    mark: { x: 38, y: 22, r: 9 },
    what: {
      opts: [{ de: 'Totholz in der Krone', en: 'Deadwood in the crown' },
             { de: 'Winterzustand ohne Belaubung', en: 'Winter condition, no leaves' },
             { de: 'Wassertriebe', en: 'Water shoots' },
             { de: 'Mistelbefall', en: 'Mistletoe' }],
      right: 0,
      de: 'Totäste haben keine Knospen, gelöste Rinde und oft Pilzrasen. Im Winter entscheidet die Knospe, nicht das Blatt.',
      en: 'Dead limbs carry no buds, the bark lifts and fungi often follow. In winter it is the bud that decides, not the leaf.'
    },
    level: { right: 2,
      de: 'Über einem Gehweg zählt der Ast, der fallen kann, nicht der Anteil Totholz an der Krone.',
      en: 'Over a footpath what counts is the limb that can fall, not the share of deadwood in the crown.' },
    safety: { right: 'restricted',
      de: 'Eingeschränkt – und das ist der häufigste Befund überhaupt in der Regelkontrolle.',
      en: 'Restricted, and this is the commonest finding of all in routine inspection.' },
    action: { right: 'prune',
      de: 'Totholzentnahme im Verkehrsraum. Im Biotopbaum abseits von Wegen bleibt Totholz stehen – es ist Lebensraum.',
      en: 'Remove deadwood over the used area. On a habitat tree away from paths it stays: it is habitat.' }
  },
  {
    id: 'lean-new', fam: 'stem', art: 'conifer',
    de: 'Eine Fichte steht acht Grad schief, der Stammfuß zeigt keinen Bogen, der Boden ist intakt.',
    en: 'A spruce leans eight degrees, the base shows no curve and the ground is intact.',
    draw: P.lean(8),
    mark: { x: 50, y: 70, r: 10 },
    what: {
      opts: [{ de: 'Gewachsene Schiefstellung', en: 'Grown-in lean' },
             { de: 'Frische Schiefstellung nach Sturm', en: 'Fresh lean after a storm' },
             { de: 'Wurzelteller in Bewegung', en: 'Root plate moving' },
             { de: 'Optische Täuschung durch Hanglage', en: 'Illusion from sloping ground' }],
      right: 0,
      de: 'Ein gewachsener Schiefstand zeigt einen Bogen im unteren Stamm: Der Baum hat sich zurückgerichtet. Ein frischer Schiefstand ist gerade und der Boden verrät ihn.',
      en: 'A grown-in lean shows a curve in the lower stem: the tree corrected itself. A fresh lean is straight, and the ground gives it away.'
    },
    level: { right: 1,
      de: 'Schiefstand allein ist kein Mangel. Bäume wachsen schief und halten das aus – sie haben Reaktionsholz dafür.',
      en: 'Lean on its own is not a defect. Trees grow leaning and cope: they have reaction wood for it.' },
    safety: { right: 'given',
      de: 'Gegeben, solange Boden und Stammfuß unauffällig sind.',
      en: 'Given, as long as the ground and stem base are unremarkable.' },
    action: { right: 'none',
      de: 'Regelkontrolle. Den Winkel notieren – der Vergleich beim nächsten Mal ist die eigentliche Messung.',
      en: 'Routine inspection. Record the angle: the comparison next time is the real measurement.' }
  },
  {
    id: 'topping', fam: 'crown', art: 'pollard',
    de: 'Alte Kappungsschnitte, darüber dichte Büschel gleichaltriger Triebe, Schnittflächen faulend.',
    en: 'Old topping cuts with dense tufts of even-aged shoots above them, the cut faces decaying.',
    draw: P.cut(38, 26) + P.cut(50, 20) + P.cut(62, 26),
    mark: { x: 50, y: 22, r: 10 },
    what: {
      opts: [{ de: 'Kappungsfolgen (Ständer mit Reiterationen)', en: 'Consequences of topping (reiteration on stubs)' },
             { de: 'Fachgerechter Kronenschnitt', en: 'Correct crown pruning' },
             { de: 'Kopfbaumpflege', en: 'Pollard maintenance' },
             { de: 'Sturmschaden', en: 'Storm damage' }],
      right: 0,
      de: 'Kappung und Kopfbaumpflege sehen sich ähnlich und sind das Gegenteil: Der Kopfbaum wird von Jugend an regelmäßig geschnitten, die Kappung trifft eine gewachsene Krone einmal und zerstört sie.',
      en: 'Topping and pollarding look alike and are opposites: a pollard is cut regularly from youth, topping hits a grown crown once and wrecks it.'
    },
    level: { right: 2,
      de: 'Die Triebe sitzen nur auf der Rinde des faulenden Stummels. Je länger sie werden, desto schlechter das Verhältnis von Hebel zu Anschluss.',
      en: 'The shoots sit only on the bark of a decaying stub. The longer they grow, the worse the ratio of lever to attachment.' },
    safety: { right: 'restricted',
      de: 'Eingeschränkt, mit kurzem Intervall. Kappungsbäume brauchen dauerhaft Pflege – das ist die Rechnung für den Schnitt von damals.',
      en: 'Restricted, at a short interval. Topped trees need care for good: that is the bill for the cut made back then.' },
    action: { right: 'prune',
      de: 'Ableitung auf tragfähige Triebe, regelmäßige Wiederholung. Ein Zurück gibt es nicht.',
      en: 'Reduce onto sound shoots and repeat regularly. There is no going back.' }
  },
  {
    id: 'compaction', fam: 'root', art: 'broad',
    de: 'Der Wurzelraum ist auf drei Seiten asphaltiert, die Krone ist licht und die Triebzuwächse sind kurz.',
    en: 'The rooting area is sealed on three sides; the crown is thin and shoot growth short.',
    draw: '<rect x="8" y="86" width="30" height="8" fill="#22262a"/><rect x="62" y="86" width="30" height="8" fill="#22262a"/>' +
          '<ellipse cx="50" cy="28" rx="20" ry="13" fill="#2c4a33" opacity=".45"/>',
    mark: { x: 24, y: 88, r: 9 },
    what: {
      opts: [{ de: 'Wurzelraumverlust und Verdichtung', en: 'Loss of rooting space and compaction' },
             { de: 'Trockenstress ohne Standortbezug', en: 'Drought stress unrelated to the site' },
             { de: 'Nährstoffmangel', en: 'Nutrient deficiency' },
             { de: 'Blattpilzbefall', en: 'Leaf fungus' }],
      right: 0,
      de: 'Der Standort erklärt die Krone. Lichte Krone plus versiegelter Wurzelraum ist ein Standortbefund, kein Kronenbefund.',
      en: 'The site explains the crown. A thin crown plus a sealed rooting area is a site finding, not a crown finding.'
    },
    level: { right: 1,
      de: 'Vitalitätsverlust, noch keine Bruch- oder Standsicherheitsfrage.',
      en: 'Loss of vitality, not yet a fracture or stability question.' },
    safety: { right: 'given',
      de: 'Gegeben. Ein kränkelnder Baum ist nicht automatisch ein unsicherer Baum – das ist einer der häufigsten Denkfehler.',
      en: 'Given. An ailing tree is not automatically an unsafe tree, and confusing the two is one of the commonest mistakes.' },
    action: { right: 'sooner',
      de: 'Standort verbessern, wo möglich, und den Baum enger beobachten. Fäulen folgen dem Vitalitätsverlust oft nach.',
      en: 'Improve the site where possible and watch the tree more closely. Decay often follows a loss of vitality.' }
  },
  {
    id: 'bleeding', fam: 'stem', art: 'broad',
    de: 'Dunkle, nässende Flecken am Stamm einer Rosskastanie, die Rinde darunter ist stellenweise abgestorben.',
    en: 'Dark bleeding patches on the stem of a horse chestnut, with dead bark underneath in places.',
    draw: '<path d="M46 66 q3 6 -1 10 q5 2 7 -4 z" fill="#2a1a12" stroke="#4a3020" stroke-width=".8"/>',
    mark: { x: 48, y: 70, r: 8 },
    what: {
      opts: [{ de: 'Bakterielle Rindenerkrankung / Schleimfluss', en: 'Bacterial bleeding canker / slime flux' },
             { de: 'Harzfluss', en: 'Resin flow' },
             { de: 'Frostschaden', en: 'Frost damage' },
             { de: 'Insektenbohrloch', en: 'Insect bore hole' }],
      right: 0,
      de: 'Nässende dunkle Flecken mit abgestorbener Rinde an Kastanie sind das typische Bild. Harz gibt es an Nadelbäumen, nicht hier.',
      en: 'Weeping dark patches with dead bark on chestnut are the typical picture. Resin belongs to conifers, not here.'
    },
    level: { right: 1,
      de: 'Zunächst geringfügig: Es kommt darauf an, ob der Stamm ringförmig betroffen ist und ob Folgefäulen einziehen.',
      en: 'Minor at first: what matters is whether the stem is affected all round and whether secondary decay moves in.' },
    safety: { right: 'given',
      de: 'Gegeben, solange der Befall örtlich bleibt.',
      en: 'Given while the infection stays local.' },
    action: { right: 'sooner',
      de: 'Ausdehnung dokumentieren und vergleichen. Die Entwicklung über die Jahre ist die Diagnose.',
      en: 'Record the extent and compare. The development over the years is the diagnosis.' }
  },
  {
    id: 'hazard-beam', fam: 'crown', art: 'broad',
    de: 'Ein waagerechter Starkast von zwölf Metern Länge über einem Parkplatz, ohne sichtbaren Defekt.',
    en: 'A horizontal limb twelve metres long over a car park, with no visible defect.',
    draw: '<path d="M50 44 L86 44" stroke="#3a2f22" stroke-width="3.4"/>' +
          '<rect x="66" y="80" width="18" height="7" rx="2" fill="#22303a"/>',
    mark: { x: 80, y: 44, r: 8 },
    what: {
      opts: [{ de: 'Langer Kragarm mit hohem Eigengewicht', en: 'Long cantilever carrying its own weight' },
             { de: 'Sturmschaden', en: 'Storm damage' },
             { de: 'Zwiesel', en: 'Fork' },
             { de: 'Kein Befund', en: 'No finding' }],
      right: 0,
      de: 'Der Befund ist die Geometrie selbst: Je länger der waagerechte Ast, desto größer das Biegemoment am Anschluss. Sommerbruch trifft genau solche Äste ohne Vorzeichen.',
      en: 'The geometry is the finding: the longer the horizontal limb, the larger the bending moment at its attachment. Summer branch drop hits exactly these limbs with no warning.'
    },
    level: { right: 1,
      de: 'Ohne weitere Anzeichen geringfügig – aber der Ast gehört in die Akte, weil er das Ziel überstreicht.',
      en: 'Minor with nothing else present, but the limb belongs in the record because it spans the target.' },
    safety: { right: 'given',
      de: 'Gegeben. Ein Risiko ohne Befund ist noch kein Mangel – aber es ist ein Grund, öfter hinzusehen.',
      en: 'Given. A risk with no finding is not yet a defect, but it is a reason to look more often.' },
    action: { right: 'sooner',
      de: 'Kürzeres Intervall, Ast im Blick behalten, bei Rissen im Anschluss sofort handeln.',
      en: 'Shorter interval, keep the limb in view, act at once if cracks appear at the attachment.' }
  },
  {
    id: 'mistletoe', fam: 'crown', art: 'conifer',
    de: 'Dichte kugelige Büsche in der Krone einer Kiefer, immergrün, im Winter deutlich sichtbar.',
    en: 'Dense globular bushes in the crown of a pine, evergreen and obvious in winter.',
    draw: '<circle cx="42" cy="46" r="4" fill="#3f6b45"/><circle cx="58" cy="38" r="3.4" fill="#3f6b45"/>' +
          '<circle cx="50" cy="52" r="3" fill="#3f6b45"/>',
    mark: { x: 50, y: 45, r: 12 },
    what: {
      opts: [{ de: 'Mistel (Viscum album)', en: 'Mistletoe (Viscum album)' },
             { de: 'Hexenbesen', en: 'Witches broom' },
             { de: 'Nest', en: 'Nest' },
             { de: 'Wassertriebbüschel', en: 'Tuft of water shoots' }],
      right: 0,
      de: 'Kugelig, immergrün, im entlaubten oder lichten Baum deutlich: Mistel. Ein Hexenbesen besteht aus Trieben des Baumes selbst.',
      en: 'Globular, evergreen, obvious in a thin or bare crown: mistletoe. A witches broom is made of the tree’s own shoots.'
    },
    level: { right: 1,
      de: 'Die Mistel entzieht Wasser und Nährsalze. Bei starkem Befall schwächt sie den Baum, bricht ihn aber nicht.',
      en: 'Mistletoe takes water and minerals. Heavy infection weakens the tree; it does not break it.' },
    safety: { right: 'given',
      de: 'Gegeben. Eine Schwächung ist kein Sicherheitsmangel – auch das ist ein häufiger Kurzschluss.',
      en: 'Given. A weakening is not a safety defect; that short circuit is a common one too.' },
    action: { right: 'none',
      de: 'Regelkontrolle, Entwicklung beobachten. Die Mistel steht in manchen Ländern unter Schutz.',
      en: 'Routine inspection, watch the development. Mistletoe is protected in some countries.' }
  },
  {
    id: 'ganoderma', fam: 'fungi', art: 'broad',
    de: 'Konsolenförmiger Fruchtkörper am Stammfuß mit weißer Porenschicht, die auf Druck braun anläuft.',
    en: 'A bracket at the stem base with a white pore layer that bruises brown when pressed.',
    draw: P.bracket(56, 82, 1.2),
    mark: { x: 54, y: 82, r: 9 },
    what: {
      opts: [{ de: 'Lackporling (Ganoderma spec.)', en: 'Ganoderma spec.' },
             { de: 'Riesenporling', en: 'Giant polypore' },
             { de: 'Schmetterlingstramete', en: 'Turkeytail' },
             { de: 'Zunderschwamm', en: 'Hoof fungus' }],
      right: 0,
      de: 'Die weiße, auf Druck bräunende Porenschicht und die harte Kruste sind das Erkennungszeichen. Die Schmetterlingstramete ist dünn und ledrig und sitzt an totem Holz.',
      en: 'The white pore layer bruising brown plus the hard crust identify it. Turkeytail is thin and leathery and grows on dead wood.'
    },
    level: { right: 3,
      de: 'Weißfäule im Stammfuß und Wurzelanlauf, dort wo die Last ankommt. Viele Lackporlingsarten arbeiten lange unbemerkt.',
      en: 'White rot at the stem base and flare, where the load arrives. Many Ganoderma species work unnoticed for a long time.' },
    safety: { right: 'not given',
      de: 'Nicht gegeben, bis die Restwandstärke bekannt ist.',
      en: 'Not given until the residual wall is known.' },
    action: { right: 'investigate',
      de: 'Eingehende Untersuchung. Fruchtkörper bestimmen lassen – die Arten unterscheiden sich im Tempo deutlich.',
      en: 'Detailed investigation, and have the species identified: they differ markedly in speed.' }
  },
  {
    id: 'sound-tree', fam: 'stem', art: 'broad',
    de: 'Gleichmäßige Krone, geschlossene Rinde, deutlich ausgebildete Wurzelanläufe, keine Auffälligkeit.',
    en: 'An even crown, closed bark, well-formed root flares, nothing conspicuous.',
    draw: '',
    mark: null,
    what: {
      opts: [{ de: 'Ohne Befund', en: 'No findings' },
             { de: 'Versteckter Stammfußdefekt', en: 'Hidden stem-base defect' },
             { de: 'Beginnende Fäule', en: 'Incipient decay' },
             { de: 'Vitalitätsverlust', en: 'Loss of vitality' }],
      right: 0,
      de: 'Die schwerste Übung überhaupt: einen gesunden Baum als gesund zu erkennen und ihn in Ruhe zu lassen. Wer überall etwas findet, findet nichts.',
      en: 'The hardest exercise of all: seeing a sound tree as sound and leaving it alone. An inspector who finds something everywhere finds nothing.'
    },
    level: { right: 0,
      de: 'Stufe 0. Das ist ein vollwertiges Ergebnis einer Kontrolle, kein Versäumnis.',
      en: 'Level 0. That is a full result of an inspection, not an omission.' },
    safety: { right: 'given',
      de: 'Gegeben.',
      en: 'Given.' },
    action: { right: 'none',
      de: 'Regelkontrolle im normalen Intervall. Auch das gehört dokumentiert – ein leerer Befund ist ein Befund.',
      en: 'Routine inspection at the normal interval. Record it too: an empty finding is a finding.' }
  }
];


/* ---- the reading behind the questions ----------------------------------
   A quiz that only marks answers teaches the answers. Each family gets a
   page: what you are actually looking at, how it fails, what separates the
   findings inside that family, and the mistake that is made most often.
   Short enough to be read standing up. */
const CASE_KNOW = {
  fungi: {
    de: {
      look: 'Ein Fruchtk\u00f6rper ist das, was der Pilz nach au\u00dfen zeigt \u2013 die Arbeit passiert lange vorher im Holz. ' +
            'Wo er sitzt, sagt mehr als was er ist: am Stammfu\u00df und im Wurzelanlauf geht es um Standsicherheit, ' +
            'am Stamm um Bruchsicherheit.',
      how: 'Wei\u00dff\u00e4ulen bauen Lignin ab, das Holz wird faserig und h\u00e4lt Druck schlecht. Braunf\u00e4ulen bauen Cellulose ab, ' +
           'das Holz w\u00fcrfelt und bricht spr\u00f6de. Der Brandkrustenpilz tut beides und hinterl\u00e4sst kein Warnzeichen au\u00dfen.',
      tell: 'Hart und mehrj\u00e4hrig (Zunder, Lackporling) gegen weich und einj\u00e4hrig (Riesenporling, Schillerporling); ' +
            'schwarz-krustig (Brandkruste) gegen f\u00e4cherf\u00f6rmig (Riesenporling); ' +
            'wei\u00dfe Myzelf\u00e4cher unter der Rinde: Hallimasch.',
      miss: 'Der h\u00e4ufigste Fehler ist, vom Fruchtk\u00f6rper auf die Stufe zu schlie\u00dfen. Der Fruchtk\u00f6rper sagt, dass etwas ' +
            'l\u00e4uft \u2013 wie weit es ist, sagt nur die Messung.'
    },
    en: {
      look: 'A bracket is what the fungus shows outside; the work happened in the wood long before. Where it sits says ' +
            'more than what it is: at the base and root flare the question is stability, on the stem it is fracture.',
      how: 'White rots take out lignin and the wood goes fibrous and poor in compression. Brown rots take out cellulose ' +
           'and the wood cubes and snaps. Brittle cinder does both and leaves no outward warning.',
      tell: 'Hard and perennial (hoof fungus, Ganoderma) against soft and annual (giant polypore, Inonotus); ' +
            'black crust (brittle cinder) against overlapping fans (giant polypore); white mycelial fans under the ' +
            'bark mean honey fungus.',
      miss: 'The commonest mistake is reading the level off the bracket. The bracket says something is happening; ' +
            'how far it has got is a matter for measurement.'
    }
  },
  base: {
    de: { look: 'Der Stammfu\u00df tr\u00e4gt alles. Hier kommt jede Last an, und hier entscheidet sich, ob ein Baum steht.',
          how: 'Der Baum antwortet auf Spannung mit Holz: Rippen, Wulste, Verdickungen. Das ist keine Krankheit, sondern eine Reaktion \u2013 ' +
               'und ein Fingerzeig auf das, was darunter liegt.',
          tell: 'Geschlossene Rinde \u00fcber einer Wulst hei\u00dft kompensiert. Offene H\u00f6hlung hei\u00dft messen. ' +
                'Fehlende Wurzelanl\u00e4ufe hei\u00dfen: hier stimmt etwas an der Verankerung nicht.',
          miss: 'Eine H\u00f6hlung wird \u00fcbersch\u00e4tzt, eine fehlende Reaktion untersch\u00e4tzt. Ein Baum, der nicht reagiert hat, ' +
                'hat entweder nichts zu kompensieren oder keine Kraft mehr dazu.' },
    en: { look: 'The stem base carries everything. Every load arrives here, and whether a tree stands is decided here.',
          how: 'A tree answers stress with wood: ribs, bulges, thickening. Not a disease but a reaction, and a pointer to ' +
               'whatever lies under it.',
          tell: 'Closed bark over a bulge means compensated. An open cavity means measure. Missing root flares mean ' +
                'something is wrong with the anchorage.',
          miss: 'A cavity gets overrated and a missing reaction underrated. A tree that has not reacted either has nothing ' +
                'to compensate or no strength left to do it.' }
  },
  stem: {
    de: { look: 'Der Stamm ist ein Rohr. Ein Rohr tr\u00e4gt, solange es rundum geschlossen ist \u2013 die \u00e4u\u00dferen Fasern tragen am meisten.',
          how: 'Ein L\u00e4ngsriss trennt das Rohr in Schalen, und zwei Schalen tragen weit weniger als ein Rohr gleicher Masse. ' +
               'Deshalb ist ein offener Riss so viel schlimmer als eine zentrale F\u00e4ule.',
          tell: 'Offene, aufstehende Rissr\u00e4nder gegen geschlossene, \u00fcberwallte. Frischer Schiefstand (Boden verr\u00e4t ihn) ' +
                'gegen gewachsenen (Bogen im unteren Stamm).',
          miss: 'Vitalit\u00e4t mit Sicherheit zu verwechseln. Ein kr\u00e4nkelnder Baum kann sicher sein, ein voll belaubter kann fallen.' },
    en: { look: 'A stem is a tube. A tube carries as long as it is closed all round, and the outer fibres carry most.',
          how: 'A longitudinal crack turns the tube into shells, and two shells carry far less than a tube of the same mass. ' +
               'That is why an open crack is so much worse than a central decay.',
          tell: 'Open, lifted crack edges against closed, occluded ones. A fresh lean (the ground gives it away) against a ' +
                'grown-in one (a curve in the lower stem).',
          miss: 'Confusing vitality with safety. An ailing tree can be safe; a fully leafed one can fall.' }
  },
  crown: {
    de: { look: 'Die Krone ist der Hebel. Was in der Krone sitzt, wirkt am Anschluss um ein Vielfaches verst\u00e4rkt.',
          how: 'Eingewachsene Rinde ist eine Sollbruchstelle, weil dort keine Holzverbindung besteht. Ein langer waagerechter ' +
               'Ast bricht an seinem Anschluss, nicht in der Mitte.',
          tell: 'Naht gegen Wulst am Zwiesel. Totast (keine Knospen, gel\u00f6ste Rinde) gegen Winterzustand. ' +
                'Kappung (einmal, an gewachsener Krone) gegen Kopfbaum (regelm\u00e4\u00dfig, von Jugend an).',
          miss: 'Totholz als Ma\u00df f\u00fcr Gefahr zu nehmen. Entscheidend ist der einzelne Ast \u00fcber dem Ziel, nicht der Anteil.' },
    en: { look: 'The crown is the lever. Whatever sits in it acts on the attachment many times magnified.',
          how: 'Included bark is a designed breaking point because there is no wood connection there. A long horizontal limb ' +
               'breaks at its attachment, not in the middle.',
          tell: 'Seam against ridge at a fork. A dead limb (no buds, lifting bark) against winter bareness. ' +
                'Topping (once, on a grown crown) against pollarding (regularly, from youth).',
          miss: 'Taking deadwood as a measure of danger. What matters is the one limb over the target, not the proportion.' }
  },
  root: {
    de: { look: 'Der Wurzelteller ist das Fundament, und man sieht ihn nicht. Was man sieht, ist der Boden dar\u00fcber.',
          how: 'Standsicherheit kommt aus dem Verbund von Wurzeln und Boden. F\u00e4llt eine Seite aus \u2013 gekappt, gef\u00e4ult, ' +
               'verdichtet \u2013 kippt der Baum \u00fcber diese Kante.',
          tell: 'Hebung auf einer Seite und Senkung auf der anderen: der Teller bewegt sich. Glatte Schnittfl\u00e4chen in einer ' +
                'Linie: ein Werkzeug war da. Lichte Krone \u00fcber versiegeltem Boden: Standortfrage, keine Kronenfrage.',
          miss: 'Den Boden nicht anzusehen. Die meisten Standsicherheitsf\u00e4lle stehen im Boden geschrieben, nicht im Stamm.' },
    en: { look: 'The root plate is the foundation and you cannot see it. What you can see is the ground above it.',
          how: 'Stability comes from roots and soil acting together. If one side drops out - cut, rotted, compacted - the ' +
               'tree goes over that edge.',
          tell: 'Raised on one side and sunken on the other: the plate is moving. Clean cut faces in a line: a tool was here. ' +
                'A thin crown over sealed ground: a site question, not a crown question.',
          miss: 'Not looking at the ground. Most stability cases are written in the soil, not in the stem.' }
  }
};
