/**
 * Swagger schemas and examples for Signal Protocol Key Management endpoints
 */

export const SIGNED_PREKEY_UPLOAD_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        message: {
            type: 'string',
            example: 'Signed prekey uploaded successfully',
            description: 'Confirmation message',
        },
    },
};

export const PREKEYS_UPLOAD_RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        message: {
            type: 'string',
            example: 'PreKeys uploaded successfully',
            description: 'Confirmation message',
        },
        uploaded: {
            type: 'number',
            example: 50,
            description: 'Number of prekeys that were uploaded',
        },
    },
};

// Request examples for SignedPreKeyDto
export const SIGNED_PREKEY_UPLOAD_EXAMPLES = {
    standard: {
        summary: 'Standard signed prekey upload',
        value: {
            keyId: 1,
            publicKey: 'BXq9L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2',
            signature: 'MEUCIQDxyzAbcd1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ...',
        },
    },
    rotation: {
        summary: 'Weekly rotation upload',
        value: {
            keyId: 42,
            publicKey: 'BZr7S8T9U0V1W2X3Y4Z5A6B7C8D9E0F1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6V7W8',
            signature: 'MEYCIQCabcdef123456GHIJKLMNOPQRSTUVWXYZ0123456789...',
        },
    },
};

// Request examples for UploadPreKeysDto
export const PREKEYS_UPLOAD_EXAMPLES = {
    smallBatch: {
        summary: 'Small batch replenishment (10 keys)',
        value: {
            preKeys: [
                { keyId: 101, publicKey: 'BRa1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3' },
                { keyId: 102, publicKey: 'BSb2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4' },
                { keyId: 103, publicKey: 'BTc3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5' },
                { keyId: 104, publicKey: 'BUd4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6' },
                { keyId: 105, publicKey: 'BVe5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7' },
                { keyId: 106, publicKey: 'BWf6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8' },
                { keyId: 107, publicKey: 'BXg7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9' },
                { keyId: 108, publicKey: 'BYh8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0' },
                { keyId: 109, publicKey: 'BZi9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1' },
                { keyId: 110, publicKey: 'BAj0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2' },
            ],
        },
    },
    fullReplenishment: {
        summary: 'Full replenishment (100 keys)',
        description: 'Upload 100 new prekeys when running low',
        value: {
            preKeys: [
                { keyId: 201, publicKey: 'BRa1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3' },
                { keyId: 202, publicKey: 'BSb2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4' },
                // ... (typically 100 keys total)
            ],
        },
    },
};

// Response examples
export const SIGNED_PREKEY_UPLOAD_RESPONSE_EXAMPLES = {
    success: {
        summary: 'Successful upload',
        value: {
            message: 'Signed prekey uploaded successfully',
        },
    },
};

export const PREKEYS_UPLOAD_RESPONSE_EXAMPLES = {
    smallBatch: {
        summary: 'Small batch uploaded',
        value: {
            message: 'PreKeys uploaded successfully',
            uploaded: 10,
        },
    },
    fullBatch: {
        summary: 'Full batch uploaded',
        value: {
            message: 'PreKeys uploaded successfully',
            uploaded: 100,
        },
    },
};
