export const CREATE_CONVERSATION_EXAMPLES = {
    example1: {
        summary: 'Create a direct conversation',
        value: {
            type: 'direct',
            memberIds: [
                '550e8400-e29b-41d4-a716-446655440000',
                '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
            ]
        }
    },
    example2: {
        summary: 'Create a group conversation',
        value: {
            type: 'group',
            memberIds: [
                '550e8400-e29b-41d4-a716-446655440000',
                '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
                '7c9e6679-7425-40de-944b-e07fc1f90ae7'
            ],
            metadata: {
                name: 'Project Team',
                description: 'Discussion group for project collaboration',
                avatar: 'https://example.com/avatars/group1.jpg'
            }
        }
    },
    example3: {
        summary: 'Create a group linked to external system',
        value: {
            type: 'group',
            memberIds: [
                '550e8400-e29b-41d4-a716-446655440000',
                '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
                '7c9e6679-7425-40de-944b-e07fc1f90ae7',
                '8d0e5679-8536-41ef-a55c-f2g1d2f091bf8'
            ],
            externalGroupId: '9e1f6789-9647-52fg-b66d-g3h2e3g102cg9',
            metadata: {
                name: 'Sales Team Q1 2026',
                description: 'Quarterly sales objectives and strategy',
                avatar: 'https://example.com/avatars/sales-team.jpg',
                department: 'Sales',
                region: 'EMEA'
            }
        }
    }
};

export const ADD_MEMBER_EXAMPLES = {
    example1: {
        summary: 'Add a regular member',
        value: {
            userId: '9e1f6789-9647-52fg-b66d-g3h2e3g102cg9'
        }
    },
    example2: {
        summary: 'Add a member as admin',
        value: {
            userId: '9e1f6789-9647-52fg-b66d-g3h2e3g102cg9',
            role: 'admin'
        }
    },
    example3: {
        summary: 'Add multiple members (use separate calls)',
        value: {
            userId: 'af2g7890-a758-63gh-c77e-h4i3f4h213dha',
            role: 'member'
        }
    }
};

export const UPDATE_MEMBER_SETTINGS_EXAMPLES = {
    example1: {
        summary: 'Mute conversation notifications',
        value: {
            muted: true
        }
    },
    example2: {
        summary: 'Enable notifications',
        value: {
            notifications: true,
            muted: false
        }
    },
    example3: {
        summary: 'Disable all notifications',
        value: {
            notifications: false
        }
    }
};
