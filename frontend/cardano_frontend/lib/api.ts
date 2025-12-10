// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// export async function fetchBlocks(){
//     const response = await fetch(`${API_BASE_URL}/api/blocks`);
//     if(!response.ok){
//         throw new Error(`Error fetching blocks: ${response.statusText}`);
//     }
//     return response.json();
// }

// export async function fetchTransactions(){
//     const response = await fetch(`${API_BASE_URL}/api/transaction`);
//     if(!response.ok){
//         throw new Error(`Error fetching transactions: ${response.statusText}`);
//     }
//     return response.json();
// }

// export async function fetchlatestBlock(){
//     const response = await fetch(`${API_BASE_URL}/api/blocks/latest`);
//     if(!response.ok){
//         throw new Error(`Error fetching latest block: ${response.statusText}`);
//     }
//     return response.json();
// }