// Tela inicial: favoritos, recentes, etiquetas e pastas.
import * as store from "../data/store.js";
import { $, view, ic, toast, crumbs } from "../ui/dom.js";
import { nbCard, folderCard, allTags, tagChip } from "../ui/cards.js";
import { folderDialog } from "../ui/dialogs.js";

export async function homeView(){
  crumbs([{label:"Início"}]);
  const [folders, notebooks] = await Promise.all([store.listFolders(), store.listNotebooks()]);
  const byId = Object.fromEntries(folders.map(f=>[f.id,f]));
  const count = id => notebooks.filter(n=>n.folderId===id).length;
  const favs = notebooks.filter(n=>n.fav), tags = allTags(notebooks);
  view.innerHTML = `
    <div class="hello">
      <div><h1>O que vamos estudar hoje?</h1><p>Crie pastas para suas matérias e cadernos para cada aula.</p></div>
      <button class="btn primary" id="new-folder" type="button">${ic("folder-plus")}Nova pasta</button>
    </div>
    ${favs.length ? `<h2 class="section-title">${ic("star")}Favoritos</h2>
      <div class="grid books">${favs.map(n=>nbCard(n, byId[n.folderId])).join("")}</div>` : ""}
    ${notebooks.length ? `<h2 class="section-title">Continue de onde parou</h2>
      <div class="grid books">${notebooks.slice(0,6).map(n=>nbCard(n, byId[n.folderId])).join("")}</div>` : ""}
    ${tags.length ? `<h2 class="section-title">${ic("tags")}Etiquetas</h2>
      <div class="tag-row">${tags.map(([t,n])=>tagChip(t).replace("</a>", ` <small>${n}</small></a>`)).join("")}</div>` : ""}
    <h2 class="section-title">Minhas pastas</h2>
    <div class="grid">
      ${folders.map(f=>folderCard(f, count(f.id))).join("")}
      <button class="item" id="new-folder-2" type="button"><span class="folder add" aria-hidden="true">${ic("plus")}</span><span class="cap"><b>Nova pasta</b></span></button>
    </div>`;
  const add = async ()=>{ const f = await folderDialog(); if(f){ toast("Pasta criada!"); location.hash = `#/pasta/${f.id}`; } };
  $("#new-folder").onclick = add; $("#new-folder-2").onclick = add;
}
