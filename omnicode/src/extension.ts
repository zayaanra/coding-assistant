import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

import * as util from './util';
import Requests from './api';

import { CognitoIdentityProviderClient, ConfirmSignUpCommand, SignUpCommand, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

// Your .env should be in root directory
const envPath = path.join(__dirname, '../../', '.env'); 
dotenv.config({ path: envPath });

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY!;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY!;
const AWS_COGNITO_APP_CLIENT_ID = process.env.AWS_COGNITO_APP_CLIENT_ID!;

const AWS_S3_OBJECT_URL = process.env.AWS_S3_OBJECT_URL!;
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const AWS_S3_OBJECT_KEY = process.env.AWS_S3_OBJECT_KEY!;

const cognitoClient = new CognitoIdentityProviderClient({
	'region': "us-east-2",
	'credentials': {
		accessKeyId: AWS_ACCESS_KEY,
		secretAccessKey: AWS_SECRET_KEY
	},
});


// Registers a new user under the given email and password. It makes a direct call to Cognito's API.
async function registerUser(email: string, password: string) {
    const command = new SignUpCommand({
        ClientId: AWS_COGNITO_APP_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
            { Name: "email", Value: email },
        ],
    });

    try {
        await cognitoClient.send(command);
        vscode.window.showInformationMessage("Signup successful!");
		return true;
    } catch (error: any) {
        vscode.window.showErrorMessage(
            `Error during registration: ${error.message || "Unknown error"}`
        );
		return false;
    }
}

// Logs in a user with the given email and password. It makes a direct call to Cognito's API.
async function loginUser(email: string, password: string) {
	const command = new InitiateAuthCommand({
		AuthFlow: "USER_PASSWORD_AUTH",
		ClientId: AWS_COGNITO_APP_CLIENT_ID,
		AuthParameters: {
			USERNAME: email,
			PASSWORD: password,
		},
	});

	try {
		const response = await cognitoClient.send(command);
		if (response.AuthenticationResult) {
			const { IdToken, AccessToken, RefreshToken } = response.AuthenticationResult;
			vscode.window.showInformationMessage("Login successful");
			return { IdToken, AccessToken, RefreshToken };
		} else {
			vscode.window.showErrorMessage("Login failed");
		}
	} catch (error) {
		vscode.window.showErrorMessage("Login failed");
	}
	return null;
}

