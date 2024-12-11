import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { jwtDecode } from "jwt-decode";

// Your .env should be in root directory
const envPath = path.join(__dirname, '../../', '.env'); 
dotenv.config({ path: envPath });

export const getCognitoUserId = (context: vscode.ExtensionContext) => {
    const authTokens = context.globalState.get<{
        IdToken: string;
        AccessToken: string;
        RefreshToken: string;
    }>("authTokens");

    if (!authTokens || !authTokens.AccessToken) {
        return;
    }

    try {
        const decoded = jwtDecode<{ sub: string }>(authTokens.AccessToken);
        return decoded.sub;
    } catch (error) {
        console.error("Failed to decode AccessToken:", error);
    }
};

// Takes in generated code from LLM and wraps each line of code in comments. Used for docstring feature.
export const wrapInComment = (data: string, languageId: string): string  => {
    switch (languageId) {
        case "python":
            return `"""${data}"""`; // Python docstring
        case "javascript":
        case "typescript":
            return `/*\n${data.split("\n").map((line) => ` * ${line}`).join("\n")}\n */`; // Block comment
        case "java":
        case "csharp":
            return `/**\n${data.split("\n").map((line) => ` * ${line}`).join("\n")}\n */`; // Javadoc style
        case "cpp":
        case "c":
            return `/*\n${data.split("\n").map((line) => ` * ${line}`).join("\n")}\n */`; // C-style comments
        case "html":
            return `<!--\n${data.split("\n").map((line) => ` ${line}`).join("\n")}\n-->`; // HTML comments
        default:
            return `// ${data.split("\n").join("\n// ")}`; // Line comments for other languages
    }
}

// Validates the password for registration and login. Password requirements adhere to Cognito's default password rules
export const validatePassword = (password: string): string | null =>  {
	
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