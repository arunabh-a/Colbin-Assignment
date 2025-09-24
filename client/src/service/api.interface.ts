// User interface based on Prisma schema
export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  hashedPassword: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  refreshTokens?: RefreshToken[];
}

// RefreshToken interface based on Prisma schema
export interface RefreshToken {
  id: string;
  tokenHash: string;
  user?: User;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
  ip?: string;
  userAgent?: string;
}

// API Response interfaces for common operations
export interface AuthResponse {
  user: Omit<User, 'hashedPassword' | 'refreshTokens'>;
  accessToken: string;
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    name?: string;
    emailVerified: boolean;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface EmailVerificationResponse {
  message: string;
  success: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}