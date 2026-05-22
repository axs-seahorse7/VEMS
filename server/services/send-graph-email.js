import { ConfidentialClientApplication } from '@azure/msal-node';
import fetch from "node-fetch";
import env from 'dotenv';
env.config();


// 1. App Configuration (Use your Azure App Details)
const msalConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,       
        authority: `https://login.microsoftonline.com/${process.env.TENANT_ID}`,
        clientSecret: process.env.CLIENT_SECRET, 
    }
};

console.log("Azure AD Config Loaded:", {
    clientId: msalConfig.auth.clientId,
    authority: msalConfig.auth.authority,
    clientSecret: msalConfig.auth.clientSecret ? '***' : 'Not Set'
});

const cca = new ConfidentialClientApplication(msalConfig);

async function sendGraphEmail() {
    try {
        // 2. Fetch the access token from Microsoft Entra ID
        const tokenResponse = await cca.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default']
        });
        const accessToken = tokenResponse.accessToken;

        // 3. Define the email payload structure required by Microsoft
        const emailPayload = {
            message: {
                subject: 'Hello from Microsoft Graph API',
                body: {
                    contentType: 'Text', // Or 'HTML' if you want to send styled text
                    content: 'This message was sent securely using direct HTTP requests via Graph API!'
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: 'axs.sh7@gmail.com'
                        }
                    }
                ]
            },
            saveToSentItems: 'true' // Automatically saves a copy to your Sent folder
        };

        // 4. Send the HTTP POST request to Microsoft Graph
            const response = await fetch(`https://graph.microsoft.com/v1.0/users/${process.env.SENDER_EMAIL}/sendMail`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });

        // 5. Check response status (Microsoft returns 202 Accepted on success)
        if (response.status === 202) {
            console.log('✅ Email sent successfully via Graph API!');
        } else {
            const errorData = await response.json();
            console.error('❌ Failed to send email:', errorData);
        }

    } catch (error) {
        console.error('An error occurred during execution:', error);
    }
}

sendGraphEmail();
