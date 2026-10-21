import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@planam/shared';

const QUOTE_STATUSES = [
  'DRAFT',
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'NEGOTIATION',
  'EXPIRED',
];
const INVOICE_STATUSES = ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'];

@Injectable()
export class VendorLogsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildDateFilter(from?: string, to?: string) {
    if (!from && !to) return null;
    const filter: any = {};
    if (from) filter.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setUTCHours(23, 59, 59, 999); // include the whole "to" day
      filter.lte = end;
    }
    return filter;
  }

  private quoteStatusCondition(status: string, now: Date) {
    if (status === 'EXPIRED') {
      return {
        OR: [
          { status: 'EXPIRED' },
          { status: 'PENDING', expiresAt: { lt: now } },
        ],
      };
    }
    if (status === 'PENDING') {
      return {
        status: 'PENDING',
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      };
    }
    return { status };
  }

  private invoiceStatusCondition(status: string, now: Date) {
    if (status === 'OVERDUE') {
      return {
        OR: [
          { status: 'OVERDUE' },
          { status: 'PENDING', dueDate: { lt: now } },
        ],
      };
    }
    if (status === 'PENDING') {
      return {
        status: 'PENDING',
        OR: [{ dueDate: null }, { dueDate: { gte: now } }],
      };
    }
    return { status };
  }

  async getLogs(
    userId: string,
    query: {
      type?: string;
      status?: string;
      from?: string;
      to?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const vendorProfile = await this.prisma.vendorProfile.findUnique({
      where: { userId },
    });
    if (!vendorProfile) throw new NotFoundException('Vendor profile not found');

    // query params arrive as strings, so convert explicitly
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 12);
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const includeQuotes =
      (!query.type || query.type === 'QUOTE') &&
      (!query.status || QUOTE_STATUSES.includes(query.status));
    const includeInvoices =
      (!query.type || query.type === 'INVOICE') &&
      (!query.status || INVOICE_STATUSES.includes(query.status));

    const dateFilter = this.buildDateFilter(query.from, query.to);

    const eventSearch = query.search
      ? {
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
        }
      : {};

    const quoteAnd: any[] = [
      { lead: { vendorProfileId: vendorProfile.id, ...eventSearch } },
    ];
    if (dateFilter) quoteAnd.push({ createdAt: dateFilter });
    if (query.status)
      quoteAnd.push(this.quoteStatusCondition(query.status, now));
    const quoteWhere: any = { AND: quoteAnd };

    const invoiceAnd: any[] = [
      { booking: { vendorProfileId: vendorProfile.id, ...eventSearch } },
    ];
    if (dateFilter) invoiceAnd.push({ createdAt: dateFilter });
    if (query.status)
      invoiceAnd.push(this.invoiceStatusCondition(query.status, now));
    const invoiceWhere: any = { AND: invoiceAnd };

    const hostInclude = {
      event: { include: { host: { select: { fullName: true } } } },
    };

    const [quotes, quoteTotal, invoices, invoiceTotal] = await Promise.all([
      includeQuotes
        ? this.prisma.quotation.findMany({
            where: quoteWhere,
            orderBy: { createdAt: 'desc' },
            take: skip + pageSize,
            include: { lead: { include: hostInclude } },
          })
        : [],
      includeQuotes ? this.prisma.quotation.count({ where: quoteWhere }) : 0,
      includeInvoices
        ? this.prisma.invoice.findMany({
            where: invoiceWhere,
            orderBy: { createdAt: 'desc' },
            take: skip + pageSize,
            include: { booking: { include: hostInclude } },
          })
        : [],
      includeInvoices ? this.prisma.invoice.count({ where: invoiceWhere }) : 0,
    ]);

    const quoteItems = quotes.map((q) => ({
      id: q.id,
      type: 'QUOTE' as const,
      reference: `Quote v${q.version}`,
      clientName: q.lead.event.host.fullName,
      eventTitle: q.lead.event.title,
      eventType: q.lead.event.eventType,
      amount: Number(q.totalAmount),
      status:
        q.status === 'PENDING' && q.expiresAt && q.expiresAt < now
          ? 'EXPIRED'
          : q.status,
      date: q.createdAt,
    }));

    const invoiceItems = invoices.map((i) => ({
      id: i.id,
      type: 'INVOICE' as const,
      reference: i.invoiceNumber,
      clientName: i.booking.event.host.fullName,
      eventTitle: i.booking.event.title,
      eventType: i.booking.event.eventType,
      amount: Number(i.amount),
      status:
        i.status === 'PENDING' && i.dueDate && i.dueDate < now
          ? 'OVERDUE'
          : i.status,
      date: i.createdAt,
    }));

    const data = [...quoteItems, ...invoiceItems]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(skip, skip + pageSize);

    const total = quoteTotal + invoiceTotal;

    return {
      data,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
