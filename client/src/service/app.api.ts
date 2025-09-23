import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenResponse,
  UserProfile,
} from './api.interface';

// Base API configuration
const API_BASE_URL = 'http://localhost:4000/api';

// Helper function for making API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    credentials: 'include', // Important for cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: `HTTP error! status: ${response.status}` 
    }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Helper function for authenticated requests
async function authenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // No need to manually add Authorization header - 
  // access token will be sent as httpOnly cookie automatically
  return apiRequest<T>(endpoint, {
    ...options,
  });
}

// Auth API functions
export const authApi = {
  /**
   * Register a new user
   */
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    // Access token is now set as httpOnly cookie by the server
    // No need to store in localStorage
    
    return response;
  },

  /**
   * Login user
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Access token is now set as httpOnly cookie by the server
    // No need to store in localStorage
    
    return response;
  },

  /**
   * Refresh access token using httpOnly cookie
   */
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const response = await apiRequest<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
    });
    
    // New access token is set as httpOnly cookie by the server
    // No need to update localStorage
    
    return response;
  },

  /**
   * Logout user and revoke refresh token
   */
  logout: async (): Promise<{ message: string }> => {
    const response = await authenticatedRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
    });
    
    // Server will clear the httpOnly cookies
    // No need to clear localStorage
    
    return response;
  },
};

// User API functions
export const userApi = {
  /**
   * Get current user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    return authenticatedRequest<UserProfile>('/users/me');
  },

  /**
   * Get user by ID
   */
  getUserById: async (userId: string): Promise<UserProfile> => {
    return authenticatedRequest<UserProfile>(`/users/user?userId=${userId}`);
  },
};

// Utility functions
export const apiUtils = {
  /**
   * Check if user is authenticated by making a test request
   * Since tokens are in httpOnly cookies, we can't access them directly
   */
  isAuthenticated: async (): Promise<boolean> => {
    try {
      // Try to access a protected endpoint
      await userApi.getProfile();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Clear authentication data (logout)
   */
  clearAuth: async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, we'll consider auth cleared
    }
  },

  /**
   * Auto-refresh token when needed
   */
  autoRefreshToken: async (): Promise<boolean> => {
    try {
      await authApi.refreshToken();
      return true;
    } catch (error) {
      console.error('Auto refresh failed:', error);
      return false;
    }
  },

  /**
   * Check authentication status (async version for httpOnly cookies)
   * This makes a silent request to avoid triggering interceptors unnecessarily
   */
  checkAuthStatus: async (): Promise<{ isAuthenticated: boolean; user?: UserProfile }> => {
    try {
      // Make a direct request without the interceptor to avoid unnecessary refresh attempts
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const user = await response.json();
        return { isAuthenticated: true, user };
      } else {
        return { isAuthenticated: false };
      }
    } catch {
      return { isAuthenticated: false };
    }
  },

  /**
   * Silent auth check - doesn't trigger refresh attempts
   * Use this for initial page loads
   */
  silentAuthCheck: async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

// HTTP interceptor for automatic token refresh
export const setupApiInterceptors = () => {
  const originalFetch = window.fetch;
  
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    
    // Check if this is a request to our API
    if (request.url.startsWith(API_BASE_URL)) {
      // Try the request
      let response = await originalFetch(request);
      
      // Only attempt refresh for protected routes, not auth routes
      // And only if we get 401 and it's not already a refresh request
      if (
        response.status === 401 && 
        !request.url.includes('/auth/refresh') &&
        !request.url.includes('/auth/login') &&
        !request.url.includes('/auth/register') &&
        request.url.includes('/users/') // Only for user routes
      ) {
        try {
          // Try to refresh the token
          await authApi.refreshToken();
          
          // Retry the original request (cookies will be updated automatically)
          response = await originalFetch(request);
        } catch (error) {
          // Refresh failed, throw session expired error
          console.warn('Token refresh failed, user needs to login again');
          // Don't throw error, just return the 401 response
        }
      }
      
      return response;
    }
    
    // For non-API requests, use original fetch
    return originalFetch(input, init);
  };
};

// Export all APIs
export const api = {
  auth: authApi,
  user: userApi,
  utils: apiUtils,
};