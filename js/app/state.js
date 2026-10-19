// Estado da navegação, compartilhado entre as telas e o roteador.
export const app = {
  editor: null,        // caderno aberto no editor (para salvar antes de sair)
  pendingFind: null,   // palavra vinda da busca, para selecionar no texto
  refresh: () => {},   // redesenha a tela atual (definido em main.js)
};
