import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import type { CreateMessageDto } from './messages.service';
import { MessageType } from '../entities';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
// @UseGuards(JwtAuthGuard) // TODO: Enable when auth is integrated
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Post()
    @ApiOperation({ summary: 'Send a new message' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Message sent successfully' })
    async create(
        @Body() dto: CreateMessageDto,
        @Request() req: any,
    ) {
        const senderId = req.user?.id || 'test-user-id';
        return this.messagesService.createMessage(dto, senderId);
    }

    @Get('conversation/:conversationId')
    @ApiOperation({ summary: 'Get messages in conversation' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of messages' })
    async getConversationMessages(
        @Param('conversationId') conversationId: string,
        @Request() req: any,
        @Query('limit') limit?: number,
        @Query('before') before?: string,
        @Query('after') after?: string,
    ) {
        const userId = req.user?.id || 'test-user-id';
        return this.messagesService.getConversationMessages(conversationId, userId, {
            limit: limit ? parseInt(String(limit)) : 50,
            before: before ? new Date(before) : undefined,
            after: after ? new Date(after) : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get message by ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Message details' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
    async findOne(@Param('id') id: string) {
        return this.messagesService.findById(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Edit a message' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Message edited' })
    async edit(
        @Param('id') id: string,
        @Body() body: { content: string },
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id';
        return this.messagesService.editMessage(id, body.content, userId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a message' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Message deleted' })
    async delete(
        @Param('id') id: string,
        @Body() body: { forEveryone?: boolean },
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.deleteMessage(id, userId, body.forEveryone);
        return { success: true };
    }

    @Post(':id/delivered')
    @ApiOperation({ summary: 'Mark message as delivered' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Marked as delivered' })
    async markDelivered(
        @Param('id') messageId: string,
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.markAsDelivered(messageId, userId);
        return { success: true };
    }

    @Post(':id/read')
    @ApiOperation({ summary: 'Mark message as read' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Marked as read' })
    async markRead(
        @Param('id') messageId: string,
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.markAsRead(messageId, userId);
        return { success: true };
    }

    @Post('read-batch')
    @ApiOperation({ summary: 'Mark multiple messages as read' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Messages marked as read' })
    async markMultipleRead(
        @Body() body: { messageIds: string[] },
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.markMultipleAsRead(body.messageIds, userId);
        return { success: true };
    }

    @Get(':id/delivery-status')
    @ApiOperation({ summary: 'Get delivery status for message' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Delivery status' })
    async getDeliveryStatus(@Param('id') messageId: string) {
        return this.messagesService.getDeliveryStatus(messageId);
    }

    // Reactions
    @Post(':id/reactions')
    @ApiOperation({ summary: 'Add reaction to message' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Reaction added' })
    async addReaction(
        @Param('id') messageId: string,
        @Body() body: { reaction: string },
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id';
        return this.messagesService.addReaction(messageId, userId, body.reaction);
    }

    @Delete(':id/reactions/:reaction')
    @ApiOperation({ summary: 'Remove reaction from message' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Reaction removed' })
    async removeReaction(
        @Param('id') messageId: string,
        @Param('reaction') reaction: string,
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.removeReaction(messageId, userId, reaction);
        return { success: true };
    }

    @Get(':id/reactions')
    @ApiOperation({ summary: 'Get reactions for message' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of reactions' })
    async getReactions(@Param('id') messageId: string) {
        return this.messagesService.getReactions(messageId);
    }
}
