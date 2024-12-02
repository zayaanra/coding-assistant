import * as vscode from 'vscode';

import { jwtDecode } from "jwt-decode";

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

