/* ============================================================================
   LANGUAGE - what the form says, not what it stores

   Every value in the register is stored in one vocabulary: 'moderate',
   'restricted', 'remove', 'III'. That vocabulary never changes, so a file
   from Tallinn opens in Berlin and a CSV means the same thing in every
   spreadsheet. What changes is what the inspector sees and hears: the label
   on the field, the words in the drop-down, the heading on the paper.

   So a person can say "damage class moderate" in English and the Estonian
   form shows "keskmine" - not by translating, but because both are names for
   the same stored value. Free text is the one thing this cannot do; a remark
   is kept in the language it was spoken in.

   The language follows the standard in use unless it is pinned: the Tallinn
   profile speaks Estonian, the FLL profile German, and English is always one
   tap away for everyone.
   ========================================================================= */

const LANG_NAMES = { en: 'English', de: 'Deutsch', nl: 'Nederlands', et: 'Eesti', fi: 'Suomi' };
const NORM_LANG = { fll: 'de', onorm: 'de', vssg: 'de', bvc: 'nl', ee: 'et', fi: 'fi', eac: 'en', quant: 'en', generic: 'en' };

function uiLang() {
  const p = (typeof prefs === 'function') ? prefs() : {};
  if (p.lang && LANG_NAMES[p.lang]) return p.lang;
  return uiLangAuto();
}
/* Left alone: the phone's own language, because its owner chose it. Only a
   phone set to a language this app does not speak falls through to the
   register's standard - which is how it used to work for everybody, and how
   a German inspector ended up with an Estonian form and a microphone that
   listened in Estonian while he spoke German. */
function uiLangAuto() {
  const own = String((typeof navigator !== 'undefined' && navigator.language) || '').slice(0, 2).toLowerCase();
  if (LANG_NAMES[own]) return own;
  return uiLangOfNorm();
}
/* What the standard alone would choose, with nobody overriding it. */
function uiLangOfNorm() {
  const n = (typeof curNorm === 'function') ? curNorm() : null;
  return (n && NORM_LANG[n.id]) || 'en';
}
/* Three settings became one. Somebody who had pinned a voice language meant
   that as their language, so it is carried over rather than thrown away. */
function langMigrate() {
  if (typeof prefs !== 'function') return;
  const p = prefs();
  if (p.guideLang == null && p.voiceLang == null) return;
  if (!p.lang) {
    const v = String(p.voiceLang || '').slice(0, 2).toLowerCase();
    const g = String(p.guideLang || '').slice(0, 2).toLowerCase();
    const pick = LANG_NAMES[v] ? v : (LANG_NAMES[g] ? g : null);
    if (pick) p.lang = pick;
  }
  delete p.guideLang; delete p.voiceLang;
  lsSet(K_PREF, JSON.stringify(p));
}

/* ---- field labels ---------------------------------------------------- */
const FIELD_L = {
  tree_id: { de: 'Baum-ID', nl: 'Boom-ID', et: 'Puu ID', fi: "Puun tunnus" },
  tag_no: { de: 'Nummer am Stamm', nl: 'Nummer op de stam', et: 'Number tüvel', fi: "Numero rungossa" },
  area: { de: 'Bezirk / Abteilung', nl: 'Wijk / vak', et: 'Linnaosa / ala', fi: "Kaupunginosa / alue" },
  species: { de: 'Art (wissenschaftlich)', nl: 'Soort (wetenschappelijk)', et: 'Liik (ladina keeles)', fi: "Laji (tieteellinen)" },
  name_en: { de: 'Trivialname', nl: 'Nederlandse naam', et: 'Eestikeelne nimi', fi: "Suomenkielinen nimi" },
  planted: { de: 'Pflanzjahr', nl: 'Plantjaar', et: 'Istutusaasta', fi: "Istutusvuosi" },
  girth_cm: { de: 'Stammumfang bei 1,0 m (cm)', nl: 'Stamomtrek op 1,0 m (cm)', et: 'Tüve ümbermõõt 1,3 m (cm)', fi: "Rungon ympärysmitta 1,3 m (cm)" },
  dbh_cm: { de: 'BHD bei 1,3 m (cm)', nl: 'Stamdiameter op 1,3 m (cm)', et: 'Rinnasdiameeter 1,3 m (cm)', fi: "Rungon läpimitta 1,3 m (cm)" },
  height_m: { de: 'Höhe (m)', nl: 'Hoogte (m)', et: 'Kõrgus (m)', fi: "Korkeus (m)" },
  crown_d_m: { de: 'Kronendurchmesser (m)', nl: 'Kroondiameter (m)', et: 'Võra läbimõõt (m)', fi: "Latvuksen leveys (m)" },
  crown_base_m: { de: 'Kronenansatz (m)', nl: 'Kroonaanzet (m)', et: 'Võra algus (m)', fi: "Latvuksen alaraja (m)" },
  tree_pit_m2: { de: 'Baumscheibe (m²)', nl: 'Boomspiegel (m²)', et: 'Juurestiku ala (m²)', fi: "Kasvualusta (m²)" },
  location: { de: 'Standort', nl: 'Locatie', et: 'Asukoht', fi: "Sijainti" },
  position_accuracy_m: { de: 'Lagegenauigkeit (m)', nl: 'Positienauwkeurigheid (m)', et: 'Asukoha täpsus (m)', fi: "Sijainnin tarkkuus (m)" },
  inspection_type: { de: 'Kontrollart', nl: 'Soort controle', et: 'Kontrolli liik', fi: "Tarkastuksen laji" },
  last_inspection: { de: 'Kontrolldatum', nl: 'Controledatum', et: 'Kontrolli kuupäev', fi: "Tarkastuspäivä" },
  inspector: { de: 'Kontrolleur/in', nl: 'Controleur', et: 'Inventeerija', fi: "Tarkastaja" },
  assessment_level: { de: 'Bewertungsstufe', nl: 'Beoordelingsniveau', et: 'Hindamise tase', fi: "Arvioinnin taso" },
  vitality_roloff: { de: 'Vitalität (Roloff 0–3)', nl: 'Vitaliteit (Roloff 0–3)', et: 'Elujõulisus (Roloff 0–3)', fi: "Elinvoima (Roloff 0–3)" },
  vitality_5: { de: 'Vitalität', nl: 'Conditie', et: 'Seisund', fi: "Elinvoima" },
  development_phase: { de: 'Entwicklungsphase', nl: 'Ontwikkelingsfase', et: 'Arengufaas', fi: "Kehitysvaihe" },
  crown_dieback_pct: { de: 'Kronenverlichtung (%)', nl: 'Kroonsterfte (%)', et: 'Võra hõrenemine (%)', fi: "Latvuksen harsuuntuminen (%)" },
  damage_class: { de: 'Schadklasse', nl: 'Schadeklasse', et: 'Kahjustuse aste', fi: "Vaurioluokka" },
  cavity: { de: 'Höhlung / Faulstelle', nl: 'Holte / rotplek', et: 'Õõnsus / mädanik', fi: "Onkalo / laho" },
  wall_t_cm: { de: 'Restwand t (cm)', nl: 'Restwand t (cm)', et: 'Terve puidu paksus t (cm)', fi: "Terveen puun paksuus t (cm)" },
  radius_r_cm: { de: 'Stammradius R (cm)', nl: 'Stamstraal R (cm)', et: 'Tüve raadius R (cm)', fi: "Rungon säde R (cm)" },
  stability: { de: 'Standsicherheit', nl: 'Stabiliteit', et: 'Püsivus (juurdumine)', fi: "Pystyssäpysyvyys" },
  breakage_resistance: { de: 'Bruchsicherheit', nl: 'Breukvastheid', et: 'Murdumiskindlus', fi: "Murtumiskestävyys" },
  target_type: { de: 'Ziel / Schutzgut', nl: 'Doel', et: 'Ohualune objekt', fi: "Kohde" },
  target_distance_m: { de: 'Abstand zum Ziel (m)', nl: 'Afstand tot doel (m)', et: 'Kaugus objektist (m)', fi: "Etäisyys kohteeseen (m)" },
  target_occupancy: { de: 'Nutzung des Ziels', nl: 'Gebruik van het doel', et: 'Objekti kasutus', fi: "Kohteen käyttö" },
  traffic_safety: { de: 'Verkehrssicherheit', nl: 'Verkeersveiligheid', et: 'Ohutus', fi: "Turvallisuus" },
  bvc_result: { de: 'Ergebnis der Sicherheitskontrolle', nl: 'Uitkomst boomveiligheidscontrole', et: 'Ohutuskontrolli tulemus', fi: "Turvallisuustarkastuksen tulos" },
  duty_of_care: { de: 'Sorgfaltspflicht', nl: 'Zorgplicht', et: 'Hoolsuskohustus', fi: "Huolellisuusvelvoite" },
  prob_failure: { de: 'Versagenswahrscheinlichkeit', nl: 'Kans op falen', et: 'Murdumise tõenäosus', fi: "Murtumisen todennäköisyys" },
  prob_impact: { de: 'Treffwahrscheinlichkeit', nl: 'Kans op treffen', et: 'Tabamise tõenäosus', fi: "Osumisen todennäköisyys" },
  consequence: { de: 'Schadensfolge', nl: 'Gevolg', et: 'Tagajärg', fi: "Seuraus" },
  part_size: { de: 'Größe des versagenden Teils', nl: 'Grootte van het falende deel', et: 'Murduva osa suurus', fi: "Murtuvan osan koko" },
  value_class: { de: 'Wertklasse', nl: 'Waardeklasse', et: 'Väärtusklass', fi: "Arvoluokka" },
  recommendation: { de: 'Empfehlung', nl: 'Aanbeveling', et: 'Soovitus', fi: "Suositus" },
  urgency: { de: 'Dringlichkeit', nl: 'Urgentie', et: 'Kiireloomulisus', fi: "Kiireellisyys" },
  actions: { de: 'Maßnahmen', nl: 'Maatregelen', et: 'Tegevused', fi: "Toimenpiteet" },
  interval_months: { de: 'Intervall (Monate)', nl: 'Interval (maanden)', et: 'Intervall (kuud)', fi: "Tarkastusväli (kk)" },
  next_inspection: { de: 'Nächste Kontrolle', nl: 'Volgende controle', et: 'Järgmine kontroll', fi: "Seuraava tarkastus" },
  condition_class: { de: 'Zustandsklasse', nl: 'Conditieklasse', et: 'Seisundiklass', fi: 'Kuntoluokka' },
  remarks: { de: 'Bemerkungen', nl: 'Opmerkingen', et: 'Märkused', fi: "Huomautukset" }
};

