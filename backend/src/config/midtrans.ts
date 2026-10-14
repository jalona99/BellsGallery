// @ts-ignore
import midtransClient from 'midtrans-client';
import dotenv from 'dotenv';

dotenv.config();

const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
const clientKey = process.env.MIDTRANS_CLIENT_KEY || '';

// Gunakan flag MIDTRANS_IS_PRODUCTION secara eksplisit
const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

console.log(`[Midtrans Config] Mode: ${isProduction ? 'PRODUCTION' : 'SANDBOX'} | ClientKey: ${clientKey ? clientKey.substring(0, 14) + '...' : 'NONE'}`);

// Create Snap API instance
export const snap = new midtransClient.Snap({
    isProduction: isProduction,
    serverKey: serverKey || 'SB-Mid-server-YOUR_SERVER_KEY',
    clientKey: clientKey || 'SB-Mid-client-YOUR_CLIENT_KEY'
});

// Create Core API instance
export const coreApi = new midtransClient.CoreApi({
    isProduction: isProduction,
    serverKey: serverKey || 'SB-Mid-server-YOUR_SERVER_KEY',
    clientKey: clientKey || 'SB-Mid-client-YOUR_CLIENT_KEY'
});
