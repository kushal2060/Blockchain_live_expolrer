import { bech32 } from 'bech32';

export const hexToBech32Address = (hex: string): string => {
    const cleanHex = hex.replace(/^0x/, '');
    const bytes = Buffer.from(cleanHex, 'hex');
    const networkByte = bytes[0];
    const isTestnet = (networkByte & 0b0001_0000) === 0;
    const prefix = isTestnet ? 'addr_test' : 'addr';
    
    const words = bech32.toWords(bytes);
    return bech32.encode(prefix, words, 1000);
};