import { SignalKeyBundleDto } from '../dto/signal-keys.dto';

/**
 * Device information interface shared between login and registration
 * Contains optional device metadata and Signal Protocol keys
 */
export interface DeviceInfo {
	deviceName?: string;
	deviceType?: string;
	signalKeyBundle?: SignalKeyBundleDto;
}
