import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  Delete,
  Patch,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { CreateGroupConversationDto } from './dto/create-group-conversation.dto';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import { UpdateConversationMemberDto } from './dto/update-conversation-member.dto';
import { ReportConversationDto } from './dto/report-conversation.dto';
import { SendFileMessageDto } from './dto/send-file-message.dto';
import { MessagingService } from './messaging.service';
import { StartDirectConversationDto } from './dto/start-direct-conversation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessagingGateway } from './messaging.gateway';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly config: ConfigService,
    private readonly messagingGateway: MessagingGateway,
  ) {}

  @Post('direct')
  startDirect(@Request() req, @Body() dto: StartDirectConversationDto) {
    return this.messagingService.getOrCreateDirectConversation(
      req.user.userId,
      dto.recipientUserId,
    );
  }

  @Get()
  list(@Request() req) {
    return this.messagingService.listMyConversations(req.user.userId);
  }

  @Get(':id/messages')
  history(
    @Request() req,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.messagingService.getHistory(id, req.user.userId, cursor);
  }

  @Post('group')
  createGroup(@Request() req, @Body() dto: CreateGroupConversationDto) {
    return this.messagingService.createGroupConversation(req.user.userId, dto);
  }

  @Get(':id/info')
  groupInfo(@Request() req, @Param('id') id: string) {
    return this.messagingService.getGroupInfo(id, req.user.userId);
  }

  @Post(':id/members')
  addMember(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: AddGroupMemberDto,
  ) {
    return this.messagingService.addGroupMember(id, req.user.userId, dto);
  }

  @Post(':id/exit')
  exitGroup(@Request() req, @Param('id') id: string) {
    return this.messagingService.exitGroup(id, req.user.userId);
  }

  @Patch(':id/settings')
  updateSettings(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateConversationMemberDto,
  ) {
    return this.messagingService.updateMemberSettings(id, req.user.userId, dto);
  }

  @Delete(':id')
  deleteForMe(@Request() req, @Param('id') id: string) {
    return this.messagingService.deleteConversationForMe(id, req.user.userId);
  }

  @Post(':id/report')
  report(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: ReportConversationDto,
  ) {
    return this.messagingService.reportConversation(
      id,
      req.user.userId,
      dto.reason,
    );
  }

  @Get(':id/attachments')
  attachments(
    @Request() req,
    @Param('id') id: string,
    @Query('type') type: 'IMAGE' | 'DOCUMENT' | 'LINK',
  ) {
    return this.messagingService.listAttachments(id, req.user.userId, type);
  }

  @Post('files')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async sendFile(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SendFileMessageDto,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      throw new BadRequestException(
        'Media uploads are not configured yet — Cloudinary credentials are missing',
      );
    }
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    const uploadResult = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `planam/conversations/${dto.conversationId}`,
            resource_type: dto.type === 'IMAGE' ? 'image' : 'raw',
          },
          (error, result) => {
            if (error || !result) return reject(error);
            resolve(result as any);
          },
        );
        stream.end(file.buffer);
      },
    );

    const message = await this.messagingService.createFileMessage(
      dto.conversationId,
      req.user.userId,
      {
        url: uploadResult.secure_url,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      dto.type,
    );

    this.messagingGateway.server
      .to(`conversation:${dto.conversationId}`)
      .emit('message:new', message);
    return message;
  }
}
