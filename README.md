# Dr Akoubache Yasmine · Dentiste

Patient website (booking + carte cadeaux) and the dentist's dashboard.
Plain HTML/CSS/JS with Supabase as the database. No build step.

## Files

| File | What it is |
|---|---|
| `index.html` | Patient site: soins, booking, carte cadeaux |
| `admin.html` | Dentist dashboard (email + password login) |
| `shared.js` | Logo, fidelity card, helpers, Supabase client |
| `style.css` | All styles (light + dark mode) |
| `config.js` | Your Supabase URL and anon key |
| `schema.sql` | Database tables, security rules and booking functions |

## Setup (about 10 minutes)

1. **Create the database.** On supabase.com, create a project. Open *SQL Editor*, paste all of `schema.sql`, and click *Run*.
2. **Create Yasmine's account.** Go to *Authentication > Users > Add user*, enter her email and a password, and tick *Auto confirm*.
3. **Give her access to the dashboard.** In the SQL Editor, run:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'her-email@example.com';
   ```
4. **Close public sign-ups.** Go to *Authentication > Sign In / Providers* and turn off *Allow new users to sign up*.
5. **Connect the site.** In *Project Settings > API*, copy the Project URL and the `anon` key into `config.js`.
6. **Host it.** Upload the folder to any static host (Vercel, Netlify, cPanel…). The patient site is `/` and the dashboard is `/admin.html`.

## How the fidelity card works

- Each séance marked "Séance faite · +1 tampon" in the dashboard adds a stamp.
- Rewards: 3rd séance **-10%**, 5th **cadeau**, 6th **-30%**, 9th **-50%**. Edit `REWARDS` in `shared.js` to change them.
- After the 9th séance, the next one starts a new card (the "cartes complétées" counter goes up).
- The dashboard shows the séance number and reward on every appointment, so the discount is known before the patient arrives.

## Security

- Patients never read the tables directly. They use 3 database functions: `taken_slots` (times only), `book_appointment` and `get_card` (first name + stamps only).
- Only accounts listed in `admins` can see names, phones and appointments, or change stamps and settings.
- A time slot can't be booked twice (unique index), and a phone number can have at most 3 upcoming appointments.

## Customize

- Services: `SERVICES` in `shared.js`
- Hours, days, lunch break, slot length, phone, address: dashboard > *Réglages*
- Colors: CSS variables at the top of `style.css`
