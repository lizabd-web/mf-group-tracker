# iPhone setup: deploy BA Fox to Render

This path avoids local terminal setup.

## What you need

- iPhone
- GitHub account with repo access
- Telegram bot token from BotFather
- Render account

## Step 1 — Create Render account

1. Open Safari.
2. Go to Render.
3. Sign up / log in with GitHub.
4. Allow Render access to the `ba-fox-control-center` repository.

## Step 2 — Create worker service

Recommended option: use `render.yaml` blueprint from this repo.

1. In Render dashboard, create a new Blueprint / service from GitHub.
2. Choose repository: `lizabd-web/mf-group-tracker`.
3. Render will detect `render.yaml`.
4. Confirm service creation.

If blueprint is unavailable on mobile:

1. New +
2. Worker
3. Connect repository `ba-fox-control-center`
4. Runtime: Python
5. Build command: `pip install -r requirements.txt`
6. Start command: `python -m bot.main`

## Step 3 — Add environment variables

In Render service settings → Environment:

```env
TELEGRAM_BOT_TOKEN=token from BotFather
TELEGRAM_OWNER_CHAT_ID=
GOOGLE_SHEET_ID=1TJjQ0Uc_olOxL8kGW3tmd-e2wCfRoPkxbOEDOBs60F4
TIMEZONE=Asia/Bangkok
REMINDER_MODE=combo
MORNING_PROMPT_TIME=09:30
MIDDAY_CHECK_TIME=12:30
PUSH_CHECK_TIME=15:30
EVENING_REPORT_TIME=19:30
```

Do not put Telegram token in GitHub.

## Step 4 — Deploy

1. Press Deploy.
2. Wait until status is live/running.
3. Open Telegram.
4. Send `/start` to Executive Fox.

## Step 5 — Chat ID

For MVP, bot can respond to direct messages without `TELEGRAM_OWNER_CHAT_ID`.

For scheduled reminders, we need Lisa's Telegram chat ID. Next implementation step: add a handler that shows chat ID when Lisa taps Settings or sends `/start`.

## Note about free hosting

Render free workers may sleep or have plan limitations. For reliable daily reminders, paid always-on hosting or a small VPS may be needed later.
