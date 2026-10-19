// Configurações: aparência do início e assistente de IA.
import { esc } from "../engine/index.js";
import { $, view, ic, paint, toast, crumbs } from "../ui/dom.js";
import { getPrefs, savePrefs, ACCENTS, DOODLES, SECTIONS } from "../ui/prefs.js";
import { getSettings, saveSettings, MODELS, PROVIDERS, OR_QUICK, listOpenRouterModels, testKey } from "../ai/assistant.js";

export async function settingsView(){
  crumbs([{label:"Início", href:"#/"}, {label:"Configurações"}]);
  const p = getPrefs(), ai = getSettings();
  const secName = id => SECTIONS.find(s=>s.id===id)?.name || id;
  view.innerHTML = `
  <div class="settings">
    <div class="hello"><div><h1>Configurações</h1><p>Deixe o Cadernim com a sua cara e ligue o assistente de IA.</p></div></div>

    <section class="panel" aria-labelledby="t-ap">
      <h2 id="t-ap">${ic("palette")}Aparência</h2>
      <label class="field">Como quer ser chamada?<input type="text" id="p-name" maxlength="30" value="${esc(p.name)}" placeholder="Seu nome ou apelido"></label>
      <div class="field"><span>Cor do site</span>
        <div class="row" id="p-accent">${ACCENTS.map(a=>`<button type="button" class="accent-pick" data-v="${a.id}" aria-pressed="${a.id===p.accent}"><i style="background:${a.dot}"></i>${a.name}</button>`).join("")}</div></div>
      <div class="field"><span>Desenhos no topo do início</span>
        <div class="row" id="p-doodles">${DOODLES.map(d=>`<button type="button" class="seg" data-v="${d.id}" aria-pressed="${d.id===p.doodles}">${d.name}</button>`).join("")}</div></div>
      <label class="check"><input type="checkbox" id="p-motion" ${p.motion?"checked":""}> Animações (desenhos flutuando e cartões aparecendo)</label>
      <div class="field"><span>O que aparece na "Visão geral"</span>
        <ol class="sections" id="p-sections">${p.sections.map((s,i)=>`<li data-id="${s.id}">
          <label class="check"><input type="checkbox" ${s.on?"checked":""}> ${esc(secName(s.id))}</label>
          <span class="move"><button type="button" class="icon-mini" data-mv="-1" aria-label="Subir ${esc(secName(s.id))}" ${i===0?"disabled":""}>${ic("chevron-up")}</button>
          <button type="button" class="icon-mini" data-mv="1" aria-label="Descer ${esc(secName(s.id))}" ${i===p.sections.length-1?"disabled":""}>${ic("chevron-down")}</button></span></li>`).join("")}</ol></div>
    </section>

    <section class="panel" aria-labelledby="t-ia">
      <h2 id="t-ia">${ic("sparkles")}Assistente de IA</h2>
      <p class="help">A IA resume páginas, organiza textos colados, cria perguntas de revisão e explica termos. Ela usa a <b>sua</b> chave de API: os pedidos são cobrados na sua conta do provedor escolhido.</p>
      <div class="field"><span>Provedor</span>
        <div class="row" id="ai-provider">${PROVIDERS.map(p=>`<button type="button" class="seg" data-v="${p.id}" aria-pressed="${p.id===ai.provider}">${p.name}</button>`).join("")}</div></div>

      <div id="prov-anthropic" ${ai.provider==="anthropic"?"":"hidden"}>
        <ol class="steps">
          <li>Entre em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> e crie uma chave de API.</li>
          <li>Cole a chave aqui embaixo e clique em <b>Salvar e testar</b>.</li>
        </ol>
        <label class="field">Chave da API da Anthropic
          <span class="key-row"><input type="password" id="ai-key" autocomplete="off" spellcheck="false" placeholder="sk-ant-..." value="${esc(ai.apiKey)}">
          <button type="button" class="btn sm show-key" data-for="ai-key">${ic("eye")}Mostrar</button></span></label>
        <div class="field"><span>Modelo</span>
          <div class="models" id="ai-model">${MODELS.map(m=>`<button type="button" class="model-pick" data-v="${m.id}" aria-pressed="${m.id===ai.model}"><b>${m.name}</b><small>${m.desc}</small></button>`).join("")}</div></div>
      </div>

      <div id="prov-openrouter" ${ai.provider==="openrouter"?"":"hidden"}>
        <ol class="steps">
          <li>Entre em <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener">openrouter.ai</a>, coloque créditos na conta e crie uma chave.</li>
          <li>Cole a chave, escolha o modelo e clique em <b>Salvar e testar</b>.</li>
        </ol>
        <label class="field">Chave do OpenRouter
          <span class="key-row"><input type="password" id="or-key" autocomplete="off" spellcheck="false" placeholder="sk-or-..." value="${esc(ai.orKey)}">
          <button type="button" class="btn sm show-key" data-for="or-key">${ic("eye")}Mostrar</button></span></label>
        <div class="field"><span>Modelo</span>
          <div class="row" id="or-quick">${OR_QUICK.map(m=>`<button type="button" class="seg" data-v="${m.id}" aria-pressed="${m.id===ai.orModel}">${m.name}</button>`).join("")}</div>
          <label class="field">Ou procure qualquer modelo do OpenRouter
            <input type="text" id="or-model" list="or-models" autocomplete="off" spellcheck="false" value="${esc(ai.orModel)}" placeholder="Ex.: anthropic/claude-sonnet-5.5"></label>
          <datalist id="or-models"></datalist>
          <span class="help" id="or-count">Carregando a lista de modelos…</span>
        </div>
      </div>

      <div class="row">
        <button type="button" class="btn primary" id="ai-save">${ic("check")}Salvar e testar</button>
        <button type="button" class="btn danger" id="ai-del" ${(ai.provider==="openrouter"?ai.orKey:ai.apiKey)?"":"hidden"}>${ic("trash-2")}Apagar chave</button>
        <span class="status-msg" id="ai-status" role="status">${(ai.provider==="openrouter"?ai.orKey:ai.apiKey) ? "Chave salva neste navegador." : ""}</span>
      </div>
      <p class="help">${ic("shield")} A chave fica guardada só neste navegador e vai direto para o provedor (Anthropic ou OpenRouter), sem passar por nenhum outro servidor. Não use o Cadernim com a sua chave em computadores de outras pessoas.</p>
    </section>
  </div>`;
  paint(view);

  /* aparência */
  $("#p-name").addEventListener("input", e => savePrefs({name:e.target.value.trim()}));
  $("#p-accent").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if(!b) return;
    savePrefs({accent:b.dataset.v}); $("#p-accent").querySelectorAll("[data-v]").forEach(x=>x.setAttribute("aria-pressed", x===b)); });
  $("#p-doodles").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if(!b) return;
    savePrefs({doodles:b.dataset.v}); $("#p-doodles").querySelectorAll("[data-v]").forEach(x=>x.setAttribute("aria-pressed", x===b)); });
  $("#p-motion").addEventListener("change", e => savePrefs({motion:e.target.checked}));
  const readSections = () => [...$("#p-sections").children].map(li=>({id:li.dataset.id, on:li.querySelector("input").checked}));
  $("#p-sections").addEventListener("change", () => savePrefs({sections:readSections()}));
  $("#p-sections").addEventListener("click", e => {
    const b = e.target.closest("[data-mv]"); if(!b) return;
    const list = readSections(), i = list.findIndex(s=>s.id===b.closest("li").dataset.id), j = i + +b.dataset.mv;
    if(j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    savePrefs({sections:list}); settingsView().then(()=>$(`#p-sections li[data-id="${list[j].id}"] [data-mv="${b.dataset.mv}"]`)?.focus());
  });

  /* IA */
  const prov = () => getSettings().provider;
  const keyOf = () => prov()==="openrouter" ? getSettings().orKey : getSettings().apiKey;
  const refreshKeyUi = () => { $("#ai-del").hidden = !keyOf(); $("#ai-status").textContent = keyOf() ? "Chave salva neste navegador." : ""; };
  $("#ai-provider").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if(!b) return;
    saveSettings({provider:b.dataset.v});
    $("#ai-provider").querySelectorAll("[data-v]").forEach(x=>x.setAttribute("aria-pressed", x===b));
    $("#prov-anthropic").hidden = b.dataset.v !== "anthropic"; $("#prov-openrouter").hidden = b.dataset.v !== "openrouter";
    refreshKeyUi(); });
  view.querySelectorAll(".show-key").forEach(btn => btn.onclick = () => {
    const k = $("#" + btn.dataset.for), show = k.type === "password"; k.type = show ? "text" : "password";
    btn.innerHTML = ic(show?"eye-off":"eye") + (show?"Esconder":"Mostrar"); paint(btn); });
  $("#ai-model").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if(!b) return;
    saveSettings({model:b.dataset.v}); $("#ai-model").querySelectorAll("[data-v]").forEach(x=>x.setAttribute("aria-pressed", x===b)); });
  const markQuick = id => $("#or-quick").querySelectorAll("[data-v]").forEach(x=>x.setAttribute("aria-pressed", x.dataset.v===id));
  $("#or-quick").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if(!b) return;
    saveSettings({orModel:b.dataset.v}); $("#or-model").value = b.dataset.v; markQuick(b.dataset.v); });
  $("#or-model").addEventListener("change", e => { const v = e.target.value.trim(); if(v){ saveSettings({orModel:v}); markQuick(v); } });
  listOpenRouterModels().then(list => {
    $("#or-models").innerHTML = list.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("");
    $("#or-count").textContent = `${list.length} modelos disponíveis. Comece a digitar o nome (ex.: claude, gemini, llama).`;
  }).catch(() => { const c = $("#or-count"); if(c) c.textContent = "Não deu para carregar a lista agora, mas você pode digitar o nome do modelo."; });
  $("#ai-save").onclick = async () => {
    const st = $("#ai-status"), isOR = prov()==="openrouter";
    const key = $(isOR ? "#or-key" : "#ai-key").value.trim();
    if(!key){ st.textContent = "Cole a chave antes de salvar."; return; }
    if(isOR){ const m = $("#or-model").value.trim(); saveSettings({orKey:key, ...(m ? {orModel:m} : {})}); }
    else saveSettings({apiKey:key});
    st.textContent = "Testando a chave…"; $("#ai-save").disabled = true; $("#ai-del").hidden = false;
    try{ await testKey(); st.textContent = "Tudo certo! A IA está pronta para usar nos cadernos."; toast("IA ativada!"); }
    catch(err){ st.textContent = err.message; }
    finally{ $("#ai-save").disabled = false; }
  };
  $("#ai-del").onclick = () => {
    saveSettings(prov()==="openrouter" ? {orKey:""} : {apiKey:""});
    $(prov()==="openrouter" ? "#or-key" : "#ai-key").value = "";
    toast("Chave apagada deste navegador."); refreshKeyUi();
  };
}
