# Editor Brief App

A Next.js web form for submitting editor briefs. On submit, it creates a task in the **Organic Content Pipeline** list in ClickUp.

## Setup

### 1. Install Node.js
Download from [nodejs.org](https://nodejs.org) (LTS version).

### 2. Install dependencies
```bash
cd /Users/vanessacatalan/Documents/agency/briefs
npm install
```

### 3. Add your ClickUp API key
```bash
cp .env.example .env.local
```
Edit `.env.local` and paste your ClickUp API token.  
Get it from: **ClickUp → Profile avatar → Apps → API Token**

### 4. (One-time) Get custom field IDs
Start the dev server and visit:
```
http://localhost:3000/api/clickup-fields
```
This returns a JSON list of all custom fields on the list. Copy the `id` values for CLIENT, PLATFORM, TYPE, FUNNEL_STAGE, and EDITOR_BRIEF into [lib/constants.ts](lib/constants.ts) under `CLICKUP_FIELD_IDS`.

### 5. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push this folder to a GitHub repo
2. Import the repo in [vercel.com](https://vercel.com)
3. Add `CLICKUP_API_KEY` as an environment variable in Vercel project settings
4. Deploy — done

---

## Phase 2: Voice Input
The form is structured to accept auto-filled data. Phase 2 will add a voice button that:
1. Captures speech via Web Speech API
2. Sends transcript to Claude API
3. Claude returns structured JSON matching `BriefFormData`
4. Form fields populate automatically

---

## File Structure
```
app/
  page.tsx              # Main form UI
  layout.tsx            # Root layout
  globals.css           # Global styles
  api/
    submit-brief/       # POST → creates ClickUp task
    clickup-fields/     # GET → lists custom field IDs (setup only)
components/
  VideoRowCard.tsx      # Per-video form section
  SelectField.tsx       # Styled dropdown
  TextField.tsx         # Styled text/textarea input
  SectionHeading.tsx    # Section title component
  FieldLabel.tsx        # Label + hint text
lib/
  clickup.ts            # ClickUp API calls
  constants.ts          # Clients, formats, field IDs
  types.ts              # TypeScript types
```
