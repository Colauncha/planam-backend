import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';
import { VendorAvailabilityService } from '../vendor-availability/vendor-availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiRecommendationService } from '../ai-recommendation/ai-recommendation.service';
import { buildMilestones } from './booking-milestones.util';
import { snapshotPolicy } from './booking-policy.util';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vendorAvailabilityService: VendorAvailabilityService,
    private readonly notificationsService: NotificationsService,
    private readonly aiRecommendationService: AiRecommendationService,
  ) {}

  private async logActivity(
    quotationId: string,
    type: string,
    description: string,
    actor: 'VENDOR' | 'HOST' | 'AI' | 'SYSTEM' = 'SYSTEM',
  ) {
    await this.prisma.quotationActivityLog.create({
      data: {
        quotationId,
        type: type as any,
        description,
        actor: actor as any,
      },
    });
  }

  private computeTotals(lineItems: { amount: number }[], taxRate: number) {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * taxRate) / 100;
    return { subtotal, taxAmount, totalAmount: subtotal + taxAmount };
  }

  private async assertQuotationParticipant(
    userId: string,
    quotationId: string,
    hideDraftFromHost = true,
  ) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        lead: {
          include: {
            event: { select: { hostId: true } },
            vendorProfile: { select: { userId: true } },
          },
        },
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');

    const isVendor = quotation.lead.vendorProfile.userId === userId;
    const isHost = quotation.lead.event.hostId === userId;
    if (!isVendor && !isHost)
      throw new ForbiddenException('Not authorized for this quotation');

    // a host cannot see a quotation the vendor has not sent yet
    if (!isVendor && hideDraftFromHost && quotation.status === 'DRAFT') {
      throw new NotFoundException('Quotation not found');
    }

    return quotation;
  }

  private getLeadDisplayStatus(
    lead: { status: string; viewedAt: Date | null },
    eventDate: Date,
    now: Date,
  ): string {
    if (lead.status !== 'PENDING') return 'RESPONDED';
    if (eventDate < now) return 'EXPIRED';
    return lead.viewedAt ? 'VIEWED' : 'NEW';
  }

  // ---- LEADS ----

  async createLead(
    hostId: string,
    eventId: string,
    dto: { vendorProfileId: string; message?: string },
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.hostId !== hostId)
      throw new ForbiddenException('You do not own this event');

    const vendor = await this.prisma.vendorProfile.findUnique({
      where: { id: dto.vendorProfileId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (!vendor.isAcceptingBookings) {
      throw new BadRequestException(
        'This vendor is not currently accepting new bookings',
      );
    }

    const lead = await this.prisma.lead.create({
      data: {
        eventId,
        vendorProfileId: dto.vendorProfileId,
        message: dto.message,
      },
    });

    await this.notificationsService.create(
      vendor.userId,
      'NEW_LEAD',
      'New lead received',
      `You have received a new lead for your ${event.title}`,
      { leadId: lead.id, eventId },
    );

    return lead;
  }

  async listVendorLeads(
    userId: string,
    query: {
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) throw new NotFoundException('Vendor profile not found');

    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 12);
    const now = new Date();

    const where: any = {
      vendorProfileId: vendorProfile.id,
      ...(query.search && {
        event: {
          OR: [
            { title: { contains: query.search, mode: 'insensitive' } },
            {
              host: {
                fullName: { contains: query.search, mode: 'insensitive' },
              },
            },
          ],
        },
      }),
    };

    // statuses that map directly to a stored value can be pushed into the query;
    // NEW/VIEWED/EXPIRED all share status:PENDING, so they're distinguished after the fetch
    if (query.status === 'RESPONDED') {
      where.status = { not: 'PENDING' };
    } else if (query.status) {
      where.status = 'PENDING';
    }

    const allMatching = await this.prisma.lead.findMany({
      where,
      include: { event: { include: { host: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    const withDisplayStatus = allMatching.map((lead) => ({
      ...lead,
      displayStatus: this.getLeadDisplayStatus(lead, lead.event.eventDate, now),
    }));

    const filtered = query.status
      ? withDisplayStatus.filter((l) => l.displayStatus === query.status)
      : withDisplayStatus;

    const total = filtered.length;
    const skip = (page - 1) * pageSize;
    const data = await Promise.all(
      filtered.slice(skip, skip + pageSize).map(async (lead) => ({
        id: lead.id,
        eventTitle: lead.event.title,
        eventType: lead.event.eventType,
        eventDate: lead.event.eventDate,
        budget: lead.event.budget,
        location: lead.event.location,
        hostName: lead.event.host.fullName,
        status: lead.displayStatus,
        aiMatch: await this.aiRecommendationService.scoreLeadForVendor(
          vendorProfile.id,
          lead.id,
        ),
        createdAt: lead.createdAt,
      })),
    );

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async respondToLead(
    userId: string,
    leadId: string,
    status: 'ACCEPTED' | 'DECLINED',
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { vendorProfile: true, event: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your lead');
    if (lead.status !== 'PENDING')
      throw new BadRequestException('This lead has already been responded to');

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });

    await this.notificationsService.create(
      lead.event.hostId,
      'LEAD_RESPONSE',
      `Your lead was ${status.toLowerCase()}`,
      undefined,
      { leadId },
    );

    return updated;
  }

  async getLeadDetail(userId: string, leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        vendorProfile: true,
        event: {
          include: {
            host: { select: { fullName: true, email: true, phone: true } },
          },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your lead');

    if (!lead.viewedAt) {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { viewedAt: new Date() },
      });
      lead.viewedAt = new Date();
    }

    const now = new Date();
    return {
      ...lead,
      displayStatus: this.getLeadDisplayStatus(lead, lead.event.eventDate, now),
    };
  }

  // ---- QUOTATIONS ----

  async createQuotation(
    userId: string,
    leadId: string,
    dto: {
      packageId?: string;
      lineItems: any[];
      taxRate?: number;
      terms?: string;
    },
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: { vendorProfile: true, event: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your lead');
    // if (lead.status !== 'ACCEPTED')
    // throw new BadRequestException('Lead must be accepted before quoting');

    if (lead.status === 'DECLINED' || lead.status === 'CLOSED') {
      throw new BadRequestException('This lead is no longer open');
    }
    if (lead.status === 'PENDING') {
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { status: 'ACCEPTED' },
      });
      await this.notificationsService.create(
        lead.event.hostId,
        'LEAD_RESPONSE',
        'Your lead was accepted',
        undefined,
        { leadId },
      );
    }

    if (dto.packageId) {
      const pkg = await this.prisma.vendorPackage.findUnique({
        where: { id: dto.packageId },
      });
      if (!pkg || pkg.vendorProfileId !== lead.vendorProfileId) {
        throw new BadRequestException('Invalid package for this vendor');
      }
    }

    const taxRate = dto.taxRate ?? 0;
    const totals = this.computeTotals(dto.lineItems, taxRate);

    const quotation = await this.prisma.quotation.create({
      data: {
        leadId,
        packageId: dto.packageId,
        lineItems: dto.lineItems,
        subtotal: totals.subtotal,
        taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        terms: dto.terms,
        status: 'DRAFT',
      },
    });

    await this.logActivity(
      quotation.id,
      'CREATED',
      'Quotation created as draft',
      'VENDOR',
    );
    return quotation;
  }

  async sendQuotation(userId: string, quotationId: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        lead: {
          include: {
            vendorProfile: true,
            event: { include: { host: { select: { email: true } } } },
          },
        },
      },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');
    if (quotation.lead.vendorProfile.userId !== userId)
      throw new ForbiddenException('Not your quotation');
    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException('Only draft quotations can be sent');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const snapshot = {
      packageId: quotation.packageId,
      lineItems: quotation.lineItems as any,
      subtotal: quotation.subtotal,
      taxRate: quotation.taxRate,
      taxAmount: quotation.taxAmount,
      totalAmount: quotation.totalAmount,
      terms: quotation.terms,
      revisionMessage: quotation.revisionMessage,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.quotation.update({
        where: { id: quotationId },
        data: { status: 'PENDING', sentAt: now, expiresAt },
      });

      await tx.quotationVersion.upsert({
        where: {
          quotationId_version: { quotationId, version: quotation.version },
        },
        update: snapshot,
        create: { quotationId, version: quotation.version, ...snapshot },
      });

      return result;
    });

    await this.logActivity(
      quotationId,
      'SENT',
      `Quote was sent to ${quotation.lead.event.host.email}`,
      'VENDOR',
    );

    await this.notificationsService.create(
      quotation.lead.event.hostId,
      'QUOTATION_RECEIVED',
      'You received a new quotation',
      undefined,
      { quotationId },
    );

    return updated;
  }

  async reviseQuotation(
    userId: string,
    quotationId: string,
    dto: {
      packageId?: string;
      lineItems?: any[];
      taxRate?: number;
      terms?: string;
      revisionMessage: string;
    },
  ) {
    const quotation = await this.getQuotationWithOwnership(
      quotationId,
      'vendor',
      userId,
    );
    if (quotation.status !== 'NEGOTIATION') {
      throw new BadRequestException(
        'Only quotations in negotiation can be revised',
      );
    }

    const lineItems = dto.lineItems ?? (quotation.lineItems as any[]);
    const taxRate = dto.taxRate ?? Number(quotation.taxRate);
    const totals = this.computeTotals(lineItems, taxRate);

    const updated = await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        packageId: dto.packageId ?? quotation.packageId,
        lineItems,
        subtotal: totals.subtotal,
        taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        terms: dto.terms ?? quotation.terms,
        revisionMessage: dto.revisionMessage,
        status: 'DRAFT', // revised quote must be explicitly sent again
        version: { increment: 1 },
      },
    });

    await this.logActivity(
      quotationId,
      'REVISED',
      dto.revisionMessage,
      'VENDOR',
    );
    return updated;
  }

  async respondToQuotation(
    userId: string,
    quotationId: string,
    status: 'ACCEPTED' | 'REJECTED' | 'NEGOTIATION',
  ) {
    const quotation = await this.getQuotationWithOwnership(
      quotationId,
      'host',
      userId,
    );

    if (quotation.status !== 'PENDING') {
      throw new BadRequestException(
        'Only a sent (pending) quotation can be responded to',
      );
    }
    if (quotation.expiresAt && quotation.expiresAt < new Date()) {
      await this.prisma.quotation.update({
        where: { id: quotationId },
        data: { status: 'EXPIRED' },
      });
      await this.logActivity(
        quotationId,
        'EXPIRED',
        'Quotation expired before the host responded',
        'SYSTEM',
      );
      throw new BadRequestException('This quotation has expired');
    }

    if (status === 'ACCEPTED') {
      const isAvailable = await this.vendorAvailabilityService.isDateAvailable(
        quotation.lead.vendorProfileId,
        quotation.lead.event.eventDate,
      );
      if (!isAvailable) {
        throw new ConflictException(
          'This vendor is no longer available on the event date',
        );
      }
    }

    const updated = await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status },
    });
    await this.logActivity(
      quotationId,
      status === 'ACCEPTED'
        ? 'ACCEPTED'
        : status === 'REJECTED'
          ? 'REJECTED'
          : 'NEGOTIATION_REQUESTED',
      `Host ${status.toLowerCase()} the quotation`,
      'HOST',
    );

    if (status === 'ACCEPTED') {
      const policy = await this.prisma.vendorPolicy.findUnique({
        where: { vendorProfileId: quotation.lead.vendorProfileId },
      });
      const booking = await this.prisma.booking.create({
        data: {
          eventId: quotation.lead.eventId,
          vendorProfileId: quotation.lead.vendorProfileId,
          quotationId: quotation.id,
          confirmedAmount: quotation.totalAmount,
          packageId: quotation.packageId,
          policySnapshot: snapshotPolicy(policy),
        },
      });

      await this.prisma.bookingMilestone.createMany({
        data: buildMilestones(
          booking.id,
          quotation.lead.event.eventDate,
          policy?.depositPercent ?? 30,
        ),
      });

      await this.prisma.lead.update({
        where: { id: quotation.leadId },
        data: { status: 'CLOSED' },
      });
      await this.vendorAvailabilityService.blockDateInternal(
        quotation.lead.vendorProfileId,
        quotation.lead.event.eventDate,
      );
      await this.notificationsService.create(
        quotation.lead.vendorProfile.userId,
        'BOOKING_CONFIRMED',
        'Booking confirmed!',
        `Your quotation for "${quotation.lead.event.title}" was accepted`,
        { bookingId: booking.id },
      );
      return booking;
    }

    await this.notificationsService.create(
      quotation.lead.vendorProfile.userId,
      'QUOTATION_RESPONSE',
      `Your quotation was ${status.toLowerCase()}`,
      undefined,
      { quotationId },
    );

    return updated;
  }

  async getQuotation(userId: string, quotationId: string) {
    await this.assertQuotationParticipant(userId, quotationId);

    return this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        package: true,
        lead: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                eventType: true,
                eventDate: true,
                location: true,
                guestCapacity: true,
                budget: true,
                host: { select: { fullName: true, email: true, phone: true } },
              },
            },
            vendorProfile: {
              select: {
                id: true,
                businessName: true,
                category: true,
                user: { select: { fullName: true, email: true } },
              },
            },
          },
        },
      },
    });
  }

  // shared ownership-check helper for quotations, since both host and vendor touch them at different steps
  private async getQuotationWithOwnership(
    quotationId: string,
    as: 'host' | 'vendor',
    userId: string,
  ) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { lead: { include: { event: true, vendorProfile: true } } },
    });
    if (!quotation) throw new NotFoundException('Quotation not found');

    const ownerId =
      as === 'host'
        ? quotation.lead.event.hostId
        : quotation.lead.vendorProfile.userId;
    if (ownerId !== userId)
      throw new ForbiddenException('Not authorized for this quotation');

    return quotation;
  }

  async getQuotationActivityLog(userId: string, quotationId: string) {
    await this.assertQuotationParticipant(userId, quotationId);
    return this.prisma.quotationActivityLog.findMany({
      where: { quotationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getQuotationVersions(userId: string, quotationId: string) {
    // snapshots only exist for versions that were actually sent, so hosts can read them
    await this.assertQuotationParticipant(userId, quotationId, false);
    return this.prisma.quotationVersion.findMany({
      where: { quotationId },
      orderBy: { version: 'asc' },
    });
  }

  async updateDraftQuotation(
    userId: string,
    quotationId: string,
    dto: {
      packageId?: string;
      lineItems?: any[];
      taxRate?: number;
      terms?: string;
      revisionMessage?: string;
    },
  ) {
    const quotation = await this.getQuotationWithOwnership(
      quotationId,
      'vendor',
      userId,
    );
    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft quotations can be edited. Use revise for a quotation in negotiation.',
      );
    }

    if (dto.packageId) {
      const pkg = await this.prisma.vendorPackage.findUnique({
        where: { id: dto.packageId },
      });
      if (!pkg || pkg.vendorProfileId !== quotation.lead.vendorProfileId) {
        throw new BadRequestException('Invalid package for this vendor');
      }
    }

    const lineItems = dto.lineItems ?? (quotation.lineItems as any[]);
    const taxRate = dto.taxRate ?? Number(quotation.taxRate);
    const totals = this.computeTotals(lineItems, taxRate);

    return this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        packageId: dto.packageId ?? quotation.packageId,
        lineItems,
        subtotal: totals.subtotal,
        taxRate,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        terms: dto.terms ?? quotation.terms,
        revisionMessage: dto.revisionMessage ?? quotation.revisionMessage,
      },
    });
  }

  // ---- BOOKINGS (read-only for now) ----

  async findMyBookingsAsHost(userId: string) {
    return this.prisma.booking.findMany({
      where: { event: { hostId: userId } },
      include: { vendorProfile: true, event: true },
    });
  }

  async findMyBookingsAsVendor(userId: string) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) throw new NotFoundException('Vendor profile not found');

    return this.prisma.booking.findMany({
      where: { vendorProfileId: vendorProfile.id },
      include: { event: true, quotation: true },
    });
  }
}
