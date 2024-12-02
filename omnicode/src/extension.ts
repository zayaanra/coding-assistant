// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as path from 'path';
import * as dotenv from 'dotenv';


import Requests from './api';
import { getCognitoUserId } from './dashboard';

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Your .env should be in root directory
const envPath = path.join(__dirname, '../../', '.env'); 
dotenv.config({ path: envPath });

import * as vscode from 'vscode';
import { CognitoIdentityProviderClient, ConfirmSignUpCommand, SignUpCommand, InitiateAuthCommand, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY!;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY!;
const AWS_COGNITO_APP_CLIENT_ID = process.env.AWS_COGNITO_APP_CLIENT_ID!;

const AWS_S3_DASHBOARD_URL = process.env.AWS_S3_DASHBOARD_URL!;
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME!;
const AWS_S3_OBJECT_KEY = process.env.AWS_S3_OBJECT_KEY!;

const cognitoClient = new CognitoIdentityProviderClient({
	'region': "us-east-2",
	'credentials': {
		accessKeyId: AWS_ACCESS_KEY,
		secretAccessKey: AWS_SECRET_KEY
	},
});

const s3Client = new S3Client({ 
	'region': "us-east-2",
	'credentials': {
		accessKeyId: AWS_ACCESS_KEY,
		secretAccessKey: AWS_SECRET_KEY
	},
});

const generatePresignedUrl = async (
    bucketName: string,
    objectKey: string,
    expiresIn: number = 300,
    userId?: string
): Promise<string> => {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn });

        console.log(`Generated pre-signed URL for ${userId || "unknown user"}: ${url}`);
        return url;
    } catch (error) {
        console.error("Error generating pre-signed URL:", error);
        throw error;
    }
}

let timeout: NodeJS.Timeout | undefined = undefined;  // To keep track of the timeout

async function insertUser(userSub: string) {
	const dynamoDBClient = new DynamoDBClient({ 
		'region': 'us-east-2',
		'credentials': {
			accessKeyId: AWS_ACCESS_KEY,
			secretAccessKey: AWS_SECRET_KEY
		},
	});

	const params = {
		TableName: "UserMetadata",
		Item: {
			CognitoUserId: { S: userSub },
		},
	};

	try {
		await dynamoDBClient.send(new PutItemCommand(params));
		console.log("User added to DynamoDB successfully");
	} catch (error) {
		console.error("Error adding user to DynamoDB");
	}
}

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
    const command = new SignUpCommand({
        ClientId: AWS_COGNITO_APP_CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
            { Name: "email", Value: email },
        ],
    });

    try {
        const response = await cognitoClient.send(command);
		await insertUser(response.UserSub!);
        vscode.window.showInformationMessage("Signup successful!");
		return true;
    } catch (error: any) {
        vscode.window.showErrorMessage(
            `Error during registration: ${error.message || "Unknown error"}`
        );
		return false;
    }
}

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
			console.log(IdToken);

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
				const passwordValidation = validatePassword(value);
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

	const disposableLogout = vscode.commands.registerCommand("omnicode.logoutUser", async () => {
		context.globalState.update("authTokens", null);
		vscode.window.showInformationMessage("You have been logged out");
	});
	context.subscriptions.push(disposableLogout);

	const provider = vscode.languages.registerInlineCompletionItemProvider(
        { scheme: 'file', language: '*' },
        {
            provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                console.log('Typing detected, starting completion process...');

                return new Promise<vscode.InlineCompletionItem[] | undefined>((resolve) => {
                    if (timeout) {
                        console.log('Clearing previous timeout...');
                        clearTimeout(timeout);
                    }

                    timeout = setTimeout(() => {
                        console.log('Timer completed, providing suggestion...');

                        const line = document.lineAt(position);
                        const words = line.text.split(/\s+/);

						Requests.codeCompletionRequest(line.text);

                        if (words.length < 2) {
                            resolve(undefined);
                            return;
                        }

                        const lastWord = words[words.length - 2];

                        const completionItem = new vscode.InlineCompletionItem(lastWord, new vscode.Range(position, position));
                        
                        resolve([completionItem]);
                    }, 3000);
                });
            }
        }
    );

    context.subscriptions.push(provider);
	



	// Refactor Code Command
	const disposableRefactorCode = vscode.commands.registerCommand("omnicode.refactorCode", async () => {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			const selectedText = editor.document.getText(editor.selection);

			// For now, just changes text all uppercase to show that it works.
			const refactoredText = selectedText.toUpperCase();

			await editor.edit(editBuilder => {
				editBuilder.replace(editor.selection, refactoredText);
			});

			Requests.refactorRequest(selectedText);

			vscode.window.showInformationMessage(`Refactored to: ${refactoredText}`);
		} else {
			vscode.window.showErrorMessage("No active editor found.");
		}
	});
	context.subscriptions.push(disposableRefactorCode);

	// Generate Documentation Command
	const disposableDocGen = vscode.commands.registerCommand("omnicode.generateDocumentation", async () => {
		const editor = vscode.window.activeTextEditor;

		if (editor) {
			
			
			const selectedText = editor.document.getText(editor.selection);
			console.log(`Selected texts for DocGen is ${selectedText}`);

			Requests.generateDocstringRequest(selectedText);
		}
	});
	context.subscriptions.push(disposableDocGen);

	const disposableDashboard = vscode.commands.registerCommand("omnicode.viewDashboard", async () => {
		const userId = getCognitoUserId(context);
		if (userId === undefined) {
			console.log("User is not logged in");
			vscode.window.showErrorMessage("You must be logged in to view your dashboard");
		} else {
			const presignedUrl = await generatePresignedUrl(AWS_S3_BUCKET_NAME, AWS_S3_OBJECT_KEY, 300, userId);
			vscode.env.openExternal(vscode.Uri.parse(presignedUrl));
		}
	});
	context.subscriptions.push(disposableDashboard);
}

// This method is called when your extension is deactivated
export function deactivate() {}
