import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, HttpStatus, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import type { CreateConversationDto } from './conversations.service';
import { ConversationType } from '../entities';
import { ConversationResponseDto, ConversationMemberDto, SuccessResponseDto, AddMemberDto, UpdateMemberSettingsDto, } from './dto';
import { CREATE_CONVERSATION_EXAMPLES, ADD_MEMBER_EXAMPLES, UPDATE_MEMBER_SETTINGS_EXAMPLES } from './swagger/conversations.examples';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
// @UseGuards(JwtAuthGuard) // TODO: Enable when auth is integrated
export class ConversationsController {
    constructor(private readonly conversationsService: ConversationsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new conversation' })
    @ApiBody({ type: Object, examples: CREATE_CONVERSATION_EXAMPLES })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Conversation created successfully', type: ConversationResponseDto })
    async create(
        @Body() dto: CreateConversationDto,
        @Request() req: any,
    ): Promise<ConversationResponseDto> {
        const userId = req.user?.id || 'test-user-id'; // TODO: Get from JWT
        return this.conversationsService.createConversation(dto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'List user conversations' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of conversations', type: [ConversationResponseDto] })
    async list(
        @Request() req: any,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ): Promise<ConversationResponseDto[]> {
        const userId = req.user?.id || 'test-user-id';
        return this.conversationsService.listUserConversations(userId, {
            limit: limit ? parseInt(String(limit)) : 50,
            offset: offset ? parseInt(String(offset)) : 0,
        });
    }

    @Get(':conversationId')
    @ApiOperation({ summary: 'Get conversation by ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Conversation details', type: ConversationResponseDto })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Conversation not found' })
    async findOne(@Param('conversationId') conversationId: string): Promise<ConversationResponseDto> {
        return this.conversationsService.findById(conversationId);
    }

    @Get(':conversationId/members')
    @ApiOperation({ summary: 'Get conversation members' })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of members', type: [ConversationMemberDto] })
    async getMembers(@Param('conversationId') conversationId: string): Promise<ConversationMemberDto[]> {
        return this.conversationsService.getMembers(conversationId);
    }

    @Post(':conversationId/members')
    @ApiOperation({ summary: 'Add member to conversation' })
    @ApiBody({ type: AddMemberDto, examples: ADD_MEMBER_EXAMPLES })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'Member added', type: ConversationMemberDto })
    async addMember(
        @Param('conversationId') conversationId: string,
        @Body() body: AddMemberDto,
        @Request() req: any,
    ): Promise<ConversationMemberDto> {
        const addedBy = req.user?.id || 'test-user-id';
        return this.conversationsService.addMember(
            conversationId,
            body.userId,
            addedBy,
            body.role,
        );
    }

    @Delete(':conversationId/members/:userId')
    @ApiOperation({ summary: 'Remove member from conversation' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Member removed', type: SuccessResponseDto })
    async removeMember(
        @Param('conversationId') conversationId: string,
        @Param('userId') userId: string,
        @Request() req: any,
    ): Promise<SuccessResponseDto> {
        const removedBy = req.user?.id || 'test-user-id';
        await this.conversationsService.removeMember(conversationId, userId, removedBy);
        return { success: true };
    }

    @Patch(':conversationId/members/:userId/settings')
    @ApiOperation({ summary: 'Update member settings' })
    @ApiBody({ type: UpdateMemberSettingsDto, examples: UPDATE_MEMBER_SETTINGS_EXAMPLES })
    @ApiResponse({ status: HttpStatus.OK, description: 'Settings updated', type: ConversationMemberDto })
    async updateMemberSettings(
        @Param('conversationId') conversationId: string,
        @Param('userId') userId: string,
        @Body() settings: UpdateMemberSettingsDto,
    ): Promise<ConversationMemberDto> {
        return this.conversationsService.updateMemberSettings(conversationId, userId, settings);
    }

    @Post(':conversationId/read')
    @ApiOperation({ summary: 'Mark conversation as read' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Marked as read', type: SuccessResponseDto })
    async markAsRead(
        @Param('conversationId') conversationId: string,
        @Request() req: any,
    ): Promise<SuccessResponseDto> {
        const userId = req.user?.id || 'test-user-id';
        await this.conversationsService.markAsRead(conversationId, userId);
        return { success: true };
    }

    @Get('direct/:otherUserId')
    @ApiOperation({ summary: 'Find or create direct conversation' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Direct conversation', type: ConversationResponseDto })
    async findOrCreateDirect(
        @Param('otherUserId') otherUserId: string,
        @Request() req: any,
    ): Promise<ConversationResponseDto> {
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
