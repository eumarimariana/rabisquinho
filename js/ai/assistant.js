// Assistente de IA com a chave da própria pessoa, por um destes provedores:
//   - Anthropic (API do Claude), pelo SDK oficial, carregado do CDN só quando a IA é usada;
//   - OpenRouter (muitos modelos de várias empresas), pela API HTTP de chat do OpenRouter.
// As chaves ficam só neste navegador (localStorage) e vão direto para o provedor escolhido.

const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.131.0/+esm";
const KEY = "cadernim-ia";

export const MODELS = [
  {id:"claude-opus-5-5",   name:"Claude Opus 5.5",   desc:"Melhor qualidade (padrão)"},
  {id:"claude-sonnet-5-5", name:"Claude Sonnet 5.5", desc:"Mais rápido e mais barato"},
  {id:"claude-haiku-5-5",  name:"Claude Haiku 5.5",  desc:"O mais barato, para textos simples"},
];

export const PROVIDERS = [
  {id:"anthropic",  name:"Claude (Anthropic)", keyHint:"sk-ant-...", keyUrl:"https://console.anthropic.com/settings/keys"},
  {id:"openrouter", name:"OpenRouter",         keyHint:"sk-or-...",  keyUrl:"https://openrouter.ai/settings/keys"},
];
const OR_URL = "https://openrouter.ai/api/v1";
/** No OpenRouter o Cadernim usa só modelos gratuitos. Atalhos (a lista completa vem da API deles). */
export const OR_FREE_ROUTER = "openrouter/free";
export const OR_QUICK = [
  {id:OR_FREE_ROUTER,                          name:"Automático grátis (o OpenRouter escolhe)"},
  {id:"google/gemma-4-31b-it:free",            name:"Gemma 4 31B"},
  {id:"nvidia/nemotron-3-super-120b-a12b:free", name:"Nemotron 3 Super"},
];
/** Modelo gratuito? (id terminado em ":free" ou o roteador grátis) */
export const isFreeModel = id => id === OR_FREE_ROUTER || /:free$/.test(id || "");

/* ---------- configurações ---------- */
const DEFAULTS = {provider:"anthropic", model:MODELS[0].id, apiKey:"", orKey:"", orModel:OR_FREE_ROUTER};
export function getSettings(){
  let s;
  try{ s = {...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}")}; }
  catch(e){ s = {...DEFAULTS}; }
  if(!isFreeModel(s.orModel)) s.orModel = OR_FREE_ROUTER;   // só modelos grátis no OpenRouter
  return s;
}
/** Nome do modelo em uso, para mostrar na tela. */
export function currentModelName(){
  const s = getSettings();
  if(s.provider === "openrouter") return (OR_QUICK.find(m=>m.id===s.orModel)?.name || s.orModel) + " · OpenRouter (grátis)";
  return MODELS.find(m=>m.id===s.model)?.name || s.model;
}
/** Lista dos modelos de texto GRATUITOS do OpenRouter (pública, sem chave). */
let orModels = null;
export async function listOpenRouterModels(){
  if(orModels) return orModels;
  const r = await fetch(OR_URL + "/models");
  if(!r.ok) throw new Error("Não deu para carregar a lista de modelos do OpenRouter.");
  const {data} = await r.json();
  const free = m => m.pricing?.prompt === "0" && m.pricing?.completion === "0";
  const chat = m => (m.architecture?.output_modalities || ["text"]).includes("text") && !/lyria|content-safety|:batch$/.test(m.id);
  orModels = data.filter(m => free(m) && chat(m) && isFreeModel(m.id))
    .map(m => ({id:m.id, name:m.name})).sort((a,b) => a.name.localeCompare(b.name));
  return orModels;
}
export function saveSettings(patch){
  const s = {...getSettings(), ...patch};
  try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){}
  return s;
}
export const hasKey = () => { const s = getSettings(); return !!(s.provider === "openrouter" ? s.orKey : s.apiKey); };

let sdk = null;
async function client(){
  const {apiKey} = getSettings();
  if(!apiKey) throw new AIError("sem-chave", "Coloque sua chave da API nas Configurações para usar a IA.");
  if(!sdk) sdk = await import(SDK_URL);
  return {Anthropic: sdk.default, c: new sdk.default({apiKey, dangerouslyAllowBrowser:true})};
}

export class AIError extends Error { constructor(code, msg){ super(msg); this.code = code; } }

