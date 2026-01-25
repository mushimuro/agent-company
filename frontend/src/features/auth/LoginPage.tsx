import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { HexagonLogo } from '@/components/HexagonLogo';
import { ArrowRight, Lock, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export const LoginPage = () => {
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(formData.username, formData.password);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[--color-bg-primary] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Theme Toggle - Top Right */}
            <div className="absolute top-6 right-6 z-10">
                <ThemeToggle />
            </div>

            {/* Decorative gradient orbs */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[--color-accent-primary] rounded-full opacity-10 blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[--color-accent-secondary] rounded-full opacity-10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

            <div className="relative w-full max-w-md space-y-10 animate-fade-in">
                {/* Logo & Branding */}
                <div className="text-center space-y-6">
                    <div className="flex justify-center animate-slide-up">
                        <HexagonLogo size={100} className="animate-glow" />
                    </div>
                    <div className="space-y-3 animate-slide-up stagger-1">
                        <h1 className="text-5xl font-extrabold tracking-tight">
                            Welcome to <span className="text-accent">Agent Company</span>
                        </h1>
                        <p className="text-[--color-text-secondary] text-lg">
                            Sign in to manage your AI-powered projects
                        </p>
                    </div>
                </div>

                {/* Login Form */}
                <div className="card-elevated p-8 animate-slide-up stagger-2">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {/* Username Input */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-semibold text-[--color-text-primary] mb-2">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-[--color-text-tertiary]" strokeWidth={2} />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    className="input pl-12"
                                    placeholder="Enter your username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-[--color-text-primary] mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-[--color-text-tertiary]" strokeWidth={2} />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    className="input pl-12"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 bg-[--color-accent-error]/10 border border-[--color-accent-error]/30 rounded-[--radius-md] animate-slide-up">
                                <p className="text-sm text-[--color-accent-error] font-medium text-center">
                                    {error}
                                </p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full group text-lg"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <span className="spinner h-5 w-5 mr-2"></span>
                                    Signing in...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center">
                                    Sign in
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Register Link */}
                <div className="text-center animate-slide-up stagger-3">
                    <p className="text-[--color-text-secondary]">
                        Don't have an account?{' '}
                        <Link 
                            to="/register" 
                            className="font-semibold text-[--color-accent-primary] hover:text-[--color-accent-primary-hover] transition-colors underline underline-offset-4"
                        >
                            Create one now
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
