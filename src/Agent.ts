import MCPClient from "./MCPClient";
import ChatOpenAI from "./ChatOpenAI";
import { logTitle, validateChannelParams } from "./utils";
import { ChannelResponse, ChannelToolCall } from "./types";

export default class Agent {
    private mcpClients: MCPClient[];
    private llm: ChatOpenAI | null = null;
    private model: string;
    private systemPrompt: string;
    private context: string;
    private currentChannelData: any = null;

    constructor(model: string = "gpt-4-turbo", mcpClients: MCPClient[] = []) {
        this.mcpClients = mcpClients;
        this.model = model;
        this.systemPrompt = this.getDefaultSystemPrompt();
        this.context = "";
    }

    private getDefaultSystemPrompt(): string {
        return `你是一个无线通信信道建模专家，请严格遵守以下规则：
1. 信道生成必须使用工具调用
2. 参数范围：
   - 发送天线: 1-256
   - 接收天线: 1-32
   - 频率: 0.5-100 GHz
3. 环境类型: [urban, suburban, indoor]
4. 可视化请求必须明确类型[heatmap,3d]`;
    }

    async init() {
        logTitle('初始化信道建模工具');
        for await (const client of this.mcpClients) {
            await client.init();
            // 验证工具是否包含必要功能
            if (!client.getTools().some(t => t.name === 'generate_mimo_channel')) {
                throw new Error(`客户端缺少信道生成工具`);
            }
        }
        
        const tools = this.mcpClients.flatMap(client => client.getTools());
        this.llm = new ChannelChatOpenAI(this.model, this.systemPrompt, tools);
    }

    async close() {
        logTitle('关闭信道建模服务');
        for await (const client of this.mcpClients) {
            await client.close();
        }
        this.currentChannelData = null;
    }

    async invoke(prompt: string): Promise<ChannelResponse> {
        if (!this.llm) throw new Error('Agent未初始化');
        
        let response = await this.llm.chat(prompt);
        let iteration = 0;
        const maxIterations = 5; // 防止无限循环

        while (iteration++ < maxIterations) {
            if (response.toolCalls.length > 0) {
                for (const toolCall of response.toolCalls) {
                    await this.processToolCall(toolCall);
                }
                response = await this.llm.chat(); // 继续对话
            } else {
                break; // 没有工具调用时退出
            }
        }

        return {
            content: response.content,
            data: this.currentChannelData,
            timestamp: new Date().toISOString()
        };
    }

    private async processToolCall(toolCall: ChannelToolCall) {
        if (!this.llm) return;

        logTitle(`执行工具: ${toolCall.function.name}`);
        try {
            const params = JSON.parse(toolCall.function.arguments);
            
            // 参数验证
            if (toolCall.function.name === 'generate_mimo_channel') {
                validateChannelParams(params);
            }

            const mcp = this.mcpClients.find(client => 
                client.getTools().some(t => t.name === toolCall.function.name)
            );

            if (mcp) {
                const result = await mcp.callTool(toolCall.function.name, params);
                const parsedResult = JSON.parse(result);
                
                // 缓存信道数据
                if (toolCall.function.name === 'generate_mimo_channel') {
                    this.currentChannelData = parsedResult;
                }
                
                this.llm.appendToolResult(toolCall.id, result);
                console.log(`工具执行成功:`, parsedResult);
            } else {
                this.llm.appendToolResult(toolCall.id, '工具不可用');
                console.warn(`未找到工具: ${toolCall.function.name}`);
            }
        } catch (error) {
            console.error(`工具执行失败:`, error);
            this.llm.appendToolResult(toolCall.id, `错误: ${error.message}`);
        }
    }
}