export const SEARCH_BY_PHONE_EXAMPLES = {
    example1: {
        summary: 'Search with viewer context',
        description: 'Search by phone number with viewer ID for privacy checks',
        value: {
            phoneNumber: '+33612345678',
            viewerId: '550e8400-e29b-41d4-a716-446655440000',
            includeInactive: false,
        },
    },
    example2: {
        summary: 'Simple phone search',
        description: 'Basic phone number search without viewer context',
        value: {
            phoneNumber: '+14155552671',
        },
    },
    example3: {
        summary: 'Search including inactive users',
        description: 'Search with inactive users included in results',
        value: {
            phoneNumber: '+442071234567',
            includeInactive: true,
        },
    },
};

export const SEARCH_BY_USERNAME_EXAMPLES = {
    example1: {
        summary: 'Search with viewer context',
        description: 'Search by username with viewer ID for privacy checks',
        value: {
            username: 'john_doe',
            viewerId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
            includeInactive: false,
        },
    },
    example2: {
        summary: 'Simple username search',
        description: 'Basic username search without viewer context',
        value: {
            username: 'alice_smith',
        },
    },
    example3: {
        summary: 'Search including inactive users',
        description: 'Username search with inactive users included',
        value: {
            username: 'bob_inactive',
            includeInactive: true,
        },
    },
};

export const USER_SEARCH_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
        phoneNumber: { type: 'string', nullable: true, example: '+33612345678' },
        username: { type: 'string', example: 'john_doe' },
        firstName: { type: 'string', example: 'John' },
        lastName: { type: 'string', example: 'Doe' },
        profilePictureUrl: { type: 'string', nullable: true, example: 'https://example.com/profile.jpg' },
        isActive: { type: 'boolean', example: true },
        canViewProfile: { type: 'boolean', example: true },
        canViewPhoneNumber: { type: 'boolean', example: false },
        canViewFirstName: { type: 'boolean', example: true },
        canViewLastName: { type: 'boolean', example: true },
    },
};

export const REBUILD_INDEXES_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        message: { type: 'string', example: 'Search indexes rebuilt successfully' },
    },
};
