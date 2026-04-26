# 4 Brothers Trucking — Disaster Recovery Runbook

This document is the playbook for "the site is broken / something got
deleted / Supabase is down." Read it once now (it's short). When you need
it for real, you'll be stressed and won't have time to figure things out
from scratch.

---

## Today's safety checklist (do once, write down the answers)

Walk this list now. The whole thing takes ~15 minutes and is the single
biggest risk reduction you can do without writing code.

### 1. GitHub (where the code lives)
- [ ] 2FA on the GitHub account → github.com/settings/security
- [ ] Repo settings → **Branches** → enable **"Require pull request before
      merging"** + **"Require status checks (Vercel)"** on `main`.
      This prevents a stolen laptop from force-pushing over history.

### 2. Vercel (where the site is hosted)
- [ ] 2FA on the Vercel account
- [ ] Open Vercel → Project → Settings → **Environment Variables**.
      Copy these two values into a password manager (1Password, Bitwarden,
      iCloud Keychain) — without them, you can't redeploy on a new host:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 3. Supabase (where ALL business data lives — single point of failure)
- [ ] 2FA on the Supabase account
- [ ] Supabase → Project → **Database → Backups**. Confirm automatic backups
      are on. Free tier = 7-day retention. **Pro tier ($25/mo) adds 14-day
      retention + Point-in-Time Restore (PITR)** — strongly recommended
      once revenue is at scale; PITR can roll back to any minute in the
      last 14 days, which is the difference between "lost a day" and
      "lost everything since the last manual backup."
- [ ] Rotate the database password (Settings → Database) and store in
      the password manager.
- [ ] Supabase → Storage → confirm the `compliance-docs` bucket exists.

### 4. App-side backups (manual, but easy)
- [ ] Open the app → **Backup** tab. The yellow banner at the top says
      "BACKUP OVERDUE" if it's been > 7 days. Click **Download Backup**
      every Friday. Save the file to Google Drive / iCloud / Dropbox.
- [ ] Click **Download Compliance ZIP** in the same tab once a month.
      Save alongside the JSON backup. Compliance docs live in Supabase
      Storage and are NOT in the JSON.

---

## Crisis runbook

### Scenario A — The site won't load (Vercel deploy broken)

**Most likely cause:** a recent deploy broke. Vercel itself is rarely down.

1. Open Vercel dashboard → **Deployments**.
2. Find the last green deploy (probably yesterday's).
3. Click **"⋯" → "Promote to Production"**.
4. Site is back in 30 seconds.

If Vercel itself is down:
1. On any laptop with the repo cloned: `git pull && npm install && npm run build`.
2. Drag the `dist/` folder into [Cloudflare Pages](https://pages.cloudflare.com/)
   or [Netlify](https://app.netlify.com/drop). Free, no signup needed for
   Netlify Drop.
3. Set the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
   from your password manager in the new host's settings.
4. Live on a different host within 15 minutes.

### Scenario B — Hacked, or someone deleted records inside the app

**First, contain it:**
1. Supabase dashboard → **Project Settings → Database** → rotate the
   database password. This kicks every active session.
2. Supabase → **Authentication → Users** → reset the password for every
   admin account. Users will get a "set new password" email.

**Then, recover the data:**
3. In the app, each main tab (Dispatches, Review, Invoices) has a
   **"Recover deleted"** view. The app keeps soft-deleted records for 30
   days. One-click restore.
4. For older or hard-deleted data: Supabase dashboard → **Database →
   Backups → Point-in-Time Restore** (Pro tier only) to a timestamp
   before the bad action.

### Scenario C — Supabase project wiped or corrupted

**Worst-case scenario.** The database is gone. What you can recover
depends on what backups you have.

1. **First option (preferred):** Supabase → Database → Backups → click
   the most recent backup → Restore. If you're on Pro, this gets you to
   within minutes of the wipe.
2. **Second option:** in the app, go to the **Backup** tab → **Restore
   from backup** → pick the most recent `4brothers-backup-YYYY-MM-DD.json`
   you've downloaded. This brings everything back EXCEPT compliance docs
   (CDLs, med cards) and Auth user passwords.
3. **Compliance docs:** if you've been downloading the compliance ZIP
   monthly, unzip the most recent `4brothers-compliance-YYYY-MM-DD.zip`
   and re-upload each file to its driver via the contact's onboarding
   link. If you don't have a ZIP, the drivers will need to re-upload via
   their phone (their onboarding link still works).
4. **Auth users:** Supabase → Authentication → Users → "Invite user" for
   every admin. They set a new password from the email link.

### Scenario D — GitHub repo deleted or account compromised

**Code is replicated everywhere it's been cloned.** This isn't a real
risk if any developer has cloned the repo.

1. From any clone (your laptop, a teammate's): create a new GitHub repo,
   then `git remote set-url origin <new-url> && git push -u origin main`.
2. Vercel → Project Settings → Git → **"Update repository"** → point at
   the new repo URL. The next push triggers a deploy.
3. If your GitHub account itself was hacked, follow GitHub's account
   recovery process and rotate your password + 2FA tokens.

---

## When you're not sure what to do

- **Don't panic-delete things.** Soft-delete recovery has a 30-day window
  but only if records aren't hard-deleted by an attacker.
- **Take a backup first.** Before any restore action, click **Download
  Backup** in the app. If the restore goes wrong, you can recover the
  current state.
- **Ask for help.** Supabase has email support on Pro tier. Vercel has
  chat support on Pro. Reach out before doing anything destructive.

---

## Recovery tools already built into the app

These already exist — you don't need to install anything:

| Where | What it does | When you'd use it |
|-------|--------------|-------------------|
| Backup tab → "Download Backup" | Full JSON of every dispatch, FB (with photos), invoice, contact | Weekly preventive |
| Backup tab → "Download Compliance ZIP" | Every CDL/med card/drug test from Storage | Monthly preventive |
| Backup tab → "Restore from backup" | Replace all data with a JSON file | Scenario C |
| Dispatches tab → "Recover deleted" | Undelete dispatches from last 30 days | Scenario B |
| Review tab → "Recover deleted" | Undelete freight bills from last 30 days | Scenario B |
| Invoices tab → "Recover deleted" | Undelete invoices from last 30 days | Scenario B |

---

## Quick references

- App repo: `https://github.com/sahilsingh4/four-brothers`
- Hosting: Vercel — `https://vercel.com/sahilsingh4s-projects/four-brothers`
- Database: Supabase — log in via supabase.com with the project owner's email
- Live site: `https://www.4brotherstruck.com/`

If anything in this runbook is out of date, fix it and commit the change.
The runbook only works if it's accurate.
