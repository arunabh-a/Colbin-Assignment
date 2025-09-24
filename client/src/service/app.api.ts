import type {
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    RefreshTokenResponse,
    EmailVerificationResponse,
    UserProfile,
} from "./api.interface";

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Helper function for making API requests
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const config: RequestInit = {
        credentials: "include", // Important for cookies
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({
            message: `HTTP error! status: ${response.status}`,
        }));
        throw new Error(
            errorData.message || `HTTP error! status: ${response.status}`
        );
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

// Authentication API functions
export const authApi = {
    /**
     * Register new user
     */
    register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
        const response = await apiRequest<RegisterResponse>("/auth/register", {
            method: "POST",
            body: JSON.stringify(userData),
        });

        // No cookies set for registration - user needs to verify email first
        return response;
    },

    /**
     * Login user
     */
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
        const response = await apiRequest<AuthResponse>("/auth/login", {
            method: "POST",
            body: JSON.stringify(credentials),
        });

        // Access token is now set as httpOnly cookie by the server
        // No need to store in localStorage

        return response;
    },

    /**
     * Refresh access token using refresh token (stored in httpOnly cookie)
     */
    refreshToken: async (): Promise<RefreshTokenResponse> => {
        const response = await apiRequest<RefreshTokenResponse>(
            "/auth/refresh",
            {
                method: "POST",
            }
        );

        // Server will set new access token as httpOnly cookie
        // No need to handle localStorage

        return response;
    },

    /**
     * Verify email using verification token
     */
    verifyEmail: async (token: string): Promise<EmailVerificationResponse> => {
        const response = await apiRequest<EmailVerificationResponse>(
            `/auth/verify?token=${token}`,
            {
                method: "GET",
            }
        );

        return response;
    },

    /**
     * Logout user (clear cookies and revoke refresh token)
     */
    logout: async (): Promise<{ message: string }> => {
        const response = await authenticatedRequest<{ message: string }>(
            "/auth/logout",
            {
                method: "POST",
            }
        );

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
        return authenticatedRequest<UserProfile>("/users/me");
    },

    /**
     * Get user by ID
     */
    getUserById: async (userId: string): Promise<UserProfile> => {
        return authenticatedRequest<UserProfile>(
            `/users/user?userId=${userId}`
        );
    },

    /**
     * Update current user's profile
     */
    updateProfile: async (updateData: { name?: string; bio?: string }): Promise<UserProfile> => {
        return authenticatedRequest<UserProfile>("/users/me", {
            method: "PUT",
            body: JSON.stringify(updateData),
        });
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
            console.warn("Error during logout, but continuing...", error);
        }
    },

    /**
     * Check current authentication status and get user data if authenticated
     */
    checkAuthStatus: async (): Promise<{
        isAuthenticated: boolean;
        user?: UserProfile;
    }> => {
        try {
            // Try to get user profile using direct fetch to avoid interceptor
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.ok) {
                const user = await response.json();
                return { isAuthenticated: true, user };
            } else {
                return { isAuthenticated: false };
            }
        } catch (error) {
            console.error("Error checking auth status:", error);
            return { isAuthenticated: false };
        }
    },

    /**
     * Lightweight auth check without fetching user data
     */
    silentAuthCheck: async (): Promise<boolean> => {
        try {
            const response = await fetch(`${API_BASE_URL}/users/me`, {
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
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
                !request.url.includes("/auth/refresh") &&
                !request.url.includes("/auth/login") &&
                !request.url.includes("/auth/register") &&
                !request.url.includes("/auth/verify") &&
                request.url.includes("/users/") // Only for user routes
            ) {
                try {
                    // Try to refresh the token
                    const refreshResponse = await originalFetch(
                        `${API_BASE_URL}/auth/refresh`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                        }
                    );

                    if (refreshResponse.ok) {
                        // Refresh successful, retry the original request
                        // Clone the original request since it can only be used once
                        const clonedRequest = request.clone();
                        response = await originalFetch(clonedRequest);
                    } else {
                        // Refresh failed, redirect to login
                        console.warn(
                            "Token refresh failed, redirecting to login"
                        );
                        window.location.href = "/auth";
                        return response; // Return the 401 response
                    }
                } catch (error) {
                    // Refresh request failed, redirect to login
                    console.warn(
                        "Token refresh request failed, redirecting to login"
                    );
                    window.location.href = "/auth";
                    return response; // Return the original 401 response
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
