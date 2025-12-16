// src/lib/api.ts

import { AuthResponse, ChallengeResponse, User } from '@/types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Helper: Extract raw bytes from CBOR hex string
function extractFromCBOR(hexStr: string, expectedByteLength: number): string {
  const hex = hexStr.trim().replace(/^0x/i, '').toLowerCase();
  
  // CBOR byte-string marker: 0x58 <length> <data...>
  // For 32 bytes (public key): 58 20 <64 hex chars>
  // For 64 bytes (signature): 58 40 <128 hex chars>
  
  const marker = expectedByteLength === 32 ? '5820' : expectedByteLength === 64 ? '5840' : null;
  
  if (marker) {
    const idx = hex.indexOf(marker);
    if (idx !== -1) {
      const start = idx + marker.length;
      const expectedHexLen = expectedByteLength * 2;
      if (hex.length >= start + expectedHexLen) {
        return hex.substring(start, start + expectedHexLen);
      }
    }
  }
  
  // Fallback: if already the right length, return as-is
  const expectedHexLen = expectedByteLength * 2;
  if (hex.length === expectedHexLen) {
    return hex;
  }
  
  // Last resort: try to find continuous hex of right length
  if (hex.length > expectedHexLen) {
    // Try from end (common case)
    return hex.substring(hex.length - expectedHexLen);
  }
  
  throw new Error(`Cannot extract ${expectedByteLength} bytes from CBOR hex (length: ${hex.length / 2} bytes)`);
}

function normalizePublicKey(raw: string): string {
  return extractFromCBOR(raw, 32); // 32 bytes = 64 hex chars
}

function normalizeSignature(raw: string): string {
  return extractFromCBOR(raw, 64); // 64 bytes = 128 hex chars
}

class APIClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    
    // Try to load token from localStorage on init
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Merge incoming headers (Headers | string[][] | Record<string,string>)
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      (options.headers as [string, string][]).forEach(([k, v]) => {
        headers[k] = v;
      });
    } else if (options.headers && typeof options.headers === 'object') {
      Object.assign(headers, options.headers as Record<string, string>);
    }

    // Add authorization header if token exists
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }


  // Auth Endpoints
 

  async getChallenge(address: string): Promise<ChallengeResponse> {
    return this.request(`/api/auth/challenge?address=${encodeURIComponent(address)}`);
  }

  async login(data: {
    address: string;
    message: string;
    signature: string;
    public_key: string;
  }): Promise<AuthResponse> {
    console.log("Raw public_key from wallet:", data.public_key);
    console.log("Raw signature from wallet:", data.signature);
    console.log("Message being sent:", data.message); 
    console.log("Address being sent:", data.address); 
    
    // Only normalize public key, send signature as-is (full COSE structure)
    const normalizedPublicKey = normalizePublicKey(data.public_key);
    
    console.log("Normalized public_key (64 hex chars):", normalizedPublicKey);
    console.log("Sending full COSE signature (not normalized)");
    
    const response = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        address: data.address,
        message: data.message,
        signature: data.signature,  // Send full COSE structure
        public_key: normalizedPublicKey,
      }),
    });

    // Save tokens
    this.setAccessToken(response.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', response.referesh_token);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async refreshToken(): Promise<{ access_token: string }> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') 
      : null;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request<{ access_token: string }>(
      '/api/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    this.setAccessToken(response.access_token);
    return response;
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/api/auth/me');
  }

  async addWallet(data: {
    address: string;
    message: string;
    signature: string;
    public_key: string;
  }): Promise<{ message: string; address: string }> {
    // Normalize for add-wallet too
    const normalizedPublicKey = normalizePublicKey(data.public_key);
    const normalizedSignature = normalizeSignature(data.signature);
    
    return this.request('/api/auth/add-wallet', {
      method: 'POST',
      body: JSON.stringify({
        address: data.address,
        message: data.message,
        signature: normalizedSignature,
        public_key: normalizedPublicKey,
      }),
    });
  }


  

  async getBlocks(limit: number = 20) {
    return this.request(`/api/blocks?limit=${limit}`);
  }

  async getTransactions(limit: number = 50) {
    return this.request(`/api/transactions?limit=${limit}`);
  }

  async getLatestBlock() {
    return this.request('/api/blocks/latest');
  }

 async getUserTransactions(addresses?: string[], limit: number = 50) {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (addresses && addresses.length > 0) {
    params.append('addresses', addresses.join(','));
  }
  return this.request(`/api/user/transactions?${params.toString()}`);
}

async getUserBalance(addresses?: string[]) {
  if (addresses && addresses.length > 0) {
    const params = new URLSearchParams();
    params.append('addresses', addresses.join(','));
    return this.request(`/api/user/balance?${params.toString()}`);
  }
  return this.request('/api/user/balance');
}

  async getUserWallets() {
    return this.request('/api/user/wallets');
  }



  setAccessToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearTokens() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

// Export singleton instance
export const apiClient = new APIClient(API_BASE_URL);

// Export class for testing
export default APIClient;
