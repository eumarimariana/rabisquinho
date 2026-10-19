# Cadernim

Site para organizar anotações de estudo em **pastas** e **cadernos** e baixar cada caderno como Word (.docx) ou PDF, em modelos fofos de caderno digital.

- Pastas e cadernos com ícone e cor, favoritos e etiquetas
- 7 modelos próprios (Morango, Lavanda, Menta, Pêssego & Mel, Céu de Algodão, Rabisco e Matcha Latte), em A4 ou Carta, com prévia ao vivo
- Barra de formatação, várias páginas por caderno, capas nos capítulos e imagens no meio do texto
- Busca em todos os cadernos
- Início com abas (Visão geral, Pastas, Cadernos, Etiquetas), animações e personalização (nome, cor do site, desenhos, seções)
- Editor em abas (Escrever, Modelo, Informações, Capas, IA) e modos Escrever / Lado a lado / Prévia
- Assistente de IA com a API do Claude (chave da própria pessoa): resumir página, organizar texto colado, perguntas de revisão e explicar termos
- Tudo fica salvo no navegador (IndexedDB), sem login e sem servidor. Backup e restauração em arquivo `.json`.

## Rodar no computador

O site usa módulos JavaScript, então precisa ser aberto por um servidor (abrir o `index.html` com dois cliques não funciona):

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000

## Publicar

É um site estático (só HTML, CSS e JS, sem etapa de build). Qualquer uma destas opções gratuitas funciona:

- **GitHub Pages**: *Settings → Pages → Deploy from a branch*, pasta raiz (`/`).
- **Netlify Drop**: arraste a pasta do projeto em https://app.netlify.com/drop
- **Vercel** ou **Cloudflare Pages**: importe o repositório, sem comando de build.

## Estrutura

```
index.html            página única do site
css/
  base.css            cores, barra do topo, botões, janelas, avisos
  home.css            início, pastas, cadernos, busca, favoritos, etiquetas
  editor.css          editor, barra de formatação, páginas, capas, folha da prévia
  print.css           impressão / "Salvar como PDF"
img/
  logo.svg            logo e ícone da aba
js/
  main.js             início do site: rotas (#/...), backup, busca, exemplo
  app/state.js        estado compartilhado entre as telas
  ai/assistant.js     assistente de IA (SDK oficial da Anthropic, chave guardada no navegador)
  data/
    store.js          salva pastas, cadernos e imagens no navegador; backup
    templates.js      os 7 modelos: paletas e estilos
    sample.js         caderno de exemplo da primeira visita
  engine/             texto → documento
    syntax.js         lê o texto (#, ##, listas, caixas, tabelas...) e vira blocos
    model.js          blocos → parágrafos e tabelas nas cores do modelo
    html.js           modelo → HTML (prévia)
    docx.js           modelo → arquivo Word (.docx)
    state.js          modelo atual, imagens e medidas da página
    index.js          junta tudo
  ui/
    dom.js            ajudas de tela (ícones, avisos, trilha, datas)
    colors.js         cores pastel e seletor de cor
    cards.js          cartões de caderno/pasta, etiquetas, favoritos
    dialogs.js        janelas (nova pasta, novo caderno, confirmar)
    prefs.js          aparência do início (nome, cor, desenhos, seções)
    toolbar.js        barra de formatação
    covers.js         capas: recorte de fotos e estampas
  views/              uma tela por arquivo
    home.js  folder.js  editor.js  search.js  tag.js  settings.js
docs/
  SINTAXE.md          como escrever as anotações (todos os símbolos)
  ROADMAP.md          o que já tem e próximos passos
```

### Como o documento é montado

```
texto do caderno ──syntax.js──▶ blocos ──model.js──▶ modelo ──┬─html.js──▶ prévia na tela
                                                              └─docx.js──▶ arquivo .docx
```

O PDF usa a própria prévia: o botão abre a impressão do navegador com `print.css`.

### Bibliotecas (carregadas por CDN em `index.html`)

- [JSZip 3.10.1](https://stuk.github.io/jszip/): monta o arquivo .docx
- [Lucide 0.460.0](https://lucide.dev): ícones
- [SDK da Anthropic 0.131.0](https://github.com/anthropics/anthropic-sdk-typescript): assistente de IA (carregado só quando a IA é usada)
- Google Fonts: Fredoka, Roboto e Roboto Mono (site); Nunito, Quicksand, Lora, Comfortaa, Pacifico e Caveat (modelos)

## Assistente de IA

Em **Configurações → Assistente de IA**, cada pessoa cola a própria chave da API do Claude (criada em https://console.anthropic.com/settings/keys) e escolhe o modelo (Claude Opus 5.5 por padrão, ou Sonnet 5.5 / Haiku 5.5). A chave fica só no navegador (`localStorage`) e os pedidos vão direto para `api.anthropic.com`, cobrados na conta da pessoa.

No editor, a aba **IA** tem quatro tarefas. A resposta vem na mesma sintaxe do caderno (`docs/SINTAXE.md`) e pode ir para uma página nova, para o fim da página ou para onde está o cursor.
