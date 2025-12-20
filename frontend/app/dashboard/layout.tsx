'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { LayoutDashboard, Mic, Presentation, Settings, LogOut } from 'lucide-react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const { user, logout } = useAuthStore()

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/record', label: 'Record', icon: Mic },
        { href: '/dashboard', label: 'My Slides', icon: Presentation },
        { href: '/dashboard', label: 'Settings', icon: Settings },
    ]

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100">
            {/* === RICH BACKGROUND LAYER - More saturated === */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Teal Blobs - Richer */}
                <div className="absolute -top-40 -left-20 w-[600px] h-[600px] bg-teal-600/25 rounded-full blur-3xl"></div>
                <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-teal-700/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 left-1/3 w-[500px] h-[500px] bg-teal-600/20 rounded-full blur-3xl"></div>

                {/* Coral Blobs - Richer */}
                <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-rose-500/25 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-[450px] h-[450px] bg-rose-400/20 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-orange-400/20 rounded-full blur-3xl"></div>
            </div>

            {/* === MAIN LAYOUT === */}
            <div className="relative z-10 flex min-h-screen">

                {/* === SOLID SIDEBAR === */}
                <aside className="hidden lg:flex lg:flex-col w-72 p-4">
                    <div className="flex-1 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-[32px] shadow-2xl shadow-slate-900/10 p-6 flex flex-col">

                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 mb-10">
                            <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/40">
                                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <span className="text-xl font-bold">
                                <span className="text-slate-900">Edu</span>
                                <span className="text-rose-500">Slides</span>
                            </span>
                        </Link>

                        {/* Navigation */}
                        <nav className="flex-1 space-y-2">
                            {navItems.map((item) => {
                                const isActive = pathname === item.href && item.label === 'Dashboard' ||
                                    (item.label === 'Record' && pathname === '/record')
                                const Icon = item.icon

                                return (
                                    <Link
                                        key={item.label}
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 ${isActive
                                            ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/40'
                                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.label}</span>
                                    </Link>
                                )
                            })}
                        </nav>

                        {/* Profile Capsule */}
                        <div className="mt-auto pt-6 border-t border-slate-200">
                            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                                <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-rose-500/30">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {user?.email?.split('@')[0] || 'Professor'}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        logout()
                                        window.location.href = '/'
                                    }}
                                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                    title="Sign Out"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* === MAIN CONTENT AREA === */}
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
