const vscode = require('vscode');

function activate(context) {
    console.log('Extension "findContextInjection" is now active!');

    let disposable = vscode.commands.registerCommand('extension.findContextInjection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        const document = editor.document;
        const position = editor.selection.active;
        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange) {
            vscode.window.showErrorMessage('No word selected');
            return;
        }

        const word = document.getText(wordRange);
        console.log(`Searching for injections of: ${word}`);
        const uris = await vscode.workspace.findFiles('**/*.{js,ts,vue,jsx,tsx}', '{**/node_modules/**,**/*.test.js}');
        const results = [];

        for (const uri of uris) {
            const fileContent = (await vscode.workspace.fs.readFile(uri)).toString();

            // Regular expressions to find .inject patterns
            const regexInject = /\.inject\(\s*[^\)]+\)/gs;

            let match;
            while ((match = regexInject.exec(fileContent)) !== null) {
                const injectContent = match[0];
                console.log(`Matched inject content: ${injectContent}`);

                // Check if the selected word is in the matched content
                const wordPattern = new RegExp(`\\b${word}\\b`, 'g');
                if (wordPattern.test(injectContent)) {
                    console.log(`Found match for word: ${word} in inject content: ${injectContent}`);

                    // Calculate position
                    const linesUntilMatch = fileContent.substr(0, match.index).split('\n');
                    const startLine = linesUntilMatch.length - 1;
                    const startCharacter = linesUntilMatch[linesUntilMatch.length - 1].length;
                    const endPos = match.index + match[0].length;

                    const linesUntilEnd = fileContent.substr(0, endPos).split('\n');
                    const endLine = linesUntilEnd.length - 1;
                    const endCharacter = linesUntilEnd[linesUntilEnd.length - 1].length;

                    const location = new vscode.Location(
                        uri,
                        new vscode.Range(
                            new vscode.Position(startLine, startCharacter),
                            new vscode.Position(endLine, endCharacter)
                        )
                    );
                    results.push(location);
                }
            }
        }

        if (results.length > 0) {
            vscode.commands.executeCommand('editor.action.showReferences', editor.document.uri, position, results);
        } else {
            vscode.window.showInformationMessage(`No inject calls found for: ${word}`);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
