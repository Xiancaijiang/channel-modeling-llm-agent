import path from "path";
import ChannelMCPClient from "./MCPClient";
import ChannelModelingAgent from "./Agent";
import { ChannelEmbeddingRetriever } from "./ChannelEmbeddingRetriever";
import { logChannelEvent } from "./utils";

// 配置常量
const CONFIG = {
    OUTPUT_DIR: path.join(__dirname, "../output/channels"),
    KNOWLEDGE_DIR: path.join(__dirname, "../knowledge/wireless"),
    DEFAULT_TASK: `
    请执行以下信道建模任务：
    1. 生成64x8的MIMO信道矩阵
    2. 频率3.5GHz，城区环境
    3. 分析信道特性
    4. 生成Markdown报告
    `
};

async function main() {
    // 初始化组件
    const retriever = new ChannelEmbeddingRetriever();
    await loadKnowledgeBase(retriever);
    
    const mcpClient = new MCPClient(
        "channel-modeling",
        "python",
        ["-m", "channel_model", "--precision=fp16"]
    );

    const agent = new ChannelModelingAgent("gpt-4-turbo", [mcpClient]);

    // 执行任务
    try {
        await agent.init();
        const response = await agent.invoke(CONFIG.DEFAULT_TASK);
        logChannelEvent(`任务完成: ${response.content}`);
    } finally {
        await agent.close();
    }
}

/** 加载通信领域知识库 */
async function loadKnowledgeBase(retriever: ChannelEmbeddingRetriever) {
    const files = fs.readdirSync(CONFIG.KNOWLEDGE_DIR);
    for (const file of files) {
        const content = fs.readFileSync(path.join(CONFIG.KNOWLEDGE_DIR, file), 'utf-8');
        await retriever.embedDocument(content, {
            source: file,
            standard: file.includes('3gpp') ? '3GPP' : undefined,
            category: ""
        });
    }
}

main().catch(err => {
    logChannelEvent(`运行失败: ${err}`, 'error');
    process.exit(1);
});