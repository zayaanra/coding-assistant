const vscode = require('vscode');

let lastTime;

function activate(context) {
	lastTime = new Date();

    // Register the inline completion provider
    const provider = {
        provideInlineCompletionItems(document, position, context, token) {
			// Calculate elapsed time
			const now = new Date();
			const elapsed = now - lastTime;
			lastTime = now;

            const linePrefix = document.lineAt(position).text.substring(0, position.character);
            const suggestionText = "suggestedCode();";
			
			// Check if more than 3 seconds has elapsed
            if (elapsed > 3) {
                const completionItem = new vscode.InlineCompletionItem(suggestionText, new vscode.Range(position, position));
                return [completionItem];
            }
			
            return [];
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

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
