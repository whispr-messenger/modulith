# Auth Service Integration Guide

## Overview

This document provides comprehensive integration guidelines for developers working with the Auth Service. The service provides secure authentication, two-factor authentication, device management, and session handling capabilities.

## Architecture

### Core Components

- **Authentication Service**: Handles user registration, login, and token management
- **Verification Service**: Manages SMS verification and security codes
- **Device Service**: Tracks and manages user devices
- **Token Service**: JWT token generation and validation
- **Crypto Service**: End-to-end encryption utilities

### Database Schema

- **UserAuth**: User credentials and authentication data
- **Device**: Registered user devices
- **PreKey**: Signal protocol pre-keys for encryption
- **SignedPreKey**: Signed pre-keys for secure communication
- **IdentityKey**: User identity keys
- **BackupCode**: Emergency authentication codes
- **LoginHistory**: Audit trail of authentication events

## API Endpoints

### Authentication

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "phoneNumber": "+33123456789",
  "password": "securePassword123",
  "deviceInfo": {
    "name": "iPhone 14",
    "type": "mobile",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response:**
```json
{
  "message": "Registration initiated",
  "verificationId": "uuid-verification-id"
}
```

#### POST /auth/confirm-registration
Confirm user registration with SMS verification code.

**Request Body:**
```json
{
  "verificationId": "uuid-verification-id",
  "code": "123456"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "phoneNumber": "+33123456789",
    "isVerified": true
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  },
  "device": {
    "id": "device-uuid",
    "name": "iPhone 14"
  }
}
```

#### POST /auth/login
Authenticate user credentials.

**Request Body:**
```json
{
  "phoneNumber": "+33123456789",
  "password": "securePassword123",
  "deviceInfo": {
    "name": "iPhone 14",
    "type": "mobile",
    "userAgent": "Mozilla/5.0..."
  }
}
```

**Response:**
```json
{
  "requiresTwoFactor": true,
  "verificationId": "uuid-verification-id",
  "availableMethods": ["sms", "totp"]
}
```

#### POST /auth/verify-2fa
Complete two-factor authentication.

**Request Body:**
```json
{
  "verificationId": "uuid-verification-id",
  "code": "123456",
  "method": "sms"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "phoneNumber": "+33123456789"
  },
  "tokens": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  },
  "device": {
    "id": "device-uuid",
    "name": "iPhone 14"
  }
}
```

### Two-Factor Authentication

#### POST /auth/setup-2fa
Initialize TOTP two-factor authentication.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "qrCode": "data:image/png;base64,...",
  "secret": "base32-encoded-secret",
  "backupCodes": ["code1", "code2", "code3"]
}
```

#### POST /auth/confirm-2fa
Confirm TOTP setup with verification code.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "code": "123456"
}
```

### QR Code Authentication

#### POST /auth/qr/generate
Generate QR code for device authentication.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "qrCode": "data:image/png;base64,...",
  "challengeId": "uuid-challenge-id",
  "expiresAt": "2024-01-01T12:00:00Z"
}
```

#### POST /auth/qr/scan
Scan QR code from another device.

**Request Body:**
```json
{
  "challengeId": "uuid-challenge-id",
  "deviceInfo": {
    "name": "iPad Pro",
    "type": "tablet",
    "userAgent": "Mozilla/5.0..."
  }
}
```

#### POST /auth/qr/approve
Approve QR code authentication request.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request Body:**
```json
{
  "challengeId": "uuid-challenge-id",
  "approved": true
}
```

### Device Management

#### GET /devices
Retrieve user devices.

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "devices": [
    {
      "id": "device-uuid",
      "name": "iPhone 14",
      "type": "mobile",
      "isActive": true,
      "lastSeen": "2024-01-01T12:00:00Z",
      "isCurrent": true
    }
  ]
}
```

#### DELETE /devices/:deviceId
Revoke device access.

**Headers:**
```
Authorization: Bearer <access-token>
```

## Authentication Flow

### Standard Registration Flow

1. Client calls `POST /auth/register` with user credentials
2. Service sends SMS verification code
3. Client calls `POST /auth/confirm-registration` with verification code
4. Service returns user data, tokens, and device information

### Standard Login Flow

1. Client calls `POST /auth/login` with credentials
2. If 2FA is enabled, service returns verification requirement
3. Client calls `POST /auth/verify-2fa` with 2FA code
4. Service returns user data, tokens, and device information

### QR Code Authentication Flow

1. Authenticated device calls `POST /auth/qr/generate`
2. New device scans QR code and calls `POST /auth/qr/scan`
3. Authenticated device approves via `POST /auth/qr/approve`
4. New device receives authentication tokens

## Security Considerations

### JWT Tokens

- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Tokens use ECDSA P-256 signing algorithm
- Include device fingerprinting for security

### Rate Limiting

- Authentication endpoints: 5 requests per minute
- General API endpoints: 100 requests per minute
- SMS verification: 3 requests per hour per phone number

### Encryption