/* ---- option labels: stored value -> what it says --------------------- */
const OPT_L = {
  vitality_5: { good: { de: 'gut', nl: 'goed', et: 'hea' , fi: "hyvä" }, moderate: { de: 'mäßig', nl: 'matig', et: 'rahuldav' },
    poor: { de: 'schlecht', nl: 'slecht', et: 'halb' }, dying: { de: 'absterbend', nl: 'afstervend', et: 'hääbuv' },
    dead: { de: 'tot', nl: 'dood', et: 'kuivanud' } },
  development_phase: { young: { de: 'Jugendphase', nl: 'jong', et: 'noor' }, maturing: { de: 'Reifungsphase', nl: 'halfwas', et: 'keskealine' },
    mature: { de: 'Reifephase', nl: 'volwassen', et: 'täiskasvanud' }, ageing: { de: 'Alterungsphase', nl: 'verouderend', et: 'vananev' },
    senescent: { de: 'Altersphase', nl: 'aftakelend', et: 'vana' } },
  damage_class: { none: { de: 'keine', nl: 'geen', et: 'puudub' , fi: "ei vaurioita" }, slight: { de: 'gering', nl: 'licht', et: 'kerge' },
    moderate: { de: 'mäßig', nl: 'matig', et: 'keskmine' }, severe: { de: 'stark', nl: 'ernstig', et: 'tugev' } },
  cavity: { yes: { de: 'ja', nl: 'ja', et: 'jah' , fi: "kyllä" }, no: { de: 'nein', nl: 'nee', et: 'ei' } },
  stability: { adequate: { de: 'gegeben', nl: 'voldoende', et: 'piisav' , fi: "riittävä" }, restricted: { de: 'eingeschränkt', nl: 'beperkt', et: 'piiratud' },
    'not given': { de: 'nicht gegeben', nl: 'onvoldoende', et: 'puudub' } },
  breakage_resistance: { adequate: { de: 'gegeben', nl: 'voldoende', et: 'piisav' , fi: "riittävä" }, restricted: { de: 'eingeschränkt', nl: 'beperkt', et: 'piiratud' },
    'not given': { de: 'nicht gegeben', nl: 'onvoldoende', et: 'puudub' } },
  traffic_safety: { adequate: { de: 'gegeben', nl: 'voldoende', et: 'tagatud' , fi: "riittävä" }, restricted: { de: 'eingeschränkt', nl: 'beperkt', et: 'piiratud' },
    'not given': { de: 'nicht gegeben', nl: 'onvoldoende', et: 'ei ole tagatud' } },
  target_type: { none: { de: 'keines', nl: 'geen', et: 'puudub' , fi: "ei kohdetta" }, path: { de: 'Weg', nl: 'pad', et: 'kõnnitee' }, road: { de: 'Straße', nl: 'weg', et: 'tee' },
    parking: { de: 'Parkplatz', nl: 'parkeerplaats', et: 'parkla' }, building: { de: 'Gebäude', nl: 'gebouw', et: 'hoone' },
    playground: { de: 'Spielplatz', nl: 'speelplaats', et: 'mänguväljak' }, other: { de: 'anderes', nl: 'anders', et: 'muu' } },
  target_occupancy: { 'rarely used': { de: 'selten genutzt', nl: 'zelden gebruikt', et: 'harva kasutatav' , fi: "harvoin käytetty" }, occasional: { de: 'gelegentlich', nl: 'af en toe', et: 'aeg-ajalt' },
    frequent: { de: 'häufig', nl: 'vaak', et: 'sage' }, constant: { de: 'ständig', nl: 'voortdurend', et: 'pidev' } },
  bvc_result: { 'no findings': { de: 'ohne Befund', nl: 'geen bevindingen', et: 'tähelepanekuteta' }, 'attention tree': { de: 'Beobachtungsbaum', nl: 'attentieboom', et: 'jälgitav puu' },
    'risk tree': { de: 'Risikobaum', nl: 'risicoboom', et: 'ohtlik puu' }, 'further investigation needed': { de: 'weitere Untersuchung', nl: 'nader onderzoek', et: 'vajab lisauuringut' } },
  duty_of_care: { standard: { de: 'normal', nl: 'normaal', et: 'tavaline' }, raised: { de: 'erhöht', nl: 'verhoogd', et: 'kõrgendatud' } },
  prob_failure: { improbable: { de: 'unwahrscheinlich', nl: 'onwaarschijnlijk', et: 'ebatõenäoline' , fi: "epätodennäköinen" }, possible: { de: 'möglich', nl: 'mogelijk', et: 'võimalik' },
    probable: { de: 'wahrscheinlich', nl: 'waarschijnlijk', et: 'tõenäoline' }, imminent: { de: 'unmittelbar', nl: 'op handen', et: 'vahetu' } },
  prob_impact: { 'very low': { de: 'sehr gering', nl: 'zeer laag', et: 'väga madal' }, low: { de: 'gering', nl: 'laag', et: 'madal' },
    medium: { de: 'mittel', nl: 'middel', et: 'keskmine' }, high: { de: 'hoch', nl: 'hoog', et: 'kõrge' } },
  consequence: { negligible: { de: 'vernachlässigbar', nl: 'verwaarloosbaar', et: 'tühine' , fi: "merkityksetön" }, minor: { de: 'gering', nl: 'gering', et: 'väike' },
    significant: { de: 'erheblich', nl: 'aanzienlijk', et: 'oluline' }, severe: { de: 'schwer', nl: 'ernstig', et: 'raske' } },
  value_class: { I: { de: 'I – besonders wertvoll', nl: 'I – zeer waardevol', et: 'I – eriti väärtuslik' , fi: "I – erittäin arvokas" },
    II: { de: 'II – wertvoll', nl: 'II – waardevol', et: 'II – väärtuslik' },
    III: { de: 'III – bedeutend', nl: 'III – van belang', et: 'III – oluline' },
    IV: { de: 'IV – wenig wertvoll', nl: 'IV – weinig waardevol', et: 'IV – väheväärtuslik' },
    V: { de: 'V – zu entfernen', nl: 'V – te verwijderen', et: 'V – likvideeritav' } },
  condition_class: { 1: { de: '1 – gut', nl: '1 – goed', et: '1 – hea', fi: '1 – hyvä' }, 2: { de: '2 – befriedigend', nl: '2 – redelijk', et: '2 – rahuldav', fi: '2 – tyydyttävä' },
    3: { de: '3 – ausreichend', nl: '3 – matig', et: '3 – kesine', fi: '3 – välttävä' }, 4: { de: '4 – schlecht', nl: '4 – slecht', et: '4 – halb', fi: '4 – huono' } },
  recommendation: { keep: { de: 'erhalten', nl: 'behouden', et: 'säilitada' , fi: "säilytä" }, maintain: { de: 'pflegen', nl: 'onderhouden', et: 'hooldada' },
    remove: { de: 'entfernen', nl: 'verwijderen', et: 'eemaldada' }, replace: { de: 'ersetzen', nl: 'vervangen', et: 'asendada' } },
  urgency: { none: { de: 'keine', nl: 'geen', et: 'puudub' , fi: "ei" }, 'next growing season': { de: 'nächste Vegetationsperiode', nl: 'volgend groeiseizoen', et: 'järgmine vegetatsiooniperiood' },
    '3 months': { de: '3 Monate', nl: '3 maanden', et: '3 kuud' }, '1 month': { de: '1 Monat', nl: '1 maand', et: '1 kuu' },
    immediate: { de: 'sofort', nl: 'onmiddellijk', et: 'kohe' } },
  inspection_type: { 'Routine inspection': { de: 'Regelkontrolle', nl: 'Reguliere controle', et: 'Korraline kontroll' , fi: "Määräaikaistarkastus" },
    'Visual inspection': { de: 'Sichtkontrolle', nl: 'Visuele controle', et: 'Visuaalne kontroll' },
    'Detailed assessment': { de: 'Eingehende Untersuchung', nl: 'Nader onderzoek', et: 'Süvauuring' },
    'Post-storm inspection': { de: 'Kontrolle nach Sturm', nl: 'Controle na storm', et: 'Tormijärgne kontroll' } },
  assessment_level: { 'Basic (walk-by)': { de: 'Basis (im Vorbeigehen)', nl: 'Basis (in het voorbijgaan)', et: 'Põhitase (möödaminnes)' },
    'Standard (visual, from the ground)': { de: 'Standard (visuell, vom Boden)', nl: 'Standaard (visueel, vanaf de grond)', et: 'Standard (visuaalne, maapinnalt)' },
    'Advanced (instruments)': { de: 'Erweitert (Geräte)', nl: 'Uitgebreid (instrumenten)', et: 'Süvendatud (seadmed)' } }
};

