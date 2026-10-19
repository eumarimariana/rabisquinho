# Cadernim

Site para organizar anotações de estudo em **pastas** e **cadernos** e baixar cada caderno como Word (.docx) ou PDF, em modelos fofos de caderno digital.

- Pastas e cadernos com ícone e cor, favoritos e etiquetas
- 7 modelos próprios (Morango, Lavanda, Menta, Pêssego & Mel, Céu de Algodão, Rabisco e Matcha Latte), em A4 ou Carta, com prévia ao vivo
- Barra de formatação, várias páginas por caderno, capas nos capítulos e imagens no meio do texto
- Busca em todos os cadernos
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
    toolbar.js        barra de formatação
    covers.js         capas: recorte de fotos e estampas
  views/              uma tela por arquivo
    home.js  folder.js  editor.js  search.js  tag.js
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
- Google Fonts: Fredoka, Roboto e Roboto Mono (site); Nunito, Quicksand, Lora, Comfortaa, Pacifico e Caveat (modelos)
