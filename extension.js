const vscode = require('vscode');
const { SidGautamScriptFormatter } = require('./formatter');
const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function activate(context) {
  // Register formatter for sgscript language
  const formatter = new SidGautamScriptFormatter();

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('sgscript', {
      provideDocumentFormattingEdits(document) {
        return formatter.format(document);
      }
    })
  );

  context.subscriptions.push(
    vscode.languages.registerDocumentRangeFormattingEditProvider('sgscript', {
      provideDocumentRangeFormattingEdits(document, range) {
        return formatter.formatRange(document, range);
      }
    })
  );

  // Register run commands
  context.subscriptions.push(vscode.commands.registerCommand('sidgautamscript.runFile', async (uri) => {
    await runFile(uri);
  }));

  context.subscriptions.push(vscode.commands.registerCommand('sidgautamscript.runSelection', async () => {
    await runSelection();
  }));

  console.log('SidGautamScript extension activated with formatter and runner');
}

async function runFile(uri) {
  try {
    const editor = vscode.window.activeTextEditor;
    let filePath;

    if (uri && uri.fsPath) {
      filePath = uri.fsPath;
    } else if (editor && editor.document && (editor.document.languageId === 'sgscript' || path.extname(editor.document.fileName).toLowerCase() === '.sidgc')) {
      filePath = editor.document.uri.fsPath;
    } else {
      vscode.window.showErrorMessage('No SidGautamScript file to run.');
      return;
    }

    // Ensure file is saved
    if (editor && editor.document && editor.document.uri.fsPath === filePath && editor.document.isDirty) {
      await editor.document.save();
    } else {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
      if (doc.isDirty) await doc.save();
    }

    const config = vscode.workspace.getConfiguration('sidgautamscript');
    const compileCmd = config.get('compileCommand', 'sgc');
    const compileArgs = (config.get('compileArgs', '') || '').trim();
    const compileInTerminal = config.get('compileInTerminal', false);

    const runCmd = config.get('runCommand', 'sg');
    const runArgs = (config.get('runArgs', '') || '').trim();
    const runInTerminal = config.get('runInTerminal', true);

    let compiledFile;
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.sidg') {
      compiledFile = filePath.replace(/\.sidg$/i, '.sidgc');
      const compileLine = `${compileCmd} "${filePath}" ${compileArgs}`.trim();

      const output = vscode.window.createOutputChannel('SidGautamScript');
      output.clear();
      output.show(true);

      // Optionally echo compile command in terminal for visibility
      if (compileInTerminal && runInTerminal) {
        let term = vscode.window.terminals.find(t => t.name === 'SidGautamScript');
        if (!term) term = vscode.window.createTerminal('SidGautamScript');
        term.show(true);
        term.sendText(compileLine);
      }

      // Run compile to ensure it succeeded before running
      await new Promise((resolve, reject) => {
        cp.exec(compileLine, { cwd: path.dirname(filePath) }, (err, stdout, stderr) => {
          if (stdout) output.appendLine(stdout);
          if (stderr) output.appendLine(stderr);
          if (err) {
            output.appendLine('Compilation failed: ' + err.message);
            reject(err);
          } else {
            resolve();
          }
        });
      });

    } else if (ext === '.sidgc') {
      compiledFile = filePath;
    } else {
      vscode.window.showErrorMessage('Unsupported file type. Use .sidg or .sidgc');
      return;
    }

    const runLine = `${runCmd} "${compiledFile}" ${runArgs}`.trim();

    if (runInTerminal) {
      let terminal = vscode.window.terminals.find(t => t.name === 'SidGautamScript');
      if (!terminal) terminal = vscode.window.createTerminal('SidGautamScript');
      terminal.show(true);
      terminal.sendText(runLine);
    } else {
      const output = vscode.window.createOutputChannel('SidGautamScript');
      output.clear();
      output.show(true);
      cp.exec(runLine, { cwd: path.dirname(compiledFile) }, (err, stdout, stderr) => {
        if (stdout) output.appendLine(stdout);
        if (stderr) output.appendLine(stderr);
        if (err) vscode.window.showErrorMessage('Run failed: ' + err.message);
      });
    }
  } catch (err) {
    vscode.window.showErrorMessage('Run failed: ' + err.message);
  }
}

async function runSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor.');
    return;
  }
  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showErrorMessage('No selection to run.');
    return;
  }
  const text = editor.document.getText(selection);
  const tmpFile = path.join(os.tmpdir(), `sidg-snippet-${Date.now()}.sidg`);
  const tmpCompiled = tmpFile.replace(/\.sidg$/i, '.sidgc');
  fs.writeFileSync(tmpFile, text, 'utf8');

  const config = vscode.workspace.getConfiguration('sidgautamscript');
  const compileCmd = config.get('compileCommand', 'sgc');
  const compileArgs = (config.get('compileArgs', '') || '').trim();
  const compileInTerminal = config.get('compileInTerminal', false);

  const runCmd = config.get('runCommand', 'sg');
  const runArgs = (config.get('runArgs', '') || '').trim();
  const runInTerminal = config.get('runInTerminal', true);

  const compileLine = `${compileCmd} "${tmpFile}" ${compileArgs}`.trim();
  const runLine = `${runCmd} "${tmpCompiled}" ${runArgs}`.trim();

  const output = vscode.window.createOutputChannel('SidGautamScript');
  output.clear();
  output.show(true);

  if (compileInTerminal && runInTerminal) {
    let term = vscode.window.terminals.find(t => t.name === 'SidGautamScript');
    if (!term) term = vscode.window.createTerminal('SidGautamScript');
    term.show(true);
    term.sendText(compileLine);
  }

  // Run compile first to make sure it succeeded
  cp.exec(compileLine, { cwd: os.tmpdir() }, (err, stdout, stderr) => {
    if (stdout) output.appendLine(stdout);
    if (stderr) output.appendLine(stderr);
    if (err) {
      vscode.window.showErrorMessage('Compilation failed: ' + err.message);
      try { fs.unlinkSync(tmpFile); } catch (e) { }
      return;
    }

    if (runInTerminal) {
      let terminal = vscode.window.terminals.find(t => t.name === 'SidGautamScript');
      if (!terminal) terminal = vscode.window.createTerminal('SidGautamScript');
      terminal.show(true);
      terminal.sendText(runLine);
    } else {
      cp.exec(runLine, { cwd: os.tmpdir() }, (err2, stdout2, stderr2) => {
        if (stdout2) output.appendLine(stdout2);
        if (stderr2) output.appendLine(stderr2);
        if (err2) vscode.window.showErrorMessage('Run failed: ' + err2.message);
        try { fs.unlinkSync(tmpFile); try { fs.unlinkSync(tmpCompiled); } catch (e) { } } catch (e) { }
      });
    }

    // Clean up temp files after 30 seconds
    setTimeout(() => {
      try { fs.unlinkSync(tmpFile); } catch (e) { }
      try { fs.unlinkSync(tmpCompiled); } catch (e) { }
    }, 30 * 1000);
  });
}

function deactivate() { }

module.exports = {
  activate,
  deactivate
};
