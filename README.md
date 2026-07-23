# TODO que falta

Extensão do Visual Studio Code que encontra `TODO`, `FIXME` e `DOCME` no
workspace, mostra as pendências na barra lateral e realça os marcadores no
editor.

Somente os marcadores escritos exatamente em maiúsculas são considerados.
Assim, `TODO` é encontrado, mas `todo` e `Todo` são ignorados.

## Recursos

- ícone próprio no Activity Bar e visão na Primary Sidebar;
- resultados agrupados por marcador e, dentro dele, por arquivo;
- clique em um resultado para abrir o arquivo na linha exata;
- realce colorido dos marcadores em editores visíveis;
- atualização automática quando os arquivos mudam;
- botão para atualizar a busca manualmente;
- exclusão configurável de pastas e limite de tamanho por arquivo.

## Executar durante o desenvolvimento

### Pré-requisitos

- [Node.js](https://nodejs.org/) instalado;
- Visual Studio Code 1.85.0 ou superior.

Não há dependências de execução para instalar. Com o projeto aberto:

1. Pressione `F5` para iniciar a extensão.
2. Na janela **Extension Development Host**, abra uma pasta que contenha
   marcadores `TODO`, `FIXME` ou `DOCME`.
3. Clique no ícone de checklist **TODO que falta** no Activity Bar.

Não é necessário executar uma etapa de build.

## Gerar o arquivo VSIX

Na raiz do projeto, execute:

```sh
npx @vscode/vsce package
```

Se o empacotador avisar que o campo `repository` não está definido, confirme a
continuação ou execute:

```sh
npx @vscode/vsce package --allow-missing-repository
```

O arquivo será criado na raiz do projeto usando o nome e a versão definidos no
`package.json`. Por exemplo:

```text
todo-que-falta-0.2.0.vsix
```

Para instalar o pacote gerado:

```sh
code --install-extension todo-que-falta-0.2.0.vsix
```

## Configurações

- `todoQueFalta.exclude`: glob de arquivos e pastas ignorados.
- `todoQueFalta.maxFileSize`: tamanho máximo de cada arquivo analisado.
