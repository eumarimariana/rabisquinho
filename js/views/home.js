// Tela inicial com abas: Visão geral, Pastas, Cadernos e Etiquetas.
// A visão geral é personalizável (nome, cor, desenhos e quais seções aparecem).
import * as store from "../data/store.js";
import { esc } from "../engine/index.js";
import { $, view, ic, paint, toast, crumbs } from "../ui/dom.js";
import { nbCard, folderCard, allTags, tagChip, favFirst, nbTitle } from "../ui/cards.js";
import { folderDialog, newNotebookDialog } from "../ui/dialogs.js";
import { getPrefs, DOODLES } from "../ui/prefs.js";
import { hasKey } from "../ai/assistant.js";

const TABS = [
  {id:"geral",     name:"Visão geral", icon:"layout-dashboard"},
  {id:"pastas",    name:"Pastas",      icon:"folder"},
  {id:"cadernos",  name:"Cadernos",    icon:"notebook"},
  {id:"etiquetas", name:"Etiquetas",   icon:"tags"},
];

const TIPS = [
  "Selecione uma palavra e aperte **Ctrl+B** para deixar em negrito.",
  "Escreva `?! Tema | pergunta | resposta` para criar um \"Você sabia?\".",
  "Cole uma imagem com **Ctrl+V** direto no texto do caderno.",
  "Use `@ 1500 | acontecimento` para montar uma linha do tempo.",
  "A IA pode resumir uma página inteira para você revisar.",
  "Coloque uma estampa em cima de cada capítulo em \"Capas dos capítulos\".",
  "Marque cadernos com a estrela para eles aparecerem primeiro.",
  "Etiquetas como \"prova\" ajudam a achar tudo que cai na avaliação.",
];
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");

function greeting(name){
  const h = new Date().getHours();
  const hi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return name ? `${hi}, ${esc(name)}!` : `${hi}!`;
}
function doodles(prefs){
  const set = DOODLES.find(d=>d.id===prefs.doodles) || DOODLES[0];
  if(!set.icons.length) return "";
  // posições fixas (não aleatórias), para o desenho ficar sempre igual
  const spots = [[6,18],[18,70],[30,30],[44,78],[58,22],[70,64],[82,30],[92,72],[52,48],[12,46]];
  return `<div class="doodles" aria-hidden="true">${spots.map(([x,y],i)=>
    `<span style="left:${x}%;top:${y}%;--d:${(i%5)*0.7}s;--r:${(i%2?-1:1)*(8+i*3)}deg;--s:${0.8+(i%3)*0.25}">${ic(set.icons[i % set.icons.length])}</span>`).join("")}</div>`;
}
const tabsBar = active => `<nav class="home-tabs" role="tablist" aria-label="Seções do início">${TABS.map(t=>
  `<a role="tab" href="#/${t.id==="geral"?"":"aba/"+t.id}" aria-selected="${t.id===active}" class="home-tab">${ic(t.icon)}${t.name}</a>`).join("")}</nav>`;

