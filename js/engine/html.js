// Modelo → HTML, para a prévia na tela.
import { R, IMAGES } from "./state.js";

export function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
const SERIF = ["Lora","Times New Roman","Tinos","Playfair Display"], HAND = ["Pacifico","Caveat","Patrick Hand"];
const cssFont = f => { f = f || "Roboto";
  if(f==="Segoe UI Symbol" || f==="Segoe UI Emoji") return `'Segoe UI Symbol','Noto Sans Symbols 2','Apple Symbols',sans-serif`;
  return `'${f}',${SERIF.includes(f) ? "Georgia,serif" : HAND.includes(f) ? "cursive" : "Roboto,Arial,sans-serif"}`; };
function runH(r){
  if(r.field) return `<span class="pg" style="font-family:${cssFont(r.font)};font-size:${r.sz||10}pt;color:${r.color||"#000"};${r.b?"font-weight:700;":""}">1</span>`;
  const bg = r.shade || r.hl;
  const st = `font-family:${cssFont(r.font)};font-size:${r.sz||10}pt;color:${r.color||"#000"};`+
    (r.b?"font-weight:700;":"")+(r.i?"font-style:italic;":"")+(r.u?"text-decoration:underline;":"")+(bg?`background-color:${bg};`:"");
  return `<span style="${st}">${esc(r.text)}</span>`;
}
function bdH(bd){ if(!bd) return ""; return ["top","left","bottom","right"].map(k=>bd[k]?`border-${k}:${bd[k][0]}pt ${bd[k][2]||"solid"} ${bd[k][1]};`:"").join(""); }
export function htmlOf(model){
  const counters = {};
  return model.map(x=>{
    if(x.t==="pb") return "<!--PB-->";
    if(x.t==="img") return `<img ${x.center && !x.keep ? "" : "data-keep "}src="${IMAGES[x.id]?.url||""}" alt="" style="display:block;width:${x.w}pt;height:${x.h}pt;object-fit:cover;${x.center && !x.keep ? "" : "break-after:avoid;"}break-inside:avoid;${x.center?"margin:0 auto;":""}">`;
    if(x.t==="t"){
      const total = x.widths.reduce((a,b)=>a+b,0);
      return `<table ${x.keep ? "data-keep " : ""}style="width:${total}pt;border-collapse:collapse;table-layout:fixed;${x.keep ? "break-after:avoid;" : ""}">`+
        `<colgroup>${x.widths.map(w=>`<col style="width:${w}pt">`).join("")}</colgroup>`+
        x.rows.map(r=>`<tr>${r.map(c=>`<td style="padding:3pt 5pt;vertical-align:${c.valign==="center"?"middle":"top"};${c.bg?`background-color:${c.bg};`:""}${bdH(c.bd)}">${htmlOf(c.paras)}</td>`).join("")}</tr>`).join("")+`</table>`;
    }
    const al = {both:"justify",center:"center",right:"right"}[x.align]||"left";
    let st = `margin:0;line-height:1.15;text-align:${al};${bdH(x.bd)}${x.shade?`background-color:${x.shade};padding:3pt 5pt;`:""}${x.bd?.left?"padding-left:7pt;":""}`;
    if(x.before) st += `padding-top:${x.before}pt;`; if(x.after) st += `padding-bottom:${x.after}pt;`;
    let pre = "";
    if(x.list){
      const L = x.list, left = 22 + L.level*20;
      st += `padding-left:${left}pt;text-indent:-14pt;`;
      let mark;
      if(L.kind==="ol"){
        const k = L.gid+"-"+L.level; counters[k] = (counters[k]||0)+1;
        for(const kk in counters) if(kk.startsWith(L.gid+"-") && +kk.split("-")[1] > L.level) delete counters[kk];
        const n = counters[k]; mark = L.level===0 ? n+"." : L.level===1 ? String.fromCharCode(96+n)+"." : "i".repeat(Math.min(n,3))+".";
      } else mark = R.bullets[L.level];
      pre = `<span style="display:inline-block;width:14pt;text-indent:0;font-family:${cssFont(/[♥✿✦➔☁★]/.test(mark)?"Segoe UI Symbol":R.font)};font-size:${L.level?7:8}pt;color:${R.bulletInk||"#000"};">${mark}</span>`;
    } else if(x.firstLine) st += `text-indent:${x.firstLine}pt;`;
    const body = x.runs.length ? x.runs.map(runH).join("") : `<span style="font-size:${R.bodySz}pt">&nbsp;</span>`;
    if(x.keepNext) st += "break-after:avoid;";
    return `<p ${x.keepNext ? "data-keep " : ""}style="${st}">${pre}${body}</p>`;
  }).join("");
}
