/* ============================================================================
   NORM PROFILES

   Every country writes the same inspection down differently. The German FLL
   guideline asks for vitality after Roloff and a t/R ratio; the Dutch
   boomveiligheidscontrole asks whether the tree is an attentieboom; the
   English-speaking world quantifies the risk as a matrix. The trees are the
   same. Only the paperwork differs.

   So the field list is not code any more, it is data. A profile names which
   fields appear, in which order, under which headings, how often the tree has
   to be seen again, and what the report is called. Adding a country is adding
   an entry here, not a rewrite.

   Where a national method is proprietary - QTRA is licensed by its author,
   TRAQ by the ISA - this file does NOT reproduce its form, its wording or its
   thresholds. The "quantified" profile below is the generic three-factor
   matrix that the literature describes in general terms, and it says so on
   screen. Anyone who needs the real thing buys the licence.
   ========================================================================= */

/* ---- the field library -------------------------------------------------
   One definition per question, reused by every profile that asks it.
   [key, label, type, options] - the same shape fieldRow() already takes. */
/* The same three words the app has always stored, so switching profile never
   orphans a value that is already in the register. */
const SAFE_SCALE = ['adequate', 'restricted', 'not given'];

const FIELDS = {
  /* --- who, when, what kind of visit --- */
  inspection_type: ['inspection_type', 'Inspection type', 'select',
    ['Routine inspection', 'Visual inspection', 'Detailed assessment', 'Post-storm inspection']],
  last_inspection: ['last_inspection', 'Inspection date', 'date'],
  inspector: ['inspector', 'Inspector', 'text'],
  assessment_level: ['assessment_level', 'Assessment level', 'select',
    ['', 'Basic (walk-by)', 'Standard (visual, from the ground)', 'Advanced (instruments)']],

  /* --- condition --- */
  vitality_roloff: ['vitality_roloff', 'Vitality (Roloff 0–3)', 'select', [0, 1, 2, 3]],
  vitality_5: ['vitality_5', 'Vitality', 'select',
    ['', 'good', 'moderate', 'poor', 'dying', 'dead']],
  development_phase: ['development_phase', 'Development phase', 'select',
    ['', 'young', 'maturing', 'mature', 'ageing', 'senescent']],
  crown_dieback_pct: ['crown_dieback_pct', 'Crown dieback (%)', 'number'],
  damage_class: ['damage_class', 'Damage class', 'select',
    ['none', 'slight', 'moderate', 'severe']],

  /* --- the body of the tree --- */
  cavity: ['cavity', 'Cavity / decay pocket', 'select', ['no', 'yes']],
  wall_t_cm: ['wall_t_cm', 'Residual wall t (cm)', 'number'],
  radius_r_cm: ['radius_r_cm', 'Stem radius R (cm)', 'number'],
  stability: ['stability', 'Stability (uprooting)', 'select', SAFE_SCALE],
  breakage_resistance: ['breakage_resistance', 'Breakage resistance', 'select', SAFE_SCALE],

  /* --- what is underneath --- */
  target_type: ['target_type', 'Target', 'select',
    ['none', 'path', 'road', 'parking', 'building', 'playground', 'other']],
  target_distance_m: ['target_distance_m', 'Distance to target (m)', 'number'],
  target_occupancy: ['target_occupancy', 'Use of the target', 'select',
    ['', 'rarely used', 'occasional', 'frequent', 'constant']],

  /* --- the verdict, German/Austrian/Swiss shape --- */
  traffic_safety: ['traffic_safety', 'Traffic safety', 'select', SAFE_SCALE],

  /* --- the verdict, Dutch shape --------------------------------------
     A boomveiligheidscontrole ends in one of a small set of words, and the
     word decides what happens next. */
  bvc_result: ['bvc_result', 'Result of the safety check', 'select',
    ['', 'no findings', 'attention tree', 'risk tree', 'further investigation needed']],
  duty_of_care: ['duty_of_care', 'Duty of care', 'select',
    ['', 'standard', 'raised']],

  /* --- the verdict, quantified shape ---------------------------------
     The generic three factors. Not a licensed method: see the header. */
  prob_failure: ['prob_failure', 'Likelihood of failure', 'select',
    ['', 'improbable', 'possible', 'probable', 'imminent']],
  prob_impact: ['prob_impact', 'Likelihood of impacting the target', 'select',
    ['', 'very low', 'low', 'medium', 'high']],
  consequence: ['consequence', 'Consequence of impact', 'select',
    ['', 'negligible', 'minor', 'significant', 'severe']],
  part_size: ['part_size', 'Size of the part likely to fail', 'select',
    ['', '< 25 mm', '25–100 mm', '100–450 mm', '> 450 mm']],

  /* --- the verdict, Estonian shape ------------------------------------
     A dendrological inventory in Estonia ends in a value class from I (of
     particular value) to V (to be removed) and one word on what to do. */
  value_class: ['value_class', 'Value class', 'select', ['', 'I', 'II', 'III', 'IV', 'V']],
  /* Finnish municipal registers grade a tree 1 to 4 by eye */
  condition_class: ['condition_class', 'Condition class', 'select', ['', '1', '2', '3', '4']],
  recommendation: ['recommendation', 'Recommendation', 'select',
    ['', 'keep', 'maintain', 'remove', 'replace']],

  /* --- what now --- */
  urgency: ['urgency', 'Urgency', 'select',
    ['none', 'next growing season', '3 months', '1 month', 'immediate']],
  actions: ['actions', 'Actions', 'list'],
  interval_months: ['interval_months', 'Interval (months)', 'number'],
  next_inspection: ['next_inspection', 'Next inspection', 'date'],
  remarks: ['remarks', 'Remarks', 'area']
};

