const vscode = require('vscode');

class SidGautamScriptFormatter {
  format(document) {
    const edits = [];
    const indentSize = vscode.workspace.getConfiguration('editor', document.uri).get('tabSize') || 2;
    const useSpaces = !vscode.workspace.getConfiguration('editor', document.uri).get('insertSpaces') ? false : true;
    const indentChar = useSpaces ? (' ').repeat(indentSize) : '\t';

    let indentLevel = 0;
    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (trimmedLine.length === 0) {
        continue;
      }

      // Calculate proper indentation
      let newIndent = indentLevel;

      // Decrease indent for closing brackets
      if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']') || trimmedLine.startsWith(')')) {
        newIndent = Math.max(0, indentLevel - 1);
      }

      // Create proper indentation
      const properIndent = indentChar.repeat(newIndent);
      const expectedLine = properIndent + trimmedLine;

      // Add edit if line indentation differs
      if (line !== expectedLine) {
        const range = new vscode.Range(i, 0, i, line.length);
        edits.push(vscode.TextEdit.replace(range, expectedLine));
      }

      // Increase indent after opening brackets
      if (trimmedLine.endsWith('{') || trimmedLine.endsWith('[') || trimmedLine.endsWith('(')) {
        indentLevel++;
      }

      // Decrease indent after closing brackets (for next line)
      if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']') || trimmedLine.startsWith(')')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
    }

    return edits;
  }

  formatRange(document, range) {
    // For now, format the entire document
    // In a more sophisticated implementation, you could limit to the range
    return this.format(document);
  }
}

module.exports = {
  SidGautamScriptFormatter
};
