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
  return uiLangOfNorm();
}
/* What the standard alone would choose, with nobody overriding it. */
function uiLangOfNorm() {
  const n = (typeof curNorm === 'function') ? curNorm() : null;
  return (n && NORM_LANG[n.id]) || 'en';
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
