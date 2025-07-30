import chalk from "chalk";
import { ChannelModel } from "./channelTypes";

// 增强的日志功能
export function logTitle(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const colors = {
        info: chalk.bold.cyanBright,
        warn: chalk.bold.yellowBright,
        error: chalk.bold.redBright
    };
    const totalLength = 80;
    const paddedMessage = `[${new Date().toISOString()}] ${message}`
        .padStart(totalLength/2 + message.length/2, '=')
        .padEnd(totalLength, '=');
    console.log(colors[level](paddedMessage));
}

// 信道参数验证
export function validateChannelParams(params: any) {
    const schema = {
        tx_antennas: { min: 1, max: 256 },
        rx_antennas: { min: 1, max: 32 },
        frequency: { min: 0.5, max: 100 }, // GHz
        environment: ['urban', 'suburban', 'indoor']
    };

    if (params.tx_antennas < schema.tx_antennas.min || params.tx_antennas > schema.tx_antennas.max) {
        throw new Error(`发送天线数必须在${schema.tx_antennas.min}-${schema.tx_antennas.max}之间`);
    }

    if (!schema.environment.includes(params.environment)) {
        throw new Error(`环境类型必须是: ${schema.environment.join(', ')}`);
    }
}

// 信道矩阵分析
export function analyzeChannelMatrix(matrix: number[][]): ChannelModel['metadata'] {
    const flatMatrix = matrix.flat();
    return {
        meanGain: flatMatrix.reduce((a, b) => a + b, 0) / flatMatrix.length,
        maxGain: Math.max(...flatMatrix),
        minGain: Math.min(...flatMatrix),
        rank: new Matrix(matrix).rank(),
        createdAt: new Date().toISOString()
    };
}

// 保存信道数据到文件
export async function saveChannelData(data: ChannelModel, filePath: string) {
    const content = `# 信道建模报告
## 基本信息
- 环境: ${data.environment}
- 频率: ${data.frequency}GHz
- 矩阵维度: ${data.matrix.length}x${data.matrix[0]?.length || 0}

## 统计特性
${Object.entries(data.metadata || {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')}

## 矩阵数据(前5x5)
\`\`\`json
${JSON.stringify(data.matrix.slice(0, 5).map(row => row.slice(0, 5)), null, 2)}
\`\`\`
`;

    await fs.promises.writeFile(filePath, content);
    logTitle(`信道数据已保存到 ${filePath}`);
}