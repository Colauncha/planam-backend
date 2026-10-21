import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@planam/shared';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getMySubscription(userId: string) {
    let sub = await this.prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      sub = await this.prisma.subscription.create({ data: { userId } }); // defaults to FREE/ACTIVE
    }
    return sub;
  }

  async initiateUpgrade(userId: string) {
    const secret = this.config.get<string>('PAYSTACK_SECRET_KEY');
    const planCode = this.config.get<string>('PAYSTACK_PREMIUM_PLAN_CODE');
    if (!secret || !planCode) {
      throw new BadRequestException(
        'Premium subscriptions are not configured yet — Paystack plan is missing',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const response = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user!.email,
          amount: 200000, // ₦2,000 in kobo — initial charge; the plan itself governs recurring amount
          plan: planCode,
          metadata: { userId, purpose: 'PREMIUM_UPGRADE' },
        }),
      },
    );

    const data = await response.json();
    if (!data.status) {
      throw new BadRequestException(
        data.message || 'Failed to initiate subscription',
      );
    }

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
    };
  }

  async handleSubscriptionWebhookEvent(event: { event: string; data: any }) {
    if (event.event === 'subscription.create') {
      let userId = event.data?.metadata?.userId;
      if (!userId) {
        const email = event.data?.customer?.email;
        if (email) {
          const user = await this.prisma.user.findUnique({ where: { email } });
          userId = user?.id;
        }
      }

      if (!userId) return; // genuinely can't match this event to a user — nothing to update

      await this.prisma.subscription.upsert({
        where: { userId },
        update: {
          plan: 'PREMIUM',
          status: 'ACTIVE',
          paystackCustomerCode: event.data.customer?.customer_code,
          paystackSubCode: event.data.subscription_code,
          renewsAt: event.data.next_payment_date
            ? new Date(event.data.next_payment_date)
            : undefined,
        },
        create: {
          userId,
          plan: 'PREMIUM',
          status: 'ACTIVE',
          paystackCustomerCode: event.data.customer?.customer_code,
          paystackSubCode: event.data.subscription_code,
          renewsAt: event.data.next_payment_date
            ? new Date(event.data.next_payment_date)
            : undefined,
        },
      });
    }

    if (event.event === 'subscription.disable') {
      const subCode = event.data?.subscription_code;
      if (!subCode) return;

      await this.prisma.subscription.updateMany({
        where: { paystackSubCode: subCode },
        data: { plan: 'FREE', status: 'CANCELLED' },
      });
    }
  }
}
