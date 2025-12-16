//configuring sabbai avilable cardano wallets

import { CardanoWallet,WalletInfo,WalletAPI,SignedData } from "@/types/wallet";
import { hexToBech32Address } from "./bech32";
//extend window object to include cardano type safety ko lagi as typescript ko window ma cardano vanra hunna
declare global {
    interface Window {
        cardano?: {
            [key: string]: CardanoWallet
        };
    }
}

//cardano wallets haru
export const KNOWN_WALLETS: Record<string,WalletInfo> = {
   lace: {
    id: 'lace',
    name: 'Lace wallet',
    icon: 'https://lace.io/favicon-32x32.png',
    isInstalled: false,
    website: 'https://lace.io'
   },
    eternl: {
    id: 'eternl',
    name: 'Eternl',
    icon: 'https://eternl.io/favicon.ico',
    isInstalled: false,
    website: 'https://eternl.io',
  },
   yoroi: {
    id: 'yoroi',
    name: 'Yoroi',
    icon: 'https://yoroi-wallet.com/assets/logo.png',
    isInstalled: false,
    website: 'https://yoroi-wallet.com',
  },
  typhon: {
    id: 'typhoncip30',  
    name: 'Typhon',
    icon: 'https://typhonwallet.io/assets/typhon.svg',
    isInstalled: false,
    website: 'https://typhonwallet.io',
  }

};
//connect to wallet
export const enableWallet = async (walletId: string): Promise<WalletAPI>=>{
    if(typeof window === 'undefined' || !window.cardano){
        throw new Error('Cardano wallets not available');
    }
    const wallet = window.cardano[walletId];

    if(!wallet){
        throw new Error(`Wallet ${walletId} not found`);
    }
    try {
        const api = await wallet.enable();
        return api;
    } catch (error) {
        console.error(`Failed to enable wallet ${walletId}:`, error);
        throw new Error(`Failed to enable wallet ${walletId}`);
    }
};

//if wallet is already enabled

export const isWalletEnabled = async (walletId: string): Promise<boolean>=>{
    if(typeof window === 'undefined' || !window.cardano){
        return false;
    }
    const wallet = window.cardano[walletId];

    if(!wallet){
        return false;
    }
    try {
        const enabled = await wallet.isEnabled();
        return enabled;
    } catch (error) {
        console.error(`Failed to check if wallet ${walletId} is enabled:`, error);
        return false;
    }   
}

//get wallet address in bech32 format (fixed version)
export const getWalletAddress = async (api: WalletAPI): Promise<string> => {
    try {
        // First try to get change address (usually returns Bech32)
        const changeAddress = await api.getChangeAddress();
        if (changeAddress && (changeAddress.startsWith('addr') || changeAddress.startsWith('stake'))) {
            return changeAddress;
        }
    } catch (e) {
        console.warn('getChangeAddress failed, trying reward addresses');
    }

    try {
        // Try reward addresses
        const rewardAddresses = await api.getRewardAddresses();
        if (rewardAddresses && rewardAddresses.length > 0) {
            const addr = rewardAddresses[0];
            if (addr.startsWith('addr') || addr.startsWith('stake')) {
                return addr;
            }
        }
    } catch (e) {
        console.warn('getRewardAddresses failed, trying used addresses');
    }

    // Fallback to used/unused addresses (these return hex, need to decode)
    const usedAddresses = await api.getUsedAddresses();
    if (usedAddresses.length > 0) {
        return hexToBech32Address(usedAddresses[0]);
    }

    const unusedAddresses = await api.getUnusedAddresses();
    if (unusedAddresses.length > 0) {
        return hexToBech32Address(unusedAddresses[0]);
    }

    throw new Error('No addresses found in wallet');
}

// Convert hex address to bech32 address
// export const hexToBech32Address = (hex: string): string => {
//     try {
//         // Remove '0x' prefix if present
//         const cleanHex = hex.replace(/^0x/, '');
        
//         // Decode hex to bytes
//         const bytes = new Uint8Array(cleanHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        
//         // Use @emurgo/cardano-serialization-lib-browser if available, or use a simpler approach
//         // For now, we'll use the Browser's TextDecoder with bech32 encoding
        
//         // Simple bech32 encoding (you may want to use a proper library)
//         // Determine prefix based on network byte
//         const networkByte = bytes[0];
//         const isTestnet = (networkByte & 0b0001_0000) === 0;
//         const prefix = isTestnet ? 'addr_test' : 'addr';
        
//         // This is a simplified version - for production use @emurgo/cardano-serialization-lib-browser
//         // or cardano-addresses library
//         return `${prefix}${cleanHex}`;
//     } catch (error) {
//         console.error('Failed to convert hex to bech32:', error);
//         return hex; // Return hex as fallback
//     }
// };

export const getWalletBalance = async (api: WalletAPI): Promise<string> => {
    const balancehex = await api.getBalance();
    const balancelovelace = parseInt(balancehex,16);
    return (balancelovelace/1_000_000).toString(); //convert to ADA
}

//sign the message with wallet (CIP-8)

export const signMessage = async (
    api: WalletAPI,
    address: string,
    message: string
): Promise<SignedData> => {
    const messagehex = Buffer.from(message, 'utf8').toString('hex');
    try {
        const signedData = await api.signData(address, messagehex);
        return signedData;
    } catch (error:any){
        console.error('Failed to sign message:', error);
        throw new Error(`Failed to sign message: ${error?.message || error}`);
    }
};

//network id
export const getNetworkId = async (api: WalletAPI): Promise<number> =>{
    return await api.getNetworkId();
};

//check if wallet is on correct network
export const isCorrectNetwork = async (
  api: WalletAPI,
  expectedNetwork: 'mainnet' | 'testnet' = 'testnet'
): Promise<boolean> => {
  const networkId = await getNetworkId(api);
  const expectedId = expectedNetwork === 'mainnet' ? 1 : 0;
  return networkId === expectedId;
};