# Connect your agent to Abhed over MCP

This puts an MCP client's tool calls behind Abhed: each one is allowed, held for a person, or blocked, and goes on the signed ledger. It takes about 5 minutes.

**[Watch the guide](video/abhed-mcp-guide.mp4)** (1:12), which follows these same steps.

## What you need

- Node 18 or newer
- An MCP client that runs stdio servers, such as Cursor, Claude Desktop or VS Code with Continue or Cline
- An Abhed server: the hosted one at `https://abhed.onrender.com`, or your own

To run your own server, use a long random value for the secret. It signs the ledger and derives the agent keys.

```bash
git clone https://github.com/HarshDubey23/abhed
cd abhed
npm install
npm run build
KAVACH_AGENT_SECRET=<long-random-value> npm start
```

On PowerShell, set it first with `$env:KAVACH_AGENT_SECRET = "<long-random-value>"`, then run `npm start`.

Without Supabase settings, your own server keeps its state in memory, so a restart clears it.

## 1. Get a pairing code

Sign in to Abhed, then open **Connect** → **Abhed SDK** → **Generate pairing code**. The code has 6 characters, lasts 10 minutes and works once.

## 2. Get your agent key

Redeem the code from your server. Use your own server's address if you run one.

```bash
curl -X POST https://abhed.onrender.com/api/connect/pair \
  -H "content-type: application/json" \
  -d '{"code":"ABC123","site":{"url":"https://your-site.com","name":"Your Company","sector":"banking","agents":[{"id":"rex","name":"Rex"}]}}'
```

The answer has a `kv_live_` key for each agent. Treat each key as a secret, and give each agent only its own key.

**Pairing a company that isn't connected yet wipes its demo history.** Check this before you pair on a shared server.

On PowerShell, this keeps the key off your screen. Replace `ABC123` with your code:

```powershell
$body = '{"code":"ABC123","site":{"url":"https://your-site.com","name":"Your Company","sector":"banking","agents":[{"id":"rex","name":"Rex"}]}}'
$pair = irm https://abhed.onrender.com/api/connect/pair -Method Post -ContentType application/json -Body $body
$env:ABHED_AGENT_KEY = $pair.keys.rex
```

## 3. Check the connection

This speaks MCP to the real server, as your client will, and walks through every outcome one step at a time. It requests a real ₹40,000 refund on the fictional customer `C-1029`, so use a demo company.

```bash
git clone https://github.com/HarshDubey23/abhed-mcp
cd abhed-mcp
ABHED_AGENT_KEY=kv_live_your_key ABHED_URL=https://abhed.onrender.com npm run try
```

On PowerShell, set the address with `$env:ABHED_URL = "https://abhed.onrender.com"`, then run `npm run try`. If you didn't set the key above, set `$env:ABHED_AGENT_KEY` too.

| Step | What you should see |
|---|---|
| Declare the task | Your agent's name, and a task id |
| Safe read | `ALLOWED`, straight through |
| ₹5,00,000 refund | `BLOCKED`, with the rule that refused it |
| ₹40,000 refund | Waits. Open the **Approver app** in Abhed and approve it |
| After you approve | `APPROVED_WAITING_TO_COMMIT`. No money has moved yet |
| In the window | Press **Cancel this refund** to get `CANCELLED`, or wait for `COMMITTED` |

The seeded demo approvers use PIN `1234`. Don't use that PIN for anything real.

## 4. Add it to your client

**Cursor:** `~/.cursor/mcp.json`

**Claude Desktop:** `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS, or `%APPDATA%\Claude\claude_desktop_config.json` on Windows

```json
{
  "mcpServers": {
    "abhed": {
      "command": "npx",
      "args": ["-y", "github:HarshDubey23/abhed-mcp"],
      "env": {
        "ABHED_AGENT_KEY": "kv_live_your_key",
        "ABHED_URL": "https://abhed.onrender.com",
        "ABHED_APPROVAL_WAIT_SECONDS": "90"
      }
    }
  }
}
```

Restart the client. Its tool list should now include `abhed_start_task` and your agent's tools.

## 5. Tell the agent how to behave

Add this to its instructions:

> Call `abhed_start_task` first. If a tool returns `NEEDS_APPROVAL`, wait or check it with `abhed_check_approval`, and don't retry it. If it returns `APPROVED_WAITING_TO_COMMIT`, no money has moved, so check it with `abhed_check_commit` and don't tell anyone it's done. Never try to work around a block.

## What the agent gets back

| Result | Meaning | What the agent should do |
|---|---|---|
| `ALLOWED` | The tool ran | Use the output |
| `NEEDS_APPROVAL` | A person hasn't decided yet | Check again later, and don't retry |
| `APPROVED_AND_EXECUTED` | A person approved and it ran | Use the output |
| `APPROVED_WAITING_TO_COMMIT` | Approved, and a person can still cancel | Check it with `abhed_check_commit` |
| `BLOCKED` | Refused, with the rule named | Stop and tell the user |

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing or unknown Abhed agent key` | The key is wrong, or the server's secret changed. Pair again for a new key |
| `This company is not connected to Abhed` | Pair the company again, or restart your client after re-pairing |
| `This code has expired` | Codes last 10 minutes, so generate a new one |
| A held call returns the approval id | Nobody decided in time. Raise `ABHED_APPROVAL_WAIT_SECONDS`, or use `abhed_check_approval` |
| Tools don't appear | Run `npm run try` to rule out the connection, then check your client's config path and restart it |
| A long wait on the hosted server | The free instance sleeps, and the first request can take about a minute |

## What this does and doesn't protect

MCP only covers the tools that go through it. **If the agent also has a shell, direct network access or other tools with real credentials, it can go around Abhed.** Give it only the Abhed server, and keep the real credentials on the Abhed side. See [what's still open](ATTACK_REPORT.md#still-open).
