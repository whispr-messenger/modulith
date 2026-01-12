import { Controller, Get, Post, Body, Patch, Param, ParseUUIDPipe, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from '../services/profile.service';
import { CompleteProfileDto, UpdateProfileDto } from '../dto';
import { User } from '../../common/entities/user.entity';

/**
 * ProfileController - Manages user profile-related endpoints
 * 
 * Handles social profile information:
 * - Complete profile after registration
 * - Update profile information (username, names, bio, avatar)
 * - Retrieve profile data
 */
@ApiTags('User - Profiles')
@ApiBearerAuth()
@Controller('users/:userId/profile')
export class ProfileController {

  constructor(private readonly profileService: ProfileService) { }

  @Post()
  @ApiOperation({
    summary: 'Complete user profile',
    description:
      'Complete the user profile with social information (username, name, etc.). ' +
      'User must already exist (created via registration). This endpoint should be called once after registration.',
  })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Profile completed successfully', type: User })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Username already exists' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Profile already completed or invalid input data' })
  async completeProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() completeProfileDto: CompleteProfileDto
  ): Promise<User> {
    return this.profileService.completeProfile(userId, completeProfileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user profile by ID' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile retrieved successfully', type: User })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  async getProfile(@Param('userId', ParseUUIDPipe) userId: string): Promise<User> {
    return this.profileService.getProfile(userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile updated successfully', type: User })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Username already exists' })
  async updateProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() updateProfileDto: UpdateProfileDto
  ): Promise<User> {
    return this.profileService.updateProfile(userId, updateProfileDto);
  }
}
