import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { QuotationsController } from './quotations.controller';
import { BookingsController } from './bookings.controller';
import { BookingService } from './booking.service';
import { PrismaService } from '@planam/shared';
import { VendorAvailabilityModule } from '../vendor-availability/vendor-availability.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingDetailsController } from './booking-details.controller';
import { BookingDetailsService } from './booking-details.service';
import { AiRecommendationModule } from '../ai-recommendation/ai-recommendation.module';
import { InstantBookingController } from './instant-booking.controller';
import { InstantBookingService } from './instant-booking.service';
import { BookingMilestonesController } from './booking-milestones.controller';
import { BookingMilestonesService } from './booking-milestones.service';
import { BookingCalendarController } from './booking-calendar.controller';
import { BookingCalendarService } from './booking-calendar.service';

@Module({
  imports: [
    VendorAvailabilityModule,
    NotificationsModule,
    AiRecommendationModule,
  ],
  controllers: [
    LeadsController,
    QuotationsController,
    BookingsController,
    BookingDetailsController,
    InstantBookingController,
    BookingMilestonesController,
    BookingCalendarController,
  ],
  providers: [
    BookingService,
    BookingDetailsService,
    InstantBookingService,
    BookingMilestonesService,
    BookingCalendarService,
    PrismaService,
  ],
  exports: [InstantBookingService],
})
export class BookingModule {}
