import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@planam/shared';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  private extractUrls(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.match(urlRegex) ?? [];
  }

  async assertMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member || member.isDeleted)
      throw new ForbiddenException('Not a member of this conversation');
    return member;
  }

  async getOrCreateDirectConversation(userId: string, recipientUserId: string) {
    if (userId === recipientUserId)
      throw new BadRequestException(
        'Cannot start a conversation with yourself',
      );

    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientUserId },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: recipientUserId } } },
        ],
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        members: { create: [{ userId }, { userId: recipientUserId }] },
      },
    });
  }

  async listMyConversations(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId, isDeleted: false },
      include: {
        conversation: {
          include: {
            members: {
              include: { user: { select: { id: true, fullName: true } } },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return memberships.map((m) => {
      const lastMessage = m.conversation.messages[0] ?? null;
      const isUnread =
        m.markedUnread ||
        (lastMessage &&
          (!m.lastReadAt || lastMessage.createdAt > m.lastReadAt));

      return {
        conversationId: m.conversationId,
        type: m.conversation.type,
        name: m.conversation.name,
        isPinned: m.isPinned,
        isMuted: m.isMuted,
        isUnread: Boolean(isUnread),
        otherMembers: m.conversation.members
          .filter((om) => om.userId !== userId)
          .map((om) => ({
            userId: om.userId,
            fullName: om.user.fullName,
            displayRole: om.displayRole,
          })),
        lastMessage,
      };
    });
  }

  async getHistory(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit = 30,
  ) {
    await this.assertMember(conversationId, userId);

    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, fullName: true } },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });
  }

  async createMessage(
    conversationId: string,
    senderId: string,
    content?: string,
  ) {
    await this.assertMember(conversationId, senderId);
    if (!content) throw new BadRequestException('Message content is required');

    const message = await this.prisma.message.create({
      data: { conversationId, senderId, content },
      include: {
        sender: { select: { id: true, fullName: true } },
        attachments: true,
      },
    });

    const urls = this.extractUrls(content);
    if (urls.length > 0) {
      await this.prisma.messageAttachment.createMany({
        data: urls.map((url) => ({
          messageId: message.id,
          type: 'LINK' as const,
          url,
        })),
      });
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return this.prisma.message.findUnique({
      where: { id: message.id },
      include: {
        sender: { select: { id: true, fullName: true } },
        attachments: true,
      },
    });
  }

  async createFileMessage(
    conversationId: string,
    senderId: string,
    file: { url: string; fileName: string; fileSize: number; mimeType: string },
    type: 'IMAGE' | 'DOCUMENT',
  ) {
    await this.assertMember(conversationId, senderId);

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        attachments: {
          create: {
            type,
            url: file.url,
            fileName: file.fileName,
            fileSize: file.fileSize,
            mimeType: file.mimeType,
          },
        },
      },
      include: {
        sender: { select: { id: true, fullName: true } },
        attachments: true,
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return message;
  }

  async listAttachments(
    conversationId: string,
    userId: string,
    type: 'IMAGE' | 'DOCUMENT' | 'LINK',
  ) {
    await this.assertMember(conversationId, userId);

    return this.prisma.messageAttachment.findMany({
      where: { type, message: { conversationId } },
      orderBy: { createdAt: 'desc' },
      include: { message: { select: { senderId: true, createdAt: true } } },
    });
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);
    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date(), markedUnread: false },
    });
  }

  async getConversationMemberIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId, isDeleted: false },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async createGroupConversation(
    creatorId: string,
    dto: {
      name: string;
      eventId?: string;
      members: {
        userId: string;
        displayRole?: string;
        isFacilitator?: boolean;
      }[];
    },
  ) {
    const allUserIds = new Set([
      creatorId,
      ...dto.members.map((m) => m.userId),
    ]);
    const memberInputs = Array.from(allUserIds).map((userId) => {
      const found = dto.members.find((m) => m.userId === userId);
      return {
        userId,
        displayRole: found?.displayRole,
        isFacilitator: found?.isFacilitator ?? false,
      };
    });

    return this.prisma.conversation.create({
      data: {
        type: 'GROUP',
        name: dto.name,
        eventId: dto.eventId,
        members: { create: memberInputs },
      },
      include: {
        members: {
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });
  }

  async addGroupMember(
    conversationId: string,
    requesterId: string,
    dto: { userId: string; displayRole?: string; isFacilitator?: boolean },
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.type !== 'GROUP')
      throw new BadRequestException(
        'Only group conversations have members added this way',
      );

    await this.assertMember(conversationId, requesterId);

    return this.prisma.conversationMember.upsert({
      where: { conversationId_userId: { conversationId, userId: dto.userId } },
      update: {
        isDeleted: false,
        displayRole: dto.displayRole,
        isFacilitator: dto.isFacilitator ?? false,
      },
      create: {
        conversationId,
        userId: dto.userId,
        displayRole: dto.displayRole,
        isFacilitator: dto.isFacilitator ?? false,
      },
    });
  }

  async getGroupInfo(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { isDeleted: false },
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async exitGroup(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.type !== 'GROUP')
      throw new BadRequestException('Only group conversations can be exited');

    await this.assertMember(conversationId, userId);

    return this.prisma.conversationMember.delete({
      where: { conversationId_userId: { conversationId, userId } },
    });
  }

  async updateMemberSettings(
    conversationId: string,
    userId: string,
    dto: { isPinned?: boolean; isMuted?: boolean; markedUnread?: boolean },
  ) {
    await this.assertMember(conversationId, userId);

    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: dto,
    });
  }

  async deleteConversationForMe(conversationId: string, userId: string) {
    await this.assertMember(conversationId, userId);

    return this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { isDeleted: true },
    });
  }

  async reportConversation(
    conversationId: string,
    reporterId: string,
    reason: string,
  ) {
    await this.assertMember(conversationId, reporterId);

    return this.prisma.conversationReport.create({
      data: { conversationId, reporterId, reason },
    });
  }

  async initiateCall(conversationId: string, initiatorId: string) {
    await this.assertMember(conversationId, initiatorId);
    const memberIds = await this.getConversationMemberIds(conversationId);

    return this.prisma.call.create({
      data: {
        conversationId,
        initiatorId,
        participants: {
          create: memberIds.map((userId) => ({
            userId,
            status: userId === initiatorId ? 'JOINED' : 'RINGING',
            joinedAt: userId === initiatorId ? new Date() : undefined,
          })),
        },
      },
      include: { participants: true },
    });
  }

  async respondToCall(callId: string, userId: string, accept: boolean) {
    const participant = await this.prisma.callParticipant.findUnique({
      where: { callId_userId: { callId, userId } },
    });
    if (!participant)
      throw new NotFoundException('You are not a participant in this call');

    const updated = await this.prisma.callParticipant.update({
      where: { callId_userId: { callId, userId } },
      data: accept
        ? { status: 'JOINED', joinedAt: new Date() }
        : { status: 'DECLINED' },
    });

    if (accept) {
      await this.prisma.call.update({
        where: { id: callId },
        data: { status: 'ACTIVE' },
      });
    }

    return updated;
  }

  async leaveCall(callId: string, userId: string) {
    await this.prisma.callParticipant.update({
      where: { callId_userId: { callId, userId } },
      data: { status: 'LEFT', leftAt: new Date() },
    });

    const remaining = await this.prisma.callParticipant.count({
      where: { callId, status: { in: ['JOINED', 'RINGING'] } },
    });

    if (remaining <= 1) {
      await this.prisma.call.update({
        where: { id: callId },
        data: { status: 'ENDED', endedAt: new Date() },
      });
    }

    return { left: true };
  }

  async getCall(callId: string) {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: { participants: { include: {} } },
    });
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }
}
