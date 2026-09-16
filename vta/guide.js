/* ============================================================================
   THE GUIDE

   A tree inspection is a method before it is a form, and the form makes no
   sense to anyone who has not been taught the method. So the app carries the
   method: what a Regelkontrolle after the FLL guidelines actually asks of the
   person standing under the tree, in the order they do it, and which button
   in this app answers which part of it.

   It is in the app's language, and the app has exactly one - there is no
   separate setting here to find and forget. Only German and English are
   written; set the app to Eesti and this page says, in Estonian, that the
   method text has not been translated and is being shown in English.
   Machine-inventing a safety procedure in a language nobody here has checked
   is not a translation, it is a liability.

   Nothing here is a quotation: the FLL guidelines are a purchased document and
   stay that way - this is the procedure described in plain words, the way a
   colleague explains it on the way to the first tree. It is a teaching aid,
   not a legal text, and it does not make anybody a qualified inspector.
   ========================================================================= */

const K_GUIDE = 'vta_guide_v1';
/* The two languages this text is actually written in. */
const GUIDE_WRITTEN = ['de', 'en'];
/* Said in the language that was asked for, because a person reading the app
   in Suomi is telling you that is the language they read. */
const GUIDE_UNWRITTEN = {
  nl: 'De methodetekst is nog niet vertaald – hier in het Engels.',
  et: 'Metoodika tekst ei ole veel tõlgitud – kuvatakse inglise keeles.',
  fi: 'Menetelmän tekstiä ei ole vielä käännetty – näytetään englanniksi.'
};
/* What the app is in ... */
function guidePick() { return uiLang(); }
/* ... and what there is to show them in it. */
function guideLang() {
  const g = guidePick();
  return GUIDE_WRITTEN.indexOf(g) >= 0 ? g : 'en';
}
function gt(pair) { return pair[guideLang()] || pair.en; }
function guideDone() { try { return JSON.parse(lsGet(K_GUIDE)) || {}; } catch (e) { return {}; } }
function guideMark(id, on) { const d = guideDone(); if (on) d[id] = true; else delete d[id]; lsSet(K_GUIDE, JSON.stringify(d)); }

/* Each step: what the method wants, then what to press. `go` is the shortcut
   to the screen the step happens on - reading about a button is not the same
   as being put in front of it. */