/* Finnish option words, merged in one place rather than threaded through the
   table above. */
const OPT_FI = {
  vitality_5: { good: 'hyvä', moderate: 'tyydyttävä', poor: 'huono', dying: 'kuoleva', dead: 'kuollut' },
  development_phase: { young: 'nuori', maturing: 'varttuva', mature: 'täysikasvuinen', ageing: 'ikääntyvä', senescent: 'vanha' },
  damage_class: { none: 'ei vaurioita', slight: 'lievä', moderate: 'kohtalainen', severe: 'vakava' },
  cavity: { yes: 'kyllä', no: 'ei' },
  stability: { adequate: 'riittävä', restricted: 'heikentynyt', 'not given': 'puutteellinen' },
  breakage_resistance: { adequate: 'riittävä', restricted: 'heikentynyt', 'not given': 'puutteellinen' },
  traffic_safety: { adequate: 'riittävä', restricted: 'heikentynyt', 'not given': 'puutteellinen' },
  target_type: { none: 'ei kohdetta', path: 'polku', road: 'tie', parking: 'pysäköintialue', building: 'rakennus', playground: 'leikkipaikka', other: 'muu' },
  target_occupancy: { 'rarely used': 'harvoin käytetty', occasional: 'satunnainen', frequent: 'vilkas', constant: 'jatkuva' },
  bvc_result: { 'no findings': 'ei huomautettavaa', 'attention tree': 'seurattava puu', 'risk tree': 'riskipuu', 'further investigation needed': 'tarkempi tutkimus' },
  duty_of_care: { standard: 'tavallinen', raised: 'korotettu' },
  prob_failure: { improbable: 'epätodennäköinen', possible: 'mahdollinen', probable: 'todennäköinen', imminent: 'välitön' },
  prob_impact: { 'very low': 'hyvin pieni', low: 'pieni', medium: 'keskisuuri', high: 'suuri' },
  consequence: { negligible: 'merkityksetön', minor: 'vähäinen', significant: 'merkittävä', severe: 'vakava' },
  value_class: { I: 'I – erittäin arvokas', II: 'II – arvokas', III: 'III – merkittävä', IV: 'IV – vähäarvoinen', V: 'V – poistettava' },
  condition_class: { 1: '1 – hyvä', 2: '2 – tyydyttävä', 3: '3 – välttävä', 4: '4 – huono' },
  recommendation: { keep: 'säilytä', maintain: 'hoida', remove: 'poista', replace: 'korvaa' },
  urgency: { none: 'ei', 'next growing season': 'seuraava kasvukausi', '3 months': '3 kuukautta', '1 month': '1 kuukausi', immediate: 'heti' },
  inspection_type: { 'Routine inspection': 'Määräaikaistarkastus', 'Visual inspection': 'Silmämääräinen tarkastus', 'Detailed assessment': 'Tarkempi tutkimus', 'Post-storm inspection': 'Myrskyn jälkeinen tarkastus' },
  assessment_level: { 'Basic (walk-by)': 'Perustaso (ohikulkien)', 'Standard (visual, from the ground)': 'Perusarvio (silmämääräinen, maasta)', 'Advanced (instruments)': 'Tarkempi (mittalaitteet)' }
};
Object.keys(OPT_FI).forEach(k => Object.keys(OPT_FI[k]).forEach(v => {
  OPT_L[k] = OPT_L[k] || {}; OPT_L[k][v] = OPT_L[k][v] || {}; OPT_L[k][v].fi = OPT_FI[k][v];
}));

