# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Quarantine channel feature: `/quarantine <member>` (and right-click context menu) creates a private channel containing the member, the bot, and all admins. The bot pings the member there for their real name.
- `/resolve [name]` (admin, in-channel) finalizes a quarantine, optionally overriding the nickname.
- `/abandon` (admin, in-channel) closes a quarantine without verifying, marking the member as maxed-out.
- Members can self-resolve a quarantine by replying in the channel with a valid name.
- `/config verifierroles add|remove <role>` to grant additional roles access to quarantine channels alongside admins.
- `/config quarantinecategory [category]` to nest quarantine channels under a category.
- `/config quarantinemaxage <hours>` to control auto-close timeout (default 168h / 7 days).
- Hourly sweep cleans up quarantine channels for members who left, channels deleted out of band, and channels older than the configured max age.
- New audit log events for quarantine create / resolve (by user or admin) / abandon, posted to the existing log channel.

### Changed
- Bot now requires the **Manage Channels** permission and the `GuildMessages` intent. Re-invite or grant the permission manually for existing deployments.

## [1.1.0] - 2026-03-12

### Fixed
- Increase verifyall rate limit delay to 3s to avoid Discord gateway rate limits

## [1.0.9] - 2026-03-12

### Added
- Verification log channel via `/config logchannel #channel`
- Logs posted for: member verified, admin verified, DM failed, max reminders reached, re-verification sent
- `/config view` now shows the configured log channel

## [1.0.8] - 2026-03-12

### Added
- `/verifyall dryrun:true` option to preview how many members would receive DMs
- `/stats` command showing verification statistics (verified, pending, maxed out counts)

## [1.0.7] - 2026-03-12

### Added
- Right-click user context menu commands: **Admin Verify**, **Re-verify**, **Who Is**

## [1.0.6] - 2026-03-12

### Added
- `/adminverify` command — manually verify a member without changing their nickname (Admin)

## [1.0.5] - 2026-03-12

### Added
- ASCII art startup banner with version number in container logs

## [1.0.4] - 2026-03-12

### Fixed
- Fix `/reverify` timing out on Discord interactions by deferring the reply
- Prevent bot crash when interaction expires before error reply can be sent

## [1.0.3] - 2026-03-12

### Fixed
- Fix better-sqlite3 native bindings not compiling in Docker (pnpm was blocking build scripts)

## [1.0.2] - 2026-03-12

### Fixed
- Ready event deprecation warning (ready -> clientReady) for discord.js v15 compatibility

## [1.0.1] - 2026-03-12

### Added
- Per-server configurable name mode via `/config namemode`:
  - `first_only` — just a first name
  - `first_initial` — first name + last initial (default)
  - `full_name` — first and last name required
- `/config view` command to see current server settings
- DM prompts, reminders, and validation now reflect the server's configured name mode

## [1.0.0] - 2026-03-12

### Added
- Core bot with Discord.js v14
- Automatic DM verification flow on member join
- Name validation requiring first name + at least last initial
- Automatic "Verified" role assignment on successful verification
- Periodic reminder system for unverified members (configurable interval and max reminders)
- SQLite database for tracking pending and verified members
- Slash commands:
  - `/setname` - Set or update your verified name
  - `/verifyall` - (Admin) Send verification DMs to all unverified members
  - `/reverify` - (Admin) Re-send verification to a specific member
  - `/whois` - (Mod) Look up a member's verified name
- Docker and docker-compose support
- GitHub Actions workflow for tag-based Docker image publishing to GHCR
