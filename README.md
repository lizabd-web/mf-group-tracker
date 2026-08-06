# BA Fox Control Center 🦊

Personal Executive Assistant task-control system for Lisa.

## Быстрый вход для нового разработчика или ИИ-агента

Начните с [`docs/REPOSITORY_HANDOFF_RU.md`](docs/REPOSITORY_HANDOFF_RU.md): там актуальная архитектура, границы безопасности, карта кода и минимальный набор проверок. Новая обратная связь коллег собрана отдельно в [`docs/INCOMING_FEEDBACK_2026-07-21.md`](docs/INCOMING_FEEDBACK_2026-07-21.md); это backlog, а не уже реализованные изменения.

## Product ownership

- Product owner: Liza Kiseleva
- Product concept and workflow architecture: Liza Kiseleva
- Primary product attribution: Made by Liza Kiseleva
- Russian product attribution: Сделано Лизой Киселёвой
- Technical implementation is maintained through GitHub PR history.
- Protection and recovery guidance: [`docs/STAGE_26_6_PRODUCT_PROTECTION_AND_OWNERSHIP_SAFEGUARDS.md`](docs/STAGE_26_6_PRODUCT_PROTECTION_AND_OWNERSHIP_SAFEGUARDS.md)

## Purpose

BA Fox Control Center turns Lisa's daily Telegram-style BA workflow into a controlled task system:

1. Lisa sends daily `#итоги #ba` and `#план #ba` to ChatGPT.
2. ChatGPT parses the plan into structured tasks.
3. Tasks are stored in Google Sheets.
4. Telegram bot sends task cards with buttons.
5. Lisa updates task status by tapping buttons.
6. Evening summary is generated for review.
7. After Lisa confirms, the final text can be copied or later sent to a work chat.

## MVP stack

- Python
- aiogram 3.x
- Google Sheets as task database
- APScheduler for reminders
- Google Drive/Gmail/Zoom/Read AI/Gemini integration later

## Current Google Sheet

Рабочая Google Sheet предоставляется назначенным сотрудникам через
корпоративный доступ. Не публикуйте её прямую ссылку в репозитории.

## Test contour

- Dashboard: актуальная ссылка на тестовый контур выдаётся отдельно; не добавляйте URL тестового окружения в репозиторий.
- User guide for colleagues: [`docs/TEST_CONTOUR_USER_GUIDE_RU.md`](docs/TEST_CONTOUR_USER_GUIDE_RU.md)
- Code contribution guide: [`docs/CONTRIBUTOR_GUIDE_RU.md`](docs/CONTRIBUTOR_GUIDE_RU.md)
- GitHub tokens are not required for testers.
- Anonymous visitors cannot load task or user data.
- Registered pilot users see role-aware navigation; the personal task page is derived from their verified Google profile.

## MVP scope

### Included

- Telegram bot main menu
- Task list for today
- Task cards with inline buttons
- Status updates: done, in progress, remind later, postpone
- Google Sheets storage
- Daily report builder
- Reminder scheduler skeleton
- Free-text task creation with preview and confirmation
- Reports submenu

### Not included yet

- Direct WhatsApp reading
- Direct work-chat sending without Lisa confirmation
- Full Read AI/Gemini/Zoom automation
- ClickUp integration
- Direct Gmail API reconciliation inside the bot

## Security

Never commit real tokens, API keys, Google service account credentials, Telegram bot tokens, OpenAI keys, or personal data.

Use `.env` locally or hosting environment variables.

## Local setup

### 1. Clone / open project

```bash
cd ba-fox-control-center
```

### 2. Create and activate virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 4. Create `.env`

Copy `.env.example`:

```bash
cp .env.example .env
```

Fill real values:

```text
TELEGRAM_BOT_TOKEN=
TELEGRAM_OWNER_CHAT_ID=
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_FILE=service-account.json
TIMEZONE=Asia/Bangkok
```

For local mode, place `service-account.json` in the project root and do not commit it.

### 5. Run bot locally

```bash
python -m bot.main
```

Terminal must stay open while the bot runs.

## Telegram QA checklist

After launch:

1. Open `@ba_executive_fox_bot`.
2. Send `/start`.
3. Send `/myid`.
4. Click `🗓 Задачи на сегодня`.
5. Test `➕ Добавить задачу`.
6. Test `📥 Отчёты`.
7. Test `⚙️ Настройки`.

## Main menu

Current approved menu:

```text
🗓 Задачи на сегодня | ➕ Добавить задачу
✅ Выполненные       | ⏰ Напоминания
📥 Отчёты            | ⚙️ Настройки
```

Inside `📥 Отчёты`:

```text
📝 Собрать итоги
📥 Отчёты встреч
```

## Deployment / hosting

Local Terminal mode is only for testing.

For always-on bot operation, deploy as a background worker.

Recommended first MVP host:

```text
Railway
```

Alternative:

```text
Render background worker
```

Worker command:

```bash
python -m bot.main
```

This command is also stored in `Procfile`:

```text
worker: python -m bot.main
```

Railway start command is also fixed in `railway.json`:

```text
python -m bot.main
```

## Hosting environment variables

Set these in hosting dashboard:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_OWNER_CHAT_ID
GOOGLE_SHEET_ID
TIMEZONE=Asia/Bangkok
REMINDER_MODE=combo
GOOGLE_SERVICE_ACCOUNT_JSON
```

For hosting, recommended Google credentials mode is:

```text
GOOGLE_SERVICE_ACCOUNT_JSON
```

Paste the full Google service account JSON into the hosting secret/env variable as one-line JSON.

Do not commit service account files to GitHub.

## Important deployment rule

Only one polling bot instance should run at a time.

Before testing hosted deployment, stop the local bot:

```text
Ctrl+C
```

If local and hosted bot run together in polling mode, Telegram updates may conflict.

If Railway shows multiple worker services for this bot, keep only the worker that passes Telegram and Google Sheets smoke tests. Stop/delete/disconnect duplicate workers so they do not consume Telegram polling updates or report false failed GitHub statuses.

## Deployment QA checklist

1. Stop local bot.
2. Start hosted worker.
3. Open Telegram.
4. Send `/start`.
5. Send `/myid`.
6. Click `🗓 Задачи на сегодня`.
7. Add a test task.
8. Confirm Google Sheet update works.
9. Check hosting logs.
10. Confirm bot still responds when Mac is sleeping / Terminal closed.

## Current project docs

Important docs live in `/docs`:

```text
PROJECT_MAP.md
STAGE_1_SUMMARY.md
REPORTING_STANDARD.md
WEEKLY_REPORTING_STANDARD.md
REPORTS_CHAT_RULES.md
REPORTS_CHAT_PROMPT.md
REMINDER_RULES.md
SETUP_CHAT_RESPONSE_RULES.md
STAGE_4_GMAIL_RECONCILIATION_ARCHITECTURE.md
GMAIL_RECONCILIATION_SCENARIOS.md
FOLLOW_UP_TEMPLATE_LIBRARY.md
HOSTING_DEPLOYMENT_PLAN.md
```
