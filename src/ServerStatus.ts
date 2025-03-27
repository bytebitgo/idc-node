export interface ServerData {
  id: string;
  temperature: number;
  cpuUsage: number;
  memoryUsage: number;
  status: 'normal' | 'warning' | 'error';
}

export class ServerStatus {
  private servers: Map<string, ServerData> = new Map();

  constructor() {
    // 初始化模拟数据
    this.initializeServers();
  }

  private initializeServers(): void {
    // 为9个机柜中的每个服务器创建状态数据
    for (let rack = 0; rack < 9; rack++) {
      for (let server = 0; server < 5; server++) { // 修改为5台服务器
        const id = `rack${rack}-server${server}`;
        this.servers.set(id, {
          id,
          temperature: Math.random() * 20 + 25, // 25-45度
          cpuUsage: Math.random() * 60 + 20, // 20-80%
          memoryUsage: Math.random() * 50 + 30, // 30-80%
          status: 'normal'
        });
      }
    }
  }

  public updateServerStatus(): void {
    // 模拟服务器状态变化
    this.servers.forEach((server) => {
      // 更新温度（随机波动±1度）
      server.temperature += (Math.random() - 0.5) * 2;
      server.temperature = Math.max(25, Math.min(45, server.temperature));

      // 更新CPU使用率
      server.cpuUsage += (Math.random() - 0.5) * 10;
      server.cpuUsage = Math.max(20, Math.min(95, server.cpuUsage));

      // 更新内存使用率
      server.memoryUsage += (Math.random() - 0.5) * 5;
      server.memoryUsage = Math.max(30, Math.min(95, server.memoryUsage));

      // 更新状态
      if (server.temperature > 42 || server.cpuUsage > 90 || server.memoryUsage > 90) {
        server.status = 'error';
      } else if (server.temperature > 38 || server.cpuUsage > 75 || server.memoryUsage > 75) {
        server.status = 'warning';
      } else {
        server.status = 'normal';
      }
    });
  }

  public getServerData(id: string): ServerData | undefined {
    return this.servers.get(id);
  }

  public getAllServers(): Map<string, ServerData> {
    return this.servers;
  }
} 