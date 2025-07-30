import { EmbeddingRetriever } from "./EmbeddingRetriever";
import { Document } from "langchain/document";

interface WirelessDocumentMetadata {
    category: string;
    source: string;
    frequencyBand?: string;
    standard?: string; // e.g. "3GPP TR 38.901"
}

export class ChannelEmbeddingRetriever extends EmbeddingRetriever {
    private knowledgeGraph: Map<string, WirelessDocumentMetadata> = new Map();

    async embedDocument(content: string, metadata: WirelessDocumentMetadata) {
        const docId = await super.embedDocument(content);
        this.knowledgeGraph.set(docId, metadata);
        return docId;
    }

    async retrieve(query: string, topK: number): Promise<Document[]> {
        // 优先检索与信道建模相关的文档
        const enhancedQuery = `${query} 无线通信 信道建模 MIMO OFDM`;
        const docs = await super.retrieve(enhancedQuery, topK);
        
        return docs.map(doc => ({
            ...doc,
            metadata: {
                ...doc.metadata,
                ...this.knowledgeGraph.get(doc.metadata.id)
            }
        }));
    }

    async getRelatedStandards(frequency: number): Promise<Document[]> {
        // 根据频率检索相关标准文档
        const band = this.getFrequencyBand(frequency);
        return this.retrieve(`3GPP标准 ${band}频段`, 2);
    }

    private getFrequencyBand(freqGHz: number): string {
        if (freqGHz < 1) return 'sub-1GHz';
        if (freqGHz < 6) return 'sub-6GHz';
        return '毫米波';
    }
}