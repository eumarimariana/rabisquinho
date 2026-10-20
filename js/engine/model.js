// Blocos → modelo do documento (parágrafos, tabelas e imagens) no estilo do modelo escolhido.
//
// Cada modelo (data/templates.js) escolhe:
//   hdr  "band" | "line" | "center"   — jeito do cabeçalho
//   h1   "box"  | "tab"  | "ribbon"   — jeito do tópico principal (1.0)
//   h2   "box"  | "line"              — jeito do subtópico (1.1) e da linha do tempo
//   foot "band" | "line" | "center"   — jeito do rodapé
//   font, headFont, labelFont, bodySz, indent, upper, bullets, sep
import { R, IMAGES, fullW, colW } from "./state.js";
import { COVER_RATIO } from "./syntax.js";

/** Junta as informações do caderno, com os valores padrão. */
export function infoOf(nb){
  const v = k => String(nb[k] ?? "").trim();
  return {subject:v("subject")||"Matéria", lesson:v("lesson"), prof:v("prof"), year:v("year"), author:v("author"),
    footer:v("footer"), source:v("source")};
}

const run  = (text,o={}) => ({text,...o});
const P    = (runs,o={}) => ({t:"p", runs:[].concat(runs).filter(Boolean), ...o});
const cell = (paras,o={}) => ({paras:[].concat(paras), ...o});
const TB   = (widths,rows,o={}) => ({t:"t", widths, rows, ...o});
const all  = (w,c,st) => ({top:[w,c,st],left:[w,c,st],bottom:[w,c,st],right:[w,c,st]});
const up   = s => R.upper ? s.toUpperCase() : s;
const BF   = () => R.font || "Roboto";          // texto
const HF   = () => R.headFont || BF();           // títulos
const LF   = () => R.labelFont || HF();          // etiquetas das caixas
const H    = sz => Math.round(sz * (R.headScale || 1) * 2) / 2;   // letras cursivas pedem tamanho maior

function base(o={}){ return Object.assign({font:BF(), sz:R.bodySz, color:"#000000"}, o); }
function inl(s, b){
  const re=/\*\*(.+?)\*\*|==(.+?)==|\+\+(.+?)\+\+|__(.+?)__|\{\{(.+?)\}\}|\*(?!\s)(.+?)\*/g;
  const out=[]; let last=0, m;
  while((m=re.exec(s))){
    if(m.index>last) out.push(run(s.slice(last,m.index), b));
    if(m[1]!=null) out.push(run(m[1], {...b, b:true}));
    else if(m[2]!=null) out.push(run(m[2], {...b, hl:R.hl1}));
    else if(m[3]!=null) out.push(run(m[3], {...b, hl:R.hl2}));
    else if(m[4]!=null) out.push(run(m[4], {...b, u:true}));
    else if(m[5]!=null) out.push(run(m[5], {...b, b:true, color:R.key}));
    else out.push(run(m[6], {...b, i:true}));
    last = re.lastIndex;
  }
  if(last<s.length) out.push(run(s.slice(last), b));
  return out;
}
const empty = () => P([], {empty:true});
const label = (text, bg, ink) => run(` ${text} `, {font:LF(), sz:H(9), b:true, color:ink, shade:bg});
const dot = () => R.sepChar || "·";