/** Traduz os erros da API para mensagens que a pessoa entende. */
function friendly(err, Anthropic){
  if(err instanceof AIError) return err;
  if(err?.name === "AbortError" || (Anthropic && err instanceof Anthropic.APIUserAbortError)) return new AIError("parado", "Geração interrompida.");
  if(!Anthropic) return new AIError("desconhecido", "Algo deu errado com a IA: " + (err?.message || err));
  if(err instanceof Anthropic?.AuthenticationError) return new AIError("chave", "A chave da API não foi aceita. Confira se copiou ela inteira nas Configurações.");
  if(err instanceof Anthropic?.PermissionDeniedError) return new AIError("permissao", "Essa chave não tem permissão para usar este modelo.");
  if(err instanceof Anthropic?.RateLimitError) return new AIError("limite", "Muitos pedidos seguidos. Espere um minutinho e tente de novo.");
  if(err instanceof Anthropic?.BadRequestError) return new AIError("pedido", "A API recusou o pedido: " + (err.message || "pedido inválido") + ". Se o texto for muito grande, tente uma parte menor.");
  if(err instanceof Anthropic?.InternalServerError) return new AIError("servidor", "O serviço da IA está com problemas agora. Tente de novo daqui a pouco.");
  if(err instanceof Anthropic?.APIConnectionError) return new AIError("conexao", "Não deu para falar com a IA. Confira sua internet.");
  if(err instanceof Anthropic?.APIError) return new AIError("api", `Erro da API (${err.status}): ${err.message}`);
  return new AIError("desconhecido", "Algo deu errado com a IA: " + (err?.message || err));
}

/* ---------- o que a IA sabe sobre o Cadernim ---------- */
const SYNTAX = `Você escreve anotações de estudo para o Cadernim, um caderno digital. O texto que você devolve é lido por um programa que transforma cada linha em um pedaço do caderno. Use SOMENTE esta sintaxe, uma coisa por linha:

# Título            → tópico principal (numerado sozinho: 1.0, 2.0…)
## Subtítulo        → subtópico (1.1, 1.2…)
### Título          → sub-subtópico
? Pergunta          → faixa com a pergunta-chave de um tópico
?? Pergunta         → faixa menor
- texto             → marcador (2 espaços antes = segundo nível, 4 = terceiro)
1. texto            → lista numerada
! texto             → termo importante, em destaque
> texto             → observação rápida
>> Título | texto   → caixa de observação importante
!!! Título | texto  → caixa de alerta (use pouco: só o que não pode errar)
?! Tema | pergunta | resposta → seção "Você sabia?"
@ 1822 | evento     → linha do tempo (ano ou data | o que aconteceu)
Tabela: legenda     → legenda numerada da tabela que vem logo abaixo
| a | b |           → linha de tabela (a primeira linha é o cabeçalho)
linha comum         → parágrafo

Dentro do texto: **negrito**, *itálico*, __sublinhado__, ==marca-texto amarelo==, ++marca-texto suave++, {{termo-chave}}.

Regras:
- Escreva em português do Brasil, com linguagem clara de estudante.
- Devolva só o texto do caderno: sem cumprimentos, sem explicar o que fez, sem blocos de código, sem Markdown que não esteja na lista (não use ** em títulos, não use ---).
- Deixe uma linha em branco entre blocos.
- Não escreva números nos títulos (nada de "# 1.0 Título"): o caderno numera sozinho.
- Prefira listas curtas a parágrafos longos. Marque com ! ou {{ }} só os termos que realmente importam.
- Não invente fatos que não estão no texto da pessoa; se faltar algo importante, você pode completar com conhecimento geral confiável, sem exagerar.
- Nunca escreva linhas que começam com [capa: ou [imagem: (são de imagens).`;