export async function homeView(tab="geral"){
  if(!TABS.some(t=>t.id===tab)) tab = "geral";
  crumbs([{label:"Início"}]);
  const prefs = getPrefs();
  const [folders, notebooks] = await Promise.all([store.listFolders(), store.listNotebooks()]);
  const byId = Object.fromEntries(folders.map(f=>[f.id,f]));
  const count = id => notebooks.filter(n=>n.folderId===id).length;
  const tags = allTags(notebooks);
  const pages = notebooks.reduce((a,n)=>a + (n.pages?.length || 1), 0);

  const hero = `
    <section class="hero" aria-label="Boas-vindas">
      ${doodles(prefs)}
      <div class="hero-text">
        <p class="hero-date">${new Date().toLocaleDateString("pt-BR", {weekday:"long", day:"numeric", month:"long"})}</p>
        <h1>${greeting(prefs.name)}</h1>
        <p>O que vamos estudar hoje?</p>
      </div>
      <div class="hero-actions">
        <button class="btn primary" id="new-folder" type="button">${ic("folder-plus")}Nova pasta</button>
        ${folders.length ? `<button class="btn" id="quick-nb" type="button">${ic("notebook-pen")}Novo caderno</button>` : ""}
        <a class="btn ghost" href="#/config">${ic("palette")}Personalizar</a>
      </div>
    </section>`;

  const S = {
    resumo: () => `<div class="stats">
      <div class="stat">${ic("folder")}<b>${folders.length}</b><span>${folders.length===1?"pasta":"pastas"}</span></div>
      <div class="stat">${ic("notebook")}<b>${notebooks.length}</b><span>${notebooks.length===1?"caderno":"cadernos"}</span></div>
      <div class="stat">${ic("file-text")}<b>${pages}</b><span>${pages===1?"página":"páginas"}</span></div>
      <div class="stat">${ic("tags")}<b>${tags.length}</b><span>${tags.length===1?"etiqueta":"etiquetas"}</span></div>
    </div>`,
    favoritos: () => { const f = notebooks.filter(n=>n.fav); return f.length ? `<h2 class="section-title">${ic("star")}Favoritos</h2>
      <div class="grid books">${f.map(n=>nbCard(n, byId[n.folderId])).join("")}</div>` : ""; },
    recentes: () => notebooks.length ? `<h2 class="section-title">${ic("clock")}Continue de onde parou</h2>
      <div class="grid books">${notebooks.slice(0,6).map(n=>nbCard(n, byId[n.folderId])).join("")}</div>` : "",
    pastas: () => `<h2 class="section-title">${ic("folder")}Minhas pastas</h2>${foldersGrid()}`,
    etiquetas: () => tags.length ? `<h2 class="section-title">${ic("tags")}Etiquetas</h2>
      <div class="tag-row">${tags.map(([t,n])=>tagChip(t).replace("</a>", ` <small>${n}</small></a>`)).join("")}</div>` : "",
    dica: () => {
      const day = Math.floor(Date.now()/864e5);
      return `<aside class="tip">${ic("lightbulb")}<div><b>Dica do dia</b><p>${md(TIPS[day % TIPS.length])}</p></div>
        ${hasKey() ? "" : `<a class="btn sm" href="#/config">${ic("sparkles")}Ativar a IA</a>`}</aside>`;
    },
  };
  const foldersGrid = () => `<div class="grid">
      ${folders.map(f=>folderCard(f, count(f.id))).join("")}
      <button class="item" id="new-folder-2" type="button"><span class="folder add" aria-hidden="true">${ic("plus")}</span><span class="cap"><b>Nova pasta</b></span></button>
    </div>`;

  let body = "";
  if(tab === "geral"){
    body = prefs.sections.filter(s=>s.on).map(s=>S[s.id]()).join("");
    if(!body.trim()) body = `<div class="empty">Todas as seções estão escondidas. <a href="#/config">Escolha o que mostrar</a>.</div>`;
  }else if(tab === "pastas"){
    body = foldersGrid();
  }else if(tab === "cadernos"){
    let sort = "recentes"; try{ sort = sessionStorage.getItem("cadernim-ordem") || "recentes"; }catch(e){}
    const list = sort==="az" ? [...notebooks].sort((a,b)=>nbTitle(a).localeCompare(nbTitle(b),"pt-BR"))
      : sort==="favoritos" ? favFirst(notebooks) : notebooks;
    body = `<div class="list-tools">
        <label class="field inline">Ordenar
          <select id="sort">${[["recentes","Mais recentes"],["az","De A a Z"],["favoritos","Favoritos primeiro"]].map(([v,l])=>`<option value="${v}" ${v===sort?"selected":""}>${l}</option>`).join("")}</select></label>
        <span class="help">${notebooks.length} ${notebooks.length===1?"caderno":"cadernos"}</span>
      </div>
      ${notebooks.length ? `<div class="grid books">${list.map(n=>nbCard(n, byId[n.folderId])).join("")}</div>`
        : `<div class="empty">Você ainda não tem cadernos. Crie uma pasta e depois um caderno dentro dela.</div>`}`;
  }else if(tab === "etiquetas"){
    body = tags.length ? `<div class="tag-cloud">${tags.map(([t,n])=>{
        const books = notebooks.filter(x=>(x.tags||[]).includes(t)).slice(0,3).map(x=>`<li>${esc(nbTitle(x))}</li>`).join("");
        return `<a class="tag-card" href="#/etiqueta/${encodeURIComponent(t)}">${tagChip(t,false)}<small>${n} ${n===1?"caderno":"cadernos"}</small><ul>${books}</ul></a>`;
      }).join("")}</div>`
      : `<div class="empty">Nenhuma etiqueta ainda. No editor de um caderno, escreva no campo "Etiquetas" (ex.: prova, revisar).</div>`;
  }

  view.innerHTML = `<div class="home ${prefs.motion ? "animated" : ""}">${hero}${tabsBar(tab)}<div class="tab-body">${body}</div></div>`;
  paint(view);

  const add = async ()=>{ const f = await folderDialog(); if(f){ toast("Pasta criada!"); location.hash = `#/pasta/${f.id}`; } };
  $("#new-folder").onclick = add;
  const n2 = $("#new-folder-2"); if(n2) n2.onclick = add;
  const q = $("#quick-nb"); if(q) q.onclick = async () => newNotebookDialog(null);
  const so = $("#sort"); if(so) so.onchange = e => { try{ sessionStorage.setItem("cadernim-ordem", e.target.value); }catch(_){} homeView("cadernos"); };
}