/* ---- headings and a few strings on the page and the paper ------------ */
const TXT_L = {
  'Inspection': { de: 'Kontrolle', nl: 'Controle', et: 'Kontroll', fi: "Tarkastus" },
  'Condition': { de: 'Zustand', nl: 'Conditie', et: 'Seisund', fi: "Kunto" },
  'Measurements': { de: 'Maße', nl: 'Maten', et: 'Mõõtmed', fi: "Mitat" },
  'Stem and root plate': { de: 'Stamm und Wurzelteller', nl: 'Stam en wortelkluit', et: 'Tüvi ja juurestik', fi: "Runko ja juuristo" },
  'Stem and roots': { de: 'Stamm und Wurzeln', nl: 'Stam en wortels', et: 'Tüvi ja juured', fi: "Runko ja juuret" },
  'Target': { de: 'Schutzgut', nl: 'Doel', et: 'Ohualune objekt', fi: "Kohde" },
  'Verdict': { de: 'Befund', nl: 'Oordeel', et: 'Hinnang', fi: "Arvio" },
  'Assessment': { de: 'Bewertung', nl: 'Beoordeling', et: 'Hinnang', fi: "Arviointi" },
  'Outcome': { de: 'Ergebnis', nl: 'Uitkomst', et: 'Tulemus', fi: "Tulos" },
  'Risk factors': { de: 'Risikofaktoren', nl: 'Risicofactoren', et: 'Riskitegurid', fi: "Riskitekijät" },
  'Species': { de: 'Art', nl: 'Soort', et: 'Liik', fi: "Laji" },
  'Position': { de: 'Lage', nl: 'Positie', et: 'Asukoht', fi: "Sijainti" },
  'DBH / height': { de: 'BHD / Höhe', nl: 'Stamdiameter / hoogte', et: 'Rinnasdiameeter / kõrgus', fi: "Läpimitta / korkeus" },
  'Symptoms': { de: 'Symptome', nl: 'Symptomen', et: 'Sümptomid', fi: "Oireet" },
  'Wood-decay fungi': { de: 'Holzzersetzende Pilze', nl: 'Houtrotschimmels', et: 'Puitu lagundavad seened', fi: "Lahottajasienet" },
  'Recorded': { de: 'Erfasst', nl: 'Vastgelegd', et: 'Sisestatud', fi: "Kirjattu" },
  'Reasoning': { de: 'Begründung', nl: 'Onderbouwing', et: 'Põhjendus', fi: "Perustelu" },
  'History': { de: 'Verlauf', nl: 'Historie', et: 'Ajalugu', fi: "Historia" },
  'Outstanding': { de: 'Offen', nl: 'Openstaand', et: 'Pooleli', fi: "Avoimet" },
  'trees': { de: 'Bäume', nl: 'bomen', et: 'puud', fi: "puuta" },
  'Level': { de: 'Stufe', nl: 'Niveau', et: 'Tase', fi: "Taso" }
};

function fieldLabel(k, base) {
  const l = uiLang();
  const t = FIELD_L[k];
  return (l !== 'en' && t && t[l]) || base || k;
}
function optLabel(k, v) {
  if (v == null || v === '') return v;
  const l = uiLang();
  const t = OPT_L[k] && OPT_L[k][v];
  return (l !== 'en' && t && t[l]) || v;
}
function tr(s) {
  const l = uiLang();
  const t = TXT_L[s];
  return (l !== 'en' && t && t[l]) || s;
}

/* ---- where are we, and which standard applies there ------------------
   Rough boxes, enough to tell Estonia from Germany. The point is only to
   propose; the inspector confirms. */
const COUNTRY_BOX = [
  ['EE', 57.5, 59.75, 21.7, 28.3],
  ['FI', 59.7, 70.1, 19.1, 31.6],
  ['NL', 50.7, 53.6, 3.3, 7.25],
  ['CH', 45.8, 47.85, 5.9, 10.55],
  ['AT', 46.35, 49.05, 9.5, 17.2],
  ['DE', 47.25, 55.1, 5.85, 15.05],
  ['GB', 49.9, 60.9, -8.2, 1.8],
  ['US', 24.5, 49.4, -125, -66.9]
];
function countryOf(lat, lon) {
  if (!(isFinite(lat) && isFinite(lon))) return null;
  for (const b of COUNTRY_BOX) if (lat >= b[1] && lat <= b[2] && lon >= b[3] && lon <= b[4]) return b[0];
  return null;
}
const COUNTRY_NORM = { EE: 'ee', FI: 'fi', DE: 'fll', AT: 'onorm', CH: 'vssg', NL: 'bvc', GB: 'quant', US: 'quant' };
function normForCountry(cc) { return COUNTRY_NORM[cc] || null; }

/* ---------------------------------------------------------------------------
   WHERE A NUMBER WAS GIVEN OUT

   Tree numbers run 00001, 00002 - fine on one phone, useless the moment two
   surveys meet in one file. A short code in front says at a glance where the
   number comes from: DE-B-00042 was given out in Berlin, EE-TLN-00007 in
   Tallinn. The country comes from the boxes above, the town from the list
   here; a town nobody listed leaves the country code alone (DE-00042), and
   outside every box the number stays bare. The codes are the short ones
   people already use - German number plates, airport-style letters - because
   they are meant to be read, not parsed.
   ------------------------------------------------------------------------ */
const PLACE_BOX = [
  // code, town, lat0, lat1, lon0, lon1        (Tharandt before Dresden: it sits in its corner)
  ['TH',  'Tharandt',  50.93, 51.02, 13.51, 13.65],
  ['B',   'Berlin',    52.34, 52.68, 13.09, 13.77],
  ['HH',  'Hamburg',   53.39, 53.74,  9.73, 10.32],
  ['M',   'Munich',    48.06, 48.25, 11.36, 11.72],
  ['K',   'Cologne',   50.83, 51.09,  6.77,  7.16],
  ['F',   'Frankfurt', 50.02, 50.23,  8.47,  8.80],
  ['S',   'Stuttgart', 48.69, 48.87,  9.04,  9.32],
  ['DD',  'Dresden',   50.97, 51.18, 13.58, 13.97],
  ['L',   'Leipzig',   51.24, 51.42, 12.24, 12.54],
  ['H',   'Hanover',   52.30, 52.45,  9.60,  9.92],
  ['W',   'Vienna',    48.10, 48.33, 16.18, 16.58],
  ['GZ',  'Graz',      47.00, 47.13, 15.35, 15.53],
  ['ZH',  'Zurich',    47.32, 47.44,  8.44,  8.63],
  ['BS',  'Basel',     47.51, 47.60,  7.55,  7.66],
  ['AMS', 'Amsterdam', 52.28, 52.43,  4.72,  5.07],
  ['RTM', 'Rotterdam', 51.85, 51.99,  4.32,  4.60],
  ['LDN', 'London',    51.28, 51.70, -0.52,  0.34],
  ['TLN', 'Tallinn',   59.33, 59.53, 24.55, 24.95],
  ['TRT', 'Tartu',     58.33, 58.42, 26.63, 26.79],
  ['TRE', 'Tampere',   61.40, 61.56, 23.60, 23.95],
  ['HKI', 'Helsinki',  60.11, 60.30, 24.78, 25.26],
  ['NYC', 'New York',  40.48, 40.93, -74.27, -73.68]
];
/* { cc, code, town, label } - code is null when only the country is known. */
function placeOf(lat, lon) {
  const cc = countryOf(lat, lon);
  if (!cc) return null;
  for (const b of PLACE_BOX) if (lat >= b[2] && lat <= b[3] && lon >= b[4] && lon <= b[5])
    return { cc: cc, code: b[0], town: b[1], label: cc + '-' + b[0] + ' · ' + b[1] };
  return { cc: cc, code: null, town: null, label: cc };
}
/* The prefix itself, trailing dash and all: 'DE-B-', 'FI-', or '' if nowhere. */
function placePrefix(lat, lon) {
  const p = placeOf(lat, lon);
  if (!p) return '';
  return p.cc + '-' + (p.code ? p.code + '-' : '');
}