export const TASKS = {
  resumo: {
    name:"Resumir", icon:"sparkles", needsText:false,
    help:"Faz um resumo desta página em anotações organizadas.",
    prompt:(t, x) => `Faça um resumo de estudo do conteúdo abaixo. Comece com um tópico principal (#) com o tema, depois os subtópicos (##) com os pontos essenciais em marcadores curtos. Termine com uma caixa >> Para lembrar | com a ideia central em 1 ou 2 frases.${x ? `\n\nPedido extra da pessoa: ${x}` : ""}\n\n<conteudo>\n${t}\n</conteudo>`,
  },
  organizar: {
    name:"Organizar texto", icon:"wand-sparkles", needsText:true,
    help:"Cole um texto solto (aula, PDF, transcrição) e a IA transforma em anotações.",
    prompt:(t, x) => `Transforme o texto abaixo em anotações de estudo bem organizadas, mantendo todas as informações importantes. Use tópicos, subtópicos, listas, tabelas (quando houver comparações) e linha do tempo (quando houver datas).${x ? `\n\nPedido extra da pessoa: ${x}` : ""}\n\n<texto>\n${t}\n</texto>`,
  },
  revisao: {
    name:"Perguntas de revisão", icon:"list-checks", needsText:false,
    help:"Cria perguntas com resposta para treinar para a prova.",
    prompt:(t, x) => `Crie perguntas de revisão sobre o conteúdo abaixo. Comece com "# Revisão". Faça de 6 a 10 itens no formato "?! Tema | pergunta | resposta curta", do mais fácil ao mais difícil, cobrindo os pontos principais.${x ? `\n\nPedido extra da pessoa: ${x}` : ""}\n\n<conteudo>\n${t}\n</conteudo>`,
  },
  explicar: {
    name:"Explicar", icon:"lightbulb", needsText:true,
    help:"Explica um termo ou trecho de um jeito simples.",
    prompt:(t, x, ctx) => `Explique de forma simples, para um estudante, o termo ou trecho abaixo. Responda com uma caixa ">> Nome do termo | explicação em 2 a 4 frases" e, se ajudar, até 3 marcadores com exemplos.${x ? `\n\nPedido extra da pessoa: ${x}` : ""}\n\n<termo>\n${t}\n</termo>${ctx ? `\n\n<contexto_da_pagina>\n${ctx}\n</contexto_da_pagina>` : ""}`,
  },
};