/* ---------- títulos ---------- */
function mainTitle(b, CW){
  if(R.h1 === "tab")
    return P([run(b.num+"   ", {font:HF(), b:true, sz:H(12), color:R.n1bg}), ...inl(up(b.title), {font:HF(), b:true, sz:H(13), color:R.t1ink})],
      {bd:{left:[6,R.n1bg], bottom:[1.5,R.t1bd]}, shade:R.t1bg, keepNext:true, before:2, after:2});
  if(R.h1 === "ribbon")
    return TB([CW],[[cell(P([run(`${R.mark||"✦"}  ${b.num}   `, {font:HF(), b:true, sz:H(11), color:R.n1bg}),
        ...inl(up(b.title), {font:HF(), b:true, sz:H(13), color:R.t1ink}), run(`   ${R.mark||"✦"}`, {font:HF(), b:true, sz:H(11), color:R.n1bg})], {align:"center"}),
      {bg:R.t1bg, bd:{top:[1.5,R.t1bd,"dashed"], bottom:[1.5,R.t1bd,"dashed"]}, valign:"center"})]], {keep:true});
  const w = 30;
  return TB([w,CW-w],[[
    cell(P(run(b.num, {font:HF(), b:true, color:R.n1ink, sz:H(10.5)}), {align:"center"}), {bg:R.n1bg, bd:all(1.5,R.t1bd), valign:"center"}),
    cell(P(inl(up(b.title), {font:HF(), b:true, color:R.t1ink, sz:H(12)})), {bg:R.t1bg, bd:all(1.5,R.t1bd), valign:"center"})
  ]], {keep:true});
}
function subTitle(b, CW){
  if(R.h2 === "line")
    return P([run(up(b.num)+"   ", {font:HF(), b:true, sz:H(11), color:R.n2bg}), ...inl(up(b.title), {font:HF(), b:true, sz:H(11), color:R.t2ink})],
      {bd:{bottom:[1,R.t2line,"dotted"]}, keepNext:true, after:2});
  const w = b.w;
  return TB([w,CW-w],[[
    cell(P(run(up(b.num), {font:HF(), b:true, color:R.n2ink, sz:H(10)}), {align:"center"}), {bg:R.n2bg,
      bd:{top:[1.5,R.t2line], left:[1,R.n2bd], right:[1,R.n2bd], bottom:[1,R.n2bd]}, valign:"center"}),
    cell(P(inl(up(b.title), {font:HF(), b:true, color:R.t2ink, sz:H(11)})), {bd:{top:[1.5,R.t2line]}, valign:"center"})
  ]], {keep:true});
}

/* ---------- larguras das colunas da tabela ----------
   Cada coluna precisa caber a sua maior palavra (senão ela vaza para a coluna vizinha);
   o espaço que sobra vai para as colunas com mais texto. */
const plain = s => String(s||"").replace(/\*\*|==|\+\+|__|\{\{|\}\}|\*/g, "");
/** Largura do texto em pt, medida com a fonte de verdade (ou estimada, se não der para medir). */
let measureCtx = null;
function textWidth(t, bold, sz){
  try{
    measureCtx = measureCtx || document.createElement("canvas").getContext("2d");
    measureCtx.font = `${bold ? 700 : 400} ${sz}pt "${BF()}", Roboto, Arial, sans-serif`;
    return measureCtx.measureText(t).width * 1.04;              // pequena folga para arredondamentos
  }catch(e){ return t.length * sz * (bold ? 0.66 : 0.58); }
}
/** Palavras que podem quebrar depois de "/" (ex.: "Cliente/Empregador"). */
const breakSlashes = s => String(s||"").replace(/\/(?=\S)/g, "/\u200B");
function tableWidths(rows, CW){
  const n = Math.max(...rows.map(r=>r.length));
  const PAD = 12, sz = R.bodySz;
  const minW = [], want = [];
  for(let c=0; c<n; c++){
    let longest = 0, total = 0;
    rows.forEach((r, ri) => {
      const t = plain(r[c]), bold = ri===0 || c===0, csz = ri===0 || c===0 ? sz : sz - 0.5;
      t.split(/[\s/]+/).forEach(w => longest = Math.max(longest, textWidth(w, bold, csz)));
      total += textWidth(t, bold, csz);
    });
    minW[c] = Math.min(longest + PAD, CW * 0.6);
    want[c] = Math.max(minW[c], total / rows.length + PAD);
  }
  const sumMin = minW.reduce((a,b)=>a+b, 0);
  if(sumMin >= CW) return minW.map(w => w * CW / sumMin);   // nem as palavras cabem: divide na proporção
  const extra = want.map((w,i) => w - minW[i]), sumExtra = extra.reduce((a,b)=>a+b, 0) || 1;
  return minW.map((w,i) => w + (CW - sumMin) * extra[i] / sumExtra);
}