// Used for code completion suggestion. User inactivity of 3 seconds will trigger API call for code completion suggestion.
let timeout: NodeJS.Timeout | undefined = undefined;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "omnicode" is now active!');

	/* This is a disposable consisting of the Register functionality. It uses input boxes to fetch a users email and password. Both inputs are validated with regex.
	It also handles verification of the registration by Cognito's default authentication methods. It sends a code to the email and waits to be confirmed with the code. */
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
				const passwordValidation = util.validatePassword(value);
				if (passwordValidation) {
					return passwordValidation;
				}
				return null;
			}
		});
	
		if (!password) return;
	
		const result = await registerUser(email, password);
		if (result) {
			const verificationCode = await vscode.window.showInputBox({
				prompt: "Enter the verification code",
				placeHolder: "Verification Code"
			});
			if (!verificationCode) return;

			const command = new ConfirmSignUpCommand({
				ClientId: AWS_COGNITO_APP_CLIENT_ID,
				Username: email,
				ConfirmationCode: verificationCode
			});

			try {
				await cognitoClient.send(command);
				vscode.window.showInformationMessage("Your account has been verified successfully");
			} catch (error) {
				vscode.window.showErrorMessage("Failed to verify your account");
			}		
		}
	});
	context.subscriptions.push(disposableRegister);

	/* Handles the Login functionality. It works like the Registration functionality. Once the user logs in, their authentication tokens are stored
	in VSCode's global state. The global stat is stored in a SQLite3 DB (provided by VSCode). */
	const disposableLogin = vscode.commands.registerCommand("omnicode.loginUser", async () => {
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
				const passwordValidation = util.validatePassword(value);
				if (passwordValidation) {
					return passwordValidation;
				}
				return null;
			}
		});

		if (!password) return;

		const tokens = await loginUser(email, password);
		if (tokens) {
			context.globalState.update("authTokens", tokens);
		}
	});
	context.subscriptions.push(disposableLogin);

	/* Handles Logout. Logging out means to delete the previously stored authentication tokens for a user. */
	const disposableLogout = vscode.commands.registerCommand("omnicode.logoutUser", async () => {
		context.globalState.update("authTokens", null);
		vscode.window.showInformationMessage("You have been logged out");
	});
	context.subscriptions.push(disposableLogout);

	/* This is where the code completion suggestion feature is implemented. The way it works is that it is triggered upon every 3 seconds of user inactivity.
	Once triggered, it collects some context of the written code and makes an API call to collect the results of the LLM given the context. With the returned code suggestion,
	the user is presented with the response as 'ghost text'. The user can choose to press TAB to accept the changes or ignore it by continuing to code. */
	const provider = vscode.languages.registerInlineCompletionItemProvider(
        { scheme: 'file', language: '*' },
        {
            provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                return new Promise<vscode.InlineCompletionItem[] | undefined>((resolve) => {
                    if (timeout) {
                        clearTimeout(timeout);
                    }
					
					// Default timeout is 3 seconds.
                    timeout = setTimeout(() => {
                        const line = document.lineAt(position);
						Requests.codeCompletionRequest(context, line.text)
							.then((data) => {
								const completion_string: string = data;
								console.log("Completion String:", completion_string);
								const completionItem = new vscode.InlineCompletionItem(completion_string, new vscode.Range(position, position));
								resolve([completionItem]);
							})
							.catch((error) => {
								console.log(error)
							});
                    }, 3000);
                });
            }
        }
    );
    context.subscriptions.push(provider);
	

	/* This is where the refactor code feature is implemented. It makes an API call to retrieve results from the LLM. The user must select some code and then has the option to refactor it
	(using right-click menu). The LLM will return the refactored code. The old code will be completely replaced with the new refactored code. */
	const disposableRefactorCode = vscode.commands.registerCommand("omnicode.refactorCode", async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selectedText = editor.document.getText(editor.selection);

			// For now, just changes text all uppercase to show that it works.
			const refactoredText = selectedText.toUpperCase();

			await editor.edit(editBuilder => {
				editBuilder.replace(editor.selection, refactoredText);
			});

			Requests.refactorRequest(context, selectedText);
		} else {
			vscode.window.showErrorMessage("No active editor found.");
		}
	});
	context.subscriptions.push(disposableRefactorCode);

	
	/* This is where the documentation generate (docstring) feature is implemented. It makes an API call to retrieve docstring from the LLM. To generate a docstring, the user selects some code
	to be documented (using right-click menu). The generated docstring will be inserted before the beginning of the selected code. */
	const disposableDocGen = vscode.commands.registerCommand("omnicode.generateDocumentation", async () => {
		const editor = vscode.window.activeTextEditor;
	
		if (editor) {
			const document = editor.document;
			const selectedText = document.getText(editor.selection);
			const languageId = document.languageId;
	
			Requests.generateDocstringRequest(context, selectedText)
				.then((data) => {
					console.log("Generated docstring:", data);
	
					if (data) {
						// Docstring needs to be multi-line commented
						const commentedData = util.wrapInComment(data, languageId);
	
						editor.edit((editBuilder) => {
							// Insert the commented data before the selected text
							editBuilder.insert(editor.selection.start, `${commentedData}\n`);
						}).then((success) => {
							if (success) {
								console.log("Docstring inserted successfully.");
							} else {
								console.error("Failed to insert docstring.");
							}
						});
					} else {
						console.warn("No data received for docstring generation.");
					}
				})
				.catch((error) => {
					console.error("Error during docstring generation:", error);
				});
		} else {
			vscode.window.showErrorMessage("No active editor found.");
		}
	});
	context.subscriptions.push(disposableDocGen);

	/* This disposable implements the dashboard functionality. The user MUST be logged in to access their dashboard. It finds their user ID from their authentication tokens and
	generates a unique pre-signed URL that opens a link to their dashboard page. */
	const disposableDashboard = vscode.commands.registerCommand("omnicode.viewDashboard", async () => {
		const userId = util.getCognitoUserId(context);
		if (userId === undefined) {
			vscode.window.showErrorMessage("You must be logged in to view your dashboard");
		} else {
			// TODO: Implement a way to pass in user ID to frontend
			vscode.env.openExternal(vscode.Uri.parse(AWS_S3_OBJECT_URL));
		}
	});
	context.subscriptions.push(disposableDashboard);
}

// This method is called when your extension is deactivated
export function deactivate() {}
