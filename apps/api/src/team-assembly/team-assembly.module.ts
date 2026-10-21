import { Module } from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import { TeamAssemblyController } from './team-assembly.controller';
import { TeamAssemblyService } from './team-assembly.service';
import { BookingModule } from '../booking/booking.module';

@Module({
  imports: [BookingModule],
  controllers: [TeamAssemblyController],
  providers: [TeamAssemblyService, PrismaService],
})
export class TeamAssemblyModule {}