export function bodyModel(blocks, I){
  const CW = colW(), out = [];
  if(R.foot !== "line" && I.source) out.push(P(run(`${dot()} ${I.source.toUpperCase()} ${dot()}`, base({b:true,i:true,color:R.src,sz:R.bodySz-1}))), empty());
  for(const b of blocks){
    switch(b.t){
      case "space": out.push(empty()); break;
      case "pagebreak": out.push({t:"pb"}); break;
      case "img": if(IMAGES[b.id]) out.push({t:"img", id:b.id, w:CW, h:CW/COVER_RATIO}); break;
      case "pic": {
        const im = IMAGES[b.id]; if(!im) break;
        const ratio = (im.h && im.w) ? im.h/im.w : 0.66, maxH = 260;
        let w = CW, h = CW*ratio; if(h > maxH){ h = maxH; w = h/ratio; }
        out.push({t:"img", id:b.id, w, h, center:true, keep:!!b.caption});
        if(b.caption) out.push(P(inl(b.caption, base({i:true, sz:R.bodySz-1, color:"#555555"})), {align:"center", before:2}));
        break;
      }
      case "main": out.push(mainTitle(b, CW)); break;
      case "sub": out.push(subTitle(b, CW)); break;
      case "subsub":
        out.push(P([run(b.num+"  ", {font:HF(), b:true, sz:H(10), color:R.q2ink}), ...inl(up(b.title), {font:HF(), b:true, sz:H(10), color:R.q2ink})],
          {shade:R.q2bg, bd:{bottom:[1,R.q2line]}, keepNext:true}));
        break;
      case "q":
        out.push(TB([CW],[[cell(P(inl(b.text.toUpperCase(), {font:HF(), b:true, color:R.qInk, sz:H(8.5)}),{align:"center"}), {bg:R.q})]], {keep:true}));
        break;
      case "q2":
        out.push(TB([CW],[[cell(P(inl(b.text, {font:HF(), b:true, color:R.q2ink, sz:H(8.5)})), {bg:R.q2bg, bd:{bottom:[1,R.q2line]}})]], {keep:true}));
        break;
      case "imp":
        out.push(TB([CW],[[cell([P(label(b.label,R.impLabel,R.impLabelInk)), P(inl(b.text, base()),{align:"both", firstLine:R.indent||0, before:3})],
          {bg:R.imp, bd:all(1,R.impBd||R.imp,"dashed")})]]));
        break;
      case "alert":
        out.push(TB([CW],[
          [cell(P([run("⚠  ", {font:"Segoe UI Symbol", sz:10, color:R.alertInk}), run(b.label, {font:LF(), b:true, sz:H(9.5), color:R.alertInk})]), {bg:R.alert, bd:all(1,R.alertBd)})],
          [cell(P(inl(b.text, base()),{align:"both", firstLine:R.indent||0}), {bd:all(1,R.alertBd)})]
        ], {keepFirst:true}));
        break;
      case "cur":
        out.push(P([run(String(b.n).padStart(3,"0")+"  "+dot()+"  ", {font:HF(), b:true, sz:H(9.5), color:R.cur}), run("Você sabia?", {font:HF(), b:true, sz:H(9.5), color:"#555555"}),
          run("  "+dot()+"  "+b.title, {font:HF(), sz:H(9.5), color:R.cur})], {bd:{bottom:[1,R.cur]}, after:4}));
        if(b.q) out.push(P(label(b.q, R.curLabel, R.curLabelInk||"#ffffff"), {after:3}));
        if(b.text) out.push(P(inl(b.text, base()), {align:"both", firstLine:R.indent||0}));
        out.push(P([], {empty:true, bd:{bottom:[1.5,R.cur,"dotted"]}}));
        break;
      case "note": out.push(P(inl(b.text, base({b:true,i:true,color:R.src,sz:R.bodySz-1})))); break;
      case "caption":
        out.push(P([run(`Tabela ${b.n}  ${dot()}  `, base({b:true, color:R.key})), ...inl(b.text, base({i:true}))], {align:"center", after:2, keepNext:true}));
        break;
      case "table": {
        const ws = tableWidths(b.rows, CW);
        out.push(TB(ws, b.rows.map((r,ri)=>ws.map((w,ci)=>{
          const head = ri===0, first = ci===0 && !head;
          const st = head ? base({b:true,color:R.thInk}) : first ? base({b:true,color:R.tfInk}) : base({sz:R.bodySz-0.5});
          return cell(P(inl(breakSlashes(r[ci]), st), {align: head||first ? "center" : "left"}),
            {bg: head ? R.th : first ? R.tf : null, bd:all(0.75,R.tbd), valign:"center"});
        }))));
        break;
      }
      case "list":
        for(const it of b.items)
          out.push(P(inl(it.text, it.key ? base({b:true,color:R.key}) : base({sz: it.level===2 ? R.bodySz-1 : R.bodySz})),
            {list:{kind:it.kind, level:it.level, gid:it.gid}, align: it.key ? "left" : "both"}));
        break;
      default: out.push(P(inl(b.text, base()), {align:"both", firstLine:R.indent||0}));
    }
  }
  if(!out.length || out[out.length-1].t!=="p") out.push(empty());
  return out;
}

