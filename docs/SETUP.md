# Setup guide — BA Fox Control Center

## 1. Create Telegram bot

1. Open Telegram.
2. Find `@BotFather`.
3. Send `/newbot`.
4. Bot name: `Executive Fox 🦊`.
5. Username: choose a unique username ending with `bot`.
6. Copy the bot token.
7. Do not commit the token to GitHub.

## 2. Local setup

```bash
git clone https://github.com/lizabd-web/mf-group-tracker.git
cd mf-group-tracker
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill `.env`:

```env
TELEGRAM_BOT_TOKEN=your_token_here
TELEGRAM_OWNER_CHAT_ID=your_chat_id_here
GOOGLE_SHEET_ID=1TJjQ0Uc_olOxL8kGW3tmd-e2wCfRoPkxbOEDOBs60F4
TIMEZONE=Asia/Bangkok
```

## 3. Run bot locally

```bash
python -m bot.main
```

Open Telegram and send `/start` to the bot.

## 4. MVP limitation

Current implementation uses Google Sheets as the live task store.

Reminder timezone should stay aligned with the product rule: `Asia/Bangkok`.

## 5. Safety

Never put real tokens or credentials into GitHub files.
Use `.env` locally and hosting environment variables in production.
