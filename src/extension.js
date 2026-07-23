'use strict';

const path = require('node:path');
const vscode = require('vscode');
const { MARKERS, scanText } = require('./scanner');
const { groupMatchesByFile } = require('./tree');

const MARKER_COLORS = Object.freeze({
  TODO: {
    backgroundColor: 'rgba(255, 193, 7, 0.25)',
    overviewRulerColor: '#ffc107'
  },
  FIXME: {
    backgroundColor: 'rgba(244, 67, 54, 0.25)',
    overviewRulerColor: '#f44336'
  },
  DOCME: {
    backgroundColor: 'rgba(33, 150, 243, 0.25)',
    overviewRulerColor: '#2196f3'
  }
});

class TodoTreeProvider {
  /**
   * @param {vscode.ExtensionContext} context
   */
  constructor(context) {
    this.context = context;
    this.matches = [];
    this.scanGeneration = 0;
    this.refreshTimer = undefined;
    this.changeEmitter = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.changeEmitter.event;
    this.decorations = new Map();

    for (const marker of MARKERS) {
      const color = MARKER_COLORS[marker];
      this.decorations.set(marker, vscode.window.createTextEditorDecorationType({
        backgroundColor: color.backgroundColor,
        borderRadius: '3px',
        fontWeight: 'bold',
        overviewRulerColor: color.overviewRulerColor,
        overviewRulerLane: vscode.OverviewRulerLane.Right
      }));
    }
  }

  async refresh() {
    const generation = ++this.scanGeneration;
    const matches = await this.scanWorkspace();

    if (generation !== this.scanGeneration) {
      return;
    }

    this.matches = matches;
    await vscode.commands.executeCommand('setContext', 'todoQueFalta.isEmpty', matches.length === 0);
    this.changeEmitter.fire();
    this.decorateVisibleEditors();
  }

