export interface User {
    address: string;
    wallet_addresses: string[];
    created_at: number;
}

export interface AuthResponse {
    access_token: string;
    referesh_token: string;
    token_type: string;
    expires_in: number;
    user: User;
}

export interface ChallengeResponse {
    message: string;
    address: string;
}