'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: '首頁', icon: '⌂' },
  { href: '/members', label: '會員', icon: '♦' },
  { href: '/visits/new', label: '登記', icon: '+', highlight: true },
  { href: '/visits', label: '記錄', icon: '≡' },
  { href: '/achievements', label: '成就', icon: '★' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-dark-border bg-dark-card/95 backdrop-blur-md md:relative md:border-t-0 md:border-r">
      <div className="flex md:flex-col md:w-20 md:min-h-screen md:pt-6">
        {/* Logo - desktop only */}
        <div className="hidden md:flex md:flex-col md:items-center md:mb-8">
          <span className="text-amber text-lg font-bold">欲室</span>
          <span className="text-light-muted text-[10px]">BAR WISH</span>
        </div>

        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href) && !(item.href === '/visits' && pathname === '/visits/new')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 md:py-4 md:flex-none transition-colors ${
                item.highlight
                  ? 'text-amber'
                  : isActive
                    ? 'text-amber'
                    : 'text-light-muted hover:text-light'
              }`}
            >
              <span className={`text-lg font-bold ${item.highlight ? 'bg-amber text-dark w-8 h-8 rounded-full flex items-center justify-center text-xl' : ''}`}>
                {item.icon}
              </span>
              <span className="text-[10px] md:text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
