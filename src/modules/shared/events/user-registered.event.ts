/**
 * Event emitted when a new user is registered in the auth module
 * This event is used to synchronize user data across modules
 */
export interface UserRegisteredEvent {
  /**
   * Unique identifier of the registered user
   */
  userId: string;

  /**
   * Phone number used for registration
   */
  phoneNumber: string;

  /**
   * Timestamp when the registration occurred
   */
  timestamp: Date;
}

/**
 * Pattern for the user.registered event
 */
export const USER_REGISTERED_PATTERN = 'user.registered';
