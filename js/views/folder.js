// Tela da pasta: os cadernos dentro dela.
import * as store from "../data/store.js";
import { esc } from "../engine/index.js";
import { $, view, ic, toast, crumbs } from "../ui/dom.js";
import { colorOf } from "../ui/colors.js";
import { nbCard, folderIcon, favFirst } from "../ui/cards.js";
import { folderDialog, confirmDialog, newNotebookDialog } from "../ui/dialogs.js";
import { app } from "../app/state.js";

export async function folderView(id){
  const folder = await store.getFolder(id);
  if(!folder){ location.hash = "#/"; return; }
  crumbs([{label:"Início", href:"#/"}, {label:folder.name}]);
  const notebooks = await store.listNotebooks(id);
  view.innerHTML = `
    <div class="folder-head" style="--fc:${colorOf(folder)}">
      <span class="ficon">${ic(folderIcon(folder))}</span><h1>${esc(folder.name)}</h1>
      <button class="btn" id="edit-folder" type="button">${ic("pencil")}Editar pasta</button>
      <button class="btn danger" id="del-folder" type="button">${ic("trash-2")}Excluir pasta</button>
    </div>
    <h2 class="section-title">Cadernos</h2>
    <div class="grid books">
      <button class="item" id="new-nb" type="button"><span class="nb add" aria-hidden="true">${ic("plus")}</span><span class="cap"><b>Novo caderno</b></span></button>
      ${favFirst(notebooks).map(n=>nbCard(n)).join("")}
    </div>
    ${notebooks.length ? "" : `<p class="help" style="margin-top:14px">Esta pasta ainda está vazia. Crie o primeiro caderno!</p>`}`;
  $("#new-nb").onclick = () => newNotebookDialog(id);
  $("#edit-folder").onclick = async () => { if(await folderDialog(folder)){ toast("Pasta salva."); app.refresh(); } };
  $("#del-folder").onclick = async () => {
    const n = notebooks.length;
    if(await confirmDialog("Excluir esta pasta?", n ? `Os ${n} cadernos dentro dela também serão apagados. Isso não pode ser desfeito.` : "Isso não pode ser desfeito.", "Excluir pasta")){
      await store.deleteFolder(id); toast("Pasta excluída."); location.hash = "#/";
    }
  };
}
