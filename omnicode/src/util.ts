import * as vscode from 'vscode';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { DynamoDBClient, QueryCommand, UpdateItemCommand, AttributeValue } from "@aws-sdk/client-dynamodb";

import { jwtDecode } from "jwt-decode";
import { time } from 'console';

// Your .env should be in root directory
const envPath = path.join(__dirname, '../../', '.env'); 
dotenv.config({ path: envPath });

const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY!;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY!;
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME!;

const dynamodbClient = new DynamoDBClient(
    { 
        region: "us-east-1",
        'credentials': {
            accessKeyId: AWS_ACCESS_KEY,
            secretAccessKey: AWS_SECRET_KEY
        },
    }
);

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

export const updateCodeCompletionBytes = async (context: vscode.ExtensionContext, accepted: boolean, bytes: number) => {
    const userId = getCognitoUserId(context)!;
    
    const queryParams = {
        TableName: DYNAMODB_TABLE_NAME,
        KeyConditionExpression: "UserId = :userId",
        FilterExpression: "#feature = :codeCompletion",
        ExpressionAttributeNames: {
          "#feature": "feature",
        },
        ExpressionAttributeValues: {
          ":userId": { S: userId },
          ":codeCompletion": { S: "code_completion" },
        } as Record<string, AttributeValue>,
        ScanIndexForward: false,
        Limit: 1,
      };

      try {
        const queryCommand = new QueryCommand(queryParams);
        const queryResponse = await dynamodbClient.send(queryCommand);
    
        if (!queryResponse.Items || queryResponse.Items.length === 0) {
          throw new Error("No code_completion items found for this user.");
        }
    
        const mostRecentItem = queryResponse.Items[0];
        const timestamp = mostRecentItem.timestamp.N!;

        const updateParams = {
            TableName: DYNAMODB_TABLE_NAME,
            Key: {
                UserId: { S: userId },
                timestamp: { N: timestamp },
            },
            UpdateExpression: "SET bytes = :b",
            ExpressionAttributeValues: {
                ":b": { N: bytes.toString() }
            },
        };
    
        const updateCommand = new UpdateItemCommand(updateParams);
        const updateResponse = await dynamodbClient.send(updateCommand);
    
        console.log("Update successful:", updateResponse.Attributes);
        return updateResponse.Attributes;
      } catch (error) {
        console.error("Error finding or updating item:", error);
        throw error;
      }
}