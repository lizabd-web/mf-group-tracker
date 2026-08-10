# BA Fox / Executive Fox — Project Map

## Purpose

This document is the current map of the BA Fox / Executive Fox project.

It shows:

- what has already been built;
- what works now;
- what is pending;
- what rules are approved;
- what stages are next;
- what is paused or legacy.

## Current project role

BA Fox / Executive Fox is Lisa's EA operating system.

V2 target connects:

```text
ChatGPT → thinking / analysis / reporting / Gmail reconciliation
Google Sheets → source of truth / task database
Apps Script → backend / automation / reminders
Web/PWA → main mobile dashboard
Google Chat → notification / quick-command layer
Gmail → inbox context / partner follow-up / reconciliation source
GitHub → project memory / technical documentation / stage tracking
```

Telegram/Railway is now a legacy/paused path. Keep the code for reference and fallback, but do not treat it as the primary V2 direction.

## Source of truth

Main sources:

```text
Google Sheet: BA Fox Control Center / Tasks
GitHub repo: lizabd-web/mf-group-tracker
GitHub issue #1: operational stage tracking
```

Key docs:

```text
docs/STAGE_1_SUMMARY.md
docs/REPORTING_STANDARD.md
docs/WEEKLY_REPORTING_STANDARD.md
docs/REPORTS_CHAT_RULES.md
docs/REPORTS_CHAT_PROMPT.md
docs/REMINDER_RULES.md
docs/SETUP_CHAT_RESPONSE_RULES.md
docs/STAGE_4_GMAIL_RECONCILIATION_ARCHITECTURE.md
docs/BA_FOX_V2_APPS_SCRIPT_WEB_CHAT_PLAN.md
docs/STAGE_29_2_USER_PILOT_QA_PACKAGE.md
docs/STAGE_30_TEAM_DASHBOARD_ARCHITECTURE.md
docs/STAGE_31_IDENTITY_USERS_ROLES_PROFILE.md
docs/STAGE_32_APPS_SCRIPT_IDENTITY_USERS_READ_MODEL.md
docs/STAGE_33_GOOGLE_IDENTITY_ENFORCEMENT_AND_VISIBILITY.md
docs/STAGE_34_GOOGLE_CLIENT_ID_OAUTH_QA.md
docs/STAGE_35_TASK_IDENTITY_SCHEMA_AND_MEMBER_VISIBILITY.md
docs/STAGE_36_VISIBILITY_DRY_RUN_AND_TASK_IDENTITY_MIGRATION.md
docs/STAGE_37_CONTROLLED_PILOT_READINESS.md
docs/STAGE_38_LIVE_PILOT_EVIDENCE_AND_OPTIONAL_MIGRATION_QA.md
docs/PROJECT_MAP.md
```

## Chat separation

### Setup / automation chat

Recommended title:

```text
BA Fox — Setup & Automation / Control Center
```

Purpose:

- bot setup;
- Google Sheets logic;
- Gmail reconciliation architecture;
- reminders;
- GitHub memory;
- integration planning;
- technical QA;
- deployment planning.

Approved response format in this chat:

```text
1) что сделал
2) предложение
3) этап из плана
4) подтверждение от меня в формате окей
```

### Reports chat

Recommended title:

```text
BA Fox — EA Reports / День и Неделя
```

Purpose:

- daily EA reports;
- weekly EA reports;
- raw notes;
- plans;
- final reports for Theodor / team;
- owner-style rewriting.

## Approved reporting principles

Daily reports use:

```text
✅ DONE / финализация
🔄 В работе / под контролем
⚠️ Блокеры / управление рисками
⏳ Wait list / зафиксировано
🎯 Фокус
```

Weekly reports use:

```text
📌 Executive summary
✅ Закрыто / финализировано
🔄 Продвинуто / под контролем
⚠️ Блокеры / управление рисками
⏳ Wait list / внешние зависимости
📂 По направлениям
🎯 Фокус следующей недели
🧩 Нужно решение / ресурс
```