const GUIDE = [
  {
    id: 'what',
    title: { en: 'What a Regelkontrolle is', de: 'Was eine Regelkontrolle ist' },
    what: {
      en: 'Whoever owns a tree owes the public a safe tree. In Germany that duty is met by ' +
          'the Regelkontrolle described in the FLL tree inspection guidelines: a visual ' +
          'inspection from the ground, done on foot, without instruments, by someone qualified ' +
          'to do it, repeated at an interval the tree itself dictates. The method of looking is ' +
          'VTA – Visual Tree Assessment, after Mattheck and Breloer: a tree that is compensating ' +
          'for a weakness shows it in its shape, and the shape can be read.',
      de: 'Wer einen Baum besitzt, schuldet der Allgemeinheit einen verkehrssicheren Baum. ' +
          'In Deutschland wird diese Pflicht durch die Regelkontrolle nach der FLL-Baumkontroll' +
          'richtlinie erfüllt: eine visuelle Kontrolle vom Boden aus, im Gehen, ohne Geräte, ' +
          'durch eine fachkundige Person, wiederholt in einem Intervall, das der Baum selbst ' +
          'vorgibt. Die Art des Hinsehens ist VTA – Visual Tree Assessment nach Mattheck und ' +
          'Breloer: ein Baum, der eine Schwachstelle ausgleicht, zeigt das in seiner Gestalt, ' +
          'und diese Gestalt lässt sich lesen.'
    },
    app: [
      { en: 'VTA is three steps, and the whole day follows them: see the symptom, test the suspicion, measure how bad it is.',
        de: 'VTA sind drei Schritte, und der ganze Tag folgt ihnen: Symptom sehen, Verdacht überprüfen, Schwere des Defekts messen.' },
      { en: 'The app records and calculates. It does not decide. The verdict is the inspector’s, and it is signed with their name.',
        de: 'Die App erfasst und rechnet. Sie entscheidet nicht. Die Beurteilung trifft der Kontrolleur und unterschreibt sie mit seinem Namen.' }
    ]
  },
  {
    id: 'before',
    title: { en: 'Before you leave', de: 'Vor dem Losgehen' },
    what: {
      en: 'The inspection is only worth what its record is worth, and the record is worth ' +
          'nothing if nobody can tell who made it, when, and to which rule.',
      de: 'Eine Kontrolle ist so viel wert wie ihre Dokumentation, und die ist nichts wert, ' +
          'wenn niemand sagen kann, wer sie wann und nach welcher Regel gemacht hat.'
    },
    app: [
      { en: 'Data → Standard: the German FLL form. The app offers it by itself as soon as it knows you are in Germany.',
        de: 'Daten → Standard: das FLL-Formular. Die App bietet es von selbst an, sobald sie weiß, dass du in Deutschland bist.' },
      { en: 'Data → Inspector: your name. It is stamped on every change you save.',
        de: 'Daten → Inspector: dein Name. Er wird auf jede gespeicherte Änderung gestempelt.' },
      { en: 'Data → Start a round. Everything you record from now on belongs to that round and is counted in it.',
        de: 'Daten → Start a round. Alles, was du ab jetzt erfasst, gehört zu dieser Runde und wird darin gezählt.' },
      { en: 'Bring the trees in: Merge a register, Load from a web address, or simply record them as you go.',
        de: 'Bäume holen: Register zusammenführen, über eine Webadresse laden, oder einfach unterwegs neu aufnehmen.' },
      { en: 'Leafed or bare matters. A crown is judged in leaf; cracks, forks and deadwood are seen in winter. Say which it was under Inspection type.',
        de: 'Belaubt oder unbelaubt ist ein Unterschied. Die Krone beurteilt man belaubt; Risse, Zwiesel und Totholz sieht man im Winter. Halte unter Inspection type fest, was es war.' }
    ],
    go: { sc: 'data', label: { en: 'Open Data', de: 'Daten öffnen' } }
  },
  {
    id: 'find',
    title: { en: 'At the tree: which tree is it', de: 'Am Baum: welcher Baum ist es' },
    what: {
      en: 'An inspection belongs to one tree and has to be findable again at the next one. ' +
          'Number, position and species come before any finding.',
      de: 'Eine Kontrolle gehört zu genau einem Baum und muss beim nächsten Mal wiederauffindbar ' +
          'sein. Nummer, Position und Art stehen vor jedem Befund.'
    },
    app: [
      { en: 'Trees is sorted by distance: the nearest is at the top. Say a number out loud – “tree five one” – and it opens.',
        de: 'Die Liste ist nach Entfernung sortiert, der nächste steht oben. Sag eine Nummer – „Baum fünf eins“ – und sie öffnet sich.' },
      { en: 'Not in the register? + Tree at my GPS position, or record it in AR where you aim, which is far more accurate.',
        de: 'Nicht im Register? + Tree at my GPS position, oder in AR dort aufnehmen, wo du hinzielst – das ist deutlich genauer.' },
      { en: 'The number carries where it was given out: DE-B-00042 was numbered in Berlin.',
        de: 'Die Nummer trägt ihren Ort: DE-B-00042 wurde in Berlin vergeben.' },
      { en: 'Species unclear: photograph a leaf, the bark and the whole tree, then Pl@ntNet in the photo gallery. The answer is a proposal, you decide.',
        de: 'Art unklar: Blatt, Rinde und Habitus fotografieren, dann Pl@ntNet in der Fotogalerie. Die Antwort ist ein Vorschlag, entscheiden musst du.' }
    ],
    go: { sc: 'list', label: { en: 'Open the trees', de: 'Baumliste öffnen' } }
  },
  {
    id: 'look',
    title: { en: 'Step 1: walk around it and look', de: 'Schritt 1: umrunden und hinsehen' },
    what: {
      en: 'Walk the whole way round the tree, twice if the light is bad, and look from far ' +
          'to near: the whole habit first – is it leaning, is the crown one-sided, does the ' +
          'shape fit the species and the site – then the crown, then the stem, then the root ' +
          'collar and the ground around it. Reaction wood is the tree telling you where its ' +
          'problem is: a rib, a bulge, a swelling means it has been reinforcing that spot for ' +
          'years. Look for what does not belong: a bulge where the stem should be straight, ' +
          'a hollow sound, a fruiting body, bark that has died back, soil that has lifted.',
      de: 'Den Baum ganz umrunden, bei schlechtem Licht zweimal, und von fern nach nah sehen: ' +
          'zuerst der Habitus – steht er schief, ist die Krone einseitig, passt die Gestalt zu ' +
          'Art und Standort – dann die Krone, dann der Stamm, dann Stammfuß und Boden ringsum. ' +
          'Reaktionsholz ist die Körpersprache des Baums: eine Rippe, eine Beule, eine ' +
          'Verdickung heißt, er verstärkt diese Stelle seit Jahren. Suche, was nicht dazugehört: ' +
          'eine Wulst, wo der Stamm gerade sein müsste, ein hohler Klang, ein Fruchtkörper, ' +
          'abgestorbene Rinde, aufgeworfener Boden.'
    },
    app: [
      { en: 'Open the tree → VTA. The symptom list is in the three zones you walk: trunk and root collar, root zone, crown.',
        de: 'Baum öffnen → VTA. Die Symptomliste steht in den drei Zonen, die du abgehst: Stamm und Stammfuß, Wurzelbereich, Krone.' },
      { en: 'Tick what you see, not what you suspect. A suspicion goes in the remarks.',
        de: 'Hake ab, was du siehst, nicht was du vermutest. Eine Vermutung gehört in die Bemerkung.' },
      { en: 'Hands full? The microphone takes “longitudinal crack”, “deadwood”, “vitality two” and writes it in the right field.',
        de: 'Hände voll? Das Mikrofon nimmt „Längsriss“, „Totholz“, „Vitalität zwei“ und schreibt es ins richtige Feld.' },
      { en: 'Photograph every symptom you tick. A photograph settles an argument two years later; a tick does not.',
        de: 'Fotografiere jedes Symptom, das du ankreuzt. Ein Foto entscheidet zwei Jahre später den Streit, ein Häkchen nicht.' }
    ]
  },
  {
    id: 'zones',
    title: { en: 'The four zones, in order', de: 'Die vier Zonen, der Reihe nach' },
    what: {
      en: 'Site and surroundings: what has changed near the tree – a trench, a new kerb, a ' +
          'building pit, a paved surface, a tree that used to stand beside it and is gone, so ' +
          'this one is suddenly in the wind.\n' +
          'Root zone and root collar: soil heave and tension cracks in the ground on the side ' +
          'away from a lean, a missing or one-sided root flare, cut roots, compaction, fruiting ' +
          'bodies at the butt.\n' +
          'Stem: longitudinal and transverse cracks, ribs and bulges, cavities and open decay, ' +
          'dead bark, lightning scars, flux, forks with included bark, a lean that has changed.\n' +
          'Crown: deadwood over about three centimetres, hangers, old breakage points, dieback ' +
          'from the top and the outside in, water shoots, decay at old topping cuts.',
      de: 'Standort und Umfeld: Was hat sich am Baum verändert – ein Graben, eine neue Bordkante, ' +
          'eine Baugrube, eine Versiegelung, ein Nachbarbaum, der gefällt wurde, sodass dieser ' +
          'plötzlich im Wind steht.\n' +
          'Wurzelbereich und Stammfuß: Bodenaufwölbung und Zugrisse im Boden auf der der Neigung ' +
          'abgewandten Seite, fehlender oder einseitiger Wurzelanlauf, gekappte Wurzeln, ' +
          'Verdichtung, Fruchtkörper am Stammfuß.\n' +
          'Stamm: Längs- und Querrisse, Rippen und Beulen, Höhlungen und offene Fäulen, tote ' +
          'Rinde, Blitzrinnen, Schleimfluss, Zwiesel mit eingewachsener Rinde, veränderte Neigung.\n' +
          'Krone: Totholz ab etwa drei Zentimetern, Hänger, alte Bruchstellen, Rückgang von oben ' +
          'und von außen nach innen, Wasserreiser, Fäulen an alten Kappungsstellen.'
    },
    app: [
      { en: 'Root zone first if anything at all is wrong with the tree: a tree that loses its anchorage falls whole, and it gives less warning than a stem does.',
        de: 'Wurzelbereich zuerst, wenn irgendetwas nicht stimmt: Ein Baum, der die Verankerung verliert, fällt ganz – und warnt weniger als ein Stamm.' },
      { en: 'Found a fruiting body: VTA → Wood-decay fungi, pick the species. The app says what that fungus does and how such a tree fails.',
        de: 'Fruchtkörper gefunden: VTA → Wood-decay fungi, Art auswählen. Die App sagt, was dieser Pilz anrichtet und wie so ein Baum versagt.' },
      { en: 'Cannot name the fungus: photograph it and tick “fruiting bodies” anyway. The app then treats it as decay until somebody names it, which is the safe way round.',
        de: 'Pilz nicht bestimmbar: fotografieren und trotzdem „Fruchtkörper“ ankreuzen. Die App behandelt das dann als Fäule, bis jemand ihn bestimmt – das ist die sichere Richtung.' },
      { en: 'Soil heave, a change of lean, or a hanger over a path each raise the tree to the highest level on their own. That is the app agreeing with the method, not replacing it.',
        de: 'Bodenaufwölbung, veränderte Neigung oder ein Hänger über einem Weg heben den Baum jeweils allein auf die höchste Stufe. Darin folgt die App der Methode, sie ersetzt sie nicht.' }
    ]
  },
  {
    id: 'photo',
    title: { en: 'Photographing, and marking what is on the picture',
             de: 'Fotografieren, und auf dem Bild markieren' },
    what: {
      en: 'A photograph settles two years later what a tick never will. There are three ways ' +
          'to take one, and they are not the same photograph.\n' +
          'In the camera view, the Photo button in the bottom bar takes what the camera sees, ' +
          'without leaving the session. This is the one that knows where it was taken from - ' +
          'how far from the stem, which side, how high, looking which way - and with what lens.\n' +
          'In the camera view, Tools gives the same thing with a name on it: bark at 1.30 m, ' +
          'leaf, flower, fruit, the whole tree. Use these: the name is what makes the picture ' +
          'worth anything to identification later.\n' +
          'On the tree\'s own page, under Photos, the camera button opens the phone\'s own ' +
          'camera app. It is the way that always works, on any phone, with no AR at all - but ' +
          'the picture comes back through a different lens, so what it knows about where it ' +
          'was taken from is rougher.',
      de: 'Ein Foto klärt zwei Jahre später, was ein Häkchen nie klärt. Es gibt drei Wege, eines ' +
          'zu machen, und es sind nicht dieselben Fotos.\n' +
          'In der Kameraansicht nimmt der Knopf <b>Photo</b> in der unteren Leiste auf, was die ' +
          'Kamera sieht, ohne die Sitzung zu verlassen. Dieses Foto weiß, von wo es gemacht wurde ' +
          '– Abstand zum Stamm, welche Seite, welche Höhe, welche Blickrichtung – und mit welchem ' +
          'Bildwinkel.\n' +
          'In der Kameraansicht gibt <b>Tools</b> dasselbe mit einem Namen: Rinde auf 1,30 m, ' +
          'Blatt, Blüte, Frucht, ganzer Baum. Nimm die: der Name macht das Bild für die ' +
          'Bestimmung später überhaupt erst brauchbar.\n' +
          'Auf der Baumseite unter <b>Photos</b> öffnet der Kameraknopf die Kamera-App des ' +
          'Telefons. Das ist der Weg, der immer funktioniert, auf jedem Gerät, ganz ohne AR – ' +
          'aber das Bild kommt durch ein anderes Objektiv zurück, also weiß es gröber, von wo es ' +
          'aufgenommen wurde.'
    },
    app: [
      { en: 'Tap any photograph to open it. “Mark the damage”, then tap the spot, then say what it is.',
        de: 'Auf ein Foto tippen, um es zu öffnen. „Mark the damage“, dann auf die Stelle tippen, dann sagen, was es ist.' },
      { en: 'A pin on a picture that knows its pose also lands on the trunk, at a height and a side worked out from the picture, and is drawn there in AR with the measured ones.',
        de: 'Ein Pin auf einem Bild, das seine Pose kennt, landet zusätzlich am Stamm, mit Höhe und Seite aus dem Bild gerechnet, und wird dort in AR neben den gemessenen gezeichnet.' },
      { en: 'The viewer says what the picture in front of you can do before you tap: on the trunk as well, rough, or on the picture only.',
        de: 'Der Viewer sagt vorher, was dieses Bild kann: auch am Stamm, grob, oder nur auf dem Bild.' },
      { en: '⟲ on a photograph walks you back to the spot it was taken from and lays it over the live camera, with last year’s pins on it.',
        de: '⟲ auf einem Foto führt dich an die Aufnahmestelle zurück und legt es über das Livebild, mitsamt der Pins von damals.' }
    ],
    go: { sc: 'list', label: { en: 'Open the trees', de: 'Baumliste öffnen' } }
  },
  {
    id: 'verify',
    title: { en: 'Step 2: test the suspicion', de: 'Schritt 2: den Verdacht überprüfen' },
    what: {
      en: 'The Regelkontrolle is done from the ground and without instruments, but it does ' +
          'include what a hand and a light hammer can tell you: sound the stem where you ' +
          'suspect a cavity, feel whether bark is loose, probe an opening to find out how deep ' +
          'it goes, look into the fork you distrust. If the suspicion stands and cannot be ' +
          'settled this way, the Regelkontrolle ends there and a detailed investigation is ' +
          'ordered – resistance drilling, sonic tomography, a pulling test – which is a separate ' +
          'job for a separate specialist. Writing “detailed investigation required” is a proper ' +
          'result of an inspection, not a failure of one.',
      de: 'Die Regelkontrolle erfolgt vom Boden und ohne Geräte, schließt aber ein, was Hand und ' +
          'Schonhammer hergeben: Klangprobe dort, wo du eine Höhlung vermutest, prüfen, ob Rinde ' +
          'lose ist, eine Öffnung aussondieren, in den verdächtigen Zwiesel schauen. Bleibt der ' +
          'Verdacht und lässt er sich so nicht klären, endet die Regelkontrolle hier und es wird ' +
          'eine eingehende Untersuchung veranlasst – Bohrwiderstandsmessung, Schalltomografie, ' +
          'Zugversuch –, und das ist Sache eines Sachverständigen. „Eingehende Untersuchung ' +
          'erforderlich“ ist ein ordentliches Ergebnis einer Kontrolle, kein Versagen.'
    },
    app: [
      { en: 'VTA → Inspection type: say that it went beyond a routine inspection.',
        de: 'VTA → Inspection type: festhalten, dass es über die Regelkontrolle hinausging.' },
      { en: 'Actions → detailed investigation, and Urgency to match. That is the order, and it is dated and signed.',
        de: 'Actions → eingehende Untersuchung, dazu die passende Dringlichkeit. Das ist die Anordnung, datiert und unterschrieben.' },
      { en: 'Voice note: say into the phone what you heard and felt. It is stored beside the photographs and typed up warm and indoors.',
        de: 'Sprachnotiz: sag ins Telefon, was du gehört und gefühlt hast. Sie liegt bei den Fotos und wird drinnen im Warmen abgetippt.' }
    ]
  },
  {
    id: 'measure',
    title: { en: 'Step 3: measure how bad it is', de: 'Schritt 3: die Schwere messen' },
    what: {
      en: 'A defect is only a defect in proportion to the tree carrying it. Two rules of thumb ' +
          'carry most of the work.\n' +
          't/R – the residual wall of a hollow stem divided by its radius. Below about 0.3 the ' +
          'wall is thin enough that the stem can buckle, and the tree belongs in a detailed ' +
          'investigation. Measure t as the sound wall you can actually establish, and R at the ' +
          'same height.\n' +
          'h/d – height divided by stem diameter in the same unit. A free-standing tree that has ' +
          'grown its whole life in the open is stocky; one that grew in a stand and now stands ' +
          'alone is slender and meets a wind it never had to carry. Mattheck’s rule of thumb for ' +
          'a solitary tree is about 50.\n' +
          'Neither number is a verdict. They say “look closer here”.',
      de: 'Ein Defekt ist immer nur im Verhältnis zum Baum ein Defekt. Zwei Faustformeln tragen ' +
          'den größten Teil.\n' +
          't/R – die Restwandstärke eines hohlen Stammes geteilt durch seinen Radius. Unter etwa ' +
          '0,3 ist die Wand so dünn, dass der Stamm ausbeulen kann, und der Baum gehört in eine ' +
          'eingehende Untersuchung. t ist die gesunde Wand, die du tatsächlich feststellen ' +
          'kannst, R wird auf derselben Höhe gemessen.\n' +
          'h/d – Höhe geteilt durch Stammdurchmesser in derselben Einheit. Ein Baum, der immer ' +
          'frei stand, ist gedrungen; einer, der im Bestand aufwuchs und nun allein steht, ist ' +
          'schlank und trifft auf einen Wind, den er nie tragen musste. Matthecks Faustzahl für ' +
          'den Solitär liegt bei etwa 50.\n' +
          'Keine der beiden Zahlen ist ein Urteil. Sie sagen: hier genauer hinsehen.'
    },
    app: [
      { en: 'VTA → Residual wall t and Stem radius R. The app divides them, shows t/R and raises the level by itself below 0.30.',
        de: 'VTA → Restwand t und Stammradius R. Die App teilt, zeigt t/R und hebt unter 0,30 von selbst die Stufe an.' },
      { en: 'Diameter: tape round the stem at 1.30 m gives the girth, and the app derives the diameter. On a phone with depth, Tools → the caliper scan reads the stem from the depth camera – walk a good arc round it, 270° or more, and it says how much it saw.',
        de: 'Durchmesser: Maßband auf 1,30 m gibt den Umfang, die App rechnet den Durchmesser. Auf einem Tiefen-Handy liest Tools → Kaliper-Scan den Stamm aus der Tiefenkamera – geh einen guten Bogen herum, 270° oder mehr, die App sagt, wie viel sie gesehen hat.' },
      { en: 'Height: Tools → Height, sight the top and the base. It is an estimate and the record says so.',
        de: 'Höhe: Tools → Höhe, Wipfel und Fuß anvisieren. Das ist eine Schätzung, und der Datensatz sagt das auch.' },
      { en: 'A cavity ticked without t and R gets you a warning, not a level. Unmeasured is not the same as harmless.',
        de: 'Eine angekreuzte Höhlung ohne t und R bringt eine Warnung, keine Stufe. Ungemessen heißt nicht harmlos.' }
    ]
  },
  {
    id: 'condition',
    title: { en: 'Vitality and damage', de: 'Vitalität und Schädigung' },
    what: {
      en: 'Vitality after Roloff is read in the branching of the outer crown, not in the colour ' +
          'of the leaves: 0 exploration, the shoots are long and the crown is still conquering ' +
          'space; 1 degeneration, growth is shortening; 2 stagnation, the crown is rebuilding ' +
          'itself out of what it has; 3 resignation, the regenerative capacity is spent. ' +
          'Dieback is estimated as a percentage of the crown. Vitality and defect are two ' +
          'different things: a vital tree with a hollow butt is dangerous, and a tree of poor ' +
          'vitality standing over a meadow is not.',
      de: 'Die Vitalität nach Roloff liest man an der Verzweigung der äußeren Krone, nicht an der ' +
          'Blattfarbe: 0 Exploration, die Triebe sind lang, die Krone erobert noch Raum; ' +
          '1 Degeneration, der Zuwachs wird kürzer; 2 Stagnation, die Krone baut sich aus dem ' +
          'Vorhandenen um; 3 Resignation, das Regenerationsvermögen ist erschöpft. Der Rückgang ' +
          'wird als Anteil der Krone geschätzt. Vitalität und Defekt sind zweierlei: ein vitaler ' +
          'Baum mit hohlem Stammfuß ist gefährlich, ein schwachvitaler über einer Wiese nicht.'
    },
    app: [
      { en: 'Quick → Vitality (Roloff 0–3), Crown dieback %, Damage class. These four fields carry most trees.',
        de: 'Quick → Vitalität (Roloff 0–3), Kronenrückgang %, Schadstufe. Diese vier Felder tragen die meisten Bäume.' },
      { en: 'The level bar at the top of the tree updates as you tick, and it names every reason it used.',
        de: 'Die Stufenleiste oben am Baum rechnet beim Ankreuzen mit und benennt jeden Grund, den sie benutzt hat.' }
    ]
  },
  {
    id: 'target',
    title: { en: 'What stands under it', de: 'Was darunter steht' },
    what: {
      en: 'Traffic safety is a tree and a target together. The same hollow lime is one thing ' +
          'over a car park used all day and another at the back of a field. Record what is ' +
          'within falling distance and how much it is used: it is half the decision, and the ' +
          'half a reader cannot reconstruct afterwards from a photograph of the tree.',
      de: 'Verkehrssicherheit ist Baum und Ziel zusammen. Dieselbe hohle Linde ist über einem ' +
          'ganztägig genutzten Parkplatz etwas anderes als am hinteren Feldrand. Halte fest, was ' +
          'in Fallweite steht und wie stark es genutzt wird: Das ist die Hälfte der Entscheidung ' +
          'und die Hälfte, die später niemand mehr aus einem Baumfoto rekonstruieren kann.'
    },
    app: [
      { en: 'VTA → Target: what it is, how far away, how heavily used.',
        de: 'VTA → Target: was es ist, wie weit entfernt, wie stark genutzt.' }
    ]
  },
  {
    id: 'verdict',
    title: { en: 'The verdict, the measure, the urgency', de: 'Beurteilung, Maßnahme, Dringlichkeit' },
    what: {
      en: 'Three separate answers, and they are separate on purpose. Is the tree safe as it ' +
          'stands? What has to be done? By when? A tree can be unsafe today and made safe this ' +
          'afternoon by taking one hanger out; that is not the same as a tree that has to come ' +
          'down. Write the measure so somebody who was not there can carry it out, and the ' +
          'urgency so somebody who is planning the week can schedule it.',
      de: 'Drei getrennte Antworten, und sie sind bewusst getrennt. Ist der Baum so, wie er ' +
          'steht, sicher? Was ist zu tun? Bis wann? Ein Baum kann heute unsicher sein und ' +
          'nachmittags durch das Entfernen eines Hängers sicher – das ist etwas anderes als ein ' +
          'Baum, der fallen muss. Formuliere die Maßnahme so, dass sie jemand ausführen kann, ' +
          'der nicht dabei war, und die Dringlichkeit so, dass jemand die Woche danach planen kann.' },
    app: [
      { en: 'Quick → Traffic safety, Actions, Urgency, Remarks.',
        de: 'Quick → Verkehrssicherheit, Maßnahmen, Dringlichkeit, Bemerkungen.' },
      { en: 'Immediate danger is not an entry in a list. Deal with it on the spot, then write it down.',
        de: 'Gefahr im Verzug ist kein Listeneintrag. Erst handeln, dann eintragen.' },
      { en: 'Save. The record is stamped with your name and the time, and the change is in the audit trail for good.',
        de: 'Speichern. Der Eintrag bekommt Name und Zeit, und die Änderung steht dauerhaft im Prüfprotokoll.' }
    ]
  },
  {
    id: 'interval',
    title: { en: 'When the tree is next seen', de: 'Wann der Baum wieder gesehen wird' },
    what: {
      en: 'The interval is part of the inspection, not an administrative afterthought. It ' +
          'follows the tree: its development phase, its condition, the site and how much is ' +
          'going on under it. A young, healthy tree in a quiet place can wait longer than a ' +
          'year; an old tree with a defect over a footpath cannot, and is often seen twice, ' +
          'once in leaf and once bare. A shortened interval is itself a measure, and writing ' +
          'the next date down is what makes it one.',
      de: 'Das Intervall gehört zur Kontrolle, es ist kein Verwaltungsanhängsel. Es richtet sich ' +
          'nach dem Baum: Entwicklungsphase, Zustand, Standort und wie viel darunter los ist. ' +
          'Ein junger, gesunder Baum an ruhiger Stelle kann länger als ein Jahr warten; ein alter ' +
          'Baum mit Defekt über einem Gehweg nicht – der wird oft zweimal gesehen, einmal belaubt ' +
          'und einmal unbelaubt. Ein verkürztes Intervall ist selbst eine Maßnahme, und erst das ' +
          'eingetragene Datum macht es dazu.'
    },
    app: [
      { en: 'VTA → Interval (months) and Next inspection. The FLL form starts at twelve months and you change it where the tree asks for it.',
        de: 'VTA → Intervall (Monate) und nächste Kontrolle. Das FLL-Formular beginnt bei zwölf Monaten, und du änderst es dort, wo der Baum es verlangt.' },
      { en: 'Trees → To do lists everything that is due or overdue, so the next round starts where this one left off.',
        de: 'Baumliste → To do listet, was fällig oder überfällig ist, damit die nächste Runde dort anfängt, wo diese aufgehört hat.' }
    ]
  },
  {
    id: 'after',
    title: { en: 'Afterwards', de: 'Danach' },
    what: {
      en: 'What was not written down did not happen, and what cannot be handed over is not a ' +
          'record. Close the round, produce the report, and get the data off the phone.',
      de: 'Was nicht dokumentiert ist, ist nicht passiert, und was sich nicht übergeben lässt, ' +
          'ist keine Dokumentation. Runde schließen, Protokoll erzeugen, Daten vom Telefon holen.'
    },
    app: [
      { en: 'Data → Inspection report: the German FLL protocol, with the photographs if you want them. It prints to paper or to PDF.',
        de: 'Daten → Inspection report: das Baumkontrollprotokoll nach FLL, auf Wunsch mit Fotos. Druckt auf Papier oder als PDF.' },
      { en: 'Data → GeoJSON or CSV for the register, and the map page for anybody who only wants to look.',
        de: 'Daten → GeoJSON oder CSV fürs Kataster, und die Kartenseite für alle, die nur schauen wollen.' },
      { en: 'Data → Close the round. It counts what was done against what there was.',
        de: 'Daten → Runde schließen. Sie zählt das Erledigte gegen den Bestand.' }
    ],
    go: { sc: 'data', label: { en: 'Open Data', de: 'Daten öffnen' } }
  },
  {
    id: 'limits',
    title: { en: 'What this guide is not', de: 'Was diese Anleitung nicht ist' },
    what: {
      en: 'This is the procedure in plain words, so the form makes sense. It is not the FLL ' +
          'guidelines, it does not quote them, and it does not replace buying them or being ' +
          'trained and examined to use them. Qualification, liability and the decision in front ' +
          'of the tree stay with the person holding the phone.',
      de: 'Das ist das Verfahren in einfachen Worten, damit das Formular Sinn ergibt. Es ist ' +
          'nicht die FLL-Richtlinie, zitiert sie nicht und ersetzt weder ihren Erwerb noch eine ' +
          'Ausbildung mit Prüfung. Qualifikation, Haftung und die Entscheidung am Baum bleiben ' +
          'bei der Person, die das Telefon hält.'
    },
    app: [
      { en: 'FLL, Richtlinie für Baumkontrollen zur Überprüfung der Verkehrssicherheit von Bäumen (Baumkontrollrichtlinie), 3rd edition 2020 – fll.de',
        de: 'FLL, Richtlinie für Baumkontrollen zur Überprüfung der Verkehrssicherheit von Bäumen (Baumkontrollrichtlinie), 3. Ausgabe 2020 – fll.de' },
      { en: 'Mattheck & Breloer, The Body Language of Trees, on which the visual method rests.',
        de: 'Mattheck & Breloer, Handbuch der Schadenskunde von Bäumen, worauf die visuelle Methode fußt.' },
      { en: 'Roloff, Vitality stages from the branching of the crown.',
        de: 'Roloff, Vitalitätsstufen anhand der Kronenverzweigung.' }
    ]
  }
];

