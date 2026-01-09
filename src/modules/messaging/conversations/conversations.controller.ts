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
import { ConversationsService } from './conversations.service';
import type { CreateConversationDto } from './conversations.service';
import { ConversationType } from '../entities';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
// @UseGuards(JwtAuthGuard) // TODO: Enable when auth is integrated
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new conversation' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Conversation created successfully' })
    async create(
        @Body() dto: CreateConversationDto,
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id'; // TODO: Get from JWT
        return this.conversationsService.createConversation(dto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'List user conversations' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of conversations' })
    async list(
        @Request() req: any,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        const userId = req.user?.id || 'test-user-id';
        return this.conversationsService.listUserConversations(userId, {
            limit: limit ? parseInt(String(limit)) : 50,
            offset: offset ? parseInt(String(offset)) : 0,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get conversation by ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Conversation details' })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
    async findOne(@Param('id') id: string) {
        return this.conversationsService.findById(id);
    }

    @Get(':id/members')
    @ApiOperation({ summary: 'Get conversation members' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of members' })
    async getMembers(@Param('id') id: string) {
        return this.conversationsService.getMembers(id);
    }

    @Post(':id/members')
    @ApiOperation({ summary: 'Add member to conversation' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Member added' })
    async addMember(
        @Param('id') conversationId: string,
        @Body() body: { userId: string; role?: 'admin' | 'member' },
        @Request() req: any,
    ) {
        const addedBy = req.user?.id || 'test-user-id';
        return this.conversationsService.addMember(
            conversationId,
            body.userId,
            addedBy,
            body.role,
        );
    }

    @Delete(':id/members/:userId')
    @ApiOperation({ summary: 'Remove member from conversation' })
    @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Member removed' })
    async removeMember(
        @Param('id') conversationId: string,
        @Param('userId') userId: string,
        @Request() req: any,
    ) {
        const removedBy = req.user?.id || 'test-user-id';
        await this.conversationsService.removeMember(conversationId, userId, removedBy);
        return { success: true };
    }

    @Patch(':id/members/:userId/settings')
    @ApiOperation({ summary: 'Update member settings' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Settings updated' })
    async updateMemberSettings(
        @Param('id') conversationId: string,
        @Param('userId') userId: string,
        @Body() settings: { muted?: boolean; notifications?: boolean },
    ) {
        return this.conversationsService.updateMemberSettings(conversationId, userId, settings);
    }

    @Post(':id/read')
    @ApiOperation({ summary: 'Mark conversation as read' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Marked as read' })
    async markAsRead(
        @Param('id') conversationId: string,
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id';
        await this.conversationsService.markAsRead(conversationId, userId);
        return { success: true };
    }

    @Get('direct/:otherUserId')
    @ApiOperation({ summary: 'Find or create direct conversation' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Direct conversation' })
    async findOrCreateDirect(
        @Param('otherUserId') otherUserId: string,
        @Request() req: any,
    ) {
        const userId = req.user?.id || 'test-user-id';

        // Try to find existing
        const existing = await this.conversationsService.findDirectConversation(userId, otherUserId);
        if (existing) {
            return existing;
        }

        // Create new
        return this.conversationsService.createConversation(
            {
                type: ConversationType.DIRECT,
                memberIds: [userId, otherUserId],
            },
            userId,
        );
    }
}
