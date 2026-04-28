# NameplateBot

A Discord bot that verifies server members by collecting their real name and setting it as their server nickname. Members must provide their first name and at least their last initial to gain access.

## How It Works

1. A new member joins the server (or an admin runs `/verifyall`)
2. The bot DMs the member asking for their real name
3. The member replies with their name (e.g., "James S" or "James Smith")
4. The bot validates the format, sets their server nickname, and assigns the **Verified** role
5. If the member doesn't respond, the bot sends periodic reminders

## Slash Commands

| Command | Permission | Description |
|---------|-----------|-------------|
| `/setname <name>` | Everyone | Set or update your verified name |
| `/config namemode <mode>` | Administrator | Set the name format requirement (first_only, first_initial, full_name) |
| `/config logchannel [#channel]` | Administrator | Set the verification log channel (omit channel to disable) |
| `/config quarantinecategory [category]` | Administrator | Set the category quarantine channels are created under (omit to clear) |
| `/config quarantinemaxage <hours>` | Administrator | Hours before a quarantine channel auto-closes (default 168) |
| `/config verifierroles add <role>` | Administrator | Add a role to the verifier list (gets access to quarantine channels alongside admins) |
| `/config verifierroles remove <role>` | Administrator | Remove a role from the verifier list |
| `/config view` | Administrator | View current server settings |
| `/verifyall` | Administrator | DM all unverified members in the server |
| `/verifyall dryrun:true` | Administrator | Preview how many members would receive DMs |
| `/reverify <member>` | Administrator | Re-send verification to a specific member |
| `/adminverify <member>` | Administrator | Manually verify a member without changing their nickname |
| `/quarantine <member>` | Administrator | Open a private channel with the member and admins to collect their name |
| `/resolve [name]` | Administrator | Resolve the current quarantine channel (in-channel only) |
| `/abandon` | Administrator | Abandon the current quarantine channel without verifying (in-channel only) |
| `/whois <member>` | Moderate Members | Look up a member's verified name |
| `/stats` | Moderate Members | View verification statistics for the server |

## Context Menu Commands

Right-click any user > **Apps** to access these commands:

| Command | Permission | Description |
|---------|-----------|-------------|
| **Admin Verify** | Administrator | Manually verify a member without changing their nickname |
| **Re-verify** | Administrator | Re-send verification to a specific member |
| **Quarantine** | Administrator | Open a private channel with the member and admins to collect their name |
| **Who Is** | Moderate Members | Look up a member's verified name |

## Name Modes

Configurable per server via `/config namemode`:

| Mode | Description | Examples |
|------|-------------|---------|
| `first_only` | Just a first name | James, Mary |
| `first_initial` | First name + last initial (default) | James S, Mary W. |
| `full_name` | First and last name | James Smith, Mary Watson |

## Setup

### Prerequisites

- Node.js 20+
- A Discord bot application with the following enabled:
  - **Bot** permissions: Manage Nicknames, Manage Roles, Manage Channels, Send Messages
  - **Privileged Gateway Intents**: Server Members Intent, Message Content Intent
  - **OAuth2 scopes**: `bot`, `applications.commands`

### Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** and enable:
   - Server Members Intent
   - Message Content Intent
4. Copy the bot token
5. Go to **Installation** and set up Guild Install with scopes `bot` + `applications.commands` and permissions integer `402654256`
6. Use the generated install link to invite the bot to your server

### Configuration

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | *required* |
| `CLIENT_ID` | Application/Client ID | *required* |
| `VERIFIED_ROLE_NAME` | Name of the role to assign | `Verified` |
| `REMINDER_INTERVAL_HOURS` | Hours between reminders | `24` |
| `MAX_REMINDERS` | Max reminders before giving up (0 = unlimited) | `3` |

### Running Locally

```bash
pnpm install
pnpm start
```

Slash commands are registered automatically on startup.

### Running with Docker

```bash
docker compose up -d
```

### Running with GHCR Image

After pushing a version tag, the image is published to GitHub Container Registry:

```yaml
services:
  nameplate:
    image: ghcr.io/Quixomatic/NameplateBot:latest
    container_name: nameplate
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/app/data
```

## Quarantine Channels

When DMs and reminders fail, an admin can run `/quarantine <member>` (or right-click → Quarantine) to spawn a private channel containing the member, the bot, and all admins. The bot pings the member there asking for their real name. The channel persists until:

- The member replies with a valid name (nickname set, role assigned, channel auto-deletes after 60s)
- An admin runs `/resolve [name]` from inside the channel (with optional name override; auto-deletes after 60s)
- An admin runs `/abandon` from inside the channel (marks the member as maxed-out, auto-deletes after 30s)
- The channel exceeds `quarantinemaxage` hours (default 168 / 7 days) and is auto-closed by the hourly sweep

By default everyone with the `Administrator` permission gets access. Use `/config verifierroles add <role>` to also include moderator-style roles.

## Important Notes

- The bot's role must be **higher** in the role hierarchy than any member it needs to nickname
- The bot **cannot** change the server owner's nickname (Discord limitation)
- Make sure the `Verified` role is positioned correctly in your channel permissions to gate access
- The Verified role is created automatically with a checkmark icon (on Boost Level 2+ servers)
- Quarantine channels need the **Manage Channels** permission. Existing installs that pre-date this feature may need to re-invite the bot or grant the permission via Server Settings → Roles.

## License

MIT
