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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `BOT_TOKEN` | Telegram bot token from @BotFather |
| `SERPAPI_API_KEY` | SerpAPI API key from serpapi.com/manage-api-key |
"# telegram-flight-bot" 