  scheduleRefresh(delay = 250) {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => {
      void this.refresh();
    }, delay);
  }

  async scanWorkspace() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      return [];
    }

    const config = vscode.workspace.getConfiguration('todoQueFalta');
    const exclude = config.get('exclude', '**/{.git,node_modules,out,dist,build,coverage,.next,.cache}/**');
    const maxFileSize = config.get('maxFileSize', 1024 * 1024);
    const uris = await vscode.workspace.findFiles('**/*', exclude);
    const results = [];

    await mapWithConcurrency(uris, 16, async (uri) => {
      try {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.type !== vscode.FileType.File || stat.size > maxFileSize) {
          return;
        }

        const bytes = await vscode.workspace.fs.readFile(uri);
        if (looksBinary(bytes)) {
          return;
        }

        const text = new TextDecoder('utf-8').decode(bytes);
        for (const match of scanText(text)) {
          results.push({ ...match, uri });
        }
      } catch {
        // Arquivos podem desaparecer ou ficar inacessíveis durante a busca.
      }
    });

    return results.sort((left, right) => {
      const byMarker = MARKERS.indexOf(left.marker) - MARKERS.indexOf(right.marker);
      const byFile = left.uri.fsPath.localeCompare(right.uri.fsPath);
      return byMarker || byFile || left.line - right.line || left.column - right.column;
    });
  }

  decorateVisibleEditors() {
    for (const editor of vscode.window.visibleTextEditors) {
      this.decorateEditor(editor);
    }
  }

  /**
   * @param {vscode.TextEditor} editor
   */
  decorateEditor(editor) {
    const byMarker = new Map(MARKERS.map((marker) => [marker, []]));

    for (const match of scanText(editor.document.getText())) {
      const start = editor.document.positionAt(
        editor.document.offsetAt(new vscode.Position(match.line, match.column))
      );
      byMarker.get(match.marker).push(
        new vscode.Range(start, start.translate(0, match.marker.length))
      );
    }

    for (const marker of MARKERS) {
      editor.setDecorations(this.decorations.get(marker), byMarker.get(marker));
    }
  }

  getTreeItem(element) {
    if (element.kind === 'group') {
      const item = new vscode.TreeItem(
        `${element.marker} (${element.count})`,
        vscode.TreeItemCollapsibleState.Expanded
      );
      item.iconPath = new vscode.ThemeIcon(markerIcon(element.marker));
      item.contextValue = 'markerGroup';
      return item;
    }

    if (element.kind === 'file') {
      const relativePath = vscode.workspace.asRelativePath(element.uri, false);
      const item = new vscode.TreeItem(
        path.basename(element.uri.fsPath),
        vscode.TreeItemCollapsibleState.Expanded
      );
      item.description = element.count === 1
        ? '1 pendência'
        : `${element.count} pendências`;
      item.tooltip = relativePath;
      item.resourceUri = element.uri;
      item.contextValue = 'todoFile';
      return item;
    }

    const relativePath = vscode.workspace.asRelativePath(element.uri, false);
    const item = new vscode.TreeItem(
      element.preview,
      vscode.TreeItemCollapsibleState.None
    );
    item.description = `linha ${element.line + 1}`;
    item.tooltip = new vscode.MarkdownString(
      `**${element.marker}** — ${escapeMarkdown(relativePath)}:${element.line + 1}:${element.column + 1}\n\n${escapeMarkdown(element.preview)}`
    );
    item.resourceUri = element.uri;
    item.iconPath = new vscode.ThemeIcon(markerIcon(element.marker));
    item.command = {
      command: 'vscode.open',
      title: 'Abrir pendência',
      arguments: [
        element.uri,
        {
          selection: new vscode.Range(
            element.line,
            element.column,
            element.line,
            element.column + element.marker.length
          )
        }
      ]
    };
    item.contextValue = 'todoMatch';
    return item;
  }

  getChildren(element) {
    if (!element) {
      return MARKERS
        .map((marker) => ({
          kind: 'group',
          marker,
          count: this.matches.filter((match) => match.marker === marker).length
        }))
        .filter((group) => group.count > 0);
    }

    if (element.kind === 'group') {
      return groupMatchesByFile(
        this.matches.filter((match) => match.marker === element.marker)
      ).map((file) => ({
        kind: 'file',
        uri: file.uri,
        count: file.matches.length,
        matches: file.matches
      }));
    }

    if (element.kind === 'file') {
      return element.matches.map((match) => ({
        kind: 'match',
        ...match
      }));
    }

    return [];
  }

  dispose() {
    clearTimeout(this.refreshTimer);
    this.changeEmitter.dispose();
    for (const decoration of this.decorations.values()) {
      decoration.dispose();
    }
  }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const provider = new TodoTreeProvider(context);
  const tree = vscode.window.createTreeView('todoQueFalta.matches', {
    treeDataProvider: provider,
    showCollapseAll: true
  });

  const watcher = vscode.workspace.createFileSystemWatcher('**/*');

  context.subscriptions.push(
    provider,
    tree,
    watcher,
    vscode.commands.registerCommand('todoQueFalta.refresh', () => provider.refresh()),
    watcher.onDidCreate(() => provider.scheduleRefresh()),
    watcher.onDidChange(() => provider.scheduleRefresh()),
    watcher.onDidDelete(() => provider.scheduleRefresh()),
    vscode.workspace.onDidSaveTextDocument(() => provider.scheduleRefresh()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('todoQueFalta')) {
        provider.scheduleRefresh(0);
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      for (const editor of vscode.window.visibleTextEditors) {
        if (editor.document === event.document) {
          provider.decorateEditor(editor);
        }
      }
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => provider.decorateVisibleEditors())
  );

  void vscode.commands.executeCommand('setContext', 'todoQueFalta.isEmpty', false);
  void provider.refresh();
}

function deactivate() {}

/**
 * @param {Uint8Array} bytes
 */
function looksBinary(bytes) {
  const sampleSize = Math.min(bytes.length, 8000);
  for (let index = 0; index < sampleSize; index += 1) {
    if (bytes[index] === 0) {
      return true;
    }
  }
  return false;
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T) => Promise<void>} worker
 */
async function mapWithConcurrency(items, concurrency, worker) {
  let nextIndex = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const current = nextIndex;
        nextIndex += 1;
        await worker(items[current]);
      }
    }
  );
  await Promise.all(runners);
}

function markerIcon(marker) {
  if (marker === 'FIXME') {
    return 'warning';
  }
  if (marker === 'DOCME') {
    return 'book';
  }
  return 'checklist';
}

function escapeMarkdown(value) {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
}

module.exports = {
  activate,
  deactivate,
  looksBinary,
  mapWithConcurrency
};