/** Tira cercas de código e linhas de imagem que a IA não deveria mandar. */
export function cleanOutput(s){
  return s.replace(/^```[a-z]*\n?/i, "").replace(/\n?```\s*$/, "")
    .split("\n").filter(l => !/^\s*\[(capa|imagem):/.test(l))
    .map(l => l.replace(/^(#{1,3})\s+\d+(?:\.\d+)*\.?\s+/, "$1 "))   // "# 1.0 Título" → "# Título" (o caderno numera sozinho)
    .join("\n").trim();
}

/**
 * Roda uma tarefa com streaming.
 * onText(textoAtéAgora) é chamado a cada pedaço. signal (AbortSignal) para parar.
 * Devolve o texto final.
 */
export async function runTask(taskId, {text, extra="", context="", onText, signal}){
  const task = TASKS[taskId];
  if(getSettings().provider === "openrouter") return runOpenRouter(task.prompt(text, extra.trim(), context), {onText, signal, maxTokens:16000});
  let Anthropic;
  try{
    const r = await client(); Anthropic = r.Anthropic;
    const {model} = getSettings();
    const params = {
      model, max_tokens: 16000,
      system: SYNTAX,
      output_config: {effort: "medium"},
      messages: [{role:"user", content: task.prompt(text, extra.trim(), context)}],
    };
    // Opus 5.5 e Sonnet 5.5: se o pedido for recusado, a API tenta de novo em outro modelo.
    const useFallback = model !== "claude-haiku-5-5";
    const stream = useFallback
      ? r.c.beta.messages.stream({...params, betas:["server-side-fallback-2026-07-01"], fallbacks:"default"}, {signal})
      : r.c.messages.stream(params, {signal});
    let out = "";
    stream.on("text", delta => { out += delta; onText?.(out); });
    const msg = await stream.finalMessage();
    if(msg.stop_reason === "refusal") throw new AIError("recusa", "A IA não quis responder esse pedido. Tente reescrever o texto ou o pedido.");
    const final = cleanOutput(out);
    if(!final) throw new AIError("vazio", "A IA não devolveu nada. Tente de novo.");
    if(msg.stop_reason === "max_tokens") return final + "\n\n> (A resposta foi cortada por ser muito longa. Tente uma parte menor do texto.)";
    return final;
  }catch(err){ throw friendly(err, Anthropic); }
}

/* ---------- OpenRouter ---------- */
function orError(status, msg){
  if(status === 401) return new AIError("chave", "A chave do OpenRouter não foi aceita. Confira se copiou ela inteira nas Configurações.");
  if(status === 402) return new AIError("creditos", "O OpenRouter pediu créditos para este pedido. Confira se o modelo escolhido é mesmo gratuito (termina em \"(free)\").");
  if(status === 403) return new AIError("permissao", "O OpenRouter bloqueou este pedido" + (msg ? `: ${msg}` : "."));
  if(status === 404) return new AIError("modelo", "Esse modelo grátis não está disponível agora. Escolha \"Automático grátis\" nas Configurações. Se continuar, em openrouter.ai/settings/privacy permita o uso de modelos gratuitos.");
  if(status === 408 || status === 429) return new AIError("limite", "Os modelos grátis têm limite de pedidos por minuto e por dia. Espere um pouco e tente de novo, ou troque de modelo.");
  if(status === 400) return new AIError("pedido", "O OpenRouter recusou o pedido" + (msg ? `: ${msg}` : ".") + " Se o texto for muito grande, tente uma parte menor.");
  if(status >= 500) return new AIError("servidor", "O modelo ou o OpenRouter está com problemas agora. Tente de novo daqui a pouco.");
  return new AIError("api", `Erro do OpenRouter (${status})` + (msg ? `: ${msg}` : ""));
}
/** Chat com streaming (SSE): cada linha "data: {...}" traz um pedaço em choices[0].delta.content. */
async function runOpenRouter(prompt, {onText, signal, maxTokens}){
  const {orKey, orModel} = getSettings();
  if(!orKey) throw new AIError("sem-chave", "Coloque sua chave do OpenRouter nas Configurações para usar a IA.");
  let res;
  try{
    res = await fetch(OR_URL + "/chat/completions", {method:"POST", signal,
      headers:{"Authorization":`Bearer ${orKey}`, "Content-Type":"application/json", "HTTP-Referer":location.origin, "X-Title":"Cadernim"},
      body: JSON.stringify({model:orModel, stream:true, max_tokens:maxTokens,
        messages:[{role:"system", content:SYNTAX}, {role:"user", content:prompt}]})});
  }catch(err){
    if(err?.name === "AbortError") throw new AIError("parado", "Geração interrompida.");
    throw new AIError("conexao", "Não deu para falar com o OpenRouter. Confira sua internet.");
  }
  if(!res.ok){ let j = {}; try{ j = await res.json(); }catch(e){} throw orError(res.status, j?.error?.message); }
  const reader = res.body.getReader(), dec = new TextDecoder();
  let buf = "", out = "", finish = null;
  try{
    for(;;){
      const {done, value} = await reader.read();
      if(done) break;
      buf += dec.decode(value, {stream:true});
      let nl;
      while((nl = buf.indexOf("\n")) >= 0){
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if(!line || line.startsWith(":") || !line.startsWith("data:")) continue;   // linhas ":" só mantêm a conexão viva
        const data = line.slice(5).trim();
        if(data === "[DONE]") break;
        let chunk; try{ chunk = JSON.parse(data); }catch(e){ continue; }
        if(chunk.error) throw orError(typeof chunk.error.code === "number" ? chunk.error.code : 500, chunk.error.message);
        const c = chunk.choices?.[0];
        if(c?.delta?.content){ out += c.delta.content; onText?.(out); }
        if(c?.finish_reason) finish = c.finish_reason;
      }
    }
  }catch(err){
    if(err instanceof AIError) throw err;
    if(err?.name === "AbortError") throw new AIError("parado", "Geração interrompida.");
    throw new AIError("conexao", "A conexão com o OpenRouter caiu no meio da resposta. Tente de novo.");
  }
  const final = cleanOutput(out);
  if(!final) throw new AIError("vazio", "O modelo não devolveu nada. Tente de novo ou escolha outro modelo.");
  if(finish === "length") return final + "\n\n> (A resposta foi cortada por ser muito longa. Tente uma parte menor do texto.)";
  return final;
}

/** Testa a chave com um pedido bem pequeno. */
export async function testKey(){
  if(getSettings().provider === "openrouter"){
    try{ await runOpenRouter("Responda só: ok", {maxTokens:64}); }
    catch(e){ if(e.code !== "vazio") throw e; }   // alguns modelos gastam os poucos tokens "pensando": a chave funcionou
    return getSettings().orModel;
  }
  let Anthropic;
  try{
    const r = await client(); Anthropic = r.Anthropic;
    const msg = await r.c.messages.create({model:getSettings().model, max_tokens:512, output_config:{effort:"low"},
      messages:[{role:"user", content:"Responda só: ok"}]});
    return msg.model;
  }catch(err){ throw friendly(err, Anthropic); }
}
