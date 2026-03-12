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
| `/verifyall` | Administrator | DM all unverified members in the server |
| `/reverify <member>` | Administrator | Re-send verification to a specific member |
| `/whois <member>` | Moderate Members | Look up a member's verified name |

## Setup

### Prerequisites

- Node.js 20+
- A Discord bot application with the following enabled:
  - **Bot** permissions: Manage Nicknames, Manage Roles, Send Messages
  - **Privileged Gateway Intents**: Server Members Intent, Message Content Intent
  - **OAuth2 scopes**: `bot`, `applications.commands`

### Discord Developer Portal Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to **Bot** and enable:
   - Server Members Intent
   - Message Content Intent
4. Copy the bot token
5. Go to **OAuth2 > URL Generator**, select `bot` + `applications.commands`
6. Select permissions: Manage Nicknames, Manage Roles, Send Messages, Read Messages
7. Use the generated URL to invite the bot to your server

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
node src/deploy-commands.js   # Register slash commands (run once)
pnpm start
```

### Running with Docker

```bash
docker compose up -d
```

To register slash commands inside the container:

```bash
docker compose exec nameplate node src/deploy-commands.js
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

## Important Notes

- The bot's role must be **higher** in the role hierarchy than any member it needs to nickname
- The bot **cannot** change the server owner's nickname (Discord limitation)
- Make sure the `Verified` role is positioned correctly in your channel permissions to gate access

## License

MIT