/* ---- on screen --------------------------------------------------------- */
function renderGuide() {
  const box = $('guideBox'); if (!box) return;
  const L = guideLang(), done = guideDone();
  box.innerHTML = '';

  const head = document.createElement('p'); head.className = 'lead';
  head.textContent = L === 'de'
    ? 'Die Regelkontrolle nach FLL, Schritt für Schritt – und welcher Knopf dieser App welchen Schritt bedient.'
    : 'A Regelkontrolle after the FLL guidelines, step by step – and which button of this app answers which step.';
  box.appendChild(head);

  /* No language switch of its own - there is one in this app and it is the
     app's. This only says which it is and opens it. */
  const pick = guidePick();
  const sw = document.createElement('div'); sw.className = 'btnrow';
  const b = document.createElement('button'); b.id = 'guideLangBtn';
  b.textContent = (L === 'de' ? 'Sprache: ' : 'Language: ') + (LANG_NAMES[pick] || pick);
  b.onclick = () => { if (typeof openLang === 'function') openLang(); };
  sw.appendChild(b);
  box.appendChild(sw);

  if (GUIDE_WRITTEN.indexOf(pick) < 0) {
    const w = document.createElement('div'); w.className = 'small wa'; w.id = 'guideUntranslated';
    w.textContent = GUIDE_UNWRITTEN[pick] || 'Not translated yet – shown in English.';
    box.appendChild(w);
  }

  const n = GUIDE.filter(s => done[s.id]).length;
  const prog = document.createElement('div'); prog.className = 'small'; prog.id = 'guideProg';
  prog.textContent = (L === 'de' ? 'Durchgearbeitet: ' : 'Worked through: ') + n + ' / ' + GUIDE.length;
  box.appendChild(prog);

  GUIDE.forEach((s, i) => {
    const d = document.createElement('details'); d.className = 'guide';
    if (done[s.id]) d.classList.add('did');
    const sm = document.createElement('summary');
    sm.innerHTML = '<b>' + (i + 1) + '.</b> ' + esc(gt(s.title)) +
                   (done[s.id] ? ' <span class="small">✓</span>' : '');
    d.appendChild(sm);

    gt(s.what).split('\n').forEach(par => {
      const p2 = document.createElement('p'); p2.textContent = par; d.appendChild(p2);
    });

    const h = document.createElement('h3');
    h.textContent = L === 'de' ? 'In der App' : 'In the app';
    d.appendChild(h);
    const ul = document.createElement('ul'); ul.className = 'guideapp';
    s.app.forEach(a => { const li = document.createElement('li'); li.textContent = gt(a); ul.appendChild(li); });
    d.appendChild(ul);

    const row = document.createElement('div'); row.className = 'btnrow';
    if (s.go) {
      const g = document.createElement('button'); g.className = 'sm';
      g.textContent = gt(s.go.label);
      g.onclick = () => showScreen(s.go.sc);
      row.appendChild(g);
    }
    const mk = document.createElement('button'); mk.className = 'sm' + (done[s.id] ? '' : ' p');
    mk.textContent = done[s.id] ? (L === 'de' ? 'Wieder offen' : 'Mark as open')
                                : (L === 'de' ? 'Verstanden' : 'Understood');
    mk.onclick = () => { guideMark(s.id, !guideDone()[s.id]); renderGuide(); };
    row.appendChild(mk);
    d.appendChild(row);
    box.appendChild(d);
  });
}
