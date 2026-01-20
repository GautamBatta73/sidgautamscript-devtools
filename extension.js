const vscode = require('vscode');
const { SidGautamScriptFormatter } = require('./formatter');

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

  console.log('SidGautamScript extension activated with formatter');
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
