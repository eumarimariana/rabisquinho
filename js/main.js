// Início do site: roteador (#/...), backup, caixa de busca, favoritos e caderno de exemplo.
import { SAMPLE } from "./data/sample.js";
import * as store from "./data/store.js";
import { $, view, paint, toast, saveFile } from "./ui/dom.js";
import { COLORS } from "./ui/colors.js";
import { app } from "./app/state.js";
import { homeView } from "./views/home.js";
import { folderView } from "./views/folder.js";
import { editorView } from "./views/editor.js";
import { searchView } from "./views/search.js";
import { tagView } from "./views/tag.js";

async function router(){
  if(app.editor?.timer){ await app.editor.flush(); }
  app.editor = null;
  const [, kind, id] = (location.hash.replace(/^#\/?/,"").match(/^([^/]*)\/?(.*)$/) || []);
  try{
    if(kind==="pasta" && id) await folderView(id);
    else if(kind==="caderno" && id){ const [nid, pg] = id.split("/"); await editorView(nid, +pg || 0); }
    else if(kind==="busca") await searchView(decodeURIComponent(id||""));
    else if(kind==="etiqueta" && id) await tagView(decodeURIComponent(id));
    else await homeView();
  }catch(e){
    console.error(e);
    view.innerHTML = e?.message==="blocked"
      ? `<div class="empty"><b>O Cadernim foi atualizado.</b><br>Feche as outras abas do site e recarregue esta página.</div>`
      : `<div class="empty"><b>Não deu para abrir seus cadernos.</b><br>O navegador pode estar bloqueando o armazenamento (por exemplo, em uma janela anônima). Tente em uma janela normal.</div>`;
  }
  paint(view); paint($("#crumbs"));
  if(kind==="busca") $("#q").focus(); else view.focus({preventScroll:true});
  window.scrollTo(0,0);
  if(kind==="caderno" && app.pendingFind){ app.editor?.focusFind?.(app.pendingFind); app.pendingFind = null; }
}
app.refresh = router;
window.addEventListener("hashchange", router);
window.addEventListener("beforeunload", ()=>{ if(app.editor?.timer) app.editor.flush(); });

/* ---------- backup ---------- */
$("#backup-out").onclick = async () => {
  const data = await store.exportAll();
  saveFile(new Blob([JSON.stringify(data, null, 1)], {type:"application/json"}), `cadernim-backup-${new Date().toISOString().slice(0,10)}.json`);
  toast("Backup baixado!");
};
$("#backup-in").onchange = async e => {
  const file = e.target.files[0]; e.target.value = "";
  if(!file) return;
  try{ const r = await store.importAll(JSON.parse(await file.text())); toast(`Backup restaurado: ${r.folders} pastas e ${r.notebooks} cadernos.`); router(); }
  catch(err){ toast(err.message || "Não deu para ler esse arquivo."); }
};

/* ---------- primeira visita: pasta de exemplo ---------- */
async function seed(){
  try{
    if(localStorage.getItem("nf-seeded")) return;
    const folders = await store.listFolders();
    if(!folders.length){
      const f = await store.saveFolder({id:store.uid(), name:"Exemplo", icon:"flask-conical", color:COLORS[2]});
      const {tpl, ...rest} = SAMPLE;
      await store.saveNotebook({id:store.uid(), folderId:f.id, tpl, color:COLORS[0], ...rest});
    }
    localStorage.setItem("nf-seeded", "1");
  }catch(e){}
}

store.askPersist();
seed().then(router);

/* ---------- caixa de busca ---------- */
$("#search").addEventListener("submit", e => {
  e.preventDefault();
  const q = $("#q").value.trim();
  if(q) location.hash = "#/busca/" + encodeURIComponent(q);
});
let searchTimer = null;
$("#q").addEventListener("input", () => {
  clearTimeout(searchTimer);
  const q = $("#q").value.trim();
  if(q.length >= 2) searchTimer = setTimeout(() => {
    const target = "#/busca/" + encodeURIComponent(q);
    if(location.hash.startsWith("#/busca/")) history.replaceState(null, "", target), router();
    else location.hash = target;
  }, 350);
});
view.addEventListener("click", e => { const h = e.target.closest(".hit"); if(h) app.pendingFind = h.dataset.q; });
/* estrela nos cartões */
view.addEventListener("click", async e => {
  const b = e.target.closest(".fav-btn"); if(!b) return;
  e.preventDefault();
  const nb = await store.getNotebook(b.dataset.fav); if(!nb) return;
  await store.patchNotebook(nb.id, {fav: !nb.fav});
  toast(!nb.fav ? "Adicionado aos favoritos!" : "Tirado dos favoritos.");
  const y = window.scrollY; await router(); window.scrollTo(0, y);
});
