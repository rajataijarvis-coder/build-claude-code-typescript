# Build Claude Code in TypeScript

A hands-on course implementing Anthropic's Claude Code architecture from scratch in TypeScript. Based on the reverse-engineered architecture patterns from alejandrobalderas/claude-code-from-source.

## Course Overview

**Duration**: 18 tutorials (one per chapter)  
**Goal**: Build a fully functional AI coding agent in TypeScript  
**Prerequisites**: TypeScript, Node.js, basic CLI knowledge  
**Output**: Working agent with terminal UI, tool execution, sub-agents, and MCP support

## Architecture Map

```
┌─────────────────────────────────────────────────────────────┐
│                    Terminal UI (Ink)                         │
├─────────────────────────────────────────────────────────────┤
│                    State Manager                             │
├─────────────────────────────────────────────────────────────┤
│  Agent Loop → Tool Manager → Sub-Agent Spawner → Memory   │
├─────────────────────────────────────────────────────────────┤
│                    API Layer (Claude API)                    │
├─────────────────────────────────────────────────────────────┤
│              MCP Client → Local Tools → Commands            │
└─────────────────────────────────────────────────────────────┘
```

## Tutorial Structure

### Part 1: Foundations (Tutorials 1-3)
1. **Bootstrap Architecture** - Project setup, DI container, state management
2. **API Layer** - Multi-provider client, streaming, error recovery
3. **State & Config** - Two-tier architecture, cost tracking, permission system

### Part 2: The Agent Core (Tutorials 4-7)
4. **Agent Loop** - AsyncGenerator pattern, query system, token budgets
5. **Tool System** - 14-step pipeline, permission hooks, result handling
6. **Concurrent Execution** - Partition algorithm, read/write safety, streaming
7. **Context Compression** - 4-layer compression (snip, microcompact, collapse, autocompact)

### Part 3: Multi-Agent (Tutorials 8-10)
8. **Sub-Agent Spawner** - AgentTool, lifecycle management, built-in types
9. **Fork Agents** - Byte-identical prefix trick, cache sharing, cost optimization
10. **Coordination** - Task state machine, coordinator mode, swarm messaging

### Part 4: Memory & Extensibility (Tutorials 11-12)
11. **Memory System** - File-based memory, LLM recall, staleness handling
12. **Skills System** - Two-phase loading, lifecycle hooks, security snapshots

### Part 5: Terminal UI (Tutorials 13-14)
13. **Terminal UI** - Custom Ink renderer, double-buffer, component pools
14. **Input Handling** - Key parsing, keybindings, vim mode, chords

### Part 6: Integration (Tutorials 15-16)
15. **MCP Protocol** - 8 transports, OAuth, tool wrapping
16. **Remote Control** - Bridge v1/v2, cloud execution, upstream proxy

### Part 7: Polish (Tutorials 17-18)
17. **Performance** - Startup optimization, context window management, search
18. **Final Integration** - Complete working agent, testing, deployment

## Key Patterns We'll Implement

- **AsyncGenerator as Agent Loop** - Yields messages, typed returns, backpressure
- **Speculative Execution** - Start read-only tools during streaming
- **Concurrent Batching** - Partition by safety, parallel reads, serialized writes
- **Fork for Cache Sharing** - Parallel children share byte-identical prefixes
- **4-Layer Compression** - Progressive context reduction
- **LLM Recall for Memory** - Sonnet side-queries select relevant memories
- **Two-Phase Skill Loading** - Fast startup, lazy content loading
- **Sticky Latches** - Cache stability once beta headers sent
- **Slot Reservation** - 8K default, escalate to 64K on need

## Getting Started

```bash
git clone https://github.com/rajataijarvis-coder/build-claude-code-typescript.git
cd build-claude-code-typescript
npm install
npm run dev
```

## Each Tutorial Includes

- ✅ Working TypeScript code
- ✅ Architecture explanation
- ✅ Pattern rationale
- ✅ Testing approach
- ✅ Git commit point
- ✅ Blog post write-up

## License

Educational purposes only. No proprietary code from Claude Code included.
