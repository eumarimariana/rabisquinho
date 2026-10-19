// Modelo → arquivo Word (.docx). JSZip é carregado como script global em index.html.
import { R, IMAGES, PAGE, GAP } from "./state.js";
import { parse, notebookText } from "./syntax.js";
import { infoOf, bodyModel, headModel, footModel } from "./model.js";

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const hex = c => c.replace("#","").toUpperCase();
const tw = pt => Math.round(pt*20);
function xesc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

function rPr(r){
  const f = r.font||"Roboto", sz = Math.round((r.sz||10)*2), bg = r.shade || r.hl;
  return `<w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:eastAsia="${f}" w:cs="${f}"/>`+
    (r.b?"<w:b/><w:bCs/>":"")+(r.i?"<w:i/><w:iCs/>":"")+
    `<w:color w:val="${hex(r.color||"#000000")}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`+
    (r.u?'<w:u w:val="single"/>':"")+
    (bg?`<w:shd w:val="clear" w:color="auto" w:fill="${hex(bg)}"/>`:"")+`</w:rPr>`;
}
function rX(r){
  const p = rPr(r);
  if(r.field) return `<w:r>${p}<w:fldChar w:fldCharType="begin"/></w:r><w:r>${p}<w:instrText xml:space="preserve"> ${r.field} </w:instrText></w:r>`+
    `<w:r>${p}<w:fldChar w:fldCharType="separate"/></w:r><w:r>${p}<w:t>1</w:t></w:r><w:r>${p}<w:fldChar w:fldCharType="end"/></w:r>`;
  return `<w:r>${p}<w:t xml:space="preserve">${xesc(r.text)}</w:t></w:r>`;
}
const BSTYLE = {solid:"single", dashed:"dashed", dotted:"dotted"};
function bdX(tag, bd){
  if(!bd) return "";
  const sides = ["top","left","bottom","right"].filter(k=>bd[k]);
  if(!sides.length) return "";
  return `<${tag}>`+sides.map(k=>`<w:${k} w:val="${BSTYLE[bd[k][2]||"solid"]}" w:sz="${Math.round(bd[k][0]*8)}" w:space="${tag==="w:pBdr"?(k==="left"?6:2):0}" w:color="${hex(bd[k][1])}"/>`).join("")+`</${tag}>`;
}
function docxOf(model, numIds){
  return model.map(x=>{
    if(x.t==="pb") return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    if(x.t==="img"){
      const {rid, n} = numIds.img(x.id), cx = Math.round(x.w*12700), cy = Math.round(x.h*12700);
      return `<w:p><w:pPr>${x.center && !x.keep ? "" : "<w:keepNext/>"}<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>${x.center?'<w:jc w:val="center"/>':""}</w:pPr><w:r><w:drawing>`+
        `<wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Capa ${n}"/>`+
        `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`+
        `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${n}" name="capa${n}"/><pic:cNvPicPr/></pic:nvPicPr>`+
        `<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`+
        `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>`+
        `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    }
    if(x.t==="t"){
      const total = x.widths.reduce((a,b)=>a+b,0);
      const mar = `<w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/>`;
      return `<w:tbl><w:tblPr><w:tblW w:w="${tw(total)}" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/>`+
        `<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>`+
        `<w:tblLayout w:type="fixed"/><w:tblCellMar>${mar}</w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr>`+
        `<w:tblGrid>${x.widths.map(w=>`<w:gridCol w:w="${tw(w)}"/>`).join("")}</w:tblGrid>`+
        x.rows.map((r,ri)=>`<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c,ci)=>{
          const bd = c.bd||{};
          const borders = "<w:tcBorders>"+["top","left","bottom","right"].map(k=>bd[k]
            ? `<w:${k} w:val="${BSTYLE[bd[k][2]||"solid"]}" w:sz="${Math.round(bd[k][0]*8)}" w:space="0" w:color="${hex(bd[k][1])}"/>` : `<w:${k} w:val="nil"/>`).join("")+"</w:tcBorders>";
          return `<w:tc><w:tcPr><w:tcW w:w="${tw(x.widths[ci])}" w:type="dxa"/>${borders}`+
            (c.bg?`<w:shd w:val="clear" w:color="auto" w:fill="${hex(c.bg)}"/>`:"")+
            (c.valign==="center"?'<w:vAlign w:val="center"/>':"")+`</w:tcPr>${docxOf(x.keep || (x.keepFirst && ri===0) ? c.paras.map(q=>({...q, keepNext:true})) : c.paras, numIds)}</w:tc>`;
        }).join("")}</w:tr>`).join("")+`</w:tbl>`;
    }
    let ppr = x.keepNext ? "<w:keepNext/>" : "";
    if(x.list){ const L=x.list; ppr += `<w:numPr><w:ilvl w:val="${L.level}"/><w:numId w:val="${L.kind==="ol" ? numIds.ol(L.gid) : 1}"/></w:numPr>`; }
    ppr += bdX("w:pBdr", x.bd);
    if(x.shade) ppr += `<w:shd w:val="clear" w:color="auto" w:fill="${hex(x.shade)}"/>`;
    ppr += `<w:spacing w:before="${tw(x.before||0)}" w:after="${tw(x.after||0)}" w:line="240" w:lineRule="auto"/>`;
    if(x.firstLine && !x.list) ppr += `<w:ind w:firstLine="${tw(x.firstLine)}"/>`;
    ppr += `<w:jc w:val="${x.align||"left"}"/>`;
    if(!x.runs.length) ppr += `<w:rPr><w:sz w:val="${Math.round(R.bodySz*2)}"/></w:rPr>`;
    return `<w:p><w:pPr>${ppr}</w:pPr>${x.runs.map(rX).join("")}</w:p>`;
  }).join("");
}
function numberingX(gids){
  const lvl = (i, fmt, text, font) => `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${xesc(text)}"/><w:lvlJc w:val="left"/>`+
    `<w:pPr><w:ind w:left="${440+i*400}" w:hanging="280"/></w:pPr><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/><w:color w:val="${hex(R.bulletInk||"#000000")}"/><w:sz w:val="${i?12:13}"/></w:rPr></w:lvl>`;
  const bf = c => /[♥✿✦➔☁★]/.test(c) ? "Segoe UI Symbol" : (R.font || "Roboto");
  let x = XML_HEAD+`<w:numbering ${W_NS}>`+
    `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${R.bullets.map((b,i)=>lvl(i,"bullet",b,bf(b))).join("")}</w:abstractNum>`+
    `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${lvl(0,"decimal","%1.","Roboto")}${lvl(1,"lowerLetter","%2.","Roboto")}${lvl(2,"lowerRoman","%3.","Roboto")}</w:abstractNum>`+
    `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>`;
  for(const [gid,id] of gids) x += `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/>`+[0,1,2].map(l=>`<w:lvlOverride w:ilvl="${l}"><w:startOverride w:val="1"/></w:lvlOverride>`).join("")+`</w:num>`;
  return x+`</w:numbering>`;
}

