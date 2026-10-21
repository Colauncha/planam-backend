import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class BookingDetailsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedBooking(
    bookingId: string,
    userId: string,
    as: 'host' | 'vendor',
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { event: true, vendorProfile: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const ownerId =
      as === 'host' ? booking.event.hostId : booking.vendorProfile.userId;
    if (ownerId !== userId)
      throw new ForbiddenException('Not authorized for this booking');

    return booking;
  }

  // ---- STATUS ----

  async updateStatus(userId: string, bookingId: string, status: string) {
    await this.getOwnedBooking(bookingId, userId, 'vendor');
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: status as any },
    });
  }

  // ---- EVENT DETAILS & ADD-ONS ----

  async updateDetails(
    userId: string,
    bookingId: string,
    dto: {
      packageId?: string;
      guestCount?: number;
      venue?: string;
      serviceDurationHours?: number;
    },
  ) {
    const booking = await this.getOwnedBooking(bookingId, userId, 'vendor');

    if (dto.packageId) {
      const pkg = await this.prisma.vendorPackage.findUnique({
        where: { id: dto.packageId },
      });
      if (!pkg || pkg.vendorProfileId !== booking.vendorProfileId) {
        throw new BadRequestException('Invalid package for this vendor');
      }
    }

    return this.prisma.booking.update({ where: { id: bookingId }, data: dto });
  }

  // ---- MENU SELECTIONS ----

  async selectMenuItem(userId: string, bookingId: string, menuItemId: string) {
    const booking = await this.getOwnedBooking(bookingId, userId, 'vendor');

    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });
    if (!menuItem || menuItem.vendorProfileId !== booking.vendorProfileId) {
      throw new BadRequestException('Invalid menu item for this vendor');
    }

    return this.prisma.bookingMenuSelection.upsert({
      where: { bookingId_menuItemId: { bookingId, menuItemId } },
      update: {},
      create: { bookingId, menuItemId },
    });
  }

  async removeMenuSelection(
    userId: string,
    bookingId: string,
    menuItemId: string,
  ) {
    await this.getOwnedBooking(bookingId, userId, 'vendor');
    return this.prisma.bookingMenuSelection.deleteMany({
      where: { bookingId, menuItemId },
    });
  }

  async listMenuSelections(
    userId: string,
    bookingId: string,
    as: 'host' | 'vendor',
  ) {
    await this.getOwnedBooking(bookingId, userId, as);
    return this.prisma.bookingMenuSelection.findMany({
      where: { bookingId },
      include: { menuItem: true },
    });
  }

  // ---- ADD-ON SELECTIONS ----

  async selectAddOn(userId: string, bookingId: string, addOnId: string) {
    const booking = await this.getOwnedBooking(bookingId, userId, 'vendor');

    const addOn = await this.prisma.vendorAddOn.findUnique({
      where: { id: addOnId },
    });
    if (!addOn || addOn.vendorProfileId !== booking.vendorProfileId) {
      throw new BadRequestException('Invalid add-on for this vendor');
    }

    return this.prisma.bookingAddOnSelection.upsert({
      where: { bookingId_vendorAddOnId: { bookingId, vendorAddOnId: addOnId } },
      update: {},
      create: { bookingId, vendorAddOnId: addOnId },
    });
  }

  async removeAddOnSelection(
    userId: string,
    bookingId: string,
    addOnId: string,
  ) {
    await this.getOwnedBooking(bookingId, userId, 'vendor');
    return this.prisma.bookingAddOnSelection.deleteMany({
      where: { bookingId, vendorAddOnId: addOnId },
    });
  }

  async listAddOnSelections(
    userId: string,
    bookingId: string,
    as: 'host' | 'vendor',
  ) {
    await this.getOwnedBooking(bookingId, userId, as);
    return this.prisma.bookingAddOnSelection.findMany({
      where: { bookingId },
      include: { vendorAddOn: true },
    });
  }

  // ---- TIMELINE ----

  async addTimelineEvent(
    userId: string,
    bookingId: string,
    dto: { label: string; time: string; order: number },
  ) {
    await this.getOwnedBooking(bookingId, userId, 'vendor');
    return this.prisma.bookingTimelineEvent.create({
      data: { bookingId, ...dto },
    });
  }

  async removeTimelineEvent(
    userId: string,
    bookingId: string,
    eventId: string,
  ) {
    await this.getOwnedBooking(bookingId, userId, 'vendor');
    return this.prisma.bookingTimelineEvent.deleteMany({
      where: { id: eventId, bookingId },
    });
  }

  async listTimeline(userId: string, bookingId: string, as: 'host' | 'vendor') {
    await this.getOwnedBooking(bookingId, userId, as);
    return this.prisma.bookingTimelineEvent.findMany({
      where: { bookingId },
      orderBy: { order: 'asc' },
    });
  }

  // ---- NOTES ----

  async addNote(
    userId: string,
    bookingId: string,
    role: string,
    dto: { type: 'INTERNAL' | 'SPECIAL_REQUEST'; content: string },
  ) {
    const as = role === 'HOST' ? 'host' : 'vendor';
    await this.getOwnedBooking(bookingId, userId, as);

    if (as === 'host' && dto.type !== 'SPECIAL_REQUEST') {
      throw new ForbiddenException('Hosts can only add special requests');
    }
    if (as === 'vendor' && dto.type !== 'INTERNAL') {
      throw new ForbiddenException('Vendors can only add internal notes');
    }

    return this.prisma.bookingNote.create({
      data: {
        bookingId,
        authorUserId: userId,
        type: dto.type as any,
        content: dto.content,
      },
    });
  }

  async listNotes(
    userId: string,
    bookingId: string,
    role: string,
    type?: 'INTERNAL' | 'SPECIAL_REQUEST',
  ) {
    const as = role === 'HOST' ? 'host' : 'vendor';
    await this.getOwnedBooking(bookingId, userId, as);

    // hosts never see the vendor's internal notes, regardless of what they ask for
    const effectiveType = as === 'host' ? 'SPECIAL_REQUEST' : type;

    return this.prisma.bookingNote.findMany({
      where: {
        bookingId,
        ...(effectiveType && { type: effectiveType as any }),
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
