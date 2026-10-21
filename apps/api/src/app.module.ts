import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdentityAccessModule } from './identity-access/identity-access.module';
import { AuthModule } from './auth/auth.module';
import { EventManagementModule } from './event-management/event-management.module';
import { VendorMarketplaceModule } from './vendor-marketplace/vendor-marketplace.module';
import { BookingModule } from './booking/booking.module';
import { VendorAvailabilityModule } from './vendor-availability/vendor-availability.module';
import { VendorAvailabilityController } from './vendor-availability.controller';
import { PaymentsModule } from './payments/payments.module';
import { PaymentsController } from './payments.controller';

import { CommunicationController } from './communication.controller';
import { GuestTicketingModule } from './guest-ticketing/guest-ticketing.module';
import { GuestTicketingController } from './guest-ticketing.controller';
import { MediaSharingModule } from './media-sharing/media-sharing.module';
import { MediaSharingController } from './media-sharing.controller';
import { ReviewsFeedbackModule } from './reviews-feedback/reviews-feedback.module';
import { ReviewsFeedbackController } from './reviews-feedback.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { NotificationsController } from './notifications.controller';
import { AiRecommendationModule } from './ai-recommendation/ai-recommendation.module';
import { AiRecommendationController } from './ai-recommendation.controller';
import { VendorCatalogModule } from './vendor-catalog/vendor-catalog.module';
import { VendorLogsModule } from './vendor-logs/vendor-logs.module';
import { VendorLogsController } from './vendor-logs.controller';
import { CalendarModule } from './calendar/calendar.module';
import { EarningsModule } from './earnings/earnings.module';
import { EarningsController } from './earnings.controller';
import { SettingsModule } from './settings/settings.module';
import { SupportModule } from './support/support.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SubscriptionsController } from './subscriptions.controller';
import { MessagingModule } from './messaging/messaging.module';
import { VendorComparisonModule } from './vendor-comparison/vendor-comparison.module';
import { TeamAssemblyModule } from './team-assembly/team-assembly.module';
import { VendorPolicyModule } from './vendor-policy/vendor-policy.module';
import { CancellationsModule } from './cancellations/cancellations.module';

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
    VendorMarketplaceModule,
    BookingModule,
    VendorAvailabilityModule,
    PaymentsModule,
    GuestTicketingModule,
    MediaSharingModule,
    ReviewsFeedbackModule,
    NotificationsModule,
    AiRecommendationModule,
    VendorCatalogModule,
    VendorLogsModule,
    CalendarModule,
    EarningsModule,
    SettingsModule,
    SupportModule,
    SubscriptionsModule,
    MessagingModule,
    VendorComparisonModule,
    TeamAssemblyModule,
    VendorPolicyModule,
    CancellationsModule,
  ],
  controllers: [
    AppController,
    VendorAvailabilityController,
    PaymentsController,
    CommunicationController,
    GuestTicketingController,
    MediaSharingController,
    ReviewsFeedbackController,
    NotificationsController,
    AiRecommendationController,
    VendorLogsController,
    EarningsController,
    SubscriptionsController,
  ],
  providers: [AppService],
})
export class AppModule {}
