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

const LANG_NAMES = { en: 'English', de: 'Deutsch', nl: 'Nederlands', et: 'Eesti' };
const NORM_LANG = { fll: 'de', onorm: 'de', vssg: 'de', bvc: 'nl', ee: 'et', eac: 'en', quant: 'en', generic: 'en' };

function uiLang() {
  const p = (typeof prefs === 'function') ? prefs() : {};
  if (p.lang && LANG_NAMES[p.lang]) return p.lang;
  const n = (typeof curNorm === 'function') ? curNorm() : null;
  return (n && NORM_LANG[n.id]) || 'en';
}

/* ---- field labels ---------------------------------------------------- */
const FIELD_L = {
  tree_id: { de: 'Baum-ID', nl: 'Boom-ID', et: 'Puu ID' },
  tag_no: { de: 'Nummer am Stamm', nl: 'Nummer op de stam', et: 'Number tüvel' },
  area: { de: 'Bezirk / Abteilung', nl: 'Wijk / vak', et: 'Linnaosa / ala' },
  species: { de: 'Art (wissenschaftlich)', nl: 'Soort (wetenschappelijk)', et: 'Liik (ladina keeles)' },
  name_en: { de: 'Trivialname', nl: 'Nederlandse naam', et: 'Eestikeelne nimi' },
  planted: { de: 'Pflanzjahr', nl: 'Plantjaar', et: 'Istutusaasta' },
  girth_cm: { de: 'Stammumfang bei 1,0 m (cm)', nl: 'Stamomtrek op 1,0 m (cm)', et: 'Tüve ümbermõõt 1,3 m (cm)' },
  dbh_cm: { de: 'BHD bei 1,3 m (cm)', nl: 'Stamdiameter op 1,3 m (cm)', et: 'Rinnasdiameeter 1,3 m (cm)' },
  height_m: { de: 'Höhe (m)', nl: 'Hoogte (m)', et: 'Kõrgus (m)' },
  crown_d_m: { de: 'Kronendurchmesser (m)', nl: 'Kroondiameter (m)', et: 'Võra läbimõõt (m)' },
  crown_base_m: { de: 'Kronenansatz (m)', nl: 'Kroonaanzet (m)', et: 'Võra algus (m)' },
  tree_pit_m2: { de: 'Baumscheibe (m²)', nl: 'Boomspiegel (m²)', et: 'Juurestiku ala (m²)' },
  location: { de: 'Standort', nl: 'Locatie', et: 'Asukoht' },
  position_accuracy_m: { de: 'Lagegenauigkeit (m)', nl: 'Positienauwkeurigheid (m)', et: 'Asukoha täpsus (m)' },
  inspection_type: { de: 'Kontrollart', nl: 'Soort controle', et: 'Kontrolli liik' },
  last_inspection: { de: 'Kontrolldatum', nl: 'Controledatum', et: 'Kontrolli kuupäev' },
  inspector: { de: 'Kontrolleur/in', nl: 'Controleur', et: 'Inventeerija' },
  assessment_level: { de: 'Bewertungsstufe', nl: 'Beoordelingsniveau', et: 'Hindamise tase' },
  vitality_roloff: { de: 'Vitalität (Roloff 0–3)', nl: 'Vitaliteit (Roloff 0–3)', et: 'Elujõulisus (Roloff 0–3)' },
  vitality_5: { de: 'Vitalität', nl: 'Conditie', et: 'Seisund' },
  development_phase: { de: 'Entwicklungsphase', nl: 'Ontwikkelingsfase', et: 'Arengufaas' },
  crown_dieback_pct: { de: 'Kronenverlichtung (%)', nl: 'Kroonsterfte (%)', et: 'Võra hõrenemine (%)' },
  damage_class: { de: 'Schadklasse', nl: 'Schadeklasse', et: 'Kahjustuse aste' },
  cavity: { de: 'Höhlung / Faulstelle', nl: 'Holte / rotplek', et: 'Õõnsus / mädanik' },
  wall_t_cm: { de: 'Restwand t (cm)', nl: 'Restwand t (cm)', et: 'Terve puidu paksus t (cm)' },
  radius_r_cm: { de: 'Stammradius R (cm)', nl: 'Stamstraal R (cm)', et: 'Tüve raadius R (cm)' },
  stability: { de: 'Standsicherheit', nl: 'Stabiliteit', et: 'Püsivus (juurdumine)' },
  breakage_resistance: { de: 'Bruchsicherheit', nl: 'Breukvastheid', et: 'Murdumiskindlus' },
  target_type: { de: 'Ziel / Schutzgut', nl: 'Doel', et: 'Ohualune objekt' },
  target_distance_m: { de: 'Abstand zum Ziel (m)', nl: 'Afstand tot doel (m)', et: 'Kaugus objektist (m)' },
  target_occupancy: { de: 'Nutzung des Ziels', nl: 'Gebruik van het doel', et: 'Objekti kasutus' },
  traffic_safety: { de: 'Verkehrssicherheit', nl: 'Verkeersveiligheid', et: 'Ohutus' },
  bvc_result: { de: 'Ergebnis der Sicherheitskontrolle', nl: 'Uitkomst boomveiligheidscontrole', et: 'Ohutuskontrolli tulemus' },
  duty_of_care: { de: 'Sorgfaltspflicht', nl: 'Zorgplicht', et: 'Hoolsuskohustus' },
  prob_failure: { de: 'Versagenswahrscheinlichkeit', nl: 'Kans op falen', et: 'Murdumise tõenäosus' },
  prob_impact: { de: 'Treffwahrscheinlichkeit', nl: 'Kans op treffen', et: 'Tabamise tõenäosus' },
  consequence: { de: 'Schadensfolge', nl: 'Gevolg', et: 'Tagajärg' },
  part_size: { de: 'Größe des versagenden Teils', nl: 'Grootte van het falende deel', et: 'Murduva osa suurus' },
  value_class: { de: 'Wertklasse', nl: 'Waardeklasse', et: 'Väärtusklass' },
  recommendation: { de: 'Empfehlung', nl: 'Aanbeveling', et: 'Soovitus' },
  urgency: { de: 'Dringlichkeit', nl: 'Urgentie', et: 'Kiireloomulisus' },
  actions: { de: 'Maßnahmen', nl: 'Maatregelen', et: 'Tegevused' },
  interval_months: { de: 'Intervall (Monate)', nl: 'Interval (maanden)', et: 'Intervall (kuud)' },
  next_inspection: { de: 'Nächste Kontrolle', nl: 'Volgende controle', et: 'Järgmine kontroll' },
  remarks: { de: 'Bemerkungen', nl: 'Opmerkingen', et: 'Märkused' }
};

