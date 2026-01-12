export const VERIFICATION_REQUEST_EXAMPLES = {
	example1: {
		summary: 'French phone number',
		value: {
			phoneNumber: '+33612345678'
		}
	},
	example2: {
		summary: 'US phone number',
		value: {
			phoneNumber: '+14155552671'
		}
	}
};

export const VERIFICATION_CONFIRM_EXAMPLES = {
	example1: {
		summary: 'Valid verification code',
		value: {
			verificationId: '550e8400-e29b-41d4-a716-446655440000',
			code: '123456'
		}
	},
	example2: {
		summary: 'Another verification attempt',
		value: {
			verificationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
			code: '987654'
		}
	}
};
