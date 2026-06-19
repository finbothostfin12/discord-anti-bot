# Discord Anti-Bot

A Discord bot that automatically detects and kicks botted accounts by monitoring image spam across multiple channels.

## How it works

- Tracks image attachments and embeds sent by each user
- If a user sends **3+ images in more than 2 channels** within a 60-second window, they are automatically kicked
- Admins and users with `ManageGuild` permission are exempt

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your bot token as an environment variable:
   ```bash
   DISCORD_BOT_TOKEN=your_token_here node bot.js
   ```

## Required Bot Permissions

- Read Messages / View Channels
- Read Message History
- Kick Members
- Send Messages
- **Message Content Intent** (enable in Discord Developer Portal → Bot → Privileged Gateway Intents)

> ⚠️ Your bot's role must be **higher in the hierarchy** than the users it's kicking.
