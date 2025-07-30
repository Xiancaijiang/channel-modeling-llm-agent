export interface ChannelTool extends Tool {
    category: 'channel-modeling' | 'visualization';
    minTxAntennas?: number;
    maxTxAntennas?: number;
}

export interface ChannelResponse {
    content: string;
    data?: ChannelModel | null;
    visualization?: string;
    timestamp: string;
}

export interface ChannelModel {
    matrix: number[][];
    environment: 'urban' | 'suburban' | 'indoor';
    frequency: number;
    metadata?: {
        rank?: number;
        conditionNumber?: number;
    };
}

export interface ChannelToolCall {
    id: string;
    function: {
        name: 'generate_mimo_channel' | 'visualize_channel' | 'analyze_capacity';
        arguments: string;
    };
}