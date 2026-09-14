/* ============================================================================
   EXAMPLE REGISTERS

   Five small files, one per country, each shaped like that municipality's real
   export: the column names, the separator, the date format, the units, the
   quirks. Berlin gives you a stem girth in centimetres and no diameter at all;
   New York gives a diameter in inches and calls it tree_dbh; Amsterdam writes
   the species in two columns; London ships eastings next to longitudes.

   THE ROWS ARE INVENTED. Nothing here is a real tree, and none of these
   numbers describes a real inspection. The column names are the real ones,
   which is the entire point: they are what the column reader has to cope with.
   Positions sit in the right city so the map looks sane.
   ========================================================================= */

const SAMPLES = [
  {
    id: 'berlin', flag: '🇩🇪', label: 'Berlin — Straßenbaumbestand',
    fmt: 'GeoJSON, German columns, girth only', n: 10, file: 'berlin_beispiel.geojson',
    text: () => JSON.stringify({
      type: 'FeatureCollection',
      features: [
        ['00101', 'Winterlinde', 'Tilia cordata', 'Argentinische Allee', '12a', 1968, 168, 14, 'Steglitz-Zehlendorf', 8.5, 13.2402, 52.4281],
        ['00102', 'Winterlinde', 'Tilia cordata', 'Argentinische Allee', '14', 1968, 154, 13, 'Steglitz-Zehlendorf', 7.5, 13.2405, 52.4282],
        ['00103', 'Stiel-Eiche', 'Quercus robur', 'Argentinische Allee', '18', 1931, 268, 19, 'Steglitz-Zehlendorf', 12.0, 13.2411, 52.4284],
        ['00104', 'Spitz-Ahorn', 'Acer platanoides', 'Am Waldrand', '3', 1985, 96, 11, 'Steglitz-Zehlendorf', 6.0, 13.2418, 52.4288],
        ['00105', 'Rot-Buche', 'Fagus sylvatica', 'Am Waldrand', '7', 1954, 212, 21, 'Steglitz-Zehlendorf', 11.0, 13.2423, 52.4291],
        ['00106', 'Hänge-Birke', 'Betula pendula', 'Am Waldrand', '11', 1992, 78, 12, 'Steglitz-Zehlendorf', 5.0, 13.2427, 52.4293],
        ['00107', 'Gemeine Esche', 'Fraxinus excelsior', 'Zum Heckeshorn', '2', 1976, 142, 16, 'Steglitz-Zehlendorf', 8.0, 13.2432, 52.4296],
        ['00108', 'Berg-Ahorn', 'Acer pseudoplatanus', 'Zum Heckeshorn', '6', 1976, 136, 15, 'Steglitz-Zehlendorf', 7.5, 13.2436, 52.4298],
        ['00109', 'Rosskastanie', 'Aesculus hippocastanum', 'Zum Heckeshorn', '10', 1949, 244, 17, 'Steglitz-Zehlendorf', 11.5, 13.2441, 52.4301],
        ['00110', 'Schwarz-Erle', 'Alnus glutinosa', 'Uferweg', '', 1998, 88, 12, 'Steglitz-Zehlendorf', 5.5, 13.2446, 52.4304]
      ].map((r, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r[10], r[11]] },
        properties: {
          gml_id: 's_wfs_baumbestand.' + (900000 + i),
          baumid: 'BB' + (900000 + i),
          kennzeich: r[0], standortnr: String(1200 + i),
          art_dtsch: r[1], art_bot: r[2],
          gattung_dtsch: r[1].split('-')[0], gattung: r[2].split(' ')[0],
          strname: r[3], hausnr: r[4],
          pflanzjahr: r[5], standalter: 2026 - r[5],
          stammumfg: r[6], baumhoehe: r[7], kronedurch: r[9],
          bezirk: r[8], eigentuemer: 'Land Berlin'
        }
      }))
    }, null, 1)
  },

  {
    id: 'wien', flag: '🇦🇹', label: 'Wien — Baumkataster',
    fmt: 'CSV, semicolon, Austrian columns', n: 10, file: 'wien_beispiel.csv',
    text: () => [
      'OBJECTID;BAUMNUMMER;GEBIET;STRASSE;GATTUNG_ART;PFLANZJAHR;STAMMUMFANG;KRONENDURCHMESSER;BAUMHOEHE;LAENGE;BREITE',
      '48201;0421;1020 Leopoldstadt;Praterstern;Platanus x acerifolia;1964;212;14;18;16.3915;48.2183',
      '48202;0422;1020 Leopoldstadt;Praterstern;Platanus x acerifolia;1964;198;13;17;16.3919;48.2184',
      '48203;0423;1020 Leopoldstadt;Hauptallee;Aesculus hippocastanum;1928;276;16;21;16.3961;48.2101',
      '48204;0424;1020 Leopoldstadt;Hauptallee;Aesculus hippocastanum;1928;301;17;22;16.3967;48.2098',
      '48205;0425;1020 Leopoldstadt;Hauptallee;Tilia cordata;1991;104;9;11;16.3972;48.2095',
      '48206;0426;1030 Landstraße;Rennweg;Acer platanoides;1978;138;11;13;16.3902;48.1946',
      '48207;0427;1030 Landstraße;Rennweg;Acer platanoides;1978;126;10;12;16.3906;48.1944',
      '48208;0428;1030 Landstraße;Ungargasse;Fraxinus excelsior;1955;186;13;16;16.3874;48.1971',
      '48209;0429;1030 Landstraße;Ungargasse;Sophora japonica;2001;72;7;8;16.3878;48.1969',
      '48210;0430;1030 Landstraße;Ungargasse;Celtis australis;2001;68;6;8;16.3882;48.1967'
    ].join('\r\n')
  },

  {
    id: 'amsterdam', flag: '🇳🇱', label: 'Amsterdam — Bomen',
    fmt: 'CSV, comma, Dutch columns, diameter class', n: 10, file: 'amsterdam_voorbeeld.csv',
    text: () => [
      'OBJECTNUMMER,BOOMNUMMER,BOOMSOORT,SOORTNAAM_NL,PLANTJAAR,STAMDIAMETER,BOOMHOOGTE,BUURT,BEHEERDER,LNG,LAT',
      '1203301,AM-0001,Ulmus hollandica,Iep,1962,58,16,Jordaan,Stadsdeel Centrum,4.8812,52.3752',
      '1203302,AM-0002,Ulmus hollandica,Iep,1962,54,15,Jordaan,Stadsdeel Centrum,4.8816,52.3754',
      '1203303,AM-0003,Platanus x acerifolia,Plataan,1951,71,19,Jordaan,Stadsdeel Centrum,4.8821,52.3757',
      '1203304,AM-0004,Tilia europaea,Linde,1984,36,12,Westerpark,Stadsdeel West,4.8709,52.3866',
      '1203305,AM-0005,Tilia europaea,Linde,1984,33,11,Westerpark,Stadsdeel West,4.8712,52.3868',
      '1203306,AM-0006,Salix alba,Wilg,1997,44,14,Westerpark,Stadsdeel West,4.8716,52.3871',
      '1203307,AM-0007,Populus nigra,Populier,1948,88,24,Oost,Stadsdeel Oost,4.9265,52.3601',
      '1203308,AM-0008,Populus nigra,Populier,1948,92,25,Oost,Stadsdeel Oost,4.9269,52.3603',
      '1203309,AM-0009,Acer campestre,Veldesdoorn,2006,21,7,Oost,Stadsdeel Oost,4.9273,52.3605',
      '1203310,AM-0010,Alnus glutinosa,Zwarte els,2006,24,8,Oost,Stadsdeel Oost,4.9277,52.3607'
    ].join('\r\n')
  },

  {
    id: 'london', flag: '🇬🇧', label: 'London — Street Trees',
    fmt: 'CSV, comma, eastings beside longitudes', n: 10, file: 'london_sample.csv',
    text: () => [
      'gla_tree_group,borough,species_name,common_name,display_name,load_date,easting,northing,longitude,latitude',
      'TG-100231,Camden,Platanus x hispanica,London plane,Plane (London),15/03/2024,529980,182110,-0.1278,51.5205',
      'TG-100232,Camden,Platanus x hispanica,London plane,Plane (London),15/03/2024,529992,182118,-0.1276,51.5206',
      'TG-100233,Camden,Tilia x europaea,Common lime,Lime (Common),15/03/2024,530010,182130,-0.1273,51.5207',
      'TG-100234,Camden,Fraxinus excelsior,Ash,Ash,15/03/2024,530030,182141,-0.1270,51.5208',
      'TG-100235,Islington,Betula pendula,Silver birch,Birch (Silver),02/11/2023,531240,183020,-0.1092,51.5284',
      'TG-100236,Islington,Betula pendula,Silver birch,Birch (Silver),02/11/2023,531251,183028,-0.1090,51.5285',
      'TG-100237,Islington,Sorbus aria,Whitebeam,Whitebeam,02/11/2023,531263,183035,-0.1089,51.5285',
      'TG-100238,Southwark,Quercus robur,English oak,Oak (English),21/06/2024,532880,179410,-0.0876,51.4956',
      'TG-100239,Southwark,Quercus robur,English oak,Oak (English),21/06/2024,532893,179419,-0.0874,51.4957',
      'TG-100240,Southwark,Carpinus betulus,Hornbeam,Hornbeam,21/06/2024,532905,179427,-0.0872,51.4958'
    ].join('\r\n')
  },

  {
    id: 'tallinn', flag: '🇪🇪', label: 'Tallinn — Maa-amet single-tree model',
    fmt: 'GeoJSON as an ArcGIS query returns it, Estonian columns, no species', n: 10, file: 'tallinn_naidis.geojson',
    /* What Estonia actually publishes for every tree in a city is not an
       inspection register but a laser-scanning product: crown, height, trunk
       position, coniferous or deciduous - and nothing a dendrologist wrote.
       This is that shape, with a few inventory columns of the kind Tallinn's
       own regulation asks for (liik, ümbermõõt at 1.3 m, seisund) on top, as
       a project inventory delivers them. */
    text: () => JSON.stringify({
      type: 'FeatureCollection',
      features: [
        ['TLN-0001', 'Tilia cordata', 'Harilik pärn', 14.2, 7.1, 156, 'hea', 'Kadriorg', 24.7911, 59.4383],
        ['TLN-0002', 'Tilia cordata', 'Harilik pärn', 13.8, 6.8, 149, 'hea', 'Kadriorg', 24.7915, 59.4384],
        ['TLN-0003', 'Quercus robur', 'Harilik tamm', 19.5, 12.4, 262, 'rahuldav', 'Kadriorg', 24.7921, 59.4386],
        ['TLN-0004', 'Acer platanoides', 'Harilik vaher', 11.1, 5.9, 98, 'hea', 'Kadriorg', 24.7926, 59.4388],
        ['TLN-0005', 'Betula pendula', 'Arukask', 16.0, 6.2, 112, 'rahuldav', 'Kadriorg', 24.7931, 59.4390],
        ['TLN-0006', 'Picea abies', 'Harilik kuusk', 17.3, 5.1, 131, 'hea', 'Kadriorg', 24.7936, 59.4392],
        ['TLN-0007', 'Ulmus glabra', 'Künnapuu', 15.4, 9.0, 178, 'halb', 'Kadriorg', 24.7941, 59.4394],
        ['TLN-0008', 'Populus tremula', 'Harilik haab', 18.2, 7.7, 141, 'rahuldav', 'Kadriorg', 24.7946, 59.4396],
        ['TLN-0009', 'Fraxinus excelsior', 'Harilik saar', 14.9, 8.3, 166, 'halb', 'Kadriorg', 24.7951, 59.4398],
        ['TLN-0010', 'Sorbus aucuparia', 'Harilik pihlakas', 7.6, 3.9, 54, 'hea', 'Kadriorg', 24.7956, 59.4400]
      ].map((r, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r[8], r[9]] },
        properties: {
          objectid: 5001 + i, puu_id: r[0],
          korgus: r[3], vora_labimoot: r[4], skaneerimise_aasta: 2023,
          puutyyp: r[1] === 'Picea abies' ? 'okaspuu' : 'lehtpuu',
          liik: r[1], liik_eesti: r[2], umbermoot: r[5], seisund: r[6],
          inventeerimise_kuupaev: '14.05.2024', inventeerija: 'dendroloog',
          asum: r[7]
        }
      }))
    }, null, 1)
  },

  {
    id: 'nyc', flag: '🇺🇸', label: 'New York — Street Tree Census',
    fmt: 'CSV, comma, diameter in inches, health words', n: 10, file: 'nyc_sample.csv',
    text: () => [
      'tree_id,block_id,created_at,tree_dbh,stump_diam,curb_loc,status,health,spc_latin,spc_common,address,zipcode,boroname,latitude,longitude',
      '190422,348711,2015-08-27,11,0,OnCurb,Alive,Fair,Platanus x acerifolia,London planetree,108-005 70 AVENUE,11375,Queens,40.7231,-73.8444',
      '190423,348711,2015-08-27,14,0,OnCurb,Alive,Good,Platanus x acerifolia,London planetree,108-007 70 AVENUE,11375,Queens,40.7233,-73.8442',
      '190424,348712,2015-08-28,6,0,OnCurb,Alive,Good,Gleditsia triacanthos var. inermis,honeylocust,108-011 70 AVENUE,11375,Queens,40.7235,-73.8440',
      '190425,348712,2015-08-28,3,0,OffsetFromCurb,Alive,Fair,Pyrus calleryana,Callery pear,108-015 70 AVENUE,11375,Queens,40.7237,-73.8438',
      '190426,349004,2015-09-02,21,0,OnCurb,Alive,Good,Quercus palustris,pin oak,1 PROSPECT PARK WEST,11215,Brooklyn,40.6710,-73.9704',
      '190427,349004,2015-09-02,24,0,OnCurb,Alive,Fair,Quercus palustris,pin oak,3 PROSPECT PARK WEST,11215,Brooklyn,40.6712,-73.9702',
      '190428,349005,2015-09-03,0,18,OnCurb,Stump,,Acer platanoides,Norway maple,7 PROSPECT PARK WEST,11215,Brooklyn,40.6714,-73.9700',
      '190429,351220,2015-09-15,9,0,OnCurb,Alive,Poor,Tilia americana,American linden,250 W 90 STREET,10024,Manhattan,40.7905,-73.9740',
      '190430,351220,2015-09-15,16,0,OnCurb,Alive,Good,Ginkgo biloba,ginkgo,254 W 90 STREET,10024,Manhattan,40.7907,-73.9738',
      '190431,351221,2015-09-16,12,0,OnCurb,Dead,,Ulmus americana,American elm,258 W 90 STREET,10024,Manhattan,40.7909,-73.9736'
    ].join('\r\n')
  }
];