/* ============================================================================
   ONE SWITCH FOR THE WHOLE APP

   There used to be three: one for the form, one for the guide, one for the
   microphone. Nobody wants to set a language three times, and nobody finds
   the third one. So there is one, prefs().lang, and everything reads it:
   the labels, the drop-downs, the method text, what the phone says and what
   it listens for.

   Left alone it follows the phone. That is the one default that is right more
   often than any other: the person holding it set that language themselves.
   The register's own standard is the second guess, for a phone set to a
   language this app does not speak. The register is not touched either way -
   an Estonian register stays Estonian, it is only the labels that move.

   Input is never restricted to one language. The parser carries the words of
   all five at once, so "damage class moderate" is understood by an Estonian
   form and stored as the same value it would store for "kahjustuse aste
   keskmine". That is the "your language plus English" part, and it needs no
   setting at all.

   What is below is the chrome: tabs, headings, buttons. German is checked.
   Dutch, Estonian and Finnish are translated but have not been read by a
   native speaker, and the app says so where the language is chosen. Long
   explanatory prose is not in here; it stays English until somebody who
   speaks the language writes it.
   ========================================================================= */

/* Languages whose chrome and method text a native speaker has gone over. */
const LANG_CHECKED = ['en', 'de'];

const UI = {
  /* the tab bar and the screens */
  'Trees': { de: 'Bäume', nl: 'Bomen', et: 'Puud', fi: 'Puut' },
  'Map': { de: 'Karte', nl: 'Kaart', et: 'Kaart', fi: 'Kartta' },
  'Office': { de: 'B\u00fcro', nl: 'Kantoor', et: 'Kontor', fi: 'Toimisto' },
  'Method': { de: 'Methode', nl: 'Methode', et: 'Meetod', fi: 'Menetelmä' },
  'AR survey': { de: 'AR-Aufnahme', nl: 'AR-opname', et: 'AR-vaatlus', fi: 'AR-kartoitus' },
  'The method': { de: 'Die Methode', nl: 'De methode', et: 'Meetod', fi: 'Menetelmä' },
  'Who is holding the phone?': { de: 'Wer hält das Handy?', nl: 'Wie houdt de telefoon vast?',
                                 et: 'Kes hoiab telefoni?', fi: 'Kuka pitää puhelinta?' },
  'Does this read your register correctly?': { de: 'Wird Ihr Register richtig gelesen?',
      nl: 'Wordt uw register goed gelezen?', et: 'Kas teie registrit loetakse õigesti?',
      fi: 'Luetaanko rekisterisi oikein?' },
  /* section headings */
  'Device check': { de: 'Gerätetest', nl: 'Apparaatcontrole', et: 'Seadme kontroll', fi: 'Laitteen tarkistus' },
  'Reference points': { de: 'Referenzpunkte', nl: 'Referentiepunten', et: 'Tugipunktid', fi: 'Kiintopisteet' },
  'Round': { de: 'Rundgang', nl: 'Ronde', et: 'Ring', fi: 'Kierros' },
  'Report': { de: 'Bericht', nl: 'Rapport', et: 'Aruanne', fi: 'Raportti' },
  'Export': { de: 'Export', nl: 'Export', et: 'Eksport', fi: 'Vienti' },
  'Give the measurements to research': { de: 'Messwerte der Forschung geben',
      nl: 'Metingen aan onderzoek geven', et: 'Anna mõõtmised teadusele', fi: 'Anna mittaukset tutkimukseen' },
  'Trees from OpenStreetMap': { de: 'Bäume aus OpenStreetMap', nl: 'Bomen uit OpenStreetMap',
      et: 'Puud OpenStreetMapist', fi: 'Puut OpenStreetMapista' },
  'Upload to OpenStreetMap': { de: 'Zu OpenStreetMap hochladen', nl: 'Uploaden naar OpenStreetMap',
      et: 'Laadi OpenStreetMapi üles', fi: 'Lähetä OpenStreetMapiin' },
  'Import': { de: 'Importieren', nl: 'Importeren', et: 'Impordi', fi: 'Tuo' },
  'Get trees': { de: 'Bäume holen', nl: 'Bomen ophalen', et: 'Too puud', fi: 'Hae puut' },
  'Where from': { de: 'Woher', nl: 'Waarvandaan', et: 'Kust', fi: 'Mistä' },
  'How much': { de: 'Wie viel', nl: 'Hoeveel', et: 'Kui palju', fi: 'Kuinka paljon' },
  'Only what the map shows': { de: 'Nur der Kartenausschnitt', nl: 'Alleen wat de kaart toont',
      et: 'Ainult see, mida kaart näitab', fi: 'Vain se, mitä kartta näyttää' },
  '300 m around me': { de: '300 m um mich herum', nl: '300 m om mij heen',
      et: '300 m minu ümber', fi: '300 m ympärilläni' },
  'Everything the source has': { de: 'Alles, was die Quelle hat', nl: 'Alles wat de bron heeft',
      et: 'Kõik, mis allikal on', fi: 'Kaikki, mitä lähteellä on' },
  'Replace the register instead of adding to it': {
      de: 'Register ersetzen statt ergänzen', nl: 'Register vervangen in plaats van aanvullen',
      et: 'Asenda register, mitte ei täienda', fi: 'Korvaa rekisteri sen täydentämisen sijaan' },
  'A file on this phone': { de: 'Eine Datei auf diesem Telefon', nl: 'Een bestand op deze telefoon',
      et: 'Fail selles telefonis', fi: 'Tiedosto tässä puhelimessa' },
  'Address': { de: 'Adresse', nl: 'Adres', et: 'Aadress', fi: 'Osoite' },
  'How many are there?': { de: 'Wie viele sind es?', nl: 'Hoeveel zijn het er?',
      et: 'Kui palju neid on?', fi: 'Kuinka monta niitä on?' },
  'Load from a web address': { de: 'Von einer Webadresse laden', nl: 'Van een webadres laden',
      et: 'Lae veebiaadressilt', fi: 'Lataa verkko-osoitteesta' },
  'Berlin tree register': { de: 'Berliner Baumkataster', nl: 'Bomenregister Berlijn',
      et: 'Berliini puuregister', fi: 'Berliinin puurekisteri' },
  'Identification service': { de: 'Bestimmungsdienst', nl: 'Determinatiedienst',
      et: 'Määramisteenus', fi: 'Tunnistuspalvelu' },
  'The plot': { de: 'Der Bestand', nl: 'De opstand', et: 'Ala', fi: 'Kuvio' },
  'Alignment': { de: 'Ausrichtung', nl: 'Uitlijning', et: 'Joondus', fi: 'Kohdistus' },
  'Users': { de: 'Benutzer', nl: 'Gebruikers', et: 'Kasutajad', fi: 'Käyttäjät' },
  'Trail': { de: 'Protokoll', nl: 'Logboek', et: 'Logi', fi: 'Loki' },
  'Standard': { de: 'Regelwerk', nl: 'Richtlijn', et: 'Standard', fi: 'Standardi' },
  'Moved positions': { de: 'Verschobene Positionen', nl: 'Verplaatste posities',
      et: 'Nihutatud asukohad', fi: 'Siirretyt sijainnit' },
  'Deleted trees': { de: 'Gelöschte Bäume', nl: 'Verwijderde bomen', et: 'Kustutatud puud', fi: 'Poistetut puut' },
  'Language': { de: 'Sprache', nl: 'Taal', et: 'Keel', fi: 'Kieli' },
  'Voice': { de: 'Sprachsteuerung', nl: 'Spraak', et: 'Kõnejuhtimine', fi: 'Puheohjaus' },
  'Measuring the diameter by phone': { de: 'Durchmesser mit dem Handy messen',
      nl: 'Diameter met de telefoon meten', et: 'Läbimõõdu mõõtmine telefoniga',
      fi: 'Läpimitan mittaus puhelimella' },
  'Status': { de: 'Status', nl: 'Status', et: 'Olek', fi: 'Tila' },
  'Reset': { de: 'Zurücksetzen', nl: 'Resetten', et: 'Lähtestamine', fi: 'Nollaus' },
  /* buttons */
  'Start AR': { de: 'AR starten', nl: 'AR starten', et: 'Käivita AR', fi: 'Käynnistä AR' },
  'Camera': { de: 'Kamera', nl: 'Camera', et: 'Kaamera', fi: 'Kamera' },
  'How a tree inspection works': { de: 'Wie eine Baumkontrolle abläuft',
      nl: 'Hoe een boomcontrole verloopt', et: 'Kuidas puude kontroll käib',
      fi: 'Miten puun tarkastus etenee' },
  'Install on the home screen': { de: 'Auf dem Startbildschirm installieren',
      nl: 'Op het beginscherm installeren', et: 'Paigalda avakuvale', fi: 'Asenna aloitusnäytölle' },
  'by distance': { de: 'nach Entfernung', nl: 'op afstand', et: 'kauguse järgi', fi: 'etäisyyden mukaan' },
  'by number': { de: 'nach Nummer', nl: 'op nummer', et: 'numbri järgi', fi: 'numeron mukaan' },
  '+ Tree at my GPS position': { de: '+ Baum an meiner GPS-Position', nl: '+ Boom op mijn GPS-positie',
      et: '+ Puu minu GPS-asukohta', fi: '+ Puu GPS-sijaintiini' },
  '+ Tree by coordinates': { de: '+ Baum nach Koordinaten', nl: '+ Boom op coördinaten',
      et: '+ Puu koordinaatide järgi', fi: '+ Puu koordinaateilla' },
  'Create': { de: 'Anlegen', nl: 'Aanmaken', et: 'Loo', fi: 'Luo' },
  'Cancel': { de: 'Abbrechen', nl: 'Annuleren', et: 'Loobu', fi: 'Peruuta' },
  'Close': { de: 'Schließen', nl: 'Sluiten', et: 'Sulge', fi: 'Sulje' },
  'Save': { de: 'Speichern', nl: 'Opslaan', et: 'Salvesta', fi: 'Tallenna' },
  'Stop walking to it': { de: 'Zielführung beenden', nl: 'Navigatie stoppen',
      et: 'Lõpeta juhatamine', fi: 'Lopeta opastus' },
  'Centre on me': { de: 'Auf mich zentrieren', nl: 'Op mij centreren',
      et: 'Keskenda minule', fi: 'Keskitä minuun' },
  '+ Tree at crosshair': { de: '+ Baum am Fadenkreuz', nl: '+ Boom op het kruis',
      et: '+ Puu sihikule', fi: '+ Puu tähtäimeen' },
  'Save this area offline': { de: 'Diesen Bereich offline speichern', nl: 'Dit gebied offline opslaan',
      et: 'Salvesta see ala võrguühenduseta', fi: 'Tallenna tämä alue offline-tilaan' },
  'Set reference point at crosshair': { de: 'Referenzpunkt am Fadenkreuz setzen',
      nl: 'Referentiepunt op het kruis zetten', et: 'Määra tugipunkt sihikule',
      fi: 'Aseta kiintopiste tähtäimeen' },
  'Go to these coordinates': { de: 'Zu diesen Koordinaten', nl: 'Naar deze coördinaten',
      et: 'Nende koordinaatideni', fi: 'Näihin koordinaatteihin' },
  'Set reference point there': { de: 'Referenzpunkt dort setzen', nl: 'Referentiepunt daar zetten',
      et: 'Määra tugipunkt sinna', fi: 'Aseta kiintopiste sinne' },
  'Take it from where I am': { de: 'Von meinem Standort nehmen', nl: 'Van mijn locatie nemen',
      et: 'Võta minu asukohast', fi: 'Ota sijainnistani' },
  'No prefix': { de: 'Kein Kürzel', nl: 'Geen voorvoegsel', et: 'Eesliiteta', fi: 'Ei etuliitettä' },
  'Start a round': { de: 'Rundgang beginnen', nl: 'Ronde starten', et: 'Alusta ringi', fi: 'Aloita kierros' },
  'Close the round': { de: 'Rundgang abschließen', nl: 'Ronde afsluiten', et: 'Lõpeta ring', fi: 'Päätä kierros' },
  'Map page': { de: 'Kartenblatt', nl: 'Kaartblad', et: 'Kaardileht', fi: 'Karttalehti' },
  'Inspection report': { de: 'Kontrollbericht', nl: 'Controlerapport', et: 'Kontrolliaruanne', fi: 'Tarkastusraportti' },
  '…with photos': { de: '…mit Fotos', nl: "…met foto's", et: '…koos fotodega', fi: '…valokuvien kanssa' },
  'Save photos individually': { de: 'Fotos einzeln speichern', nl: "Foto's afzonderlijk opslaan",
      et: 'Salvesta fotod eraldi', fi: 'Tallenna kuvat erikseen' },
  'Save the bundle': { de: 'Paket speichern', nl: 'Bundel opslaan', et: 'Salvesta pakett', fi: 'Tallenna paketti' },
  '…with the photographs': { de: '…mit den Fotos', nl: "…met de foto's", et: '…koos fotodega',
      fi: '…valokuvien kanssa' },
  'Within 300 m of me': { de: 'Im Umkreis von 300 m', nl: 'Binnen 300 m van mij',
      et: '300 m raadiuses minust', fi: '300 m säteellä minusta' },
  'In the map view': { de: 'Im Kartenausschnitt', nl: 'In het kaartbeeld', et: 'Kaardivaates', fi: 'Karttanäkymässä' },
  'Sign in to OSM': { de: 'Bei OSM anmelden', nl: 'Aanmelden bij OSM', et: 'Logi OSMi sisse', fi: 'Kirjaudu OSM:ään' },
  'Sign out': { de: 'Abmelden', nl: 'Afmelden', et: 'Logi välja', fi: 'Kirjaudu ulos' },
  'Upload my own trees': { de: 'Eigene Bäume hochladen', nl: 'Eigen bomen uploaden',
      et: 'Laadi oma puud üles', fi: 'Lähetä omat puuni' },
  'Merge a register…': { de: 'Register zusammenführen…', nl: 'Register samenvoegen…',
      et: 'Ühenda register…', fi: 'Yhdistä rekisteri…' },
  'Replace…': { de: 'Ersetzen…', nl: 'Vervangen…', et: 'Asenda…', fi: 'Korvaa…' },
  'Does this address answer?': { de: 'Antwortet diese Adresse?', nl: 'Antwoordt dit adres?',
      et: 'Kas see aadress vastab?', fi: 'Vastaako tämä osoite?' },
  'Fetch and read': { de: 'Holen und lesen', nl: 'Ophalen en lezen', et: 'Lae ja loe', fi: 'Hae ja lue' },
  'The area on the map': { de: 'Der Bereich auf der Karte', nl: 'Het gebied op de kaart',
      et: 'Kaardil olev ala', fi: 'Kartalla näkyvä alue' },
  'Put the stand on my position': { de: 'Bestand auf meine Position legen',
      nl: 'Opstand op mijn positie leggen', et: 'Aseta ala minu asukohta', fi: 'Sijoita kuvio sijaintiini' },
  'Add user': { de: 'Benutzer anlegen', nl: 'Gebruiker toevoegen', et: 'Lisa kasutaja', fi: 'Lisää käyttäjä' },
  'Export the trail (CSV)': { de: 'Protokoll exportieren (CSV)', nl: 'Logboek exporteren (CSV)',
      et: 'Ekspordi logi (CSV)', fi: 'Vie loki (CSV)' },
  'Clear the trail': { de: 'Protokoll löschen', nl: 'Logboek wissen', et: 'Kustuta logi', fi: 'Tyhjennä loki' },
  'Test the voice': { de: 'Sprachausgabe testen', nl: 'Spraak testen', et: 'Testi kõnet', fi: 'Testaa puhetta' },
  'Fetch the current version': { de: 'Aktuelle Version holen', nl: 'Huidige versie ophalen',
      et: 'Lae uusim versioon', fi: 'Hae uusin versio' },
  'Delete field records': { de: 'Feldaufnahmen löschen', nl: 'Veldopnames verwijderen',
      et: 'Kustuta välitöö andmed', fi: 'Poista maastotiedot' },
  'Delete all trees': { de: 'Alle Bäume löschen', nl: 'Alle bomen verwijderen',
      et: 'Kustuta kõik puud', fi: 'Poista kaikki puut' },
  'Forget everything except the trees': { de: 'Alles außer den Bäumen vergessen',
      nl: 'Alles behalve de bomen vergeten', et: 'Unusta kõik peale puude',
      fi: 'Unohda kaikki paitsi puut' },
  '+ Tree': { de: '+ Baum', nl: '+ Boom', et: '+ Puu', fi: '+ Puu' },
  'Photo': { de: 'Foto', nl: 'Foto', et: 'Foto', fi: 'Kuva' },
  'Tools': { de: 'Werkzeuge', nl: 'Gereedschap', et: 'Tööriistad', fi: 'Työkalut' },
  'Align': { de: 'Ausrichten', nl: 'Uitlijnen', et: 'Joonda', fi: 'Kohdista' },
  'Exit': { de: 'Beenden', nl: 'Sluiten', et: 'Välju', fi: 'Poistu' },
  'To do': { de: 'Zu erledigen', nl: 'Te doen', et: 'Teha', fi: 'Tehtävää' },
  /* the front door */
  'Tree inspection in the field – offline, on this phone': {
      de: 'Baumkontrolle im Feld – offline, auf diesem Telefon',
      nl: 'Boomcontrole in het veld – offline, op deze telefoon',
      et: 'Puude kontroll välitööl – võrguühenduseta, selles telefonis',
      fi: 'Puiden tarkastus maastossa – offline, tässä puhelimessa' },
  'Name': { de: 'Name', nl: 'Naam', et: 'Nimi', fi: 'Nimi' },
  'Password': { de: 'Passwort', nl: 'Wachtwoord', et: 'Parool', fi: 'Salasana' },
  'Stay signed in on this phone': { de: 'Auf diesem Telefon angemeldet bleiben',
      nl: 'Aangemeld blijven op deze telefoon', et: 'Jää selles telefonis sisse logituks',
      fi: 'Pysy kirjautuneena tässä puhelimessa' },
  'Start': { de: 'Los', nl: 'Start', et: 'Alusta', fi: 'Aloita' },
  'Continue without a name': { de: 'Ohne Namen weiter', nl: 'Doorgaan zonder naam',
      et: 'Jätka nimeta', fi: 'Jatka ilman nimeä' },
  /* reports */
  'Reports': { de: 'Berichte', nl: 'Rapporten', et: 'Aruanded', fi: 'Raportit' },
  'Letter head': { de: 'Briefkopf', nl: 'Briefhoofd', et: 'Kirjaplank', fi: 'Kirjelomake' },
  'Template': { de: 'Vorlage', nl: 'Sjabloon', et: 'Mall', fi: 'Malli' },
  'Write it': { de: 'Ausgeben', nl: 'Uitgeven', et: 'Väljasta', fi: 'Tulosta' },
  'The long report': { de: 'Der ausführliche Bericht', nl: 'Het uitgebreide rapport',
      et: 'Pikk aruanne', fi: 'Pitkä raportti' },
  'Columns': { de: 'Spalten', nl: 'Kolommen', et: 'Veerud', fi: 'Sarakkeet' },
  'Read a blank form…': { de: 'Leerformular einlesen…', nl: 'Leeg formulier inlezen…',
      et: 'Loe tühi vorm sisse…', fi: 'Lue tyhjä lomake…' },
  'Change the columns': { de: 'Spalten ändern', nl: 'Kolommen wijzigen',
      et: 'Muuda veerge', fi: 'Muuta sarakkeita' },
  'Delete': { de: 'Löschen', nl: 'Verwijderen', et: 'Kustuta', fi: 'Poista' },
  'Page to print': { de: 'Seite zum Drucken', nl: 'Pagina om te printen',
      et: 'Leht printimiseks', fi: 'Tulostettava sivu' },
  'Word (.docx)': { de: 'Word (.docx)', nl: 'Word (.docx)', et: 'Word (.docx)', fi: 'Word (.docx)' },
  'Property': { de: 'Objekt', nl: 'Object', et: 'Objekt', fi: 'Kohde' },
  'Job no.': { de: 'Auftrags-Nr.', nl: 'Opdrachtnr.', et: 'Töö nr', fi: 'Työnumero' },
  'Date': { de: 'Datum', nl: 'Datum', et: 'Kuupäev', fi: 'Päivämäärä' },
  'Client / who ordered it': { de: 'Auftraggeber', nl: 'Opdrachtgever',
      et: 'Tellija', fi: 'Tilaaja' },
  'Property or site': { de: 'Objekt / Liegenschaft', nl: 'Object / terrein',
      et: 'Objekt / kinnistu', fi: 'Kohde / kiinteistö' },
  'Job number': { de: 'Auftragsnummer', nl: 'Opdrachtnummer', et: 'Töö number', fi: 'Työnumero' },
  'Contractor / your office': { de: 'Auftragnehmer / eigenes Büro',
      nl: 'Opdrachtnemer / eigen bureau', et: 'Töövõtja / oma büroo', fi: 'Toimeksisaaja / oma toimisto' },
  'Signed by': { de: 'Unterzeichnet von', nl: 'Ondertekend door',
      et: 'Allkirjastaja', fi: 'Allekirjoittaja' },
  'Position': { de: 'Funktion', nl: 'Functie', et: 'Ametikoht', fi: 'Asema' },
  'Place': { de: 'Ort', nl: 'Plaats', et: 'Koht', fi: 'Paikka' },
  'Note under the head': { de: 'Hinweis unter dem Kopf', nl: 'Opmerking onder het hoofd',
      et: 'Märkus päise all', fi: 'Huomautus otsikon alla' },
  'Report date': { de: 'Berichtsdatum', nl: 'Rapportdatum',
      et: 'Aruande kuupäev', fi: 'Raportin päivämäärä' },
  /* the signature */
  'Signature': { de: 'Unterschrift', nl: 'Handtekening', et: 'Allkiri', fi: 'Allekirjoitus' },
  'Sign here': { de: 'Hier unterschreiben', nl: 'Hier ondertekenen',
      et: 'Allkirjasta siin', fi: 'Allekirjoita tähän' },
  'Remove': { de: 'Entfernen', nl: 'Verwijderen', et: 'Eemalda', fi: 'Poista' },
  'Keep': { de: 'Übernehmen', nl: 'Bewaren', et: 'Säilita', fi: 'Säilytä' },
  'Clear': { de: 'Löschen', nl: 'Wissen', et: 'Tühjenda', fi: 'Tyhjennä' },
  'Drawn': { de: 'Gezeichnet', nl: 'Getekend', et: 'Joonistatud', fi: 'Piirretty' },
  'Sign with a finger or a stylus. It is kept on this phone and set above the line in every report.': {
      de: 'Mit dem Finger oder einem Stift unterschreiben. Sie bleibt auf diesem Telefon und steht ' +
          'in jedem Bericht über der Linie.',
      nl: 'Onderteken met een vinger of een stylus. Hij blijft op deze telefoon en staat in elk ' +
          'rapport boven de lijn.',
      et: 'Allkirjasta sõrme või pliiatsiga. See jääb sellesse telefoni ja on igas aruandes joone kohal.',
      fi: 'Allekirjoita sormella tai kynällä. Se jää tähän puhelimeen ja tulee jokaisessa ' +
          'raportissa viivan yläpuolelle.' },
  'No signature yet – the report prints an empty line.': {
      de: 'Noch keine Unterschrift – der Bericht druckt eine leere Linie.',
      nl: 'Nog geen handtekening – het rapport drukt een lege lijn af.',
      et: 'Allkirja veel ei ole – aruanne prindib tühja joone.',
      fi: 'Ei vielä allekirjoitusta – raportti tulostaa tyhjän viivan.' },
  'Nothing drawn yet.': { de: 'Noch nichts gezeichnet.', nl: 'Nog niets getekend.',
      et: 'Midagi ei ole veel joonistatud.', fi: 'Mitään ei ole vielä piirretty.' },
  'Signature kept.': { de: 'Unterschrift übernommen.', nl: 'Handtekening bewaard.',
      et: 'Allkiri salvestatud.', fi: 'Allekirjoitus tallennettu.' },
  'Signature removed.': { de: 'Unterschrift entfernt.', nl: 'Handtekening verwijderd.',
      et: 'Allkiri eemaldatud.', fi: 'Allekirjoitus poistettu.' },
  'Remove the signature?': { de: 'Unterschrift entfernen?', nl: 'Handtekening verwijderen?',
      et: 'Kas eemaldada allkiri?', fi: 'Poistetaanko allekirjoitus?' },
  'Checksum of this report without this line. It says the report has not been changed since it was made; it says nothing about who made it.': {
      de: 'Prüfsumme dieses Berichts ohne diese Zeile. Sie sagt, dass der Bericht seit der ' +
          'Erstellung nicht verändert wurde; über den Ersteller sagt sie nichts.',
      nl: 'Controlegetal van dit rapport zonder deze regel. Het zegt dat het rapport sinds het ' +
          'opstellen niet is gewijzigd; over wie het opstelde zegt het niets.',
      et: 'Selle aruande kontrollsumma ilma selle reata. See ütleb, et aruannet ei ole pärast ' +
          'koostamist muudetud; koostaja kohta ei ütle see midagi.',
      fi: 'Tämän raportin tarkistussumma ilman tätä riviä. Se kertoo, ettei raporttia ole ' +
          'muutettu laatimisen jälkeen; laatijasta se ei kerro mitään.' }
};

