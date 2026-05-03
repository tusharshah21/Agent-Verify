import Link from 'next/link';
import Head from 'next/head';

export default function Home() {
  return (
    <>
      <Head>
        <title>AgentVerify — Trust Layer for AI Agents</title>
        <meta name="description" content="ENS identity, KeeperHub execution, Uniswap settlement, Gensyn P2P mesh, and 0G storage for autonomous AI agents." />
      </Head>

      <div style={{
        minHeight: 'calc(100vh - 52px)',
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 60%, #0a1628 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 20px',
        gap: '40px',
      }}>

        {/* Hero */}
        <div style={{ maxWidth: '680px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🤖</div>
          <h1 style={{ fontSize: '52px', fontWeight: '900', margin: '0 0 12px', color: '#0ea5e9', letterSpacing: '-1.5px', lineHeight: 1.1 }}>
            AgentVerify
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', margin: '0 0 24px', lineHeight: 1.6 }}>
            The trust layer for autonomous AI agents.<br />
            Identity · Execution · Settlement · Storage · Communication
          </p>

          {/* Track badges */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '32px' }}>
            {[
              { label: 'ENS', color: '#6366f1' },
              { label: 'Gensyn AXL', color: '#8b5cf6' },
              { label: 'KeeperHub', color: '#10b981' },
              { label: 'Uniswap', color: '#e91e8c' },
              { label: '0G Storage', color: '#0ea5e9' },
            ].map(t => (
              <span key={t.label} style={{
                background: t.color, color: 'white',
                padding: '4px 12px', borderRadius: '20px',
                fontSize: '12px', fontWeight: '700',
              }}>{t.label}</span>
            ))}
          </div>

          <Link href="/dashboard">
            <button style={{
              padding: '16px 40px',
              background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
              color: 'white', border: 'none', borderRadius: '12px',
              fontSize: '18px', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 0 30px rgba(14,165,233,0.35)',
              transition: 'all 0.2s',
            }}>
              Open Dashboard →
            </button>
          </Link>
        </div>

        {/* Feature grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          maxWidth: '900px',
          width: '100%',
        }}>
          {[
            { icon: '🔑', title: 'ENS Identity', desc: 'Every agent gets a real .eth name on Sepolia' },
            { icon: '⚙️', title: 'KeeperHub', desc: 'Gasless automated execution via keeper network' },
            { icon: '💱', title: 'Uniswap V3', desc: 'On-chain quotes and trustless settlement' },
            { icon: '🌐', title: 'Gensyn AXL', desc: 'P2P mesh for agent-to-agent communication' },
            { icon: '🗄️', title: '0G Storage', desc: 'Decentralized state — no single point of failure' },
          ].map(f => (
            <div key={f.title} style={{
              background: 'rgba(14,165,233,0.06)',
              border: '1px solid rgba(14,165,233,0.15)',
              borderRadius: '10px', padding: '20px',
              textAlign: 'left',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{f.icon}</div>
              <div style={{ fontWeight: '700', color: '#e2e8f0', marginBottom: '4px', fontSize: '14px' }}>{f.title}</div>
              <div style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ color: '#334155', fontSize: '12px', margin: 0 }}>
          Built for ETHGlobal 2025 · Sepolia Testnet · Wallet 0xf866…397d4
        </p>
      </div>
    </>
  );
}
