// Janelas: confirmar, nova pasta / editar pasta, novo caderno.
import { TEMPLATES } from "../data/templates.js";
import * as store from "../data/store.js";
import { esc } from "../engine/index.js";
import { $, ic, paint } from "./dom.js";
import { FOLDER_COLORS, randomColor, colorPicker, wireColorPicker } from "./colors.js";
import { FOLDER_ICONS, folderIcon } from "./cards.js";

const dlg = $("#dlg");
export function openDialog(html, setup){
  dlg.innerHTML = `<form class="dlg" method="dialog">${html}</form>`;
  const form = $("form", dlg);
  setup?.(form);
  paint(dlg);
  dlg.showModal();
  return new Promise(resolve=>{
    form.addEventListener("submit", e=>{ e.preventDefault(); resolve(e.submitter?.value === "cancel" ? null : form); dlg.close(); });
    dlg.addEventListener("close", ()=>resolve(null), {once:true});
  });
}
export function pickGroup(form, name){
  form.addEventListener("click", e=>{
    const b = e.target.closest(`[data-pick="${name}"]`); if(!b) return;
    form.querySelectorAll(`[data-pick="${name}"]`).forEach(x=>x.setAttribute("aria-pressed", x===b));
  });
}
export const picked = (form, name) => form.querySelector(`[data-pick="${name}"][aria-pressed="true"]`)?.dataset.value;

export async function folderDialog(f){
  const cur = f ? {...f, icon:folderIcon(f)} : {name:"", icon:FOLDER_ICONS[0], color:FOLDER_COLORS[0]};
  const form = await openDialog(`
    <h2>${f ? "Editar pasta" : "Nova pasta"}</h2>
    <label class="field">Nome da pasta<input type="text" id="fd-name" required maxlength="60" value="${esc(cur.name)}" placeholder="Ex.: Biologia"></label>
    <div><p>Ícone</p><div class="row">${FOLDER_ICONS.map(e=>`<button type="button" class="pick" data-pick="icon" data-value="${e}" aria-pressed="${e===cur.icon}" aria-label="Ícone ${e}">${ic(e)}</button>`).join("")}</div></div>
    <div><p>Cor da pasta</p>${colorPicker("color", cur.color)}</div>
    <div class="row end"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="ok">${f ? "Salvar" : "Criar pasta"}</button></div>`,
    form => { pickGroup(form,"icon"); wireColorPicker(form,"color"); setTimeout(()=>$("#fd-name",form).focus()); });
  if(!form) return null;
  return store.saveFolder({...cur, id:cur.id||store.uid(), name:$("#fd-name",form).value.trim()||"Sem nome",
    icon:picked(form,"icon")||cur.icon, color:picked(form,"color")||cur.color});
}
export async function confirmDialog(title, text, okLabel){
  const form = await openDialog(`<h2>${esc(title)}</h2><p>${esc(text)}</p>
    <div class="row end"><button class="btn" value="cancel">Cancelar</button><button class="btn danger solid" value="ok">${esc(okLabel)}</button></div>`);
  return !!form;
}
export async function newNotebookDialog(folderId){
  const startColor = randomColor();
  const form = await openDialog(`
    <h2>Novo caderno</h2>
    <label class="field">Nome da aula ou tema<input type="text" id="nb-lesson" maxlength="120" placeholder="Ex.: Aula 5: mitose"></label>
    <div><p>Cor da capa</p>${colorPicker("color", startColor)}</div>
    <div><p>Escolha o modelo</p><div class="tpls">${TEMPLATES.map((t,i)=>`<button type="button" class="tpl" data-pick="tpl" data-value="${t.id}" aria-pressed="${i===0}">
      <span class="dots">${t.dots.map(c=>`<i style="background:${c}"></i>`).join("")}</span><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join("")}</div></div>
    <div class="row end"><button class="btn" value="cancel">Cancelar</button><button class="btn primary" value="ok">Criar caderno</button></div>`,
    form => { pickGroup(form,"tpl"); wireColorPicker(form,"color"); setTimeout(()=>$("#nb-lesson",form).focus()); });
  if(!form) return;
  const folder = await store.getFolder(folderId);
  const nb = await store.saveNotebook({id:store.uid(), folderId, tpl:picked(form,"tpl")||TEMPLATES[0].id, page:"a4", color:picked(form,"color")||startColor,
    subject: folder?.name || "", lesson:$("#nb-lesson",form).value.trim(), icon:"", prof:"", year:String(new Date().getFullYear()),
    author:"", footer:"", source:"", pages:[{id:store.uid(), text:"# Primeiro tópico\n- Comece a escrever aqui!\n"}]});
  location.hash = `#/caderno/${nb.id}`;
}
