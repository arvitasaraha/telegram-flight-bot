# Telegram Flight Search Bot

A Telegram bot that searches Google Flights via SerpAPI and returns live results.

## Usage

Send messages like:
- `flights HEL to ICN in February`
- `flights from Helsinki to Seoul in March`
- `HEL ICN February`

## Local Setup

```bash
cd telegram-flight-bot
npm install
cp .env.example .env
# Edit .env and fill in BOT_TOKEN and SERPAPI_API_KEY
node index.js
```

## Deploy to Railway

1. Push this directory to a GitHub repository
2. Go to https://railway.app → New Project → Deploy from GitHub repo
3. Set environment variables in Railway:
   - `BOT_TOKEN` — from @BotFather
   - `SERPAPI_API_KEY` — your SerpAPI key
4. Railway auto-detects Node.js and runs `npm start`

## Restricting Access

To limit the bot to specific users, set `ALLOWED_USER_IDS` to a comma-separated list of
Telegram user IDs. Leave it empty to allow everyone.

To find your Telegram user ID, message **@userinfobot** in Telegram — it replies with your numeric ID.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `SERPAPI_API_KEY` | SerpAPI API key from serpapi.com/manage-api-key |
| `ALLOWED_USER_IDS` | Optional. Comma-separated Telegram user IDs (e.g. `123456789,987654321`). Leave empty to allow all users. |
