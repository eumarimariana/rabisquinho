// Tela do editor: modelo, informações, páginas, texto, capas e prévia.
import { TEMPLATES } from "../data/templates.js";
import * as store from "../data/store.js";
import { setTemplate, setImages, coverLine, coverIdOf, pictureLine, parse, bodyModel, headModel, footModel,
  htmlOf, infoOf, buildDocx, fileName, PAGE, esc, notebookText } from "../engine/index.js";
import { $, view, ic, paint, toast, crumbs, saveFile, norm } from "../ui/dom.js";
import { colorOf, colorPicker, wireColorPicker } from "../ui/colors.js";
import { tplById, tplFor, nbTitle, allTags, tagColor } from "../ui/cards.js";
import { openDialog, pickGroup, picked, confirmDialog } from "../ui/dialogs.js";
import { attachToolbar, insertBlock } from "../ui/toolbar.js";
import { shrinkImage, cropToBanner, PATTERNS, patternColors, patternCanvas, patternBlob } from "../ui/covers.js";
import { app } from "../app/state.js";
import { TASKS, runTask, hasKey, currentModelName } from "../ai/assistant.js";

/* ---------- tela: editor ---------- */
const FIELDS = [["subject","Matéria","wide"],["lesson","Aula / tema","wide"],["prof","Professor(a)",""],["year","Ano",""],
  ["author","Seu nome",""],["footer","Turma / semestre",""],["source","Fonte / referências","wide"]];

const CHEAT = `
  <h3>Títulos</h3>
  <code># Título</code><span>Tópico principal (1.0, 2.0...)</span>
  <code>## Subtítulo</code><span>Subtópico (1.1, 1.2...)</span>
  <code>### Título</code><span>Sub-subtópico (1.2.1...)</span>
  <code>? Pergunta</code><span>Faixa com a pergunta-chave</span>
  <code>?? Pergunta</code><span>Faixa clarinha, menor</span>
  <h3>Listas e texto</h3>
  <code>- texto</code><span>Marcador (2 ou 4 espaços antes = mais para dentro)</span>
  <code>1. texto</code><span>Lista numerada</span>
  <code>! texto</code><span>Termo importante</span>
  <code>&gt; texto</code><span>Observação rápida</span>
  <h3>Caixas</h3>
  <code>&gt;&gt; Título | texto</code><span>Bloco de observação importante</span>
  <code>!!! Título | texto</code><span>Caixa de alerta</span>
  <code>?! Tema | pergunta | texto</code><span>Seção "Você sabia?"</span>
  <code>@ 1822 | evento</code><span>Linha do tempo</span>
  <code>[capa:…]</code><span>Capa do capítulo (use "Capas dos capítulos" abaixo)</span>
  <code>Tabela: legenda</code><span>Legenda numerada da tabela</span>
  <code>| a | b |</code><span>Tabela (a primeira linha é o título)</span>
  <h3>Destaques</h3>
  <code>**negrito**</code><span><code>*itálico*</code> <code>__sublinhado__</code></span>
  <code>==amarelo==</code><span>Marca-texto amarelo, e <code>++texto++</code> na cor secundária</span>
  <code>{{termo}}</code><span>Negrito na cor principal do modelo</span>`;

// Como no Word: enche a 1ª coluna antes de passar para a 2ª (altura mínima de uma página).
/* ---------- folhas da prévia: quebra automática de página ----------
   Cada folha tem o tamanho exato do papel. O conteúdo vai entrando nas duas colunas;
   quando não cabe mais, continua numa folha nova (com o mesmo cabeçalho e rodapé). */
const overflows = cols => cols.scrollWidth > cols.clientWidth + 2;
const isSpacer = n => n.nodeType === 1 && n.tagName === "P" && !n.textContent.replace(/\u00a0/g, "").trim() && !n.querySelector("img") && !n.style.borderBottom;
function paginate(container, chunks, {head, foot, R}){
  const pg = PAGE[R.page];
  // as folhas são montadas num espaço invisível (mas com tamanho de verdade) e só depois vão para a prévia,
  // assim a medição funciona mesmo com a prévia escondida (modo "Escrever")
  const stage = document.createElement("div");
  stage.className = "sheets measuring"; stage.setAttribute("aria-hidden", "true");
  document.body.appendChild(stage);
  const sheets = [];
  const newSheet = page => {
    const el = document.createElement("div");
    el.className = "paper"; el.dataset.page = page;
    el.style.width = pg.w + "pt"; el.style.height = pg.h + "pt";
    el.innerHTML = `<div class="sheet-head">${head}</div><div class="cols${R.sep ? " sep" : ""}"></div><div class="sheet-foot">${foot}</div>`;
    stage.appendChild(el); sheets.push(el);
    return el.querySelector(".cols");
  };
  chunks.forEach((html, page) => {
    const tmp = document.createElement("div"); tmp.innerHTML = html;
    const nodes = [...tmp.childNodes].filter(n => n.nodeType === 1);
    let cols = newSheet(page);
    // caminho rápido: tudo cabe numa folha
    nodes.forEach(n => cols.appendChild(n));
    if(!overflows(cols)) return;
    cols.innerHTML = "";
    for(const n of nodes){
      if(!cols.childElementCount && isSpacer(n)) continue;          // folha nova não começa com linha vazia
      cols.appendChild(n);
      if(overflows(cols) && cols.childElementCount > 1){
        cols.removeChild(n);
        while(cols.lastElementChild && isSpacer(cols.lastElementChild)) cols.lastElementChild.remove();
        cols = newSheet(page);
        if(!isSpacer(n)) cols.appendChild(n);
      }
    }
  });
  sheets.forEach((el, i) => {
    el.title = `Folha ${i + 1}`;
    el.querySelectorAll(".pg").forEach(x => x.textContent = i + 1);
  });
  container.replaceChildren(...sheets);
  stage.remove();
  return sheets.length;
}

