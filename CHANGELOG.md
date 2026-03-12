# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
