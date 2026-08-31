import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityAccessModule } from './identity-access/identity-access.module';
import { AuthModule } from './auth/auth.module';
import { EventManagementModule } from './event-management/event-management.module';

@Module({
  // imports: [IdentityAccessModule],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../packages/shared/.env',
    }),
    IdentityAccessModule,
    AuthModule,
    EventManagementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