// Quando uma fonte termina de carregar, o texto muda de tamanho: a prévia é refeita.
let redrawPreview = null;
document.fonts?.addEventListener?.("loadingdone", () => redrawPreview?.());

export async function editorView(id, startPage=0){
  const nb = await store.getNotebook(id);
  if(!nb){ location.hash = "#/"; return; }
  const [folder, folders] = await Promise.all([store.getFolder(nb.folderId), store.listFolders()]);
  crumbs([{label:"Início", href:"#/"}, ...(folder ? [{label:folder.name, href:`#/pasta/${folder.id}`}] : []), {label:nbTitle(nb)}]);

  const TABS = [["escrever","Escrever","pen-line"],["modelo","Modelo","palette"],["info","Info","info"],["capas","Capas","image"],["ia","IA","sparkles"]];
  let mode = "split", tab = "escrever";
  try{ mode = localStorage.getItem("cadernim-modo") || "split"; tab = sessionStorage.getItem("cadernim-aba") || "escrever"; }catch(e){}
  if(!TABS.some(t=>t[0]===tab)) tab = "escrever";
  view.innerHTML = `
  <div class="editor-bar">
    <div class="view-mode" role="group" aria-label="Como ver o editor">
      <button type="button" class="seg" data-mode="write" aria-pressed="${mode==="write"}">${ic("pen-line")}Escrever</button>
      <button type="button" class="seg" data-mode="split" aria-pressed="${mode==="split"}">${ic("columns-2")}Lado a lado</button>
      <button type="button" class="seg" data-mode="preview" aria-pressed="${mode==="preview"}">${ic("eye")}Prévia</button>
    </div>
    <div class="actions">
      <button class="btn primary" id="dl-docx" type="button">${ic("file-down")}Baixar .docx</button>
      <button class="btn" id="dl-pdf" type="button">${ic("file-text")}PDF</button>
      <button class="btn icon-btn" id="copy-all" type="button" title="Copiar texto formatado" aria-label="Copiar texto formatado">${ic("copy")}</button>
      <button class="btn icon-btn fav-toggle" id="fav-nb" type="button" aria-pressed="${!!nb.fav}" title="${nb.fav?"Tirar dos favoritos":"Favoritar"}" aria-label="${nb.fav?"Tirar dos favoritos":"Favoritar"}">${ic("star")}</button>
      <span class="saved" id="saved">Salvo</span>
    </div>
  </div>
  <div class="editor mode-${mode}" id="editor">
    <section class="panel ed-panel" aria-label="Editor">
      <nav class="ed-tabs" role="tablist" aria-label="Partes do editor">${TABS.map(([id,name,icon])=>
        `<button type="button" role="tab" class="ed-tab" data-tab="${id}" aria-selected="${id===tab}" aria-controls="tab-${id}">${ic(icon)}<span>${name}</span></button>`).join("")}</nav>

      <div class="ed-pane" id="tab-escrever" role="tabpanel" ${tab==="escrever"?"":"hidden"}>
        <div class="pages" id="pages" role="tablist" aria-label="Páginas do caderno"></div>
        <div class="toolbar" id="toolbar" role="toolbar" aria-label="Formatação"></div>
        <textarea id="f-text" class="write-area" spellcheck="true" aria-label="Texto da página"></textarea>
        <details><summary>Como formatar</summary><div class="cheat">${CHEAT}</div></details>
      </div>

      <div class="ed-pane" id="tab-modelo" role="tabpanel" ${tab==="modelo"?"":"hidden"}>
        <h2>Modelo</h2>
        <div class="tpls" id="tpls" role="group" aria-label="Escolha o modelo"></div>
        <div class="paper-size" role="group" aria-label="Tamanho do papel">
          <span>Papel</span>
          <button type="button" class="seg" data-page="a4" aria-pressed="${nb.page!=="letter"}">A4</button>
          <button type="button" class="seg" data-page="letter" aria-pressed="${nb.page==="letter"}">Carta</button>
        </div>
        <h2>Cor da capa</h2>
        <div id="nb-color">${colorPicker("color", colorOf(nb), true)}</div>
      </div>

      <div class="ed-pane" id="tab-info" role="tabpanel" ${tab==="info"?"":"hidden"}>
        <h2>Informações do cabeçalho e rodapé</h2>
        <div class="fields">${FIELDS.map(([k,l,c])=>`<label class="field ${c}">${l}<input type="text" id="f-${k}"></label>`).join("")}
          <div class="field wide"><label for="tag-new">Etiquetas</label>
            <div class="tag-input" id="tag-input"><span class="tags" id="tag-list"></span>
              <input type="text" id="tag-new" list="tag-sugg" maxlength="30" placeholder="Ex.: prova, revisar (Enter para adicionar)"></div>
            <datalist id="tag-sugg">${allTags(await store.listNotebooks()).map(([t])=>`<option value="${esc(t)}">`).join("")}</datalist>
          </div></div>
        <div class="editor-tools">
          <label class="field" style="flex-direction:row;align-items:center;gap:8px">Pasta
            <select id="move">${folders.map(f=>`<option value="${f.id}" ${f.id===nb.folderId?"selected":""}>${esc(f.name)}</option>`).join("")}</select></label>
          <button class="btn danger" id="del-nb" type="button">${ic("trash-2")}Excluir caderno</button>
        </div>
      </div>

      <div class="ed-pane" id="tab-capas" role="tabpanel" ${tab==="capas"?"":"hidden"}>
        <h2>Capas dos capítulos</h2>
        <p class="help">Uma faixa com imagem em cima de cada tópico principal (<code>#</code>) da página que está aberta em "Escrever".</p>
        <div class="covers" id="covers"></div>
        <input type="file" id="cover-file" accept="image/*" hidden>
        <input type="file" id="pic-file" accept="image/*" hidden>
      </div>

      <div class="ed-pane" id="tab-ia" role="tabpanel" ${tab==="ia"?"":"hidden"}>
        <div id="ai-box"></div>
      </div>
    </section>
    <section class="preview-wrap" aria-label="Pré-visualização">
      <div class="paper-scroll"><div class="sheets" id="sheets"></div></div>
      <p class="help"><span id="sheet-count"></span> · <span id="credit"></span></p>
    </section>
  </div>`;

  const F = {}; for(const [k] of FIELDS) F[k] = $("#f-"+k);
  for(const k in F) F[k].value = nb[k] ?? "";
  const pages = Array.isArray(nb.pages) && nb.pages.length ? nb.pages.map(p=>({...p})) : [{id:store.uid(), text:nb.text||""}];
  app.editor = {nb, F, pages, active:0, timer:null, html:{}};
  const text = $("#f-text");
  text.value = pages[0].text;

  // imagens de capa deste caderno
  const images = {};
  for(const im of await store.listImages(nb.id)) images[im.id] = {...im, url:URL.createObjectURL(im.blob)};
  app.editor.images = images;
  setImages(images);

  const current = () => {
    const d = {...app.editor.nb}; for(const k in F) d[k] = F[k].value;
    d.pages = app.editor.pages.map(p=>({...p}));
    d.text = notebookText(d);
    return d;
  };
  const drawPages = () => {
    const {pages, active} = app.editor;
    $("#pages").innerHTML = pages.map((p,i)=>`<button type="button" class="page-tab" role="tab" data-i="${i}" aria-selected="${i===active}">Página ${i+1}</button>`).join("")+
      `<button type="button" class="page-add" id="page-add">${ic("plus")}Nova página</button>`+
      (pages.length>1 ? `<button type="button" class="page-del" id="page-del" title="Excluir página ${active+1}" aria-label="Excluir página ${active+1}">${ic("trash-2")}</button>` : "");
    paint($("#pages"));
  };
  const selectPage = i => {
    app.editor.active = Math.max(0, Math.min(i, app.editor.pages.length-1));
    text.value = app.editor.pages[app.editor.active].text;
    drawPages(); markActive(); drawCovers();
  };
  /* capítulos (# título) da página atual e a capa logo acima de cada um */
  const chapters = () => {
    const lines = app.editor.pages[app.editor.active].text.split("\n"), out = [];
    lines.forEach((l,i)=>{ const m = l.match(/^#\s+(.*)/); if(m) out.push({line:i, title:m[1].trim()||"Sem título", cover: i>0 ? coverIdOf(lines[i-1]) : null}); });
    return out;
  };
  const drawCovers = () => {
    const list = chapters();
    $("#covers").innerHTML = list.length ? list.map((c,k)=>`
      <div class="cover-row" data-k="${k}">
        <span class="cover-thumb">${c.cover && images[c.cover] ? `<img src="${images[c.cover].url}" alt="">` : ic("image")}</span>
        <b>${esc(c.title)}</b>
        <span class="cover-btns">
          <button type="button" class="btn sm" data-act="photo">${ic("image-up")}Foto</button>
          <button type="button" class="btn sm" data-act="pattern">${ic("sparkles")}Estampa</button>
          ${c.cover ? `<button type="button" class="btn sm danger" data-act="remove" aria-label="Tirar capa">${ic("x")}</button>` : ""}
        </span>
      </div>`).join("") : `<p class="help">Escreva um tópico com <code># Título</code> para poder colocar uma capa.</p>`;
    paint($("#covers"));
  };
  const setCover = async (k, made) => {
    const c = chapters()[k]; if(!c) return;
    const id = store.uid();
    await store.saveImage({id, notebookId:nb.id, blob:made.blob, type:made.type});
    images[id] = {id, blob:made.blob, type:made.type, url:URL.createObjectURL(made.blob)};
    const lines = app.editor.pages[app.editor.active].text.split("\n");
    if(c.cover){ lines[c.line-1] = coverLine(id); store.deleteImage(c.cover); }
    else lines.splice(c.line, 0, coverLine(id));
    app.editor.pages[app.editor.active].text = text.value = lines.join("\n");
    render(); drawCovers(); schedule(); toast("Capa colocada!");
  };
  const removeCover = k => {
    const c = chapters()[k]; if(!c?.cover) return;
    const lines = app.editor.pages[app.editor.active].text.split("\n");
    lines.splice(c.line-1, 1); store.deleteImage(c.cover);
    app.editor.pages[app.editor.active].text = text.value = lines.join("\n");
    render(); drawCovers(); schedule(); toast("Capa retirada.");
  };
  const patternDialog = async () => {
    const R = tplFor(app.editor.nb), colors = patternColors(R);
    const form = await openDialog(`<h2>Escolha uma estampa</h2><p>Nas cores do modelo ${esc(R.name)}.</p>
      <div class="patterns">${PATTERNS.map((p,i)=>`<button type="button" class="pattern" data-pick="pat" data-value="${p.id}" aria-pressed="${i===0}">
        <img src="${patternCanvas(p.id, colors).toDataURL()}" alt=""><span>${p.name}</span></button>`).join("")}</div>
      <div class="row end"><button class="btn" value="cancel">Cancelar</button><button class="btn primary" value="ok">Usar estampa</button></div>`,
      form => pickGroup(form, "pat"));
    return form ? patternBlob(picked(form,"pat")||"dots", colors) : null;
  };
  const markActive = () => {
    document.querySelectorAll("#sheets .paper").forEach(el => el.classList.toggle("active", +el.dataset.page === app.editor.active));
  };
  const render = () => {
    if(!document.body.contains(text)) return;   // saiu do editor
    const d = current(), R = tplFor(d);
    setTemplate(R);
    const I = infoOf(d);
    const h = app.editor.html;
    h.head = htmlOf(headModel(I)); h.body = htmlOf(bodyModel(parse(notebookText(d)), I)); h.foot = htmlOf(footModel(I));
    const n = paginate($("#sheets"), h.body.split("<!--PB-->"), {head:h.head, foot:h.foot, R});
    $("#sheet-count").textContent = `${n} ${n===1 ? "folha" : "folhas"}`;
    markActive();
    $("#credit").textContent = `Modelo ${R.name}: ${R.desc.toLowerCase()}. Papel ${R.page==="a4"?"A4":"Carta"}.`;
    $("#tpls").innerHTML = TEMPLATES.map(t=>`<button type="button" class="tpl" data-id="${t.id}" aria-pressed="${t.id===R.id}">
      <span class="dots">${t.dots.map(c=>`<i style="background:${c}"></i>`).join("")}</span><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></button>`).join("");
  };
  const persist = async () => {
    clearTimeout(app.editor.timer); app.editor.timer = null;
    app.editor.nb = await store.saveNotebook(current());
    $("#saved").textContent = "Salvo";
  };
  const schedule = () => { $("#saved").textContent = "Salvando..."; clearTimeout(app.editor.timer); app.editor.timer = setTimeout(persist, 600); };
  app.editor.flush = persist;

  let renderTimer = null;
  const renderSoon = () => { clearTimeout(renderTimer); renderTimer = setTimeout(render, 120); };
  for(const k in F) F[k].addEventListener("input", ()=>{ renderSoon(); schedule(); });
  text.addEventListener("input", ()=>{ app.editor.pages[app.editor.active].text = text.value; renderSoon(); schedule(); drawCovers(); });
  /* imagens no meio do texto */
  const addPicture = async file => {
    try{
      const made = await shrinkImage(file);
      const pid = store.uid();
      await store.saveImage({id:pid, notebookId:nb.id, kind:"pic", ...made});
      images[pid] = {id:pid, ...made, url:URL.createObjectURL(made.blob)};
      const cap = "Legenda da imagem";
      insertBlock(text, pictureLine(pid, cap));
      const at = text.value.indexOf(pictureLine(pid, cap)) + pictureLine(pid, "").length - 1 + 3;
      text.setSelectionRange(at, at + cap.length);
      toast("Imagem colocada! Escreva a legenda ou apague o texto depois do |.");
    }catch(err){ console.error(err); toast("Não deu para abrir essa imagem. Tente outra (JPG ou PNG)."); }
  };
  attachToolbar($("#toolbar"), text, paint, {onImage: () => $("#pic-file").click()});

  /* etiquetas */
  app.editor.nb.tags = [...(nb.tags||[])];
  const drawTags = () => {
    $("#tag-list").innerHTML = app.editor.nb.tags.map((t,i)=>`<span class="tag" style="--tc:${tagColor(t)}">${esc(t)}<button type="button" data-rm="${i}" aria-label="Tirar etiqueta ${esc(t)}">${ic("x")}</button></span>`).join("");
    paint($("#tag-list"));
  };
  const addTag = raw => {
    const t = raw.trim().replace(/^#/, "").toLowerCase(); if(!t) return;
    if(!app.editor.nb.tags.includes(t)){ app.editor.nb.tags.push(t); drawTags(); schedule(); }
  };
  $("#tag-new").addEventListener("keydown", e=>{
    const inp = e.target;
    if(e.key==="Enter" || e.key===","){ e.preventDefault(); addTag(inp.value); inp.value = ""; }
    else if(e.key==="Backspace" && !inp.value && app.editor.nb.tags.length){ app.editor.nb.tags.pop(); drawTags(); schedule(); }
  });
  $("#tag-new").addEventListener("change", e=>{ if(e.target.value.includes(",") || [...$("#tag-sugg").options].some(o=>o.value===e.target.value)){ e.target.value.split(",").forEach(addTag); e.target.value = ""; } });
  $("#tag-new").addEventListener("blur", e=>{ if(e.target.value.trim()){ addTag(e.target.value); e.target.value = ""; } });
  $("#tag-list").addEventListener("click", e=>{ const b = e.target.closest("[data-rm]"); if(b){ app.editor.nb.tags.splice(+b.dataset.rm,1); drawTags(); schedule(); } });
  $("#tag-input").addEventListener("click", e=>{ if(e.target.id==="tag-input" || e.target.id==="tag-list") $("#tag-new").focus(); });
  drawTags();

  $("#fav-nb").onclick = () => {
    app.editor.nb.fav = !app.editor.nb.fav; const b = $("#fav-nb");
    b.setAttribute("aria-pressed", app.editor.nb.fav); const lbl = app.editor.nb.fav ? "Tirar dos favoritos" : "Favoritar"; b.title = lbl; b.setAttribute("aria-label", lbl);
    schedule(); toast(app.editor.nb.fav ? "Adicionado aos favoritos!" : "Tirado dos favoritos.");
  };
  $("#pic-file").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if(f) addPicture(f); });
  text.addEventListener("paste", e => {
    const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith("image/"));
    if(f){ e.preventDefault(); addPicture(f); }
  });
  $("#dl-pdf").onclick = () => {
    const R = tplFor(app.editor.nb);
    let st = $("#print-size"); if(!st){ st = document.createElement("style"); st.id = "print-size"; document.head.appendChild(st); }
    st.textContent = `@page{size:${R.page==="a4"?"A4":"letter"};margin:0}`;
    toast('Na janela que abrir, escolha "Salvar como PDF".');
    setTimeout(()=>window.print(), 400);
  };
  let coverTarget = null;
  $("#covers").addEventListener("click", async e=>{
    const b = e.target.closest("[data-act]"); if(!b) return;
    const k = +b.closest(".cover-row").dataset.k;
    if(b.dataset.act==="photo"){ coverTarget = k; $("#cover-file").click(); }
    if(b.dataset.act==="pattern"){ const made = await patternDialog(); if(made) setCover(k, made); }
    if(b.dataset.act==="remove") removeCover(k);
  });
  $("#cover-file").addEventListener("change", async e=>{
    const file = e.target.files[0]; e.target.value = "";
    if(!file || coverTarget==null) return;
    try{ setCover(coverTarget, await cropToBanner(file)); }
    catch(err){ console.error(err); toast("Não deu para abrir essa imagem. Tente outra (JPG ou PNG)."); }
  });
  $("#pages").addEventListener("click", async e=>{
    const tab = e.target.closest(".page-tab");
    if(tab){ selectPage(+tab.dataset.i); text.focus(); return; }
    if(e.target.closest("#page-add")){
      app.editor.pages.splice(app.editor.active+1, 0, {id:store.uid(), text:""});
      selectPage(app.editor.active+1); render(); schedule(); text.focus();
      document.querySelectorAll("#sheets .paper")[app.editor.active]?.scrollIntoView({behavior:"smooth", block:"nearest"});
      toast("Página adicionada!"); return;
    }
    if(e.target.closest("#page-del")){
      const n = app.editor.active+1;
      const empty = !app.editor.pages[app.editor.active].text.trim();
      if(empty || await confirmDialog(`Excluir a página ${n}?`, "O texto desta página será apagado. Isso não pode ser desfeito.", "Excluir página")){
        app.editor.pages.splice(app.editor.active, 1);
        selectPage(Math.min(app.editor.active, app.editor.pages.length-1)); render(); schedule(); toast("Página excluída.");
      }
    }
  });
  $("#sheets").addEventListener("click", e=>{ const p = e.target.closest(".paper"); if(p) selectPage(+p.dataset.page); });
  F.lesson.addEventListener("change", ()=>crumbs([{label:"Início", href:"#/"}, ...(folder ? [{label:folder.name, href:`#/pasta/${folder.id}`}] : []), {label:nbTitle(current())}]));
  $(".paper-size").addEventListener("click", e=>{
    const b = e.target.closest("[data-page]"); if(!b) return;
    app.editor.nb.page = b.dataset.page;
    document.querySelectorAll(".paper-size .seg").forEach(x=>x.setAttribute("aria-pressed", x===b));
    render(); schedule();
  });
  $("#tpls").addEventListener("click", e=>{
    const b = e.target.closest(".tpl"); if(!b) return;
    app.editor.nb.tpl = b.dataset.id; render(); schedule();
  });
  wireColorPicker($("#nb-color"), "color", c => { app.editor.nb.color = c; schedule(); });
  $("#move").onchange = async e => { app.editor.nb.folderId = e.target.value; await persist(); toast("Caderno movido."); app.refresh(); };
  $("#del-nb").onclick = async () => {
    if(await confirmDialog("Excluir este caderno?", "Isso não pode ser desfeito.", "Excluir caderno")){
      clearTimeout(app.editor.timer); const fid = app.editor.nb.folderId;
      await store.deleteNotebook(id); app.editor = null; toast("Caderno excluído."); location.hash = `#/pasta/${fid}`;
    }
  };
  $("#dl-docx").onclick = async () => {
    const btn = $("#dl-docx");
    if(typeof JSZip === "undefined"){ toast("Não deu para preparar o arquivo. Recarregue a página."); return; }
    btn.disabled = true;
    try{ const d = current(); setTemplate(tplFor(d)); setImages(images); saveFile(await buildDocx(d), fileName(d)); toast("Arquivo baixado!"); }
    catch(e){ console.error(e); toast("Não deu para gerar o arquivo."); }
    finally{ btn.disabled = false; }
  };
  $("#copy-all").onclick = async () => {
    const h = app.editor.html, full = `<div>${h.body.split("<!--PB-->").map(b=>h.head+b+h.foot).join('<br style="page-break-before:always">')}</div>`;
    const tmp = document.createElement("div"); tmp.innerHTML = full;
    let ok = false;
    try{ await navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([full],{type:"text/html"}),"text/plain":new Blob([tmp.innerText],{type:"text/plain"})})]); ok = true; }
    catch(e){
      tmp.contentEditable = "true"; tmp.style.cssText = "position:fixed;left:-9999px;top:0;background:#fff;color:#000";
      document.body.appendChild(tmp); const r = document.createRange(); r.selectNodeContents(tmp);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try{ ok = document.execCommand("copy"); }catch(_){} sel.removeAllRanges(); tmp.remove();
    }
    toast(ok ? "Copiado! Agora é só colar onde quiser." : "Não deu para copiar. Selecione a folha e use Ctrl+C.");
  };
  /* ---------- abas do editor e modo de visualização ---------- */
  let sel = {a:0, b:0};
  text.addEventListener("blur", () => { sel = {a:text.selectionStart, b:text.selectionEnd}; });
  const showTab = id => {
    if(document.activeElement === text) sel = {a:text.selectionStart, b:text.selectionEnd};
    document.querySelectorAll(".ed-tab").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === id));
    document.querySelectorAll(".ed-pane").forEach(p => p.hidden = p.id !== "tab-" + id);
    try{ sessionStorage.setItem("cadernim-aba", id); }catch(e){}
    if(id === "capas") drawCovers();
    if(id === "ia") drawAI();
    if(id === "escrever") text.focus({preventScroll:true});
  };
  $(".ed-tabs").addEventListener("click", e => { const b = e.target.closest(".ed-tab"); if(b) showTab(b.dataset.tab); });
  $(".ed-tabs").addEventListener("keydown", e => {
    if(!["ArrowLeft","ArrowRight"].includes(e.key)) return;
    const tabs = [...document.querySelectorAll(".ed-tab")], i = tabs.indexOf(document.activeElement); if(i < 0) return;
    const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); showTab(n.dataset.tab);
  });
  $(".view-mode").addEventListener("click", e => {
    const b = e.target.closest("[data-mode]"); if(!b) return;
    $("#editor").className = "editor mode-" + b.dataset.mode;
    document.querySelectorAll(".view-mode .seg").forEach(x => x.setAttribute("aria-pressed", x === b));
    try{ localStorage.setItem("cadernim-modo", b.dataset.mode); }catch(err){}
    if(b.dataset.mode !== "write") render();
  });

  /* ---------- assistente de IA ---------- */
  const WHERE = [["nova","Numa página nova"],["fim","No fim desta página"],["cursor","Onde está o cursor"]];
  const DEFAULT_WHERE = {resumo:"nova", organizar:"fim", revisao:"nova", explicar:"cursor"};
  // Estado do painel (sobrevive quando o painel é redesenhado)
  let ai = {task:"resumo", where:"nova", abort:null, result:"", resultTask:"", extra:"", src:{organizar:"", explicar:""}, status:"", statusErr:false, from:null, to:null};
  /** Intervalo de páginas usado por Resumir e Perguntas de revisão (padrão: a página aberta). */
  const range = () => {
    const last = app.editor.pages.length - 1;
    let from = ai.from ?? app.editor.active, to = ai.to ?? app.editor.active;
    from = Math.min(Math.max(0, from), last); to = Math.min(Math.max(from, to), last);
    return {from, to};
  };
  const setStatus = (msg, err=false) => { ai.status = msg; ai.statusErr = err; const st = $("#ai-status"); if(st){ st.textContent = msg; st.classList.toggle("err", err); } };
  const drawAI = () => {
    const box = $("#ai-box");
    if(!hasKey()){
      box.innerHTML = `<div class="ai-empty">${ic("sparkles")}<h2>Assistente de IA</h2>
        <p>Ele resume páginas, organiza textos colados, cria perguntas de revisão e explica termos. Para usar, coloque sua chave da API do Claude (Anthropic) ou do OpenRouter nas Configurações.</p>
        <a class="btn primary" href="#/config">${ic("settings")}Ir para Configurações</a></div>`;
      paint(box); return;
    }
    const t = TASKS[ai.task], busy = !!ai.abort;
    // ao abrir "Explicar" com uma palavra selecionada no texto, ela já vem preenchida
    const picked = text.value.slice(sel.a, sel.b).trim();
    if(ai.task === "explicar" && picked && !ai.src.explicar) ai.src.explicar = picked;
    box.innerHTML = `
      <div class="ai-head"><h2>Assistente de IA</h2>
        <p class="help">Usando ${esc(currentModelName())} · <a href="#/config">trocar</a></p></div>
      <div class="ai-tasks" role="radiogroup" aria-label="O que a IA vai fazer">${Object.entries(TASKS).map(([id,x]) =>
        `<button type="button" class="ai-task" role="radio" data-task="${id}" aria-checked="${id===ai.task}" ${busy && id!==ai.task ? "disabled" : ""}>${ic(x.icon)}<b>${x.name}</b><small>${x.help}</small></button>`).join("")}</div>
      ${t.needsText
        ? `<label class="field">${ai.task==="explicar" ? "Termo ou trecho" : "Texto para organizar"}
            <textarea id="ai-src" rows="${ai.task==="explicar"?3:8}" placeholder="${ai.task==="explicar" ? "Ex.: mitocôndria" : "Cole aqui o texto da aula, de um PDF ou de uma transcrição"}">${esc(ai.src[ai.task] || "")}</textarea></label>`
        : app.editor.pages.length > 1 ? (() => { const {from, to} = range(), n = app.editor.pages.length;
            const opts = (sel, min=0) => Array.from({length:n}, (_,i) => i < min ? "" : `<option value="${i}" ${i===sel?"selected":""}>Página ${i+1}</option>`).join("");
            return `<div class="field"><span>Quais páginas usar</span>
              <div class="row ai-range"><label>De <select id="ai-from">${opts(from)}</select></label>
                <label>até <select id="ai-to">${opts(to, from)}</select></label>
                <button type="button" class="btn sm" id="ai-all">Todas</button>
                <small>${to-from+1} ${to===from ? "página" : "páginas"}</small></div></div>`; })()
          : `<p class="ai-from">${ic("file-text")} Vai usar o texto da <b>Página 1</b>.</p>`}
      <label class="field">Pedido extra (opcional)
        <input type="text" id="ai-extra" value="${esc(ai.extra)}" placeholder="Ex.: mais curto, foco nas datas, linguagem bem simples"></label>
      <div class="field"><span>Onde colocar o resultado</span>
        <div class="row" id="ai-where">${WHERE.map(([v,l]) => `<button type="button" class="seg" data-v="${v}" aria-pressed="${v===ai.where}">${l}</button>`).join("")}</div></div>
      <div class="row ai-actions">
        <button type="button" class="btn primary" id="ai-go" ${busy ? "disabled" : ""}>${ic("sparkles")}${busy ? "Gerando…" : "Gerar"}</button>
        <button type="button" class="btn" id="ai-stop" ${busy ? "" : "hidden"}>${ic("square")}Parar</button>
        <span class="status-msg ${ai.statusErr ? "err" : ""}" id="ai-status" role="status">${esc(ai.status)}</span>
      </div>
      <div class="ai-out" id="ai-out" ${ai.result || busy ? "" : "hidden"}>
        <p class="ai-out-title">${ic("sparkles")}Resultado: ${esc(TASKS[ai.resultTask || ai.task].name)}</p>
        <pre id="ai-text">${esc(ai.result)}</pre>
        <div class="row" id="ai-out-actions" ${busy ? "hidden" : ""}>
          <button type="button" class="btn primary" id="ai-insert">${ic("check")}Colocar no caderno</button>
          <button type="button" class="btn" id="ai-discard">${ic("x")}Descartar</button></div>
      </div>`;
    paint(box);
    box.querySelector(".ai-tasks").onclick = e => {
      const b = e.target.closest("[data-task]"); if(!b || b.disabled) return;
      if(ai.abort){ setStatus("Espere terminar (ou clique em Parar) para trocar de tarefa."); return; }
      ai.task = b.dataset.task; ai.where = DEFAULT_WHERE[ai.task]; drawAI();
    };
    const srcEl = $("#ai-src"); if(srcEl) srcEl.oninput = e => { ai.src[ai.task] = e.target.value; };
    const fromEl = $("#ai-from"), toEl = $("#ai-to"), allEl = $("#ai-all");
    if(fromEl) fromEl.onchange = e => { ai.from = +e.target.value; ai.to = Math.max(ai.from, range().to); drawAI(); };
    if(toEl) toEl.onchange = e => { ai.to = +e.target.value; ai.from = range().from; drawAI(); };
    if(allEl) allEl.onclick = () => { ai.from = 0; ai.to = app.editor.pages.length - 1; drawAI(); };
    $("#ai-extra").oninput = e => { ai.extra = e.target.value; };
    $("#ai-where").onclick = e => { const b = e.target.closest("[data-v]"); if(!b) return; ai.where = b.dataset.v;
      $("#ai-where").querySelectorAll("[data-v]").forEach(x => x.setAttribute("aria-pressed", x === b)); };
    $("#ai-go").onclick = generate;
    $("#ai-stop").onclick = () => ai.abort?.abort();
    $("#ai-insert").onclick = insertResult;
    $("#ai-discard").onclick = () => { ai.result = ""; ai.resultTask = ""; setStatus(""); drawAI(); };
  };
  const generate = async () => {
    if(ai.abort) return;
    const t = TASKS[ai.task];
    const {from, to} = range();
    const src = t.needsText ? (ai.src[ai.task] || "").trim()
      : app.editor.pages.slice(from, to + 1).map(p => p.text.split("\n").filter(l => !/^\s*\[(capa|imagem):/.test(l)).join("\n").trim()).filter(Boolean).join("\n\n");
    if(!src){ setStatus(t.needsText ? "Escreva ou cole um texto primeiro." : (from === to ? "Esta página está vazia." : "Essas páginas estão vazias.") + " Escreva algo antes de pedir à IA.", true); return; }
    ai.abort = new AbortController(); ai.result = ""; ai.resultTask = ai.task;
    setStatus("Pensando…"); drawAI();
    let frame = 0, partial = "";
    try{
      ai.result = await runTask(ai.task, {text:src, extra:ai.extra, context: ai.task==="explicar" ? app.editor.pages[app.editor.active].text.slice(0, 6000) : "",
        signal: ai.abort.signal,
        onText: out => { partial = out; if(ai.status !== "Escrevendo…") setStatus("Escrevendo…");
          if(!frame) frame = requestAnimationFrame(() => { frame = 0; const el = $("#ai-text"); if(el){ el.textContent = partial; el.scrollTop = el.scrollHeight; } }); }});
      setStatus("Pronto! Confira e coloque no caderno.");
    }catch(err){
      // parou no meio ou deu erro: guarda o que já tinha chegado, mas mostra o aviso certo
      ai.result = partial.trim();
      setStatus(err.code === "parado" ? (ai.result ? "Parado. O que já tinha sido escrito ficou aqui embaixo." : "Parado.") : err.message, err.code !== "parado");
    }finally{
      ai.abort = null;
      drawAI();
    }
  };
  const insertResult = () => {
    const out = ai.result.trim(); if(!out) return;
    const E = app.editor;
    if(ai.where === "nova"){
      E.pages.splice(E.active + 1, 0, {id:store.uid(), text:out + "\n"});
      selectPage(E.active + 1);
    }else if(ai.where === "fim"){
      E.pages[E.active].text = (E.pages[E.active].text.replace(/\s+$/, "") + "\n\n" + out + "\n");
      text.value = E.pages[E.active].text;
    }else{
      showTab("escrever");
      text.setSelectionRange(sel.b, sel.b);
      insertBlock(text, out);
      E.pages[E.active].text = text.value;
    }
    ai.result = ""; ai.resultTask = ""; setStatus(""); render(); schedule();
    showTab("escrever");
    toast("Pronto! O texto da IA entrou no caderno.");
  };

  drawPages();
  render();
  drawCovers();
  redrawPreview = renderSoon;
  document.fonts?.ready?.then(() => renderSoon());
  if(startPage) selectPage(startPage);
  app.editor.focusFind = q => {             // vindo da busca: seleciona a palavra no texto
    const i = norm(text.value).indexOf(norm(q)); if(i < 0) return;
    text.scrollIntoView({block:"center"});
    text.focus({preventScroll:true}); text.setSelectionRange(i, i + q.length);
    const lh = parseFloat(getComputedStyle(text).lineHeight) || 20;
    text.scrollTop = Math.max(0, text.value.slice(0, i).split("\n").length * lh - text.clientHeight/2);
  };
}
