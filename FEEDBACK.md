# Uniswap Developer Platform — Builder Feedback

**Project:** AgentVerify — Trust & Identity Layer for AI Agents  
**Hackathon:** ETHGlobal 2025  
**Integration:** Uniswap V3 Quoter V2 + SwapRouter for autonomous agent-to-agent payments  

---

## What We Built

AgentVerify gives AI agents autonomous financial settlement via Uniswap V3. Agents discover each other via ENS, communicate via AXL (Gensyn P2P), and when one agent completes work for another, it settles payment by calling Uniswap directly — no human in the loop. The settlement layer handles token swaps (e.g., agent A pays in USDC, agent B wants DAI) with real Quoter V2 quotes before executing.

---

## What Worked Well

### Quoter V2 staticCall pattern
Once we understood that `quoteExactInputSingle` needs `contract.quoteExactInputSingle.staticCall(params)` in ethers v6 (not a plain call), it worked cleanly. The struct-based params in Quoter V2 are cleaner than V1's individual args.

### Pool fee tier auto-discovery
Trying multiple fee tiers (100 → 500 → 3000 → 10000) until one returns a valid quote was a good pattern. No documentation explicitly told us to do this — we figured it out by trial and error. Would help to have it documented.

### SwapRouter02 interface
Having both V2 and V3 routes in one router (`0x68b3465833fb72B5A828cCEEaC9BF242352bECA5`) simplified the integration significantly.

---

## Pain Points & Bugs

### 1. Sepolia liquidity is sparse and unpredictable
**Problem:** Most token pairs on Sepolia have zero or near-zero liquidity. Quoter V2 reverts (doesn't return an error — it just reverts) when there's no pool for a pair/fee combination. This means you need try/catch around every fee tier, and the error message is unhelpful (`"execution reverted"` with no reason string).

**What we did:** Try all 4 fee tiers, fall back to hardcoded rates if all fail. Not a real solution for production agents.

**Request:** A Sepolia liquidity bootstrapping guide or a maintained test pool set would save every hackathon team hours.

### 2. `uniswap-ai` package has almost no documentation
**Problem:** The GitHub link to `uniswap-ai` was listed in the prize resources but the README had no working examples for agent payment flows. There was no example of "agent A calls Uniswap to pay agent B" end-to-end.

**Request:** One 50-line example showing: get quote → approve token → execute swap → confirm receipt. That's all we needed.

### 3. Token approval before swap is not obvious for agents
**Problem:** Agents need to `approve()` the SwapRouter before `exactInputSingle()`. This requires a separate transaction, which for autonomous agents means managing a two-step flow with potential race conditions. No clear guidance in the docs on how agentic systems should handle this.

**Request:** Document the approval pattern for autonomous agents specifically — ideally with permit2 so it's a single signature.

### 4. Quoter V2 ABI struct format differs from what the SDK exports
**Problem:** `@uniswap/v3-sdk`'s exported ABI does not match the actual deployed Quoter V2 struct format for `quoteExactInputSingle`. We had to hand-write the ABI as:
```
'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
```
This took ~45 minutes to figure out. A copy-paste ABI snippet in the docs would eliminate this entirely.

### 5. No agent-native payment primitive
**Problem:** For AI agent use cases, what we really needed was: "agent wallet pays agent wallet X tokens, with optional swap." Uniswap V3 handles this but requires understanding pools, fees, deadlines, slippage, and approvals. The cognitive load for an agent (or agent developer) is high.

**Request:** A high-level `agentPay(fromToken, toToken, amount, recipient)` wrapper — either in the `uniswap-ai` package or as a documented pattern — would dramatically lower the barrier for agentic finance.

---

## Missing Endpoints / Features

- **Quote streaming:** We needed real-time price updates for the dashboard. A WebSocket or SSE endpoint for live Uniswap quotes would be very useful.
- **Batch quotes:** Quoting multiple pairs at once (for a multi-agent settlement round) requires N separate calls. A batch endpoint would help.
- **Testnet status page:** Is the Sepolia USDC/WETH pool actually liquid right now? A status page for testnet pools would save debugging time.

---

## What We Wish Existed

1. A **one-function agent payment SDK** — `uniswap.agentPay(params)` that handles approval + quote + swap atomically
2. A **maintained Sepolia test environment** with known-good liquidity across major pairs
3. **Permit2 integration examples** for agents that can't do multi-step flows

---

## Overall DX Rating: 6/10

The protocol itself is excellent. The agent-specific DX has room to grow — the existing tools are built for human-driven dApps, not autonomous systems. With the `uniswap-ai` package and better agentic examples, this could easily be 9/10.
