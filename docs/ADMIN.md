# FITR8 admin

One staff admin at `/admin` for every internal tool. The blog is the first section; more
(users, foods, reports…) plug into the same sign-in, roles, guard and menu.

```
/admin/login        Google sign-in (dev email sign-in locally)
/admin              Home: one card per section + the team
/admin/team         Staff and roles (everyone sees it; admins change it)
/admin/no-access    Signed in, but not staff
/admin/blog/*       Blog section (docs/BLOG.md)
/admin/feedback     Feedback section: users' in-app feedback (admins only)
```

## Staff and roles

Staff sign in with their normal Google account; that creates an ordinary FITR8 user. Access is a
`staff_members` row owned by the `admin` module (`apps/api/src/modules/admin`).

| Role   | Everywhere                | Blog section                                                      |
| ------ | ------------------------- | ----------------------------------------------------------------- |
| ADMIN  | Everything, plus the team | Everything                                                        |
| EDITOR | Runs content              | Publishes, edits every post, categories, tags, redirects, authors |
| AUTHOR | Contributes               | Writes own drafts; an editor publishes                            |

- Rules are pure functions: `@fitr8/domain/staff` (`staffCan`: the team) and each section's own map
  (`@fitr8/domain/blog` `blogCan`). The API enforces them; the web only hides what you can't do.
- **First admins:** `ADMIN_EMAILS` (Google emails, comma separated). In production set it as a GitHub repo
  variable (Settings → Secrets and variables → Actions → Variables; a secret of the same name also works); the next deploy passes it to the API. They become (and stay)
  ADMIN on first visit; the UI can't demote or remove them ("Set in ADMIN_EMAILS").
- **Inviting:** `/admin/team` → email + role. The row shows "Invited" until that account first opens
  `/admin`, then links to it. The last other admin can't be removed or demoted.
- Removing someone keeps their work (blog posts stay, without an author).

## API

- `GET /api/admin/me` → `AdminMeDto`: the staff member, `can.manageTeam`, and one permission block
  per section (`sections.blog`, `sections.feedback`). The web builds its menu from it.
- `GET/POST /api/admin/staff`, `PATCH/DELETE /api/admin/staff/:id`.
- Every `/api/admin/**` controller uses `@UseGuards(StaffGuard)` (after the global AuthGuard) and gets
  the caller with `@Staff() actor: StaffActor`. Not staff → 403 with the "no access" message.

## Adding a section

1. **Rules:** `packages/domain/src/<section>.ts` — a `<section>Can(role, action)` over `StaffRole`.
2. **API:** a module that imports `AdminModule`; its controller is `@Controller("admin/<section>")`
   with `@UseGuards(StaffGuard)` and `NoStoreInterceptor`. It owns its own tables; staff come from
   `StaffService`.
3. **Permissions:** add `sections.<section>` to `AdminMeDto` (`packages/contracts/src/admin.ts`) and
   fill it in `StaffService.me`.
4. **Web:** pages under `apps/web/src/app/admin/(panel)/<section>/` (they get the shell and
   `requireStaff()`), a group in `SECTIONS` (`components/admin/admin-nav.tsx`) and a card on the
   home page (`app/admin/(panel)/page.tsx`). Browser calls: `adminApi("/<section>/...")`.
5. **Tests:** `apps/api/test/<section>.e2e.spec.ts` (401, 403 for non-staff, role checks, happy path).

## Feedback section

Help & support → "Send feedback" in the app posts `POST /api/feedback` (signed in; strict per-minute
limit plus 5 messages per account per hour → 429). Rows live in `feedback` (owned by
`modules/feedback`; deleted with the account). `GET /api/admin/feedback?page=` lists them newest
first, 50 a page, with the sender's id, name and email so the team can reply. Only ADMIN may read
them (`@fitr8/domain/feedback` `feedbackCan`; others get 403 and the menu group is hidden). Web:
`app/admin/(panel)/feedback/page.tsx`, menu group "Support", card on the admin home. e2e
`test/feedback.e2e.spec.ts`.

## Code

- API: `modules/admin/` (`staff.service.ts`, `staff.guard.ts`, `admin.controller.ts`); e2e
  `test/admin.e2e.spec.ts`.
- Web: `app/admin/` (login, no-access, `(panel)/layout.tsx`), `components/admin/` (shell, nav,
  team, shared UI), `lib/admin/` (`adminApi`/`blogApi`, `requireStaff`).
