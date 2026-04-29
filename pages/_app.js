import '../styles/globals.css';
import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV_LINKS = [
  { href: '/dashboard', label: '🤖 Dashboard' },
  { href: '/', label: '🕹️ ZOGS' },
];

function Navbar() {
  const router = useRouter();

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'rgba(15,23,42,0.95)',
      borderBottom: '1px solid rgba(100,116,139,0.25)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(8px)',
    }}>
      <Link href="/dashboard" style={{ fontWeight: 700, color: '#0ea5e9', fontSize: '16px', letterSpacing: '-0.3px' }}>
        AgentVerify
      </Link>

      <div style={{ display: 'flex', gap: '8px' }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = router.pathname === href;
          return (
            <Link key={href} href={href} style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: active ? '#0ea5e9' : '#94a3b8',
              background: active ? 'rgba(14,165,233,0.12)' : 'transparent',
              border: active ? '1px solid rgba(14,165,233,0.3)' : '1px solid transparent',
              transition: 'all 0.2s',
            }}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <>
      <Navbar />
      <Component {...pageProps} />
    </>
  );
}