Core reporting rule:

```text
result → status → next action → deadline / control point
```

Reports should not sound like tasks are dragging.

Weak standalone wording to avoid:

```text
жду
в процессе
попробую
пинговала
делала
занималась
нет ответа
не успела
```

## Reminder rules

Approved rule:

```text
Рабочие — только будние.
Личные — каждый день.
Часовой пояс — Bangkok / Asia/Bangkok.
```

Work reminders:

```text
Monday–Friday, 10:00 Asia/Bangkok
```

Personal reminders:

```text
Daily, 14:00 Asia/Bangkok
```

Work and personal tasks must stay visually and logically separate.

## Stage status

## V2 — Apps Script / Web / Google Chat

Status:

```text
Active architecture direction / documentation in progress
```

Decision:

```text
BA Fox V2 = Google Sheets + Apps Script + Web/PWA + Google Chat.
```

Primary plan:

```text
docs/BA_FOX_V2_APPS_SCRIPT_WEB_CHAT_PLAN.md
```

V2 responsibilities:

- Google Sheets remains the source of truth.
- Apps Script becomes backend, automation, and reminder layer.
- Web/PWA becomes the main mobile dashboard.
- Google Chat starts as notification-only MVP.
- ChatGPT remains planning, reporting, and reconciliation layer.

Guardrails:

- Telegram/Railway remains legacy/paused.
- Do not delete Telegram bot code yet.
- Do not pay Railway for V2 unless explicitly re-approved.
- Do not expose secrets.
- Do not connect live Gmail automation yet.

## Stage 1 — Foundation / Telegram MVP

Status:

```text
Complete
```

Built:

- Telegram bot `@ba_executive_fox_bot`;
- Google Sheet connection;
- task reading from Google Sheet;
- Telegram dashboard;
- category buttons;
- task status buttons;
- free-text task creation;
- preview and confirmation flow;
- Gmail forwarding setup for Thai/Lao inboxes;
- labels `EA Thai` and `EA Lao`.

## Stage 2 — Gmail reconciliation v1 / manual hybrid check

Status:

```text
Complete enough for MVP / manually tested
```

Done:

- Gmail was checked manually through ChatGPT;
- relevant tasks were reconciled with email status;
- confirmed updates were applied to Google Sheet;
- follow-up texts were drafted;
- PayConnect was identified but not activated because Lisa did not recognize the context.

Key status decisions:

- Bitazza → urgent / in progress;
- Kasikorn → urgent / in progress;
- BCEL → push until Monday;
- P3 → push / alternative channel;
- GLN → push / alternative channel;
- APEC → push / remind Andrey;
- Shobana → completed / interaction closed;
- JDB virtual card → wait list / vendor does not provide it;
- Super Rich → offer not sent yet.

## Stage 3 — Telegram bot QA

Status:

```text
Functionally passed, pending Monday task rollover QA
```

Confirmed working:

- local bot startup;
- Telegram API connectivity after network/VPN fix;
- `/start`;
- `/myid`;
- `🗓 Задачи на сегодня`;
- `➕ Добавить задачу`;
- free-text task preview;
- user-entered free task text is removed after preview generation;
- main menu works with 6 buttons;
- `📝 Собрать итоги` moved into `📥 Отчёты`.

Current main menu:

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

Pending:

```text
Monday QA — verify tasks for 2026-05-18 in Telegram dashboard.
```

## Stage 4 — Gmail reconciliation automation

Status:

```text
Architecture approved, implementation blocked until Monday QA passes
```

Approved MVP model:

```text
ChatGPT → Gmail reconciliation intelligence
Telegram bot → task/status UI
Google Sheet → control center / source of truth
```

Deferred:

```text
Direct Gmail API integration inside local Telegram bot.
```

Stage 4.1 after Monday QA:

