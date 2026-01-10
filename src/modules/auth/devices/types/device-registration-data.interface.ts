export interface DeviceRegistrationData {
	userId: string;
	deviceName: string;
	deviceType: string;
	publicKey: string;
	ipAddress?: string;
	fcmToken?: string;
}
