const vscode = require('vscode');

let idleTime = 0; // Time in seconds before considering the user idle
let idleInterval; // Interval for checking idle time
let providerDisposable; // To store the completion provider

function activate(context) {
    // Reset idle timer when user interacts
    const resetIdleTimer = () => {
        idleTime = 0; // Reset idle time
    };

    // Start an interval to check idle time
    idleInterval = setInterval(() => {
        idleTime++;
        if (idleTime >= 3) { // Change this value to set the idle threshold
            vscode.commands.executeCommand('editor.action.triggerSuggest');
        }
    }, 1000);

	context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(resetIdleTimer),
        vscode.window.onDidChangeActiveTextEditor(resetIdleTimer),
        vscode.window.onDidChangeTextEditorSelection(resetIdleTimer),
        vscode.window.onDidChangeActiveColorTheme(resetIdleTimer)
    );

    // Register the inline completion provider
    const provider = {
        provideInlineCompletionItems(document, position, context, token) {
            // Define the suggestion text based on custom logic
            const suggestionText = "suggestedCode();"; // Replace with the suggestion you want

			const completionItem = new vscode.InlineCompletionItem(suggestionText, new vscode.Range(position, position));
			return [completionItem];			
        }
    };

    // Register the provider for the language of your choice
    const providerDisposable = vscode.languages.registerInlineCompletionItemProvider(
        { scheme: 'file', language: 'javascript' }, // Adjust for your target language
        provider
    );

    // Add to the extension's subscriptions
    context.subscriptions.push(providerDisposable);
}

function deactivate() {
	clearInterval(idleInterval);
}

module.exports = {
    activate,
    deactivate
};