export async function buildDocx(nb){
  const I = infoOf(nb);
  const gids = new Map(), media = new Map();
  const numIds = {
    ol: gid => { if(!gids.has(gid)) gids.set(gid, 2+gids.size); return gids.get(gid); },
    img: id => { if(!media.has(id)) media.set(id, {rid:"rIdImg"+(media.size+1), n:media.size+1}); return media.get(id); },
  };
  const body = docxOf(bodyModel(parse(notebookText(nb)), I), numIds);
  const head = docxOf(headModel(I), numIds);
  const foot = docxOf(footModel(I), numIds);
  const pg = PAGE[R.page];
  const doc = XML_HEAD+`<w:document ${W_NS}><w:body>${body}`+
    `<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/>`+
    `<w:pgSz w:w="${pg.tw}" w:h="${pg.th}"/><w:pgMar w:top="1300" w:right="1440" w:bottom="1300" w:left="1440" w:header="500" w:footer="500" w:gutter="0"/>`+
    `<w:cols w:num="2" w:space="${tw(GAP)}"${R.sep?' w:sep="1"':""}/></w:sectPr></w:body></w:document>`;
  const styles = XML_HEAD+`<w:styles ${W_NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${R.font||"Roboto"}" w:hAnsi="${R.font||"Roboto"}" w:eastAsia="${R.font||"Roboto"}" w:cs="${R.font||"Roboto"}"/><w:sz w:val="${Math.round(R.bodySz*2)}"/><w:szCs w:val="${Math.round(R.bodySz*2)}"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault>`+
    `<w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`+
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>`+
    `<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
  const CT = "application/vnd.openxmlformats-officedocument.wordprocessingml.";
  const types = XML_HEAD+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`+
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>`+
    `<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>`+
    `<Override PartName="/word/document.xml" ContentType="${CT}document.main+xml"/><Override PartName="/word/styles.xml" ContentType="${CT}styles+xml"/>`+
    `<Override PartName="/word/numbering.xml" ContentType="${CT}numbering+xml"/><Override PartName="/word/header1.xml" ContentType="${CT}header+xml"/>`+
    `<Override PartName="/word/footer1.xml" ContentType="${CT}footer+xml"/></Types>`;
  const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/";
  const rels = XML_HEAD+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}officeDocument" Target="word/document.xml"/></Relationships>`;
  const docRels = XML_HEAD+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`+
    `<Relationship Id="rIdS" Type="${REL}styles" Target="styles.xml"/><Relationship Id="rIdN" Type="${REL}numbering" Target="numbering.xml"/>`+
    `<Relationship Id="rIdH" Type="${REL}header" Target="header1.xml"/><Relationship Id="rIdF" Type="${REL}footer" Target="footer1.xml"/>`+
    [...media].map(([id,m])=>`<Relationship Id="${m.rid}" Type="${REL}image" Target="media/capa${m.n}.${IMAGES[id].type==="image/png"?"png":"jpeg"}"/>`).join("")+
    `</Relationships>`;
  const zip = new JSZip();
  zip.file("[Content_Types].xml", types);
  zip.file("_rels/.rels", rels);
  zip.file("word/document.xml", doc);
  zip.file("word/styles.xml", styles);
  zip.file("word/numbering.xml", numberingX(gids));
  zip.file("word/header1.xml", XML_HEAD+`<w:hdr ${W_NS}>${head}</w:hdr>`);
  zip.file("word/footer1.xml", XML_HEAD+`<w:ftr ${W_NS}>${foot}</w:ftr>`);
  zip.file("word/_rels/document.xml.rels", docRels);
  for(const [id,m] of media) zip.file(`word/media/capa${m.n}.${IMAGES[id].type==="image/png"?"png":"jpeg"}`, await IMAGES[id].blob.arrayBuffer());
  return zip.generateAsync({type:"blob", mimeType:CT+"document", compression:"DEFLATE"});
}
export function fileName(nb){
  const base = [nb.subject||"", nb.lesson||""].map(s=>s.trim()).filter(Boolean).join(" - ") || "Minhas notas";
  return base.replace(/[\\/:*?"<>|]+/g," ").replace(/\s+/g," ").trim().slice(0,120)+".docx";
}
