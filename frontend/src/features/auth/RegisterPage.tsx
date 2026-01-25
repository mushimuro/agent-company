import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { HexagonLogo } from '@/components/HexagonLogo';
import { ArrowRight, Lock, User, Mail, CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export const RegisterPage = () => {
    const navigate = useNavigate();
    const register = useAuthStore((state) => state.register);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.password_confirm) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            await register(
                formData.username,
                formData.email,
                formData.password,
                formData.password_confirm
            );
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to register');
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
                            Join <span className="text-accent">Agent Company</span>
                        </h1>
                        <p className="text-[--color-text-secondary] text-lg">
                            Create your account and start building amazing projects
                        </p>
                    </div>
                </div>

                {/* Register Form */}
                <div className="card-elevated p-8 animate-slide-up stagger-2">
                    <form className="space-y-5" onSubmit={handleSubmit}>
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
                                    placeholder="Choose a username"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold text-[--color-text-primary] mb-2">
                                Email address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-[--color-text-tertiary]" strokeWidth={2} />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    className="input pl-12"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                                    placeholder="Create a strong password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <label htmlFor="password_confirm" className="block text-sm font-semibold text-[--color-text-primary] mb-2">
                                Confirm password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <CheckCircle2 className="h-5 w-5 text-[--color-text-tertiary]" strokeWidth={2} />
                                </div>
                                <input
                                    id="password_confirm"
                                    name="password_confirm"
                                    type="password"
                                    required
                                    className="input pl-12"
                                    placeholder="Confirm your password"
                                    value={formData.password_confirm}
                                    onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
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
                            className="btn-primary w-full group mt-6 text-lg"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <span className="spinner h-5 w-5 mr-2"></span>
                                    Creating account...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center">
                                    Create Account
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                                </span>
                            )}
                        </button>
                    </form>
                </div>

                {/* Login Link */}
                <div className="text-center animate-slide-up stagger-3">
                    <p className="text-[--color-text-secondary]">
                        Already have an account?{' '}
                        <Link 
                            to="/login" 
                            className="font-semibold text-[--color-accent-primary] hover:text-[--color-accent-primary-hover] transition-colors underline underline-offset-4"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};
