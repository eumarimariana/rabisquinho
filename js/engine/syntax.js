// Sintaxe do texto: transforma as linhas escritas em blocos (tópicos, listas, caixas, tabelas...).
/** Linha de texto que coloca uma capa acima do capítulo seguinte. */
export const coverLine = id => `[capa:${id}]`;
export const COVER_RE = /^\[capa:([A-Za-z0-9_-]+)\]$/;
export const coverIdOf = line => (String(line).trim().match(COVER_RE) || [])[1] || null;
export const COVER_RATIO = 3; // largura ÷ altura da faixa
/** Linha de texto com uma imagem no meio das anotações (legenda opcional). */
export const pictureLine = (id, caption="") => `[imagem:${id}${caption ? " | "+caption : ""}]`;
export const PIC_RE = /^\[imagem:([A-Za-z0-9_-]+)\s*(?:\|\s*(.*?))?\s*\]$/;
/** Texto "limpo", sem os símbolos de formatação (para a busca). */
export function plainText(line){
  return String(line).trim().replace(COVER_RE, "").replace(PIC_RE, "$2").replace(/^\||\|$/g, "")
    .replace(/^\s*(#{1,3}|\?!|\?\?|\?|!!!|>>|>|@|-|\*|•|!|\d+[.)])\s*/, "")
    .replace(/\*\*|==|\+\+|__|\{\{|\}\}|\*/g, "").replace(/\s*\|\s*/g, " · ").trim();
}

/** Linha que separa uma página da outra dentro do texto do caderno. */
export const PAGE_MARK = "<<<nova-pagina>>>";
/** Texto completo do caderno, com todas as páginas. */
export function notebookText(nb){
  return Array.isArray(nb.pages) && nb.pages.length ? nb.pages.map(p=>p.text||"").join(`\n${PAGE_MARK}\n`) : (nb.text||"");
}

export function parse(src){
  const lines = src.replace(/\r/g,"").split("\n");
  const out = [];
  let main=0, sub=0, subsub=0, i=0, cur=0, tab=0, gid=0;
  const space = () => { if(out.length && out[out.length-1].t!=="space") out.push({t:"space"}); };
  const split = (s, n) => { const p = s.split("|").map(x=>x.trim()); return p.length>n ? [...p.slice(0,n-1), p.slice(n-1).join(" | ")] : p; };
  while(i<lines.length){
    const raw = lines[i], t = raw.trim(); let m;
    i++;
    if(raw === PAGE_MARK){ while(out.length && out[out.length-1].t==="space") out.pop(); out.push({t:"pagebreak"}); continue; }
    if(!t){ space(); continue; }
    if((m=t.match(/^###\s+(.*)/))){ subsub++; space(); out.push({t:"subsub", num:`${Math.max(main,1)}.${Math.max(sub,1)}.${subsub}`, title:m[1]}); space(); continue; }
    if((m=t.match(/^##\s+(.*)/))){ sub++; subsub=0; space(); out.push({t:"sub", num:`${Math.max(main,1)}.${sub}`, title:m[1], w:28}); space(); continue; }
    if((m=t.match(COVER_RE))){ space(); out.push({t:"img", id:m[1]}); continue; }
    if((m=t.match(PIC_RE))){ space(); out.push({t:"pic", id:m[1], caption:m[2]||""}); space(); continue; }
    if((m=t.match(/^#\s+(.*)/))){ main++; sub=0; subsub=0; if(out[out.length-1]?.t!=="img") space(); out.push({t:"main", num:`${main}.0`, title:m[1]}); space(); continue; }
    if((m=t.match(/^\?!\s*(.*)/))){ cur++; const p=split(m[1],3); out.push({t:"cur", n:cur, title:p[0]||"", q:p.length===3?p[1]:"", text:p.length===3?p[2]:(p[1]||"")}); space(); continue; }
    if((m=t.match(/^\?\?\s+(.*)/))){ out.push({t:"q2", text:m[1]}); space(); continue; }
    if((m=t.match(/^\?\s+(.*)/))){ out.push({t:"q", text:m[1]}); space(); continue; }
    if((m=t.match(/^!!!\s*(.*)/))){ const p=split(m[1],2); out.push({t:"alert", label:p.length>1?p[0]:"Atenção!", text:p.length>1?p[1]:p[0]}); space(); continue; }
    if((m=t.match(/^>>\s*(.*)/))){ const p=split(m[1],2); out.push({t:"imp", label:p.length>1?p[0]:"Importante", text:p.length>1?p[1]:p[0]}); space(); continue; }
    if((m=t.match(/^@\s*([^|]+)\|\s*(.*)/))){ out.push({t:"sub", num:m[1].trim(), title:m[2], w:46}); space(); continue; }
    if((m=t.match(/^tabela\s*:\s*(.*)/i))){ tab++; out.push({t:"caption", n:tab, text:m[1]}); continue; }
    if(t.startsWith("|")){
      const rows=[[...t.replace(/^\||\|$/g,"").split("|").map(c=>c.trim())]];
      while(i<lines.length && lines[i].trim().startsWith("|")){
        const cells = lines[i].trim().replace(/^\||\|$/g,"").split("|").map(c=>c.trim());
        if(!cells.every(c=>/^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      out.push({t:"table", rows}); space(); continue;
    }
    const li = s => s.match(/^(\s*)([-*•]|!|\d+[.)])\s+(.*)/);
    if(li(raw)){
      i--; const items=[]; let prevKind=null;
      while(i<lines.length && (m=li(lines[i]))){
        const ind = m[1].replace(/\t/g,"  ").length;
        const kind = /^\d/.test(m[2]) ? "ol" : "ul";
        if(kind==="ol" && prevKind!=="ol") gid++;
        const starred = /^!\s+/.test(m[3]);   // "- ! termo" também conta como termo importante
        items.push({kind, level: ind>=4?2 : ind>=2?1 : 0, key:m[2]==="!" || starred, text: starred ? m[3].replace(/^!\s+/, "") : m[3], gid});
        prevKind = kind; i++;
      }
      out.push({t:"list", items}); continue;
    }
    if(t.startsWith(">")){ out.push({t:"note", text:t.replace(/^>\s*/,"")}); continue; }
    out.push({t:"p", text:t});
  }
  while(out.length && out[out.length-1].t==="space") out.pop();
  return out;
}
