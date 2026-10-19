// Tela de uma etiqueta: todos os cadernos com ela.
import * as store from "../data/store.js";
import { esc } from "../engine/index.js";
import { view, ic, crumbs } from "../ui/dom.js";
import { nbCard, allTags, tagChip, tagColor, favFirst } from "../ui/cards.js";

export async function tagView(tag){
  crumbs([{label:"Início", href:"#/"}, {label:`Etiqueta: ${tag}`}]);
  const [folders, notebooks] = await Promise.all([store.listFolders(), store.listNotebooks()]);
  const byId = Object.fromEntries(folders.map(f=>[f.id,f]));
  const list = favFirst(notebooks.filter(n=>(n.tags||[]).includes(tag)));
  view.innerHTML = `
    <div class="hello"><div><h1>${tagChip(tag,false)}</h1><p>${list.length} ${list.length===1?"caderno":"cadernos"} com esta etiqueta</p></div></div>
    <div class="tag-row">${allTags(notebooks).map(([t,n])=>t===tag ? `<span class="tag on" style="--tc:${tagColor(t)}">${ic("tag")}${esc(t)} <small>${n}</small></span>` : tagChip(t).replace("</a>", ` <small>${n}</small></a>`)).join("")}</div>
    <div class="grid books" style="margin-top:20px">${list.map(n=>nbCard(n, byId[n.folderId])).join("")}</div>
    ${list.length ? "" : `<div class="empty">Nenhum caderno tem essa etiqueta agora.</div>`}`;
}
