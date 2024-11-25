import * as path from 'path';
import * as dotenv from 'dotenv';

import axios, { AxiosResponse } from 'axios';

const envPath = path.join(__dirname, '../../', '.env'); // Adjust path based on where .env is located
dotenv.config({ path: envPath });

const CODE_COMPLETION_REQUEST_URL = process.env.CODE_COMPLETION_REQUEST_URL!;
const GENERATE_DOCSTRING_REQUEST_URL = process.env.GENERATE_DOCSTRING_REQUEST_URL!;
const REFACTOR_REQUEST_URL = process.env.REFACTOR_REQUEST_URL!;


interface ResponseData {

}

const codeCompletionRequest = async (code: string) => {
    const data: object = {
        code_snippet: code
    }

    try {
        const response: AxiosResponse<ResponseData> = await axios.post(CODE_COMPLETION_REQUEST_URL, data);

        console.log(response);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.log(error.message);
        } else {
            console.log(error);
        }
    }
}

const generateDocstringRequest = async (code: string) => {
    const data: object = {
        code_snippet: code
    }

    try {
        const response: AxiosResponse<ResponseData> = await axios.post(GENERATE_DOCSTRING_REQUEST_URL, data);

        console.log(response);
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.log(error.message);
        } else {
            console.log(error);
        }
    }
}

const refactorRequest = async (code: string) => {
    const data: object = {
        code_snippet: code
    }

    try {
        const response: AxiosResponse<ResponseData> = await axios.post(REFACTOR_REQUEST_URL, data);

        console.log(response);
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