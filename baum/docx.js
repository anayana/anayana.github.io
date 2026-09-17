/* ============================================================================
   A WORD FILE, WRITTEN BY HAND

   A .docx is a ZIP with XML in it. That is the whole secret, and it means an
   offline app on a phone can write one without a library and without a server:
   four small XML parts, stored - not deflated - in a ZIP this file builds a
   byte at a time.

   Stored, not compressed, because Word does not care and a deflate
   implementation is a week of work to save a few kilobytes on a document that
   is mostly a table. The CRC-32 it does care about, so that is here.

   The same ZIP writer makes an .odt for anybody on LibreOffice, and would make
   an .xlsx. What it will not make is a PDF: a PDF with a usable table means
   laying out text, and the phone already has a renderer that does that
   properly - the browser. So PDF goes through the print dialogue, where the
   inspector picks the paper size and gets their own header and footer.
   ========================================================================= */

/* ---- CRC-32, the one thing a stored ZIP still has to compute ----------- */
let CRC_T = null;
function crcTable() {
  if (CRC_T) return CRC_T;
  CRC_T = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    CRC_T[n] = c >>> 0;
  }
  return CRC_T;
}
function crc32(bytes) {
  const t = crcTable();
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---- the ZIP itself ----------------------------------------------------
   entries: [{ name, data: Uint8Array }] in the order they should be stored.
   Returns a Blob. No directories, no zip64, no compression: a report is never
   four gigabytes and never has a folder Word cares about. */
function zipStore(entries, mime) {
  const enc = new TextEncoder();
  const parts = [], dir = [];
  /* a fixed DOS timestamp: the tools that read these files insist on a valid
     month and day, and the minute a report was zipped is not information */
  const DOSTIME = 0, DOSDATE = ((2020 - 1980) << 9) | (1 << 5) | 1;
  let at = 0;
  const u16 = n => [n & 0xFF, (n >>> 8) & 0xFF];
  const u32 = n => [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF];

  entries.forEach(e => {
    const name = enc.encode(e.name);
    const data = (e.data instanceof Uint8Array) ? e.data : enc.encode(String(e.data));
    const crc = crc32(data);
    const local = [].concat(
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(DOSTIME), u16(DOSDATE),
      u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
    parts.push(new Uint8Array(local), name, data);
    dir.push({ name: name, crc: crc, size: data.length, at: at });
    at += local.length + name.length + data.length;
  });

  const cen = [];
  dir.forEach(d => {
    cen.push(new Uint8Array([].concat(
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(DOSTIME), u16(DOSDATE),
      u32(d.crc), u32(d.size), u32(d.size), u16(d.name.length),
      u16(0), u16(0), u16(0), u16(0), u32(0), u32(d.at))));
    cen.push(d.name);
  });
  const cenSize = cen.reduce((n, b) => n + b.length, 0);
  const end = new Uint8Array([].concat(
    u32(0x06054b50), u16(0), u16(0), u16(dir.length), u16(dir.length),
    u32(cenSize), u32(at), u16(0)));

  return new Blob(parts.concat(cen, [end]),
                  { type: mime || 'application/octet-stream' });
}

/* ---- the document model ------------------------------------------------
   Deliberately small, because a report is a small shape: headings, paragraphs
   and tables. Anything richer belongs in the HTML version.
     { h: 1..3, t }            a heading
     { p, b, i, sz, right }    a paragraph
     { table: [[cell,…],…], head: true, w: [widths] }
     { br: true }              a page break                                 */
function dxEsc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function dxRun(text, o) {
  o = o || {};
  const pr = '<w:rPr>' + (o.b ? '<w:b/>' : '') + (o.i ? '<w:i/>' : '') +
             (o.sz ? '<w:sz w:val="' + (o.sz * 2) + '"/>' : '') +
             (o.grey ? '<w:color w:val="666666"/>' : '') + '</w:rPr>';
  /* a newline inside a cell or a paragraph is a line break, not a new one */
  const bits = String(text == null ? '' : text).split('\n');
  return bits.map((b, n) => '<w:r>' + pr + (n ? '<w:br/>' : '') +
    '<w:t xml:space="preserve">' + dxEsc(b) + '</w:t></w:r>').join('');
}
function dxPara(text, o) {
  o = o || {};
  const jc = o.right ? '<w:jc w:val="right"/>' : '';
  const style = o.h ? '<w:pStyle w:val="Heading' + o.h + '"/>' : '';
  const spacing = '<w:spacing w:before="' + (o.h ? (o.h === 1 ? 240 : 200) : 40) +
                  '" w:after="' + (o.h ? 120 : 40) + '"/>';
  return '<w:p><w:pPr>' + style + spacing + jc + '</w:pPr>' +
         dxRun(text, o) + '</w:p>';
}
function dxCell(text, o, w) {
  o = o || {};
  return '<w:tc><w:tcPr>' + (w ? '<w:tcW w:w="' + w + '" w:type="dxa"/>' : '') +
         (o.shade ? '<w:shd w:val="clear" w:fill="EFEFEF"/>' : '') +
         '</w:tcPr>' + dxPara(text, o) + '</w:tc>';
}
function dxTable(rows, opt) {
  opt = opt || {};
  const w = opt.w || null;
  const body = rows.map((r, n) => '<w:tr>' + r.map((c, k) =>
      dxCell(c, { b: (opt.head && n === 0), shade: (opt.head && n === 0), sz: opt.sz || 9 },
             w ? w[k] : null)).join('') + '</w:tr>').join('');
  return '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>' +
    '<w:tblW w:w="5000" w:type="pct"/>' +
    '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s =>
      '<w:' + s + ' w:val="single" w:sz="4" w:space="0" w:color="999999"/>').join('') +
    '</w:tblBorders></w:tblPr><w:tblGrid>' +
    (w || rows[0].map(() => 1000)).map(x => '<w:gridCol w:w="' + x + '"/>').join('') +
    '</w:tblGrid>' + body + '</w:tbl>';
}
/* A picture, inline in its own paragraph. Word measures in EMU - 914400 to
   the inch - which is why the millimetres a person thinks in are converted
   here rather than anywhere else. */
const EMU_MM = 914400 / 25.4;
function dxImage(rid, wmm, hmm, n) {
  const cx = Math.round(wmm * EMU_MM), cy = Math.round(hmm * EMU_MM);
  return '<w:p><w:pPr><w:spacing w:before="40" w:after="0"/></w:pPr><w:r><w:drawing>' +
    '<wp:inline distT="0" distB="0" distL="0" distR="0" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
    '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
    '<wp:docPr id="' + n + '" name="Picture ' + n + '"/>' +
    '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:nvPicPr><pic:cNvPr id="' + n + '" name="Picture ' + n + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
    '<pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'r:embed="' + rid + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
}
/* data:image/png;base64,… -> the bytes Word wants in the ZIP */
function dxBytes(dataUrl) {
  const i = String(dataUrl || '').indexOf(',');
  if (i < 0) return null;
  const bin = atob(String(dataUrl).slice(i + 1));
  const out = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k);
  return out;
}

