export interface Transactions {
    hash: string;
    block_number: number;
    timestamp: number;
    fee: number;
    input_count: number;
    output_count: number;
    total_output: number;
}