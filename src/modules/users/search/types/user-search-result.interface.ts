export interface UserSearchResult {
  id: string;
  phoneNumber?: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  profilePictureUrl?: string;
  isActive: boolean;
  canViewProfile: boolean;
  canViewPhoneNumber: boolean;
  canViewFirstName: boolean;
  canViewLastName: boolean;
}
