// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "omnicode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('omnicode.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from Omnicode!');
	});

	// TODO - We also need a command for:

	// Refactor Code Command
	const disposableRefactorCode = vscode.commands.registerCommand("omnicode.refactorCode", async () => {
		// TODO: This is where we'll call the Lambda function for refactoring code.

		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const selectedText = editor.document.getText(editor.selection);

			// For now, just changes text all uppercase to show that it works.
			const refactoredText = selectedText.toUpperCase();

			await editor.edit(editBuilder => {
				editBuilder.replace(editor.selection, refactoredText);
			});

			vscode.window.showInformationMessage(`Refactored to: ${refactoredText}`);
		} else {
			vscode.window.showErrorMessage("No active editor found.");
		}
	});

	// Generate Documentation Command
	const disposableDocGen = vscode.commands.registerCommand("omnicode.generateDocumentation", async () => {
		// TODO: This is where we'll call the Lambda function for generating documentation

		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const selectedText = editor.document.getText(editor.selection);
			console.log(`Selected texts for DocGen is ${selectedText}`);
		}
	});


	context.subscriptions.push(disposable, disposableRefactorCode, disposableDocGen);
}

// This method is called when your extension is deactivated
export function deactivate() {}