/* The words that are not text nodes - placeholders and the like - said in the
   app's language by the screen that owns them. */
const UI_GATE = {
  name_ph: { en: 'your name, as it should appear on the record',
             de: 'Ihr Name, so wie er im Datensatz stehen soll',
             nl: 'uw naam, zoals die in het record moet staan',
             et: 'teie nimi, nagu see kirjes olema peab',
             fi: 'nimesi, kuten sen tulee näkyä tiedoissa' },
  pw_new: { en: 'a password, or leave it empty', de: 'ein Passwort, oder leer lassen',
            nl: 'een wachtwoord, of laat het leeg', et: 'parool või jäta tühjaks',
            fi: 'salasana, tai jätä tyhjäksi' },
  pw_none: { en: 'this name has no password', de: 'dieser Name hat kein Passwort',
             nl: 'deze naam heeft geen wachtwoord', et: 'sellel nimel ei ole parooli',
             fi: 'tällä nimellä ei ole salasanaa' },
  pw_kept: { en: 'remembered on this phone', de: 'auf diesem Telefon gemerkt',
             nl: 'onthouden op deze telefoon', et: 'selles telefonis meeles',
             fi: 'muistettu tässä puhelimessa' },
  newname: { en: 'the new name', de: 'der neue Name', nl: 'de nieuwe naam',
             et: 'uus nimi', fi: 'uusi nimi' },
  another: { en: '+ a new name…', de: '+ ein neuer Name…', nl: '+ een nieuwe naam…',
             et: '+ uus nimi…', fi: '+ uusi nimi…' },
  foot: { en: 'There is no server. The name and the password stay on this phone and record who ' +
              'signed an inspection.',
          de: 'Es gibt keinen Server. Name und Passwort bleiben auf diesem Telefon und halten fest, ' +
              'wer eine Kontrolle unterschrieben hat.',
          nl: 'Er is geen server. De naam en het wachtwoord blijven op deze telefoon en leggen vast ' +
              'wie een controle heeft ondertekend.',
          et: 'Serverit ei ole. Nimi ja parool jäävad sellesse telefoni ja näitavad, kes kontrolli ' +
              'allkirjastas.',
          fi: 'Palvelinta ei ole. Nimi ja salasana jäävät tähän puhelimeen ja kertovat, kuka on ' +
              'allekirjoittanut tarkastuksen.' },
  wrongpw: { en: 'That password is wrong.', de: 'Das Passwort stimmt nicht.',
             nl: 'Dat wachtwoord klopt niet.', et: 'See parool on vale.',
             fi: 'Salasana on väärä.' },
  needpw: { en: 'That name has a password.', de: 'Dieser Name hat ein Passwort.',
            nl: 'Die naam heeft een wachtwoord.', et: 'Sellel nimel on parool.',
            fi: 'Tällä nimellä on salasana.' },
  needname: { en: 'A name, so the records are signed.', de: 'Ein Name, damit die Aufnahmen unterschrieben sind.',
              nl: 'Een naam, zodat de opnames ondertekend zijn.',
              et: 'Nimi, et kirjed oleksid allkirjastatud.',
              fi: 'Nimi, jotta tiedot on allekirjoitettu.' },
  unchecked: { en: '· This language is translated but has not been read by anyone who speaks it, ' +
                   'and the method text in it is still English.',
               de: '· Diese Sprache ist übersetzt, aber von niemandem gegengelesen worden, der sie ' +
                   'spricht; der Methodentext darin ist weiterhin Englisch.',
               nl: '· Deze taal is vertaald maar door niemand die haar spreekt nagelezen, en de ' +
                   'methodetekst erin is nog Engels.',
               et: '· See keel on tõlgitud, kuid keegi seda kõnelev ei ole seda üle lugenud, ja ' +
                   'metoodika tekst on selles endiselt inglise keeles.',
               fi: '· Tämä kieli on käännetty, mutta kukaan sitä puhuva ei ole lukenut sitä, ja ' +
                   'menetelmän teksti on siinä yhä englanniksi.' }
};
function gt2(key) {
  const row = UI_GATE[key] || {};
  return row[uiLang()] || row.en || '';
}

/* The chrome in the app's language, English where nothing is written. */
function T(en) {
  const e = String(en == null ? '' : en);
  const l = uiLang();
  if (l === 'en') return e;
  const row = UI[e];
  return (row && row[l]) || e;
}

/* Swap the chrome in place. The English original is kept on the node, so
   switching again works from the original and never from a translation. */
const uiOrig = new WeakMap();
function uiApply(root) {
  const scope = root || document.body;
  if (!scope || !scope.querySelectorAll) return;
  const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode: n => {
      const p = n.parentNode, tag = p && p.nodeName;
      if (!tag || tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const hits = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) hits.push(n);
  hits.forEach(n => {
    const had = uiOrig.get(n);
    const raw = (had != null) ? had : n.nodeValue;
    const key = raw.trim();
    if (!key || !UI[key]) return;
    if (had == null) uiOrig.set(n, raw);
    const t = T(key);
    const out = raw.replace(key, t);
    if (n.nodeValue !== out) n.nodeValue = out;
  });
}
