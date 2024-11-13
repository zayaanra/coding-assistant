// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as dotenv from 'dotenv';

dotenv.config();

const USER_POOL_ID = process.env.USER_POOL_ID;

function validatePassword(password: string): string | null {
	// Password requirements adhere to Cognito's default password rules
    if (password.length < 8) {
        return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(password)) {
        return "Password must contain at least one uppercase letter.";
    }
    if (!/[a-z]/.test(password)) {
        return "Password must contain at least one lowercase letter.";
    }
    if (!/[0-9]/.test(password)) {
        return "Password must contain at least one digit.";
    }
    if (!/[\W_]/.test(password)) {
        return "Password must contain at least one special character (e.g., @, $, #, etc.).";
    }
    return null;
}

async function registerUser(email: string, password: string) {
	const AWS = require('aws-sdk')
	const cognito = new AWS.CognitoIdentityServiceProvider();

	const params = {
		UserPoolId: USER_POOL_ID,
		Username: email,
		TemporaryPassword: password,
		UserAttributes: [
			{
				Name: 'email',
				Value: email
			}
		],
		MessageAction: 'SUPPRESS',
	};

	try {
		await cognito.adminCreateUser(params).promise()
		console.log("User successfully registered");
	} catch (error) {
		console.error("Error registering user:", error)
		vscode.window.showErrorMessage("Error registering user");
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "omnicode" is now active!');

	const disposableRegister = vscode.commands.registerCommand('omnicode.registerUser', async () => {
		const email = await vscode.window.showInputBox({
			prompt: "Enter your email address",
			placeHolder: "user@example.com",
			validateInput: (value: string) => {
				const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
				if (!emailRegex.test(value)) {
					return "Please enter a valid email address.";
				}
				return null;
			}
		});
		if (!email) return;

		const password = await vscode.window.showInputBox({
			prompt: "Enter your password",
			placeHolder: "Password",
			password: true,
			validateInput: (value: string) => {
				const passwordValidation = validatePassword(value);
				if (passwordValidation) {
					return passwordValidation;
				}
				return null;
			}
		});
	
		if (!password) return;
	
		// TODO: Need to set up AWS credentials (either call Cognito API in Lambda function or use environment variables locally)

		// await registerUser(email, password);
		vscode.window.showInformationMessage("Registration successful!");

	});
	context.subscriptions.push(disposableRegister);


	// TODO: We also need a command for code completions

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
	context.subscriptions.push(disposableRefactorCode);

	// Generate Documentation Command
	const disposableDocGen = vscode.commands.registerCommand("omnicode.generateDocumentation", async () => {
		// TODO: This is where we'll call the Lambda function for generating documentation

		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const selectedText = editor.document.getText(editor.selection);
			console.log(`Selected texts for DocGen is ${selectedText}`);
		}
	});
	context.subscriptions.push(disposableDocGen);
}

// This method is called when your extension is deactivated
export function deactivate() {}