/* ---- option labels: stored value -> what it says --------------------- */
const OPT_L = {
  vitality_5: { good: { de: 'gut', nl: 'goed', et: 'hea' }, moderate: { de: 'mäßig', nl: 'matig', et: 'rahuldav' },
    poor: { de: 'schlecht', nl: 'slecht', et: 'halb' }, dying: { de: 'absterbend', nl: 'afstervend', et: 'hääbuv' },
    dead: { de: 'tot', nl: 'dood', et: 'kuivanud' } },
  development_phase: { young: { de: 'Jugendphase', nl: 'jong', et: 'noor' }, maturing: { de: 'Reifungsphase', nl: 'halfwas', et: 'keskealine' },
    mature: { de: 'Reifephase', nl: 'volwassen', et: 'täiskasvanud' }, ageing: { de: 'Alterungsphase', nl: 'verouderend', et: 'vananev' },
    senescent: { de: 'Altersphase', nl: 'aftakelend', et: 'vana' } },
  damage_class: { none: { de: 'keine', nl: 'geen', et: 'puudub' }, slight: { de: 'gering', nl: 'licht', et: 'kerge' },
    moderate: { de: 'mäßig', nl: 'matig', et: 'keskmine' }, severe: { de: 'stark', nl: 'ernstig', et: 'tugev' } },
  cavity: { yes: { de: 'ja', nl: 'ja', et: 'jah' }, no: { de: 'nein', nl: 'nee', et: 'ei' } },
  stability: { adequate: { de: 'gegeben', nl: 'voldoende', et: 'piisav' }, restricted: { de: 'eingeschränkt', nl: 'beperkt', et: 'piiratud' },
    'not given': { de: 'nicht gegeben', nl: 'onvoldoende', et: 'puudub' } },
  breakage_resistance: { adequate: { de: 'gegeben', nl: 'voldoende', et: 'piisav' }, restricted: { de: 'eingeschränkt', nl: 'beperkt', et: 'piiratud' },
    'not given': { de: 'nicht gegeben', nl: 'onvoldoende', et: 'puudub' } },
  traffic_safety: { adequate: { de: 'gegeben', nl: 'voldoende', et: 'tagatud' }, restricted: { de: 'eingeschränkt', nl: 'beperkt', et: 'piiratud' },
    'not given': { de: 'nicht gegeben', nl: 'onvoldoende', et: 'ei ole tagatud' } },
  target_type: { none: { de: 'keines', nl: 'geen', et: 'puudub' }, path: { de: 'Weg', nl: 'pad', et: 'kõnnitee' }, road: { de: 'Straße', nl: 'weg', et: 'tee' },
    parking: { de: 'Parkplatz', nl: 'parkeerplaats', et: 'parkla' }, building: { de: 'Gebäude', nl: 'gebouw', et: 'hoone' },
    playground: { de: 'Spielplatz', nl: 'speelplaats', et: 'mänguväljak' }, other: { de: 'anderes', nl: 'anders', et: 'muu' } },
  target_occupancy: { 'rarely used': { de: 'selten genutzt', nl: 'zelden gebruikt', et: 'harva kasutatav' }, occasional: { de: 'gelegentlich', nl: 'af en toe', et: 'aeg-ajalt' },
    frequent: { de: 'häufig', nl: 'vaak', et: 'sage' }, constant: { de: 'ständig', nl: 'voortdurend', et: 'pidev' } },
  bvc_result: { 'no findings': { de: 'ohne Befund', nl: 'geen bevindingen', et: 'tähelepanekuteta' }, 'attention tree': { de: 'Beobachtungsbaum', nl: 'attentieboom', et: 'jälgitav puu' },
    'risk tree': { de: 'Risikobaum', nl: 'risicoboom', et: 'ohtlik puu' }, 'further investigation needed': { de: 'weitere Untersuchung', nl: 'nader onderzoek', et: 'vajab lisauuringut' } },
  duty_of_care: { standard: { de: 'normal', nl: 'normaal', et: 'tavaline' }, raised: { de: 'erhöht', nl: 'verhoogd', et: 'kõrgendatud' } },
  prob_failure: { improbable: { de: 'unwahrscheinlich', nl: 'onwaarschijnlijk', et: 'ebatõenäoline' }, possible: { de: 'möglich', nl: 'mogelijk', et: 'võimalik' },
    probable: { de: 'wahrscheinlich', nl: 'waarschijnlijk', et: 'tõenäoline' }, imminent: { de: 'unmittelbar', nl: 'op handen', et: 'vahetu' } },
  prob_impact: { 'very low': { de: 'sehr gering', nl: 'zeer laag', et: 'väga madal' }, low: { de: 'gering', nl: 'laag', et: 'madal' },
    medium: { de: 'mittel', nl: 'middel', et: 'keskmine' }, high: { de: 'hoch', nl: 'hoog', et: 'kõrge' } },
  consequence: { negligible: { de: 'vernachlässigbar', nl: 'verwaarloosbaar', et: 'tühine' }, minor: { de: 'gering', nl: 'gering', et: 'väike' },
    significant: { de: 'erheblich', nl: 'aanzienlijk', et: 'oluline' }, severe: { de: 'schwer', nl: 'ernstig', et: 'raske' } },
  value_class: { I: { de: 'I – besonders wertvoll', nl: 'I – zeer waardevol', et: 'I – eriti väärtuslik' },
    II: { de: 'II – wertvoll', nl: 'II – waardevol', et: 'II – väärtuslik' },
    III: { de: 'III – bedeutend', nl: 'III – van belang', et: 'III – oluline' },
    IV: { de: 'IV – wenig wertvoll', nl: 'IV – weinig waardevol', et: 'IV – väheväärtuslik' },
    V: { de: 'V – zu entfernen', nl: 'V – te verwijderen', et: 'V – likvideeritav' } },
  recommendation: { keep: { de: 'erhalten', nl: 'behouden', et: 'säilitada' }, maintain: { de: 'pflegen', nl: 'onderhouden', et: 'hooldada' },
    remove: { de: 'entfernen', nl: 'verwijderen', et: 'eemaldada' }, replace: { de: 'ersetzen', nl: 'vervangen', et: 'asendada' } },
  urgency: { none: { de: 'keine', nl: 'geen', et: 'puudub' }, 'next growing season': { de: 'nächste Vegetationsperiode', nl: 'volgend groeiseizoen', et: 'järgmine vegetatsiooniperiood' },
    '3 months': { de: '3 Monate', nl: '3 maanden', et: '3 kuud' }, '1 month': { de: '1 Monat', nl: '1 maand', et: '1 kuu' },
    immediate: { de: 'sofort', nl: 'onmiddellijk', et: 'kohe' } },
  inspection_type: { 'Routine inspection': { de: 'Regelkontrolle', nl: 'Reguliere controle', et: 'Korraline kontroll' },
    'Visual inspection': { de: 'Sichtkontrolle', nl: 'Visuele controle', et: 'Visuaalne kontroll' },
    'Detailed assessment': { de: 'Eingehende Untersuchung', nl: 'Nader onderzoek', et: 'Süvauuring' },
    'Post-storm inspection': { de: 'Kontrolle nach Sturm', nl: 'Controle na storm', et: 'Tormijärgne kontroll' } },
  assessment_level: { 'Basic (walk-by)': { de: 'Basis (im Vorbeigehen)', nl: 'Basis (in het voorbijgaan)', et: 'Põhitase (möödaminnes)' },
    'Standard (visual, from the ground)': { de: 'Standard (visuell, vom Boden)', nl: 'Standaard (visueel, vanaf de grond)', et: 'Standard (visuaalne, maapinnalt)' },
    'Advanced (instruments)': { de: 'Erweitert (Geräte)', nl: 'Uitgebreid (instrumenten)', et: 'Süvendatud (seadmed)' } }
};

