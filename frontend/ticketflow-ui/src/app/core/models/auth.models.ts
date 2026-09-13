export type Role = 'USER' | 'ORGANIZER' | 'ADMIN';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface CurrentUserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  accessToken: string;
  expiresAt: number;
}