function dxBlocks(blocks, media) {
  return blocks.map(b => {
    if (b.br) return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    if (b.img) {
      const bytes = dxBytes(b.img);
      if (!bytes) return '';
      const n = media.length + 1;
      media.push({ name: 'image' + n + '.png', data: bytes });
      return dxImage('rIdImg' + n, b.w || 50, b.h || 20, n);
    }
    if (b.table) return dxTable(b.table, b) + '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>';
    if (b.h) return dxPara(b.t, b);
    return dxPara(b.p, b);
  }).join('');
}

/* ---- the four parts of a .docx ---------------------------------------- */
function docxBlob(blocks, opt) {
  opt = opt || {};
  const media = [];
  const body = dxBlocks(blocks, media);
  const doc =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:body>' + body +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"' + (opt.landscape ? ' w:orient="landscape"' : '') + '/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1417" w:header="709" ' +
    'w:footer="709" w:gutter="0"/></w:sectPr>' +
    '</w:body></w:document>';
  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr>' +
    '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="20"/>' +
    '</w:rPr></w:rPrDefault></w:docDefaults>' +
    /* Normal has to exist and has to be the default: a paragraph with no style
       of its own is otherwise a paragraph with no style at all, and readers
       differ on what they do about that - some fall back, some give up. */
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">' +
    '<w:name w:val="Normal"/><w:qFormat/></w:style>' +
    [['Heading1', 32], ['Heading2', 26], ['Heading3', 22]].map(h =>
      '<w:style w:type="paragraph" w:styleId="' + h[0] + '"><w:name w:val="heading ' +
      h[0].slice(-1) + '"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="' +
      (+h[0].slice(-1) - 1) + '"/></w:pPr><w:rPr><w:b/><w:sz w:val="' + h[1] +
      '"/></w:rPr></w:style>').join('') +
    '<w:style w:type="table" w:default="1" w:styleId="TableGrid">' +
    '<w:name w:val="Table Grid"/><w:tblPr><w:tblCellMar>' +
    '<w:top w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/>' +
    '<w:bottom w:w="40" w:type="dxa"/><w:right w:w="80" w:type="dxa"/>' +
    '</w:tblCellMar></w:tblPr></w:style>' +
    '</w:styles>';
  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';
  const docRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    media.map((m, k) => '<Relationship Id="rIdImg' + (k + 1) + '" Type="http://schemas.openxmlformats.org' +
      '/officeDocument/2006/relationships/image" Target="media/' + m.name + '"/>').join('') +
    '</Relationships>';
  const ct =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    (media.length ? '<Default Extension="png" ContentType="image/png"/>' : '') +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '</Types>';
  return zipStore([
    { name: '[Content_Types].xml', data: ct },
    { name: '_rels/.rels', data: rels },
    { name: 'word/document.xml', data: doc },
    { name: 'word/_rels/document.xml.rels', data: docRels },
    { name: 'word/styles.xml', data: styles }
  ].concat(media.map(m => ({ name: 'word/media/' + m.name, data: m.data }))),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
