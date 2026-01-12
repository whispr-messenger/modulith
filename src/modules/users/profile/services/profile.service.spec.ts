import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { User } from '../../entities';
import { CompleteProfileDto, UpdateProfileDto } from '../dto';
import { UserSearchIndexService } from '../../search/services/user-search-index.service';
import { UserRepository } from '../../common/repositories';

describe('ProfileService', () => {
  let service: ProfileService;
  let userRepository: jest.Mocked<UserRepository>;
  let userSearchIndexService: jest.Mocked<UserSearchIndexService>;

  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phoneNumber: '+1234567890',
    username: null,
    firstName: null,
    lastName: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: UserRepository,
          useValue: {
            findById: jest.fn(),
            findByUsername: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: UserSearchIndexService,
          useValue: {
            updateSearchIndex: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    userRepository = module.get(UserRepository);
    userSearchIndexService = module.get(UserSearchIndexService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('completeProfile', () => {
    const completeProfileDto: CompleteProfileDto = {
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should complete profile successfully', async () => {
      userRepository.findById.mockResolvedValue(mockUser as User);
      userRepository.findByUsername.mockResolvedValue(null);
      userRepository.save.mockResolvedValue({ ...mockUser, ...completeProfileDto } as User);

      const result = await service.completeProfile(mockUser.id!, completeProfileDto);

      expect(result.username).toBe(completeProfileDto.username);
      expect(userSearchIndexService.updateSearchIndex).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.completeProfile('nonexistent', completeProfileDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if profile already completed', async () => {
      userRepository.findById.mockResolvedValue({ ...mockUser, username: 'existing' } as User);

      await expect(
        service.completeProfile(mockUser.id!, completeProfileDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if username already exists', async () => {
      userRepository.findById.mockResolvedValue(mockUser as User);
      userRepository.findByUsername.mockResolvedValue({ id: 'other-id' } as User);

      await expect(
        service.completeProfile(mockUser.id!, completeProfileDto)
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateProfile', () => {
    const updateProfileDto: UpdateProfileDto = {
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update profile successfully', async () => {
      const userWithProfile = { ...mockUser, username: 'testuser', firstName: 'Test' };
      userRepository.findById.mockResolvedValue(userWithProfile as User);
      userRepository.save.mockResolvedValue({ ...userWithProfile, ...updateProfileDto } as User);

      const result = await service.updateProfile(mockUser.id!, updateProfileDto);

      expect(result.firstName).toBe(updateProfileDto.firstName);
      expect(userSearchIndexService.updateSearchIndex).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateProfile('nonexistent', updateProfileDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if username already exists', async () => {
      const updateWithUsername = { ...updateProfileDto, username: 'existinguser' };
      const userWithProfile = { ...mockUser, username: 'testuser' };
      
      userRepository.findById.mockResolvedValue(userWithProfile as User);
      userRepository.findByUsername.mockResolvedValue({ id: 'other-id' } as User);

      await expect(
        service.updateProfile(mockUser.id!, updateWithUsername)
      ).rejects.toThrow(ConflictException);
    });
  });
});
