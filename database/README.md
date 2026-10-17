# Database

SQL Server, database `JEE_Preparation_Platform`. Apply everything with:

```
node --env-file=.env.local scripts/migrate-db.mjs
```

Every file is idempotent (safe to re-run). Conventions: PascalCase tables, `Id INT IDENTITY` keys, every user-owned
table has `UserId` with `ON DELETE CASCADE` (deleting a user removes all of their data), UTC timestamps (`DATETIME2`).

| File | Tables | Replaces browser localStorage |
|---|---|---|
| `Users.sql` | `Users` | – (login/sign-up) |
| `Auth.sql` | `PasswordResetTokens` | – (password reset links) |
| `UserPreferences.sql` | `UserPreferences` | – (onboarding / profile) |
| `StudyPlan.sql` | `StudyPlans`, `StudyPlanTasks`, `ChapterProgress` | `jee-plan`, `jee-completed`, `jee-done`, `jee-scores`, `jee-chapters-done` |
| `Practice.sql` | `PracticeAnswers`, `MistakeBook` | `jee-answers`, `jee-mistakes` |
| `Tests.sql` | `TestAttempts`, `TestAttemptAnswers`, `ContestRegistrations` | `jee-contest-active/history`, `jee-mock-active/history`, `jee-challenge`, `jee-time` |
| `Engagement.sql` | `UserSettings`, `NotificationReads`, `MentorRequests` (worked through at `/admin/mentor-requests`) | `jee-theme`, `jee-notif-read` |
| `PYQ.sql` | `PyqSubjects`, `PyqChapters`, `PyqTopics`, `PyqQuestions`, `PyqOptions`, `PyqAttempts` | – (question bank + student PYQ answers) |

## Relationships

```
Users ─┬─ UserPreferences (1:1)          Users ─┬─ TestAttempts ── TestAttemptAnswers
       ├─ UserSettings (1:1)                    ├─ ContestRegistrations
       ├─ StudyPlans ── StudyPlanTasks          ├─ PracticeAnswers
       ├─ ChapterProgress                       ├─ MistakeBook
       ├─ NotificationReads                     ├─ MentorRequests
       └─ PyqAttempts ── PyqQuestions ── PyqOptions
                              └── PyqTopics ── PyqChapters ── PyqSubjects
```

## Derived, not stored

Streaks, accuracy, weekly study minutes, and the "done" log are calculated from `PracticeAnswers`, `StudyPlanTasks`
(`CompletedAt`, `Minutes`) and `TestAttempts` (`TimeTakenMs`) so there is a single source of truth for each fact.

## How the app reads and writes this data

All of a student's data goes through `lib/user-data.js` (server) and the routes under `app/api/me/`:

| Route | Purpose |
|---|---|
| `GET /api/me/state?today=&contest=` | everything the dashboard needs, in one call |
| `PUT/PATCH /api/me/plan` | save today's plan / tick a task |
| `POST /api/me/practice` | log answered practice questions |
| `POST/PATCH/DELETE /api/me/mistakes` | mistake book |
| `PUT/DELETE/POST /api/me/tests` | autosave a running test / discard it / submit it |
| `PUT /api/me/contest-registration` | weekly challenge registration |
| `PUT /api/me/notifications` | mark notifications read |
| `PUT /api/me/settings` | theme |
| `POST /api/me/mentor-requests` | request a mentor |
| `GET /api/me/leaderboard?contest=` | rank, percentile and top 10 for a weekly contest |
| `POST /api/me/import` | one-time move of data an older version kept in the browser |

The only thing still in the browser is a copy of the theme (`jee-theme`), so the right colours show before the page loads.

## Password reset

`POST /api/auth/forgot-password` emails a one-hour, single-use link (only a SHA-256 hash of the token is stored in `PasswordResetTokens`);
`GET/POST /api/auth/reset-password` checks the link and sets the new password. Configure email with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS`, `MAIL_FROM` and set `APP_URL` (the public site address) in `.env.local`. Without `SMTP_HOST` the link is printed in the server console instead.
