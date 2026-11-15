# RCC Control Center setup

## Security model
- `admin.html` checks the active Supabase session before rendering. It redirects to `/index.html` unless the authenticated email matches `drillbobhii@gmail.com`.
- Every data read or mutation is handled by `functions/api/admin-dashboard.ts`. That function independently validates the bearer JWT with Supabase Auth and checks the exact administrator email again.
- The Supabase `service_role` key is read only in the Pages Function. It is never included in HTML, browser JavaScript, or API responses.
- The browser receives only sanitized user/payment data required by this console.

## Cloudflare Pages environment variables
Configure these as encrypted/server-side Pages environment variables (not `VITE_*` or client-exposed values):

- `SUPABASE_URL` = Supabase project URL.
- `SUPABASE_ANON_KEY` = Supabase anon/publishable key; the browser also uses the public key already in `admin.html`.
- `SUPABASE_SERVICE_ROLE_KEY` = service role secret (server-side only).
- `RCC_VIP_API_URL` = full HTTPS Railway endpoint, including `/vip/grant`.
- `RCC_VIP_WEBHOOK_SECRET` = the shared secret expected by Railway's VIP grant endpoint.

The admin allowlist is deliberately fixed in `functions/api/admin-dashboard.ts` to `drillbobhii@gmail.com`; changing it requires a reviewed code change.

## Database migration
Apply `supabase/migrations/20261115000300_admin_profile_flags.sql` in Supabase SQL Editor or through the project's migration workflow. It adds `is_creator` and `has_banner` to `profiles`, defaulting to false. The VIP entitlement itself remains in `rcc_vip_memberships.is_vip`; the existing `profiles.is_supporter` mirror is synchronized when an administrator changes VIP state.

The panel reads account email from Supabase Auth (not from `profiles`), VIP from `rcc_vip_memberships`, and linked Discord IDs/profile data from `profiles`. Ko-fi entries are read from `rcc_kofi_events`.

## Features
- Users: global search by email, Auth user UUID, or Discord ID; switch VIP/creator/banner flags.
- Real payments: list recorded Ko-fi events, match by Auth user ID/email, approve eligible USD payments of at least USD 1.99, activate membership, and attempt direct Railway role assignment without Gemini.
- Discord: list linked accounts, retry the role for active VIP members, and clear the RCC profile's `discord_id` field.
- Statistics: registered users, active VIP memberships, Discord links, and USD revenue across the latest event rows returned by the dashboard.
- Manual refresh and silent 30-second polling.

## Important behavior
- The unlink button clears `profiles.discord_id`; it does not delete the Discord OAuth identity from Supabase Auth.
- If a buyer has no linked Discord account, payment approval still activates the web VIP and returns a status asking for Discord linking.
- If the user is not in the guild, Railway returns `NOT_IN_GUILD`; the page reports the condition instead of treating the web payment as failed.
- The revenue card is a sum of the latest event rows loaded by the dashboard, not an accounting reconciliation or subscription MRR report.

## Private support chat

Apply supabase/migrations/20261115000400_rcc_private_support_chat.sql after deploying the chat code. It:
- Adds profiles.is_banned (default false) and a database trigger that rejects browser-side attempts to change it; only server-side service_role can restrict/unrestrict accounts.
- Creates rcc_chat_conversations, rcc_chat_messages, and rcc_admin_private_notes.
- Enables RLS and removes browser-role table privileges. The Pages Function uses SUPABASE_SERVICE_ROLE_KEY after validating each caller's Supabase JWT.
- Creates the private chat-files Storage bucket (10 MB maximum). The browser never gets service-role access; uploads and short-lived signed file URLs are mediated by /api/chat.

No new environment variable is required beyond the existing SUPABASE_URL, SUPABASE_ANON_KEY, and server-only SUPABASE_SERVICE_ROLE_KEY.

The admin chat is restricted to the exact allowlisted account drillbobhii@gmail.com on both the client and functions/api/chat.ts. Internal notes live in rcc_admin_private_notes, not profiles.bio, so they are never included in public profile reads.

The user-side widget is loaded on index.html. For authenticated, non-admin users it polls /api/chat every 4 seconds. The same endpoint powers the admin inbox. Restricting an account sets profiles.is_banned; the main page checks that status on load and during polling and overlays the page with the account-restriction message.

Attachments are limited to 10 MB and accepted only for supported image, PDF, text/CSV, JSON, ZIP, and DOCX MIME types. Files are private in Storage and signed URLs expire after one hour. Read receipts are recorded in read_at; typing state expires after a few seconds.
