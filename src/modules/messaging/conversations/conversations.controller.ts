import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Request, HttpStatus, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import type { CreateConversationDto } from './conversations.service';
import { ConversationType } from '../entities';
import { ConversationResponseDto, ConversationMemberDto, SuccessResponseDto, AddMemberDto, UpdateMemberSettingsDto, } from './dto';
import { CREATE_CONVERSATION_EXAMPLES, ADD_MEMBER_EXAMPLES, UPDATE_MEMBER_SETTINGS_EXAMPLES, PIN_CONVERSATION_EXAMPLES, UNPIN_CONVERSATION_EXAMPLES } from './swagger/conversations.examples';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversation')
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
    @ApiOperation({
        summary: 'List user conversations',
        description: 'Retrieve all conversations for the authenticated user. Pinned conversations appear first. Archived conversations are excluded by default.',
    })
    @ApiResponse({ status: HttpStatus.OK, description: 'List of conversations', type: [ConversationResponseDto] })
    async list(
        @Request() req: any,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
        @Query('include_archived') includeArchived?: boolean,
    ): Promise<ConversationResponseDto[]> {
        const userId = req.user?.id || 'test-user-id';
        return this.conversationsService.listUserConversations(userId, {
            limit: limit ? parseInt(String(limit)) : 50,
            offset: offset ? parseInt(String(offset)) : 0,
            includeArchived: includeArchived === true || includeArchived === 'true' as any,
        });
    }

    @Get('pinned')
    @ApiOperation({
        summary: 'Get pinned conversations',
        description: 'Retrieve all conversations that have been pinned by the user. Returns a maximum of 5 conversations.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of pinned conversations',
        type: [ConversationResponseDto],
    })
    async getPinnedConversations(@Request() req: any): Promise<ConversationResponseDto[]> {
        const userId = req.user?.id || 'test-user-id';
        return this.conversationsService.getPinnedConversations(userId);
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

    @Post(':conversationId/pin')
    @ApiOperation({
        summary: 'Pin a conversation',
        description: 'Pin a conversation to keep it at the top of the conversation list. Maximum 5 conversations can be pinned at once. Pinning a conversation will automatically unarchive it if it was archived.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversation pinned successfully',
        type: ConversationMemberDto,
        examples: PIN_CONVERSATION_EXAMPLES,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Pin limit reached (maximum 5 conversations)',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Conversation not found or user is not a member',
    })
    async pinConversation(
        @Param('conversationId') conversationId: string,
        @Request() req: any,
    ): Promise<ConversationMemberDto> {
        const userId = req.user?.id || 'test-user-id';
        return this.conversationsService.pinConversation(conversationId, userId);
    }

    @Delete(':conversationId/pin')
    @ApiOperation({
        summary: 'Unpin a conversation',
        description: 'Remove a conversation from the pinned list. The conversation will return to its normal position in the conversation list.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversation unpinned successfully',
        type: ConversationMemberDto,
        examples: UNPIN_CONVERSATION_EXAMPLES,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Conversation not found or user is not a member',
    })
    async unpinConversation(
        @Param('conversationId') conversationId: string,
        @Request() req: any,
    ): Promise<ConversationMemberDto> {
        const userId = req.user?.id || 'test-user-id';
        return this.conversationsService.unpinConversation(conversationId, userId);
    }

    @Post(':conversationId/archive')
    @ApiOperation({
        summary: 'Archive a conversation',
        description: 'Archive a conversation to remove it from the main conversation list. Archiving automatically unpins the conversation. Archived conversations can be accessed via the archived endpoint.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversation archived successfully',
        type: ConversationMemberDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Conversation not found or user is not a member',
    })
    async archiveConversation(
        @Param('conversationId') conversationId: string,
        @Request() req: any,
    ): Promise<ConversationMemberDto> {
        const userId = req.user?.id || 'test-user-id';
        return this.conversationsService.archiveConversation(conversationId, userId);
    }

    @Delete(':conversationId/archive')
    @ApiOperation({
        summary: 'Unarchive a conversation',
        description: 'Unarchive a conversation to restore it to the main conversation list.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversation unarchived successfully',
        type: ConversationMemberDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Conversation not found or user is not a member',
    })
    async unarchiveConversation(
        @Param('conversationId') conversationId: string,
        @Request() req: any,
    ): Promise<ConversationMemberDto> {
        const userId = req.user?.id || 'test-user-id';
        return this.conversationsService.unarchiveConversation(conversationId, userId);
    }

    @Get('archived')
    @ApiOperation({
        summary: 'Get archived conversations',
        description: 'Retrieve all conversations that have been archived by the user.',
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of archived conversations',
        type: [ConversationResponseDto],
    })
    async getArchivedConversations(
        @Request() req: any,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ): Promise<ConversationResponseDto[]> {
        const userId = req.user?.id || 'test-user-id';
        return this.conversationsService.getArchivedConversations(userId, {
            limit: limit ? parseInt(String(limit)) : 50,
            offset: offset ? parseInt(String(offset)) : 0,
        });
    }
}
