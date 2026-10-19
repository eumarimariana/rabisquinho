// Cartões de caderno, ícones de pasta, etiquetas e favoritos.
import { TEMPLATES, TEMPLATE_ALIASES } from "../data/templates.js";
import { esc } from "../engine/index.js";
import { ic, when, norm } from "./dom.js";
import { COLORS, colorOf } from "./colors.js";

export const tplById = id => TEMPLATES.find(t=>t.id===(TEMPLATE_ALIASES[id]||id)) || TEMPLATES[0];
/** Modelo do caderno já com o tamanho de papel escolhido (A4 é o padrão). */
export const tplFor = nb => ({...tplById(nb.tpl), page: nb.page==="letter" ? "letter" : "a4"});
// Ícones das pastas (biblioteca Lucide: https://lucide.dev/icons)
export const FOLDER_ICONS = ["book-open","flask-conical","calculator","globe","palette","lightbulb","stethoscope","pen-line",
  "brain","music","laptop","atom","landmark","languages","leaf","heart","star","dumbbell"];
export const OLD_EMOJI = {"📚":"book-open","🧪":"flask-conical","📐":"calculator","🌎":"globe","🎨":"palette","💡":"lightbulb","🩺":"stethoscope",
  "📝":"pen-line","🧠":"brain","🎵":"music","💻":"laptop","🌸":"flower-2"};
export const folderIcon = f => f.icon || OLD_EMOJI[f.emoji] || "folder";
export const nbTitle = nb => (nb.lesson||"").trim() || (nb.subject||"").trim() || "Caderno sem título";
/* ---------- etiquetas e favoritos ---------- */
export const tagColor = t => COLORS[[...norm(t)].reduce((a,c)=>a+c.charCodeAt(0),0) % COLORS.length];
export const tagChip = (t, href=true) => href
  ? `<a class="tag" href="#/etiqueta/${encodeURIComponent(t)}" style="--tc:${tagColor(t)}">${ic("tag")}${esc(t)}</a>`
  : `<span class="tag" style="--tc:${tagColor(t)}">${ic("tag")}${esc(t)}</span>`;
export function allTags(notebooks){
  const m = new Map();
  for(const n of notebooks) for(const t of (n.tags||[])) m.set(t, (m.get(t)||0)+1);
  return [...m].sort((a,b)=> b[1]-a[1] || a[0].localeCompare(b[0], "pt-BR"));
}
export const favFirst = list => [...list].sort((a,b)=> (!!b.fav - !!a.fav) || b.updatedAt - a.updatedAt);

export function nbCard(nb, folder){
  const t = tplById(nb.tpl);
  const sub = folder ? folder.name : (nb.subject || "");
  const tags = (nb.tags||[]).slice(0,3);
  return `<div class="item-wrap">
    <button type="button" class="fav-btn" data-fav="${nb.id}" aria-pressed="${!!nb.fav}" title="${nb.fav?"Tirar dos favoritos":"Favoritar"}" aria-label="${nb.fav?"Tirar dos favoritos":"Favoritar"}">${ic("star")}</button>
    <a class="item" href="#/caderno/${nb.id}">
    <span class="nb" style="--cc:${colorOf(nb)}" aria-hidden="true"><span class="spiral"></span><span class="label"></span></span>
    <span class="cap"><b>${esc(nbTitle(nb))}</b>${sub ? `<small>${esc(sub)}</small>` : ""}
      <small class="meta"><span class="dots">${t.dots.map(c=>`<i style="background:${c}"></i>`).join("")}</span>${esc(t.name)} · ${(nb.pages?.length||1)} ${(nb.pages?.length||1)===1?"página":"páginas"} · ${when(nb.updatedAt)}</small>
      ${tags.length ? `<span class="tags">${tags.map(x=>tagChip(x,false)).join("")}</span>` : ""}</span></a></div>`;
}

/** Cartão de pasta (desenho da pasta, com o nome embaixo). */
export function folderCard(f, count){
  return `<a class="item" href="#/pasta/${f.id}">
    <span class="folder" style="--fc:${colorOf(f)}" aria-hidden="true"><span class="ficon">${ic(folderIcon(f))}</span></span>
    <span class="cap"><b>${esc(f.name)}</b>${count==null ? "" : `<small>${count} ${count===1?"caderno":"cadernos"}</small>`}</span></a>`;
}
