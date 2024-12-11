import * as path from 'path';
import * as dotenv from 'dotenv';
import * as vscode from 'vscode';

import axios, { AxiosResponse } from 'axios';
import { getCognitoUserId } from './util';

// Your .env should be in root directory
const envPath = path.join(__dirname, '../../', '.env');
dotenv.config({ path: envPath });

const CODE_COMPLETION_REQUEST_URL = process.env.CODE_COMPLETION_REQUEST_URL!;
const GENERATE_DOCSTRING_REQUEST_URL = process.env.GENERATE_DOCSTRING_REQUEST_URL!;
const REFACTOR_REQUEST_URL = process.env.REFACTOR_REQUEST_URL!;

// Fetches a code completion suggestion from the LLM with the given code snippet
const codeCompletionRequest = async (context: vscode.ExtensionContext, code: string) => {
    const data: object = {
        userId: getCognitoUserId(context),
        code_snippet: code,
        code_language: vscode.window.activeTextEditor?.document.languageId,
    }
    console.log("language:", vscode.window.activeTextEditor?.document.languageId);

    try {
        const response: AxiosResponse = await axios.post(CODE_COMPLETION_REQUEST_URL, data);
        return JSON.parse(response.data.body).completion_string;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.log(error.message);
        } else {
            console.log(error);
        }
    }
}

// Fetches a generated docstring from the LLM with the given code snippet
const generateDocstringRequest = async (context: vscode.ExtensionContext, code: string) => {
    const data: object = {
        userId: getCognitoUserId(context),
        code_snippet: code,
        code_language: vscode.window.activeTextEditor?.document.languageId,
    }

    try {
        const response: AxiosResponse = await axios.post(GENERATE_DOCSTRING_REQUEST_URL, data);
        return JSON.parse(response.data.body).doc_string;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.log(error.message);
        } else {
            console.log(error);
        }
    }
}

// Refactors the given code snippet into the new code provided by the LLM
const refactorRequest = async (context: vscode.ExtensionContext, code: string) => {
    const data: object = {
        userId: getCognitoUserId(context),
        code_snippet: code,
        code_language: vscode.window.activeTextEditor?.document.languageId,
    }

    try {
        const response: AxiosResponse = await axios.post(REFACTOR_REQUEST_URL, data);
        return JSON.parse(response.data.body).refactored_code;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.log(error.message);
        } else {
            console.log(error);
        }
    }
}

const Requests = {
    codeCompletionRequest,
    generateDocstringRequest,
    refactorRequest
};

export default Requests;