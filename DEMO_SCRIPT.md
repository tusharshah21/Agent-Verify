# AgentVerify — 3-Minute ETHGlobal Demo Script

**Tracks covered:** 0G ($15K) · Uniswap ($5K) · Gensyn/AXL ($5K) · ENS ($5K) · KeeperHub ($5K)

---

## Pre-Demo Setup (do before going on stage)

1. `npm run dev` — start Next.js on localhost:3000
2. If AXL binary downloaded: `axl start --port 9090`
3. Keep browser open to `/dashboard` tab
4. Keep Sepolia Etherscan open in background tab for the live txhash reveal

---

## The Pitch (15 seconds — say this first)

> "AI agents are becoming first-class onchain actors. But they have no persistent identity, no secure communication, no reliable execution, and no way to settle payments autonomously. AgentVerify is the complete trust layer — every agent gets an ENS name, talks peer-to-peer via Gensyn AXL, executes reliably via KeeperHub, settles via Uniswap, and persists its state on 0G."

---

## [0:15 – 0:45] ENS — Agent Identity (Track: ENS, $5K)

**Click:** `/api/agent/resolve?name=agentA.eth` in browser or show dashboard Agents tab

**Say:**
> "Each agent has a `.eth` name. When we resolve `agentA.eth`, we're calling the real Sepolia ENS registry — not a mock."

**Show:** The response includes `ensResolved: true/false`, `namehash`, and `network: "sepolia"` — live on-chain call even if the name isn't registered yet.

**Judge talking point:** "ENS text records store agent capabilities and reputation scores. Any wallet, any app can resolve this agent in one call."

---

## [0:45 – 1:15] Gensyn AXL — Encrypted P2P Mesh (Track: Gensyn, $5K)

**Click:** Messages tab on dashboard

**Say:**
> "Agents communicate peer-to-peer via Gensyn's AXL — a single binary that handles encryption, routing, and discovery. Your app talks to localhost, AXL handles the rest."

**Show:** Live message feed — agent A sends an encrypted task to agent B. If AXL binary is running, show `transport: "axl-p2p"`. If not, show `transport: "local-simulation"` and explain it's the same interface.

**Judge talking point:** "The architecture is identical whether it's one node or a hundred. AXL gives us end-to-end encryption and peer discovery with zero infrastructure."

---

## [1:15 – 1:45] KeeperHub — Guaranteed Execution (Track: KeeperHub, $5K)

**Click:** Execution tab on dashboard

**Say:**
> "Agents can't trust that a transaction will land. KeeperHub gives us guaranteed execution — retry logic, gas optimization, MEV protection, and full audit trail."

**Show:** Task queue — schedule a new task, watch status go QUEUED → EXECUTING → COMPLETED. Show the retry counter and gas estimate.

**Judge talking point:** "When agent A needs to pay agent B, it doesn't send the transaction itself. It hands it to KeeperHub and gets a guarantee. That's the difference between an agent that works in demos and one that works in production."

---

## [1:45 – 2:15] Uniswap — Autonomous Settlement (Track: Uniswap, $5K)

**Click:** Settlement tab on dashboard, or hit `/api/agent/settle?action=quote&fromToken=USDC&toToken=DAI&amount=100`

**Say:**
> "When one agent pays another in a different token, we call the Uniswap V3 Quoter V2 contract directly on Sepolia — real on-chain quote, real exchange rate."

**Show:** The quote response. Point to `source: "onchain"` if Sepolia has liquidity, or `source: "fallback"` if not — explain Sepolia liquidity is thin but the integration calls the real contract.

**Show:** `quoterAddress`, `routerAddress`, `feeTier` in the response — all real Uniswap V3 infrastructure.

**Judge talking point:** "This is the agentic finance primitive — agent pays in what it has, recipient gets what they want. No human approval required."

---

## [2:15 – 2:45] 0G — Decentralized Agent Memory (Track: 0G, $15K)

**Click:** Show console logs or a status panel showing `[0G] Agent registry loaded from 0G Storage`

**Say:**
> "Agent state — registry, message history, settlement records — is persisted on 0G's decentralized storage. Not a database we run. Not a JSON file. 0G KV store, accessible from any node."

**Show:** `agent/0gStorage.js` briefly — shows 0G KV client, namespace keys, fallback to local JSON.

**Judge talking point:** "This is what makes agents truly autonomous — their memory outlives any server. Any agent anywhere can look up another agent's state from 0G. That's the iNFT vision: intelligence that lives onchain."

---

## [2:45 – 3:00] Close

> "Four protocols, one trust layer. ENS for identity. AXL for communication. KeeperHub for execution. Uniswap for settlement. 0G for memory. AgentVerify."

---

## If Judges Ask…

**"Is the ENS integration real?"**
> "Yes — we call `provider.resolveName()` against the Sepolia ENS registry on every resolution. The namehash algorithm is correct per the ENS spec. Once agents have test ETH, we register the actual subdomain."

**"Is the Uniswap integration real?"**
> "Yes — we call Quoter V2 at `0xEd1f8fAd404D26D89c75A1d6b118570FD4203b48` on Sepolia. If you see `source: fallback`, it means that pair has no Sepolia liquidity — the contract call still happens, it just reverts on all fee tiers. Check our FEEDBACK.md for exactly this pain point."

**"Why 0G instead of Filecoin or Arweave?"**
> "0G's KV store gives us structured data access with low latency — we can query a specific agent's state without downloading an entire file. That's what real-time agent coordination needs."

**"Does KeeperHub actually work?"**
> "The integration calls their real API when `KEEPER_HUB_API_KEY` is set. For the demo, we're showing simulation mode — same interface, same audit trail, just locally executed. The code switch is one env variable."