/* ---- headings and a few strings on the page and the paper ------------ */
const TXT_L = {
  'Inspection': { de: 'Kontrolle', nl: 'Controle', et: 'Kontroll' },
  'Condition': { de: 'Zustand', nl: 'Conditie', et: 'Seisund' },
  'Measurements': { de: 'Maße', nl: 'Maten', et: 'Mõõtmed' },
  'Stem and root plate': { de: 'Stamm und Wurzelteller', nl: 'Stam en wortelkluit', et: 'Tüvi ja juurestik' },
  'Stem and roots': { de: 'Stamm und Wurzeln', nl: 'Stam en wortels', et: 'Tüvi ja juured' },
  'Target': { de: 'Schutzgut', nl: 'Doel', et: 'Ohualune objekt' },
  'Verdict': { de: 'Befund', nl: 'Oordeel', et: 'Hinnang' },
  'Assessment': { de: 'Bewertung', nl: 'Beoordeling', et: 'Hinnang' },
  'Outcome': { de: 'Ergebnis', nl: 'Uitkomst', et: 'Tulemus' },
  'Risk factors': { de: 'Risikofaktoren', nl: 'Risicofactoren', et: 'Riskitegurid' },
  'Species': { de: 'Art', nl: 'Soort', et: 'Liik' },
  'Position': { de: 'Lage', nl: 'Positie', et: 'Asukoht' },
  'DBH / height': { de: 'BHD / Höhe', nl: 'Stamdiameter / hoogte', et: 'Rinnasdiameeter / kõrgus' },
  'Symptoms': { de: 'Symptome', nl: 'Symptomen', et: 'Sümptomid' },
  'Wood-decay fungi': { de: 'Holzzersetzende Pilze', nl: 'Houtrotschimmels', et: 'Puitu lagundavad seened' },
  'Recorded': { de: 'Erfasst', nl: 'Vastgelegd', et: 'Sisestatud' },
  'Reasoning': { de: 'Begründung', nl: 'Onderbouwing', et: 'Põhjendus' },
  'History': { de: 'Verlauf', nl: 'Historie', et: 'Ajalugu' },
  'Outstanding': { de: 'Offen', nl: 'Openstaand', et: 'Pooleli' },
  'trees': { de: 'Bäume', nl: 'bomen', et: 'puud' },
  'Level': { de: 'Stufe', nl: 'Niveau', et: 'Tase' }
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
const COUNTRY_NORM = { EE: 'ee', DE: 'fll', AT: 'onorm', CH: 'vssg', NL: 'bvc', GB: 'quant', US: 'quant' };
function normForCountry(cc) { return COUNTRY_NORM[cc] || null; }
