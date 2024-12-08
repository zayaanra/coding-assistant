import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

// import { SQSSendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

import { jwtDecode } from "jwt-decode";

// Your .env should be in root directory
const envPath = path.join(__dirname, '../../', '.env'); 
dotenv.config({ path: envPath });

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY!;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY!;

const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL!;

// const sqsClient = new SQSClient(
//     { 
//         region: "us-east-1",
//         'credentials': {
//             accessKeyId: AWS_ACCESS_KEY,
//             secretAccessKey: AWS_SECRET_KEY
//         },
//     }
// );

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

/* This function will push code completion metrics directly to SQS. In refactor and documentation requests, the metric push is done in a Lambda function.
The reason why it is different here is because we need to keep track of whether the user accepts a code completion and this is only known until after the fact. 
Therefore, it makes the most sense to do it direcly here. SQS is very efficient and can handle nearly unlimited number of TPS. */
// export const pushCodeCompletionMetrics = async (context: vscode.ExtensionContext, bytes: number) => {
//     const message_body = {
//         "UserId": getCognitoUserId(context),
//         "code_language": vscode.window.activeTextEditor?.document.languageId,
//         "bytes": bytes,
//         "timestamp": Date.now(),
//         "feature": "code_completion"
//     }

//     const params = {
//         QueueUrl: SQS_QUEUE_URL,
//         MessageBody: JSON.stringify(message_body)
//     }



// }