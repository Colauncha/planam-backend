import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private readonly redisLogger = new Logger(RedisIoAdapter.name);
  // private adapterConstructor: ReturnType<typeof createAdapter>;
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  // Render provides one REDIS_URL; host and port stay as a fallback for local development
  private resolveRedisUrl(): string {
    const url = this.config.get<string>('REDIS_URL');
    if (url) return url.trim();

    const host = this.config.get<string>('REDIS_HOST', 'localhost').trim();
    const port = this.config.get<string>('REDIS_PORT', '6379').trim();
    return `redis://${host}:${port}`;
  }

  /*
  async connectToRedis(): Promise<void> {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<string>('REDIS_PORT', '6379');

    const pubClient = createClient({ url: `redis://${host}:${port}` });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }
*/

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: this.resolveRedisUrl() });
    const subClient = pubClient.duplicate();

    // without error listeners, a dropped Redis connection crashes the whole process
    pubClient.on('error', (err) =>
      this.redisLogger.error(`Redis (pub) error: ${err.message}`),
    );
    subClient.on('error', (err) =>
      this.redisLogger.error(`Redis (sub) error: ${err.message}`),
    );

    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(
    port: number,
    options?: Parameters<IoAdapter['createIOServer']>[1],
  ): ReturnType<IoAdapter['createIOServer']> {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor as any);
    return server;
  }
}