- Passwords hashed with bcrypt (12 rounds)
- Sensitive data encrypted with AES-256-GCM
- End-to-end encryption keys managed per device

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid phone number or password",
    "details": {
      "field": "password",
      "reason": "incorrect"
    }
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "path": "/auth/login"
}
```

### Common Error Codes

- `INVALID_CREDENTIALS`: Authentication failed
- `VERIFICATION_REQUIRED`: SMS or 2FA verification needed
- `VERIFICATION_EXPIRED`: Verification code expired
- `VERIFICATION_INVALID`: Invalid verification code
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `DEVICE_LIMIT_EXCEEDED`: Maximum devices reached
- `TWO_FACTOR_REQUIRED`: 2FA setup required
- `ACCOUNT_LOCKED`: Account temporarily locked

## Environment Configuration

### Required Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=auth_user
DB_PASSWORD=secure_password
DB_NAME=auth_service

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# JWT Configuration
JWT_PRIVATE_KEY=base64-encoded-private-key
JWT_PUBLIC_KEY=base64-encoded-public-key
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_EXPIRY=7d

# SMS Service
SMS_PROVIDER=twilio
SMS_API_KEY=your-api-key
SMS_API_SECRET=your-api-secret
SMS_FROM_NUMBER=+1234567890

# Security
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=900000

# Two-Factor Authentication
TWO_FACTOR_ISSUER=YourApp
TWO_FACTOR_WINDOW=1

# Device Management
MAX_DEVICES_PER_USER=5
DEVICE_CHALLENGE_EXPIRY=300000
```

## Client Integration Examples

### JavaScript/TypeScript

```typescript
class AuthClient {
  private baseUrl: string;
  private accessToken?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async register(phoneNumber: string, password: string, deviceInfo: any) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, password, deviceInfo })
    });
    return response.json();
  }

  async confirmRegistration(verificationId: string, code: string) {
    const response = await fetch(`${this.baseUrl}/auth/confirm-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationId, code })
    });
    const data = await response.json();
    this.accessToken = data.tokens?.accessToken;
    return data;
  }

  async login(phoneNumber: string, password: string, deviceInfo: any) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, password, deviceInfo })
    });
    return response.json();
  }

  async verify2FA(verificationId: string, code: string, method: string) {
    const response = await fetch(`${this.baseUrl}/auth/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationId, code, method })
    });
    const data = await response.json();
    this.accessToken = data.tokens?.accessToken;
    return data;
  }

  async getDevices() {
    const response = await fetch(`${this.baseUrl}/devices`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
}
```

### Python

```python
import requests
from typing import Optional, Dict, Any

class AuthClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.access_token: Optional[str] = None

    def register(self, phone_number: str, password: str, device_info: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/auth/register",
            json={
                "phoneNumber": phone_number,
                "password": password,
                "deviceInfo": device_info
            }
        )
        return response.json()

    def confirm_registration(self, verification_id: str, code: str) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/auth/confirm-registration",
            json={
                "verificationId": verification_id,
                "code": code
            }
        )
        data = response.json()
        if "tokens" in data:
            self.access_token = data["tokens"]["accessToken"]
        return data

    def login(self, phone_number: str, password: str, device_info: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={
                "phoneNumber": phone_number,
                "password": password,
                "deviceInfo": device_info
            }
        )
        return response.json()

    def verify_2fa(self, verification_id: str, code: str, method: str) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}/auth/verify-2fa",
            json={
                "verificationId": verification_id,
                "code": code,
                "method": method
            }
        )
        data = response.json()
        if "tokens" in data:
            self.access_token = data["tokens"]["accessToken"]
        return data

    def get_devices(self) -> Dict[str, Any]:
        response = requests.get(
            f"{self.base_url}/devices",
            headers={"Authorization": f"Bearer {self.access_token}"}
        )
        return response.json()
```

## Testing

### Unit Tests

Run unit tests for all services:

```bash
npm run test
```

### End-to-End Tests

Run E2E tests against the full application:

```bash
npm run test:e2e
```

### Test Environment Setup

The test environment uses:
- In-memory SQLite database
- Mocked SMS service
- Mocked Redis cache
- Test JWT keys

## Deployment

### Docker Deployment

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check service health
curl http://localhost/health
```

### Health Checks

- `/health`: Overall service health
- `/health/ready`: Readiness probe
- `/health/live`: Liveness probe

## Monitoring and Logging

### Metrics

- Authentication success/failure rates
- Token generation and validation metrics
- Device registration and management events
- SMS verification success rates

### Logging

- All authentication events are logged
- Failed login attempts are tracked
- Device management actions are audited
- Security events are logged with high priority

## Support and Troubleshooting

### Common Issues

1. **JWT Token Expired**: Refresh tokens using the refresh endpoint
2. **SMS Not Received**: Check SMS provider configuration and rate limits
3. **2FA Setup Failed**: Verify TOTP secret generation and QR code display
4. **Device Limit Reached**: Remove unused devices before adding new ones

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development
LOG_LEVEL=debug
```

### Contact

For technical support and integration assistance, refer to the project documentation or contact DALM1 (development team).