/* ---- the profiles ---------------------------------------------------- */

const NORMS = [
  {
    id: 'fll', cc: 'DE', flag: '🇩🇪',
    label: 'Germany — FLL tree inspection guidelines',
    source: 'FLL, Richtlinien für Baumkontrollen zur Überprüfung der Verkehrssicherheit, 3rd ed. 2020',
    note: 'Regelkontrolle from the ground, visually, by a qualified inspector. ' +
          'Vitality after Roloff, residual wall thickness as t/R.',
    defaultInterval: 12,
    verdict: 'traffic_safety',
    quick: ['tag_no', 'species', 'dbh_cm', 'vitality_roloff', 'crown_dieback_pct',
            'damage_class', 'traffic_safety', 'urgency', 'remarks'],
    groups: [
      ['Inspection', ['inspection_type', 'last_inspection', 'inspector']],
      ['Condition', ['vitality_roloff', 'crown_dieback_pct', 'damage_class']],
      ['Stem and root plate', ['cavity', 'wall_t_cm', 'radius_r_cm', 'stability', 'breakage_resistance']],
      ['Target', ['target_type', 'target_distance_m', 'target_occupancy']],
      ['Verdict', ['traffic_safety', 'urgency', 'actions', 'interval_months', 'next_inspection', 'remarks']]
    ],
    reportTitle: 'Baumkontrollprotokoll (FLL)'
  },
  {
    id: 'onorm', cc: 'AT', flag: '🇦🇹',
    label: 'Austria — ÖNORM L 1122',
    source: 'ÖNORM L 1122:2024-06-15, Baumkontrolle und Baumpflege',
    note: 'Assessment from the ground without instruments; the standard sets the ' +
          'intervals by development phase and regulates the written findings.',
    defaultInterval: 12,
    verdict: 'traffic_safety',
    quick: ['tag_no', 'species', 'dbh_cm', 'development_phase', 'vitality_roloff',
            'damage_class', 'traffic_safety', 'urgency', 'remarks'],
    groups: [
      ['Kontrolle', ['inspection_type', 'last_inspection', 'inspector']],
      ['Zustand', ['development_phase', 'vitality_roloff', 'crown_dieback_pct', 'damage_class']],
      ['Stamm und Wurzelanlauf', ['cavity', 'wall_t_cm', 'radius_r_cm', 'stability', 'breakage_resistance']],
      ['Umfeld', ['target_type', 'target_distance_m', 'target_occupancy']],
      ['Befund', ['traffic_safety', 'urgency', 'actions', 'interval_months', 'next_inspection', 'remarks']]
    ],
    reportTitle: 'Baumkontrollbefund (ÖNORM L 1122)'
  },
  {
    id: 'vssg', cc: 'CH', flag: '🇨🇭',
    label: 'Switzerland — VSSG recommendation',
    source: 'VSSG, Merkblatt Baumkontrolle im Siedlungsgebiet',
    note: 'Recommendation rather than a binding norm; close to the German practice.',
    defaultInterval: 12,
    verdict: 'traffic_safety',
    quick: ['tag_no', 'species', 'dbh_cm', 'vitality_roloff', 'damage_class',
            'traffic_safety', 'urgency', 'remarks'],
    groups: [
      ['Kontrolle', ['inspection_type', 'last_inspection', 'inspector']],
      ['Zustand', ['vitality_roloff', 'crown_dieback_pct', 'damage_class']],
      ['Stamm', ['cavity', 'wall_t_cm', 'radius_r_cm', 'stability', 'breakage_resistance']],
      ['Umfeld', ['target_type', 'target_distance_m', 'target_occupancy']],
      ['Befund', ['traffic_safety', 'urgency', 'actions', 'interval_months', 'next_inspection', 'remarks']]
    ],
    reportTitle: 'Baumkontrolle (VSSG)'
  },
  {
    id: 'bvc', cc: 'NL', flag: '🇳🇱',
    label: 'Netherlands — Boomveiligheidscontrole (Handboek Bomen)',
    source: 'Norminstituut Bomen, Handboek Bomen; zorgplicht under the Burgerlijk Wetboek',
    note: 'VTA-based safety check. Standard cycle every three to four years; ' +
          'annually where a raised duty of care applies. The check ends in one word: ' +
          'no findings, attention tree, risk tree, or further investigation.',
    defaultInterval: 36,
    verdict: 'bvc_result',
    quick: ['tag_no', 'species', 'dbh_cm', 'vitality_5', 'damage_class',
            'bvc_result', 'urgency', 'remarks'],
    groups: [
      ['Controle', ['inspection_type', 'last_inspection', 'inspector', 'duty_of_care']],
      ['Conditie', ['vitality_5', 'crown_dieback_pct', 'damage_class']],
      ['Stam en wortels', ['cavity', 'wall_t_cm', 'radius_r_cm', 'stability', 'breakage_resistance']],
      ['Omgeving', ['target_type', 'target_distance_m', 'target_occupancy']],
      ['Uitkomst', ['bvc_result', 'urgency', 'actions', 'interval_months', 'next_inspection', 'remarks']]
    ],
    reportTitle: 'Boomveiligheidscontrole (BVC)'
  },
  {
    id: 'ee', cc: 'EE', flag: '🇪🇪',
    label: 'Estonia — Tallinn greenery inventory',
    source: 'Tallinna Linnavalitsuse määrus nr 15 (10.06.2020), Haljastuse inventeerimise kord; ' +
            'Riigi Teataja, Puittaimestiku ja haljastuse inventeerimise kord',
    note: 'Inventory as a dendrologist delivers it: species, girth at 1.3 m, height, crown, ' +
          'condition, a value class from I to V and a recommendation. There is no separate ' +
          'traffic-safety verdict; the value class and the recommendation carry it.',
    defaultInterval: 12,
    verdict: 'value_class',
    quick: ['tag_no', 'species', 'girth_cm', 'height_m', 'crown_d_m', 'vitality_5',
            'damage_class', 'value_class', 'recommendation', 'remarks'],
    groups: [
      ['Inspection', ['last_inspection', 'inspector']],
      ['Measurements', ['girth_cm', 'height_m', 'crown_d_m']],
      ['Condition', ['vitality_5', 'crown_dieback_pct', 'damage_class', 'cavity']],
      ['Target', ['target_type', 'target_distance_m']],
      ['Assessment', ['value_class', 'recommendation', 'urgency', 'actions',
                      'interval_months', 'next_inspection', 'remarks']]
    ],
    reportTitle: 'Puittaimestiku inventeerimise aruanne'
  },
  {
    id: 'fi', cc: 'FI', flag: '🇫🇮',
    label: 'Finland — municipal tree register',
    source: 'Municipal practice (Tampere, Helsinki): visual condition class 1–4; Viherympäristöliitto guidance, KAM ’19 valuation',
    note: 'Finland has no statutory single-tree inspection standard. Cities keep a register with ' +
          'species, girth, height, crown, planting year and a condition class from 1 (good) to 4 ' +
          '(poor) assessed by eye, with a measure and its urgency.',
    defaultInterval: 12,
    verdict: 'condition_class',
    quick: ['tag_no', 'species', 'girth_cm', 'height_m', 'crown_d_m', 'condition_class',
            'damage_class', 'recommendation', 'urgency', 'remarks'],
    groups: [
      ['Inspection', ['last_inspection', 'inspector']],
      ['Measurements', ['girth_cm', 'height_m', 'crown_d_m']],
      ['Condition', ['condition_class', 'crown_dieback_pct', 'damage_class', 'cavity']],
      ['Target', ['target_type', 'target_distance_m']],
      ['Assessment', ['recommendation', 'urgency', 'actions', 'interval_months', 'next_inspection', 'remarks']]
    ],
    reportTitle: 'Puiden kuntoarviointiraportti'
  },
  {
    id: 'eac', cc: 'EU', flag: '🇪🇺',
    label: 'Europe — European Tree Assessment Standard',
    source: 'European Arboricultural Council, ECoST — Tree Assessment Standard, published February 2025',
    note: 'The harmonised European standard, drafted by experts from eleven countries. ' +
          'Useful as the default where a country has no national method of its own.',
    defaultInterval: 12,
    verdict: 'traffic_safety',
    quick: ['tag_no', 'species', 'dbh_cm', 'assessment_level', 'vitality_5',
            'damage_class', 'traffic_safety', 'urgency', 'remarks'],
    groups: [
      ['Assessment', ['assessment_level', 'last_inspection', 'inspector']],
      ['Condition', ['vitality_5', 'development_phase', 'crown_dieback_pct', 'damage_class']],
      ['Stem and roots', ['cavity', 'wall_t_cm', 'radius_r_cm', 'stability', 'breakage_resistance']],
      ['Target', ['target_type', 'target_distance_m', 'target_occupancy']],
      ['Outcome', ['traffic_safety', 'urgency', 'actions', 'interval_months', 'next_inspection', 'remarks']]
    ],
    reportTitle: 'Tree Assessment Record (EAC)'
  },
  {
    id: 'quant', cc: 'XX', flag: '🌐',
    label: 'Quantified risk (generic three-factor matrix)',
    source: 'Generic. NOT QTRA and NOT ISA TRAQ — both are licensed methods with their own ' +
            'forms and thresholds. Use this only where no licensed method is required.',
    note: 'Risk from likelihood of failure × likelihood of impact × consequence, ' +
          'the shape used in the English-speaking world. The wording here is generic; ' +
          'if your client demands QTRA or TRAQ, buy the licence and use their form.',
    defaultInterval: 12,
    verdict: 'risk_rating',
    quick: ['tag_no', 'species', 'dbh_cm', 'vitality_5', 'prob_failure',
            'prob_impact', 'consequence', 'urgency', 'remarks'],
    groups: [
      ['Assessment', ['assessment_level', 'last_inspection', 'inspector']],
      ['Condition', ['vitality_5', 'crown_dieback_pct', 'damage_class']],
      ['Stem and roots', ['cavity', 'wall_t_cm', 'radius_r_cm']],
      ['Risk factors', ['part_size', 'prob_failure', 'target_type', 'target_distance_m',
                        'target_occupancy', 'prob_impact', 'consequence']],
      ['Outcome', ['urgency', 'actions', 'interval_months', 'next_inspection', 'remarks']]
    ],
    reportTitle: 'Tree Risk Assessment Record'
  },
  {
    id: 'generic', cc: 'XX', flag: '📋',
    label: 'No national standard — plain record',
    source: 'For countries with no tree inspection standard of their own.',
    note: 'The smallest defensible record: who looked, when, what they saw, what has ' +
          'to happen, when to come back. Everything a court asks for and nothing else.',
    defaultInterval: 12,
    verdict: 'traffic_safety',
    quick: ['tag_no', 'species', 'dbh_cm', 'vitality_5', 'damage_class',
            'traffic_safety', 'urgency', 'remarks'],
    groups: [
      ['Inspection', ['last_inspection', 'inspector']],
      ['Condition', ['vitality_5', 'crown_dieback_pct', 'damage_class', 'cavity']],
      ['Target', ['target_type', 'target_distance_m', 'target_occupancy']],
      ['Outcome', ['traffic_safety', 'urgency', 'actions', 'interval_months', 'next_inspection', 'remarks']]
    ],
    reportTitle: 'Tree inspection record'
  }
];

function normById(id) { return NORMS.find(n => n.id === id) || NORMS[0]; }

/* Every field any profile can ask for, so the CSV writer and the importer
   know the full vocabulary regardless of which profile is switched on. */
function allNormKeys() {
  const seen = {};
  NORMS.forEach(n => n.groups.forEach(g => g[1].forEach(k => { seen[k] = 1; })));
  return Object.keys(seen);
}