```text
Add 📬 Сверить почту inside 📥 Отчёты.
```

MVP behavior:

```text
Сверка почты пока запускается через ChatGPT.
Напиши в setup-чате: “запусти Gmail reconciliation”.
После анализа я покажу статусы, follow-up тексты и что обновить в таблице.
```

## Stage 5 — Hosting / deployment

Status:

```text
Legacy/paused for V2
```

Goal:

Original goal was to make the Telegram bot run without Lisa keeping Terminal open.

Current V2 decision:

```text
Do not continue Railway as the primary path for BA Fox V2.
```

Possible options:

- Render;
- Railway;
- Fly.io;
- VPS;
- lightweight cloud instance.

Railway duplicate worker cleanup may still be needed to avoid false GitHub statuses or billing, but Railway is not the V2 runtime target.

## Stage 6 — Personal tasks architecture

Status:

```text
Not started / safe to design before Monday
```

Known personal tasks:

- order Nikita's shampoo, conditioner and styling gel;
- open oils and record a review;
- buy / order kettle;
- order cat litter;
- check Tuleo diffuser.

Current rule:

```text
Personal reminders are daily at 14:00 Asia/Bangkok.
```

Future decision:

- separate personal mode inside BA Fox;
- separate Telegram button;
- separate bot;
- or future app with work/personal separation.

## Monday QA checklist

Date:

```text
2026-05-18
```

Time:

```text
10:10 Asia/Bangkok reminder created
```

Checklist:

1. Start local bot if needed.
2. Open `@ba_executive_fox_bot`.
3. Click `🗓 Задачи на сегодня`.
4. Verify tasks for `2026-05-18` appear.
5. Confirm urgent focus includes:
   - Bitazza;
   - Kasikorn / KBankLao;
   - Super Rich;
   - BCEL;
   - P3;
   - GLN;
   - APEC;
   - relevant JDB wait-list items.
6. If tasks appear correctly: close Stage 3.
7. If tasks do not appear: debug date filtering before Stage 4.1.

## Current V2 deployment status

V2 replaces Railway deployment as the primary architecture path.

```text
V2.1 — Apps Script / Web / Google Chat plan: in progress.
V2.2 — Apps Script backend MVP: pending.
V2.3 — Web/PWA MVP connection: pending.
V2.4 — Google Chat notification MVP: pending.
Stage 29 — 2-user pilot QA package: ready for controlled pilot.
Stage 30 — team dashboard architecture overhaul: frontend/dashboard logic in progress.
Stage 31 — identity/users/roles/profile foundation: prepared, not enforced.
Stage 32 — Apps Script identity/users read model: profile route implemented, enforcement partial.
Stage 33 — Google identity verification/enforcement foundation: profile token verification prepared, dashboard filtering not enabled by default.
Stage 34 — Google Client ID setup and live OAuth QA: manual setup package ready, enforcement remains profile_only.
Stage 35 — task identity schema and member visibility foundation: optional columns supported, filtering not enabled by default.
Stage 36 — visibility dry-run and optional identity migration foundation: live QA passed, dashboard filtering remains off.
Stage 37 — controlled pilot readiness: runbook and dry-run preview QA prep, pilot paused.
Stage 38 — live pilot evidence and optional migration QA: evidence collection only, enforcement remains off.
Stage 39 — secure full test contour: Google-verified browser writes, zero public action token, migration and full write QA before employee access.
Telegram/Railway — legacy/paused.
```

Current operational rule:

```text
Do not delete Telegram code, but do not build V2 around Railway.
```

## Current next action

Continue V2 planning and Google-native implementation prep:

1. Approve V2 Apps Script / Web / Google Chat plan.
2. Prepare Google Sheets V2 schema update.
3. Create Apps Script backend scaffold.
4. Connect Web/PWA to Apps Script API.
5. Add Google Chat notification-only MVP.

Do not connect live Gmail automation until separately approved.
