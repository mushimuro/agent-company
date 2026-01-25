import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import {
    LayoutDashboard,
    FolderKanban,
    Settings,
    LogOut,
    Menu,
    X,
    Shield
} from 'lucide-react';
import { useState } from 'react';
import { HexagonLogo } from '@/components/HexagonLogo';
import { ThemeToggle } from '@/components/ThemeToggle';

export const DashboardLayout = () => {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/projects', label: 'Projects', icon: FolderKanban },
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/settings/local-access', label: 'Local Access', icon: Shield },
        { to: '/settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-[--color-bg-primary] flex">
            {/* Mobile sidebar toggle */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-[--radius-md] bg-[--color-surface] border border-[--color-border-strong] shadow-md hover:border-[--color-accent-primary] transition-colors"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40 w-72 bg-[--color-bg-secondary] border-r border-[--color-border] transform transition-transform duration-300 ease-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-full flex flex-col">
                    {/* Logo / Brand */}
                    <div className="h-24 flex items-center justify-between px-6 border-b border-[--color-border]">
                        <div className="flex items-center gap-4">
                            <HexagonLogo size={50} />
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">
                                    Agent <span className="text-accent">Company</span>
                                </h1>
                                <p className="text-xs text-[--color-text-tertiary] mt-0.5">
                                    AI-Powered Development
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-thin">
                        {navItems.map((item, index) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-[--radius-md] transition-all duration-200
                                    animate-slide-up stagger-${index + 1}
                                    ${isActive
                                        ? 'bg-[--color-accent-primary] text-[--color-bg-primary] shadow-[--shadow-accent]'
                                        : 'text-[--color-text-secondary] hover:bg-[--color-surface-hover] hover:text-[--color-text-primary]'}
                                `}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <item.icon className="h-5 w-5" strokeWidth={2} />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* User Section */}
                    <div className="p-4 border-t border-[--color-border] bg-[--color-bg-tertiary]">
                        <div className="flex items-center mb-4 px-2">
                            <div className="w-10 h-10 rounded-[--radius-md] bg-gradient-to-br from-[--color-accent-primary] to-[--color-accent-secondary] flex items-center justify-center text-[--color-bg-primary] font-bold shadow-md">
                                {user?.username?.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[--color-text-primary] truncate">
                                    {user?.username}
                                </p>
                                <p className="text-xs text-[--color-text-tertiary] truncate">
                                    {user?.email}
                                </p>
                            </div>
                            <ThemeToggle />
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[--color-accent-error] rounded-[--radius-md] border-2 border-[--color-border-strong] bg-[--color-surface] hover:bg-[--color-accent-error] hover:text-white hover:border-[--color-accent-error] transition-all duration-200 active:scale-[0.97]"
                        >
                            <LogOut className="h-4 w-4" strokeWidth={2} />
                            Sign out
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0 overflow-auto">
                <div className="min-h-full">
                    <div className="max-w-[1600px] mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
                        <Outlet />
                    </div>
                </div>
            </main>

            {/* Overlay for mobile sidebar */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/60 lg:hidden backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
};
