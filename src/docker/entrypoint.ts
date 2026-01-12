import runEnvChecks from './check-env';
import { loadBootstrap } from './bootstrap-loader';

export function runEntrypoint() {
	try {
		// Run environment checks. Will throw on missing required vars
		runEnvChecks();

		console.log('Starting Whispr Messenger...\n');

		// Import main.js which will automatically call bootstrap()
		// At runtime this will be dist/docker/entrypoint.js importing dist/main.js
		// The import side-effect will start the NestJS application
		loadBootstrap();
	} catch (err) {
		// If environment checks failed, log and exit non-zero so container fails fast
		console.error('Entrypoint failed:', err instanceof Error ? err.message : err);
		process.exit(1);
	}
}

// Auto-run when module is imported directly (not during tests)
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
	runEntrypoint();
}
