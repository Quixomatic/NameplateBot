# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