/* ---------- cabeçalho ---------- */
export function headModel(I){
  const FW = fullW();
  if(R.hdr === "band"){
    const left = [I.year, I.prof].filter(Boolean).join("  |  ").toUpperCase();
    return [
      P(run(R.upper ? I.subject.toUpperCase() : I.subject, {font:HF(), b:!R.headLight, sz:R.titleSz||23, color:R.subj})),
      TB([FW/2, FW/2], [[
        cell(P(run(left, {font:BF(), b:true, sz:8.5, color:R.hdrInk})), {bg:R.hdrBg, bd:{bottom:[1.5,R.rule]}, valign:"center"}),
        cell(P(run(I.lesson.toUpperCase(), {font:BF(), b:true, sz:8.5, color:R.hdrInk2}), {align:"right"}), {bd:{bottom:[1.5,R.rule]}, valign:"center"})
      ]]),
      empty()
    ];
  }
  const title = I.lesson || I.subject;
  if(R.hdr === "center"){
    const info = [I.lesson ? I.subject : "", I.prof, I.footer, I.year].filter(Boolean).join(`   ${dot()}   `);
    return [
      P(run(title, {font:HF(), b:!R.headLight, sz:R.titleSz||24, color:R.subj}), {align:"center"}),
      P(run(info.toUpperCase(), {font:BF(), b:true, sz:8, color:R.hdrInk2}), {align:"center", bd:{bottom:[1.5,R.rule,"dotted"]}, after:2}),
      empty()
    ];
  }
  const cellInfo = (t, o={}) => cell(P(run(t, {font:BF(), b:true, sz:8, color:R.hdrInk2}), {align:o.align||"left"}), {bg:o.bg||null, bd:{bottom:[1.5,R.rule]}, valign:"center"});
  return [
    P(run(title, {font:HF(), b:!R.headLight, sz:R.titleSz||22, color:R.subj}), {bd:{bottom:[1.5,R.rule]}}),
    TB([FW*0.36, FW*0.29, FW*0.25, FW*0.10], [[
      cellInfo(I.lesson ? I.subject : ""), cellInfo(I.footer, {align:"center"}), cellInfo(I.author, {align:"right"}), cellInfo(I.year, {bg:R.yearBg, align:"center"})
    ]]),
    empty()
  ];
}

/* ---------- rodapé ---------- */
export function footModel(I){
  const FW = fullW();
  const page = (o) => [run(o.prefix||"", o), run("1", {...o, field:"PAGE"})];
  const st = {font:BF(), b:true, sz:8};
  if(R.foot === "band"){
    const txt = [I.footer, I.subject, I.prof].filter(Boolean).join("  |  ").toUpperCase();
    const ws = [FW-200, 140, 60];
    return [
      TB(ws, [[
        cell(P(run(txt, {...st, color:R.footInk}), {align:"right"}), {bd:{bottom:[1.5,R.rule]}, valign:"center"}),
        cell(P(run(I.lesson.toUpperCase(), {...st, color:R.footBoxInk}), {align:"center"}), {bg:R.footBox, bd:{bottom:[1.5,R.rule]}, valign:"center"}),
        cell(P(page({...st, color:R.pageInk, prefix:"PÁG. "}), {align:"center"}), {bg:R.pageBg, bd:{bottom:[1.5,R.rule]}, valign:"center"})
      ]]),
      I.author ? P(run(I.author, {font:BF(), sz:8, color:"#666666"})) : empty()
    ];
  }
  if(R.foot === "center"){
    const txt = [I.author, I.lesson || I.subject].filter(Boolean).join(`   ${dot()}   `);
    return [P([run(txt ? txt + `   ${dot()}   ` : "", {...st, b:false, color:R.footInk}), ...page({...st, color:R.footInk, prefix:"página "})],
      {align:"center", bd:{top:[1,R.rule,"dotted"]}, before:4})];
  }
  return [
    TB([FW-190, 160, 30], [[
      cell(P(run(I.author, {font:BF(), sz:8, color:R.footInk}), {align:"right"}), {valign:"center"}),
      cell(P(run(I.lesson || I.subject, {font:HF(), b:true, sz:H(8.5), color:R.footBoxInk}), {align:"center"}), {bg:R.footBox, valign:"center"}),
      cell(P(page({font:BF(), b:true, sz:9, color:R.footInk}), {align:"center"}), {valign:"center"})
    ]]),
    P([run("Referências: ", {font:BF(), b:true, sz:8, color:"#555555"}), run(I.source, {font:BF(), sz:8, color:"#555555"})], {bd:{top:[1,R.footBox]}})
  ];
}
