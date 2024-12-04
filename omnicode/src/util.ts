import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { jwtDecode } from "jwt-decode";

// Your .env should be in root directory
const envPath = path.join(__dirname, '../../', '.env'); 
dotenv.config({ path: envPath });

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY!;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY!;

const s3Client = new S3Client({ 
	'region': "us-east-2",
	'credentials': {
		accessKeyId: AWS_ACCESS_KEY,
		secretAccessKey: AWS_SECRET_KEY
	},
});

export const getCognitoUserId = (context: vscode.ExtensionContext) => {
    const authTokens = context.globalState.get<{
        IdToken: string;
        AccessToken: string;
        RefreshToken: string;
    }>("authTokens");

    if (!authTokens || !authTokens.AccessToken) {
        console.error("AccessToken is missing in authTokens");
        return;
    }

    try {
        const decoded = jwtDecode<{ sub: string }>(authTokens.AccessToken);
        console.log("Decoded AccessToken:", decoded);
        return decoded.sub;
    } catch (error) {
        console.error("Failed to decode AccessToken:", error);
    }
};

/* Generates a unique presigned URL to access the dashboard. By default, public access to the dashboard is disallowed. The pre-signed URL
makes it so that only those with the presigned URL can see their dashboard. */
export const generatePresignedUrl = async (bucketName: string, objectKey: string, expiresIn: number = 300, userId?: string): Promise<string> => {
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn });
		// TODO: Need to figure out how to add user id on the URL
        return url;
    } catch (error) {
        console.error("Error generating pre-signed URL:", error);
        throw error;
    }
}

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