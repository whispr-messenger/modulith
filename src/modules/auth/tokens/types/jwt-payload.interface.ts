export interface JwtPayload {
	sub: string;
	iat: number;
	exp: number;
	deviceId: string;
	scope: string;
	fingerprint: string;
}
