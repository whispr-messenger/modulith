export const REGISTER_EXAMPLES = {
	example1: {
		summary: 'Complete registration with Signal protocol keys',
		value: {
			verificationId: '550e8400-e29b-41d4-a716-446655440000',
			firstName: 'John',
			lastName: 'Doe',
			deviceName: 'iPhone 15 Pro',
			deviceType: 'mobile',
			signalKeyBundle: {
				identityKey: 'BQoU1C7F8P9X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
				signedPreKey: {
					keyId: 1,
					publicKey: 'BXq9L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2',
					signature: 'MEUCIQDxyzAbcd1234567890ABCDEFGHIJK...'
				},
				preKeys: [
					{ keyId: 1, publicKey: 'BRa1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3' },
					{ keyId: 2, publicKey: 'BSb2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4' },
					{ keyId: 3, publicKey: 'BTc3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5' }
					// ... typically 100 prekeys
				]
			}
		}
	},
	example2: {
		summary: 'Minimal registration (web client without E2E)',
		value: {
			verificationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
			firstName: 'Alice',
			lastName: 'Smith'
		}
	},
	example3: {
		summary: 'Registration with desktop device',
		value: {
			verificationId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
			firstName: 'Bob',
			lastName: 'Johnson',
			deviceName: 'MacBook Pro',
			deviceType: 'desktop',
			signalKeyBundle: {
				identityKey: 'BRc4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F3G4H5I6',
				signedPreKey: {
					keyId: 2,
					publicKey: 'BYp8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0',
					signature: 'MEQCIF5wxyzAbcd9876543210ZYXWVU...'
				},
				preKeys: [
					{ keyId: 1, publicKey: 'BUx9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1' },
					{ keyId: 2, publicKey: 'BVy0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2' }
				]
			}
		}
	}
};

export const LOGIN_EXAMPLES = {
	example1: {
		summary: 'Login with Signal protocol keys',
		value: {
			verificationId: '550e8400-e29b-41d4-a716-446655440000',
			deviceName: 'iPhone 15 Pro',
			deviceType: 'mobile',
			signalKeyBundle: {
				identityKey: 'BQoU1C7F8P9X2Y3Z4A5B6C7D8E9F0G1H2I3J4K5L6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z0A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6',
				signedPreKey: {
					keyId: 1,
					publicKey: 'BXq9L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2',
					signature: 'MEUCIQDxyzAbcd1234567890ABCDEFGHIJK...'
				},
				preKeys: [
					{ keyId: 1, publicKey: 'BRa1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3' },
					{ keyId: 2, publicKey: 'BSb2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4' }
					// ... typically 100 prekeys
				]
			}
		}
	},
	example2: {
		summary: 'Simple login (web client)',
		value: {
			verificationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
		}
	},
	example3: {
		summary: 'Login from tablet with keys',
		value: {
			verificationId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
			deviceName: 'iPad Air',
			deviceType: 'tablet',
			signalKeyBundle: {
				identityKey: 'BWm5N6O7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2O3P4Q5R6S7',
				signedPreKey: {
					keyId: 3,
					publicKey: 'BZr7S8T9U0V1W2X3Y4Z5A6B7C8D9E0F1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6V7W8',
					signature: 'MEYCIQCabcdef123456GHIJKLMNOPQR...'
				},
				preKeys: [
					{ keyId: 1, publicKey: 'BAw8X9Y0Z1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0' }
				]
			}
		}
	}
};

export const LOGOUT_EXAMPLES = {
	example1: {
		summary: 'Logout specific device',
		value: {
			deviceId: '550e8400-e29b-41d4-a716-446655440000',
			userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
		}
	},
	example2: {
		summary: 'Logout current session (use JWT info)',
		value: {}
	},
	example3: {
		summary: 'Logout with only device ID',
		value: {
			deviceId: '7c9e6679-7425-40de-944b-e07fc1f90ae7'
		}
	}
};
