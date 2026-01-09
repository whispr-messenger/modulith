import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import type { CreateMessageDto } from './messages.service';
import { MessageType } from '../entities';
import {
    MessageResponseDto,
    MessageReactionDto,
    DeliveryStatusDto,
    SuccessResponseDto,
} from './dto';

@ApiTags('Messages')
@ApiBearerAuth()
@Controller('messages')
// @UseGuards(JwtAuthGuard) // TODO: Enable when auth is integrated
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Post()
    @ApiOperation({ summary: 'Send a new message' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Message sent successfully', type: MessageResponseDto })
    async create(@Body() dto: CreateMessageDto, @Request() req: any,): Promise<MessageResponseDto> {
        const senderId = req.user?.id || 'test-user-id';
        return this.messagesService.createMessage(dto, senderId);
    }

    @Get('conversation/:conversationId')
    @ApiOperation({ summary: 'Get messages in conversation' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of messages', type: [MessageResponseDto] })
    async getConversationMessages(
        @Param('conversationId') conversationId: string,
        @Request() req: any,
        @Query('limit') limit?: number,
        @Query('before') before?: string,
        @Query('after') after?: string,
    ): Promise<MessageResponseDto[]> {
        const userId = req.user?.id || 'test-user-id';
        return this.messagesService.getConversationMessages(conversationId, userId, {
            limit: limit ? parseInt(String(limit)) : 50,
            before: before ? new Date(before) : undefined,
            after: after ? new Date(after) : undefined,
        });
    }

    @Get(':messageId')
    @ApiOperation({ summary: 'Get message by ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Message details', type: MessageResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
    async findOne(@Param('messageId') messageId: string): Promise<MessageResponseDto> {
        return this.messagesService.findById(messageId);
    }

    @Patch(':messageId')
    @ApiOperation({ summary: 'Edit a message' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Message edited', type: MessageResponseDto })
    async edit(@Param('messageId') messageId: string, @Body() body: { content: string }, @Request() req: any): Promise<MessageResponseDto> {
        const userId = req.user?.id || 'test-user-id';
        return this.messagesService.editMessage(messageId, body.content, userId);
    }

    @Delete(':messageId')
    @ApiOperation({ summary: 'Delete a message' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Message deleted', type: SuccessResponseDto })
    async delete(@Param('messageId') messageId: string, @Body() body: { forEveryone?: boolean }, @Request() req: any): Promise<SuccessResponseDto> {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.deleteMessage(messageId, userId, body.forEveryone);
        return { success: true };
    }

    @Post(':messageId/delivered')
    @ApiOperation({ summary: 'Mark message as delivered' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Marked as delivered', type: SuccessResponseDto })
    async markDelivered(@Param('messageId') messageId: string, @Request() req: any): Promise<SuccessResponseDto> {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.markAsDelivered(messageId, userId);
        return { success: true };
    }

    @Post(':messageId/read')
    @ApiOperation({ summary: 'Mark message as read' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Marked as read', type: SuccessResponseDto })
    async markRead(@Param('messageId') messageId: string, @Request() req: any): Promise<SuccessResponseDto> {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.markAsRead(messageId, userId);
        return { success: true };
    }

    @Post('read-batch')
    @ApiOperation({ summary: 'Mark multiple messages as read' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Messages marked as read', type: SuccessResponseDto })
    async markMultipleRead(@Body() body: { messageIds: string[] }, @Request() req: any): Promise<SuccessResponseDto> {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.markMultipleAsRead(body.messageIds, userId);
        return { success: true };
    }

    @Get(':messageId/delivery-status')
    @ApiOperation({ summary: 'Get delivery status for message' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Delivery status', type: [DeliveryStatusDto] })
    async getDeliveryStatus(@Param('messageId') messageId: string): Promise<DeliveryStatusDto[]> {
        return this.messagesService.getDeliveryStatus(messageId);
    }

    // Reactions
    @Post(':messageId/reactions')
    @ApiOperation({ summary: 'Add reaction to message' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Reaction added', type: MessageReactionDto })
    async addReaction(
        @Param('messageId') messageId: string,
        @Body() body: { reaction: string },
        @Request() req: any,
    ): Promise<MessageReactionDto> {
        const userId = req.user?.id || 'test-user-id';
        return this.messagesService.addReaction(messageId, userId, body.reaction);
    }

    @Delete(':messageId/reactions/:reaction')
    @ApiOperation({ summary: 'Remove reaction from message' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Reaction removed', type: SuccessResponseDto })
    async removeReaction(
        @Param('messageId') messageId: string,
        @Param('reaction') reaction: string,
        @Request() req: any,
    ): Promise<SuccessResponseDto> {
        const userId = req.user?.id || 'test-user-id';
        await this.messagesService.removeReaction(messageId, userId, reaction);
        return { success: true };
    }

    @Get(':messageId/reactions')
    @ApiOperation({ summary: 'Get reactions for message' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of reactions', type: [MessageReactionDto] })
    async getReactions(@Param('messageId') messageId: string): Promise<MessageReactionDto[]> {
        return this.messagesService.getReactions(messageId);
    }
}
