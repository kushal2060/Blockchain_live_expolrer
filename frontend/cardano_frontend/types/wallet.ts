//types

export interface CardanoWallet {
    name: string;
    icon: string;
    apiVersion: string;
    enable(): Promise<WalletAPI>;
    isEnabled(): Promise<boolean>;
}


export interface WalletAPI {
  getNetworkId(): Promise<number>;
  getUtxos(): Promise<string[] | undefined>;
  getBalance(): Promise<string>;
  getUsedAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getChangeAddress(): Promise<string>;
  getRewardAddresses(): Promise<string[]>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  signData(address: string, payload: string): Promise<SignedData>;
  submitTx(tx: string): Promise<string>;
}

export interface SignedData{
    signature: string;
    key: string; //public key
}

export interface WalletInfo{
    id: string;
    name: string;
    icon: string;
    isInstalled: boolean;
    website?: string;
}
export interface ConnectedWallet{
    id: string;
    name:string;
    address: string;
    icon: string;
    api: WalletAPI;
    networkId: number;
}