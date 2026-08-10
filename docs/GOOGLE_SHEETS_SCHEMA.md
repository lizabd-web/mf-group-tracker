# Google Sheets schema

Main spreadsheet: BA Fox Control Center

## Tasks

| Column | Name | Description |
|---|---|---|
| A | ID | Stable task ID, e.g. `BA-20260514-001` |
| B | Дата | Task date |
| C | Категория | Task category |
| D | Организация / контакт | Company, person, or project |
| E | Задача | Short task name |
| F | Шаги для Лизы | Step-by-step instructions |
| G | Источник | Plan, Gmail, Drive, Read AI, Gemini, Zoom, Manual |
| H | Приоритет | High / Medium / Low |
| I | Дедлайн | Date/time or today |
| J | Режим напоминаний | Soft / Hard / Combo |
| K | Статус | Not started, in progress, waiting, push, done, postpone |
| L | Следующее напоминание | Next reminder timestamp |
| M | Итог / комментарий | Result or Lisa's notes |
| N | Канал | ChatGPT, Telegram, Gmail, WhatsApp, etc. |
| AI | Parent Task ID | ID родительской задачи. Пусто для верхнего уровня; позволяет неограниченную вложенность. |
| AJ | Project ID | Связь с конкретным направлением, банком или иной подгруппой из листа Projects. |

## Projects

| Column | Name | Description |
|---|---|---|
| A-J | Existing project fields | ID, name, department, owner, status, description and audit fields. |
| K | Parent Project ID | ID родительской группы. Пусто для верхнего уровня; позволяет дерево «направление → банк → задачи». |

## Daily Reports

Stores daily input and generated output.

## Meetings Inbox

Temporary inbox for Read AI / Gemini / Zoom reports before action items become tasks.

## Settings

Reference values for categories, statuses, reminder modes, and bot templates.

## Organizations

Optional lightweight contact/organization tracker.

## Templates

Reusable Telegram messages and report templates.
