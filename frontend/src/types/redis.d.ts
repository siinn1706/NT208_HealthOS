declare module "redis" {
  export function createClient(options?: { url?: string }): RedisClient;
  export interface RedisClient {
    connect(): Promise<void>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: { EX?: number }): Promise<void>;
  }
}
