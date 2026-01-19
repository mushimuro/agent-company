import { create } from 'zustand';
import { authApi, User } from '@/api/auth';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string, password_confirm: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    login: async (username, password) => {
        const response = await authApi.login({ username, password });
        localStorage.setItem('access_token', response.tokens.access);
        localStorage.setItem('refresh_token', response.tokens.refresh);
        set({ user: response.user, isAuthenticated: true });
    },

    register: async (username, email, password, password_confirm) => {
        const response = await authApi.register({ username, email, password, password_confirm });
        localStorage.setItem('access_token', response.tokens.access);
        localStorage.setItem('refresh_token', response.tokens.refresh);
        set({ user: response.user, isAuthenticated: true });
    },

    logout: () => {
        authApi.logout();
        set({ user: null, isAuthenticated: false });
    },

    checkAuth: async () => {
        try {
            const user = await authApi.getCurrentUser();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            // Clear tokens on auth failure
            authApi.logout();
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
}));
