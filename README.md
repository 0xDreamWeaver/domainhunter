# DomainHunter

**Check domain availability, compare prices across registrars, and score domains for SEO quality — all from your terminal.**

DomainHunter is a command-line tool that takes a list of domain names and tells you everything you need to know before buying one: is it available, where can you buy it, what does it cost, and how good is it for SEO? It works two ways — as a beautiful interactive app (TUI mode) or as a scriptable command (CLI mode).

---

## Table of Contents

1. [What You Need (Prerequisites)](#1-what-you-need-prerequisites)
2. [Installation](#2-installation)
3. [Setting Up API Keys (Optional but Recommended)](#3-setting-up-api-keys-optional-but-recommended)
4. [TUI Mode — The Interactive App](#4-tui-mode--the-interactive-app)
5. [CLI Mode — The Command Line](#5-cli-mode--the-command-line)
6. [Importing Domain Lists](#6-importing-domain-lists)
7. [Exporting Results](#7-exporting-results)
8. [Filtering and Sorting](#8-filtering-and-sorting)
9. [Understanding SEO Scores](#9-understanding-seo-scores)
10. [CLI Flag Reference](#10-cli-flag-reference)
11. [CLI Usage Examples](#11-cli-usage-examples)
12. [Automation Examples](#12-automation-examples)
13. [Troubleshooting](#13-troubleshooting)
14. [Environment Variables Reference](#14-environment-variables-reference)
15. [Debugging and Logs](#15-debugging-and-logs)
16. [Exit Codes](#16-exit-codes)

---

## 1. What You Need (Prerequisites)

Before you can use DomainHunter, you need two things installed on your computer:

### Bun (JavaScript Runtime)

Bun is the engine that runs DomainHunter. Install it by opening your terminal and running:

**Mac or Linux:**
```sh
curl -fsSL https://bun.sh/install | bash
```

**Windows:**
```sh
powershell -c "irm bun.sh/install.ps1 | iex"
```

After installing, close and reopen your terminal, then verify it worked:
```sh
bun --version
```
You should see a version number like `1.x.x`.

### How to Open a Terminal

- **Mac:** Press `Cmd + Space`, type "Terminal", press Enter
- **Windows:** Press `Windows + R`, type "cmd" or "powershell", press Enter
- **Linux:** Press `Ctrl + Alt + T`

---

## 2. Installation

### Step 1: Download DomainHunter

If you have Git installed:
```sh
git clone https://github.com/your-username/domainhunter.git
cd domainhunter
```

Or download the ZIP file from GitHub and extract it, then navigate to the folder in your terminal:
```sh
cd path/to/domainhunter
```

### Step 2: Install Dependencies

Inside the DomainHunter folder, run:
```sh
bun install
```

This downloads all the required packages. It takes about 10–30 seconds.

### Step 3: (Optional) Install Globally as `dh`

To use the `dh` command from anywhere on your computer:
```sh
bun link
```

After this, you can type `dh` from any folder instead of `bun run index.ts`.

> **Note:** Until you run `bun link`, replace every `dh` in this guide with `bun run index.ts`.

---

## 3. Setting Up API Keys (Optional but Recommended)

DomainHunter always works without any API keys — it uses RDAP (the official ICANN protocol) and WHOIS to check availability for free. API keys unlock **pricing information** from registrars like GoDaddy, Namecheap, Namesilo, and Name.com. Porkbun pricing is included automatically with no key required.

### How availability checking works

DomainHunter uses **RDAP** as its primary availability check. RDAP is ICANN's modern replacement for TCP WHOIS — it covers all major gTLDs (`.com`, `.net`, `.org`, `.io`, `.app`, `.dev`, `.ai`, etc.) and requires no API key. For country-code TLDs (`.uk`, `.de`, `.fr`, etc.) that aren't in the RDAP registry, DomainHunter falls back to TCP WHOIS automatically.

API keys are stored in a file called `.env` in the DomainHunter folder. Create this file:

```sh
# Create the .env file (Mac/Linux)
touch .env
```

Then open it in a text editor and add the keys you have:

```sh
# .env file — add only the ones you have, delete the rest

# GoDaddy API (get free at: developer.godaddy.com)
GODADDY_API_KEY=your_key_here
GODADDY_API_SECRET=your_secret_here

# Namecheap API (enable at: namecheap.com/support/api/intro)
# Note: Namecheap requires your IP address to be whitelisted in their settings
NAMECHEAP_API_KEY=your_key_here
NAMECHEAP_USERNAME=your_namecheap_username
NAMECHEAP_CLIENT_IP=your.ip.address.here

# Namesilo API (get free at: namesilo.com/account_api.php)
NAMESILO_API_KEY=your_key_here

# Name.com API (get at: name.com/reseller — free sandbox available)
NAMECOM_USERNAME=your_username_here
NAMECOM_TOKEN=your_token_here

# Google Sheets (for importing/exporting to Google Sheets)
# Point this to the path of your service account JSON key file
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account-key.json
```

**You don't need all of them.** Each registrar is used independently — if a key is missing, that registrar is simply skipped.

### How to Get a GoDaddy API Key (Free)

1. Go to [developer.godaddy.com](https://developer.godaddy.com)
2. Sign in with your GoDaddy account (or create one free)
3. Click "API Keys" → "Create New API Key"
4. Name it anything (e.g., "DomainHunter")
5. Select "Production" environment
6. Copy the **Key** and **Secret** into your `.env` file

### How to Get a Namecheap API Key (Free)

1. Log into your Namecheap account
2. Go to Profile → Tools → Namecheap API Access
3. Request API access (requires a funded account)
4. Whitelist your IP address in the API settings
5. Copy your API key into your `.env` file

### How to Get a Namesilo API Key (Free)

1. Log into [namesilo.com](https://www.namesilo.com)
2. Go to Account → API Manager
3. Generate an API key
4. Add it to your `.env` file as `NAMESILO_API_KEY`

### How to Get a Name.com API Token

1. Log into [name.com](https://www.name.com)
2. Go to Account → API Settings
3. Create a new API token
4. Add your username and token to `.env` as `NAMECOM_USERNAME` and `NAMECOM_TOKEN`

### Porkbun Pricing (No Key Required)

DomainHunter automatically fetches current Porkbun registration prices for all TLDs — no account or API key needed. Porkbun pricing appears alongside other registrars in your results.

### How to Find Your IP Address

```sh
curl ifconfig.me
```

---

## 4. TUI Mode — The Interactive App

The TUI (Terminal User Interface) is a full-screen interactive app that lets you check domains, browse results, and export — all with keyboard shortcuts.

### Starting the TUI

```sh
# Open the TUI with no domains (you'll enter them interactively)
dh

# Open the TUI with domains pre-loaded
dh acme.com acme.io mysite.co
```

---

### Screen 1: Domain Input

When you open DomainHunter with no domains, you see the input screen:

```
DomainHunter

Enter domain names to check (one per line, or comma-separated):
Press Enter after each domain. Empty line or Ctrl+D to start checking.

› _
```

**How to use it:**
- Type a domain name and press `Enter` to add it to the queue
- Type multiple domains separated by commas: `acme.com, acme.io, acme.co`
- When you're done adding domains, press `Enter` on an empty line (or `Ctrl+D`)
- DomainHunter will start checking immediately

---

### Screen 2: Processing

While DomainHunter checks your domains, you see a progress screen:

```
DomainHunter

⠋ Checking domains… 3/10

✓ acme.com
✗ example.io
✓ mysite.co
```

This can take a few seconds per domain depending on WHOIS server response times. Domains are checked in parallel (up to 5 at a time), so a list of 20 domains usually takes 10–30 seconds.

---

### Screen 3: Results Table

Once checking is complete (or in progress), you see the results table:

```
DomainHunter                    [f]ilter  [s]ort  [x]export  [q]quit
┌──────────────────────────────┬────────────────┬────────────┬──────────────┐
│ Domain                       │ Status         │ Best Price │ SEO Score    │
├──────────────────────────────┼────────────────┼────────────┼──────────────┤
│▶ acme.com                    │ ✓ Available    │ $12.99     │ ████████░░ 93│
│  acme.io                     │ ✓ Available    │ $35.00     │ ███████░░░ 88│
│  acme-tools.com              │ ✗ Taken        │ —          │ █████░░░░░ 62│
│  xqzt.net                    │ ✓ Available    │ $14.99     │ ███░░░░░░░ 38│
└──────────────────────────────┴────────────────┴────────────┴──────────────┘
4 domains · 3 available · 1 taken

[↑↓] navigate  [f] filter  [s] sort  [x] export  [Enter] detail  [i] add  [q] quit
```

**What each column means:**
- **Domain** — the domain name you checked
- **Status** — green ✓ Available or red ✗ Taken (or ? Unknown if WHOIS timed out)
- **Best Price** — the cheapest price found across all configured registrars
- **SEO Score** — a bar + number showing how SEO-friendly the domain is (0–100)

---

### Keyboard Shortcuts (Results Screen)

| Key | Action |
|-----|--------|
| `↑` / `k` | Move selection up |
| `↓` / `j` | Move selection down |
| `Page Up` | Jump up 10 rows |
| `Page Down` | Jump down 10 rows |
| `g` | Jump to first row |
| `G` | Jump to last row |
| `Enter` or `l` | Open detail view for selected domain |
| `f` | Open filter panel |
| `s` | Open sort panel |
| `x` | Open export dialog |
| `i` | Add more domains |
| `q` | Quit |

---

### Detail View

Press `Enter` on any domain to see full details:

```
┌──────────────────────────────────────────────────────────┐
│ acme.com                                    [Esc] back    │
│                                                           │
│ Status: ✓ AVAILABLE                                       │
│                                                           │
│ Pricing                                                   │
│   godaddy      $12.99 · godaddy.com/...                  │
│   namecheap    $11.98 · namecheap.com/...                │
│   Best price   $11.98                                     │
│                                                           │
│ SEO Score: 93/100                                         │
│   Length              ██████████████ 20/20               │
│   TLD                 ████████████████░░ 25/25            │
│   No hyphens/numbers  ██████████████████ 15/15            │
│   Pronounceability    ██████████████████ 20/20            │
│   Brandability        █████████░░░░░░░░░ 13/20            │
│   Keywords            ░░░░░░░░░░ 0/20                     │
│                                                           │
│ Domain is available for registration.                     │
└──────────────────────────────────────────────────────────┘
```

For taken domains, you'll see WHOIS information instead:

```
│ WHOIS Info                                                │
│   Registrar      GoDaddy.com, LLC                        │
│   Registrant     Acme Corporation                        │
│   Email          admin@acme.com                          │
│   Created        2010-01-15                              │
│   Expires        2025-01-15                              │
│   Nameservers    ns1.godaddy.com, ns2.godaddy.com        │
└──────────────────────────────────────────────────────────┘
```

Press `Esc` or `Enter` to go back.

---

### Filter Panel

Press `f` to open the filter panel:

```
╭─────────────────────────────────────────────────────╮
│ Filter Domains                                       │
│                                                      │
│ ▶ Availability:                                      │
│     ◉ all   ○ available   ○ taken                   │
│                                                      │
│   Max Price ($):                                     │
│     no limit                                         │
│                                                      │
│   Min SEO Score (0–100):                             │
│     no minimum                                       │
│                                                      │
│ [Tab] next field  [←→] toggle  [Enter] apply  [Esc] cancel
╰─────────────────────────────────────────────────────╯
```

**How to use:**
- Press `Tab` to move between fields
- Use `←` / `→` to change the Availability option
- Type a number in the price/SEO fields
- Press `Enter` on the last field to apply the filter
- Press `Esc` to cancel

**Example:** To see only available domains under $20, set:
- Availability: `available`
- Max Price: `20`

---

### Sort Panel

Press `s` to open the sort panel. You can sort by up to two fields:

```
╭───────────────────────────────────────────────────────╮
│ Sort Domains                                           │
│                                                        │
│ Primary Sort                                           │
│   ▶ Field:  name  [price]  status  seo                │
│     Direction:  [Ascending ↑]  Descending ↓           │
│                                                        │
│ Secondary Sort (optional)                              │
│   Field:  [none]  name  price  status  seo            │
╰───────────────────────────────────────────────────────╯
```

**How to use:**
- Press `Tab` to move between rows
- Use `←` / `→` to change the selected option
- Press `Enter` to move to the next field
- On the last field, press `Enter` to apply

**Example:** Sort by price (cheapest first), then by SEO score (highest first):
- Primary field: `price`, direction: `Ascending ↑`
- Secondary field: `seo`, direction: `Descending ↓`

---

### Export Dialog

Press `x` to open the export dialog:

```
╭─────────────────────────────────────────────────────────╮
│ Export Results                                           │
│                                                          │
│ ▶ Format:  [CSV]  Excel  JSON  Google Sheets            │
│                                                          │
│   Output file:                                           │
│     domains.csv                                          │
╰─────────────────────────────────────────────────────────╯
```

**How to use:**
- Press `←` / `→` to select a format
- Press `Tab` to move to the filename field
- Type your desired filename (or a Google Sheets ID/URL for the Sheets option)
- Press `Enter` to export

A success message appears briefly at the bottom: `✓ Exported to domains.csv`

---

## 5. CLI Mode — The Command Line

CLI mode is for when you want quick results in your terminal, or when you're writing scripts and automations. It doesn't use the interactive TUI — it just runs and prints results.

### Basic Usage

```sh
# Check one or more domains directly
dh acme.com

# Check multiple domains
dh acme.com acme.io my-startup.co

# Read from a file and output to another file
dh -i my-domains.csv -o results.xlsx
```

### When Does CLI Mode Activate?

DomainHunter automatically uses CLI mode when you include any flags (options starting with `-`). Without flags, it opens the TUI.

```sh
dh acme.com          # → TUI mode (domains loaded, interactive)
dh acme.com --sort price  # → CLI mode (prints table, exits)
```

To force CLI mode without flags, add any flag (like `--skip-pricing` to go faster):

```sh
dh acme.com --skip-pricing   # CLI mode, no pricing lookup
```

### Output Format

CLI mode prints a formatted table to your terminal:

```
──────────────────────────────────────────────────────────────────
Domain                         │ Status       │ Price      │ SEO
──────────────────────────────────────────────────────────────────
acme.com                       │ ✓ Available  │ $12.99     │ 93/100
acme.io                        │ ✓ Available  │ $35.00     │ 88/100
example.com                    │ ✗ Taken      │ —          │ 80/100
──────────────────────────────────────────────────────────────────
3 domains · 2 available · 1 taken
```

---

## 6. Importing Domain Lists

You can feed DomainHunter a list of domains from multiple file types.

### CSV File

Create a CSV file with a column named `domain` (or `name`, `url`, `hostname`):

```csv
domain
acme.com
acme.io
my-startup.co
example.net
```

Or a multi-column CSV (DomainHunter finds the domain column automatically):

```csv
domain,notes,priority
acme.com,our top choice,high
acme.io,fallback,medium
```

Import it:
```sh
dh -i my-domains.csv
```

### Excel File (.xlsx)

Create an Excel spreadsheet with a column header `Domain` (case-insensitive). DomainHunter reads the first sheet automatically.

```sh
dh -i my-domains.xlsx
```

### Google Sheet

You need the Google Sheets API configured (see Section 3). Then use either the full URL or just the spreadsheet ID:

```sh
# Full URL
dh -i "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit"

# Just the ID (the long string between /d/ and /edit in the URL)
dh -i 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

### Combining Sources

You can combine a file with command-line domains:

```sh
dh acme.com acme.io -i more-domains.csv
```

---

## 7. Exporting Results

### Save to CSV

```sh
dh -i domains.csv -o results.csv
```

The CSV includes all data: domain, status, prices from each registrar, all SEO score components, and WHOIS info.

### Save to Excel

```sh
dh -i domains.csv -o results.xlsx
```

The Excel file has color-coded cells:
- **Green** = available / high SEO score
- **Yellow** = medium SEO score
- **Red** = taken / low SEO score
- Bold header row with dark background

### Save to JSON

```sh
dh -i domains.csv -o results.json
```

JSON includes the full structured data, useful for feeding into other programs.

### Export to Google Sheets

```sh
dh -i domains.csv -o "your-spreadsheet-id-here"
```

This writes results starting at cell A1, overwriting existing data. The spreadsheet must already exist and your service account must have edit access to it.

### Specifying Format Explicitly

If your filename doesn't make the format obvious, use `--format`:

```sh
dh -i domains.csv --output myfile --format excel
```

---

## 8. Filtering and Sorting

### Filtering

Narrow down results so you only see what matters.

```sh
# Show only available domains
dh -i domains.csv --filter-status available

# Show only taken domains
dh -i domains.csv --filter-status taken

# Only show domains under $20
dh -i domains.csv --max-price 20

# Only show domains with SEO score 70 or above
dh -i domains.csv --min-seo 70

# Combine filters: available AND under $15 AND SEO ≥ 75
dh -i domains.csv --filter-status available --max-price 15 --min-seo 75
```

### Sorting

Control the order results appear in.

```sh
# Sort alphabetically (A → Z)
dh -i domains.csv --sort name --sort-dir asc

# Sort by price, cheapest first
dh -i domains.csv --sort price --sort-dir asc

# Sort by SEO score, highest first
dh -i domains.csv --sort seo --sort-dir desc

# Sort by availability first, then by price
dh -i domains.csv --sort status --sort2 price --sort2-dir asc
```

**Sort field options:** `name`, `status`, `price`, `seo`
**Direction options:** `asc` (ascending, A→Z or low→high), `desc` (descending, Z→A or high→low)

---

## 9. Understanding SEO Scores

SEO scores range from **0 to 100** and are calculated entirely on your computer — no internet required, no API key needed.

### Score Breakdown

| Category | Max Points | What it measures |
|----------|-----------|------------------|
| **Length** | 20 | Shorter domains score higher. ≤5 chars = 20pts, 6–7 = 17pts, 8–9 = 14pts, 10–12 = 10pts, 13–15 = 5pts, 16+ = 0pts. |
| **TLD** | 25 | `.com` = 25pts, `.io`/`.ai`/`.co` = 22pts, `.app`/`.dev`/`.net`/`.org` = 18pts, `.us`/`.me`/country codes = 10–12pts, `.info`/`.biz`/`.online` = 5–6pts, everything else = 3pts. |
| **No Hyphens/Numbers** | 15 | No hyphens and no numbers = 15pts. Numbers only = 8pts. Hyphens only = 5pts. Both = 0pts. |
| **Pronounceability** | 20 | Based on vowel-to-consonant ratio and consonant clusters. Easy-to-say names score higher. Names like "acme" or "stripe" score well; "xqzt" scores poorly. |
| **Brandability** | 20 | Single word (no hyphens) = +8pts. Ends with a brand suffix (-ly, -ify, -hub, -app, -base, -lab, -hq, etc.) = +7pts. Good length (4–10 chars) = +5pts. |
| **Keywords** | 20 | If you provide keywords with `--keywords`, domains containing those words score up to +20pts. |

### Color Guide

- **Green (80–100):** Excellent domain — memorable, brandable, strong TLD
- **Yellow (60–79):** Good domain — some weaknesses but usable
- **Red (0–59):** Poor domain — too long, weak TLD, hard to remember

### Using Keywords

Keywords boost the SEO score when a domain contains your target words:

```sh
# Scores higher for domains containing "shop" or "store"
dh acme.com shopify.com storeify.co --keywords shop,store
```

---

## 10. CLI Flag Reference

| Flag | Short | Type | Default | Description |
|------|-------|------|---------|-------------|
| `--input` | `-i` | file/URL | — | Input file: CSV, Excel (.xlsx), or Google Sheets URL/ID |
| `--output` | `-o` | file/ID | — | Output file: .csv, .xlsx, .json, or Google Sheets ID |
| `--format` | `-f` | string | auto | Override output format: `csv`, `excel`, `json`, `sheets` |
| `--filter-status` | — | string | `all` | Filter by status: `all`, `available`, `taken` |
| `--max-price` | — | number | — | Only show domains at or under this price (USD) |
| `--min-seo` | — | number | — | Only show domains with this SEO score or higher |
| `--sort` | — | string | `seo` | Primary sort field: `name`, `status`, `price`, `seo` |
| `--sort-dir` | — | string | `asc` | Primary sort direction: `asc` or `desc` |
| `--sort2` | — | string | — | Secondary sort field (same options as `--sort`) |
| `--sort2-dir` | — | string | `asc` | Secondary sort direction |
| `--keywords` | — | string | — | Comma-separated keywords for SEO scoring, e.g. `shop,store,buy` |
| `--concurrency` | — | number | `5` | How many domains to check simultaneously (higher = faster but more network load) |
| `--skip-whois` | — | flag | off | Skip WHOIS lookup — much faster, but no availability data unless you have registrar API keys |
| `--skip-pricing` | — | flag | off | Skip registrar pricing lookup (faster, availability-only) |
| `--tui` | — | flag | off | Force TUI mode even when other flags are present |
| `--debug` | — | flag | off | Print WARN/ERROR log entries to stderr in real time (useful for diagnosing API failures) |
| `--log-file <path>` | — | string | `~/.domainhunter/logs/YYYY-MM-DD.log` | Override the log file path for this run |
| `--no-log` | — | flag | off | Disable log file writing entirely for this run (useful in CI or read-only environments) |
| `--version` | `-V` | — | — | Show version number and exit |
| `--help` | `-h` | — | — | Show help text and exit |

---

## 11. CLI Usage Examples

### Quick Single Domain Check

```sh
dh acme.com --skip-pricing
```

Quickly checks if `acme.com` is available using WHOIS (no registrar API needed). Prints result and exits.

---

### Check Several TLD Variants at Once

```sh
dh acme.com acme.io acme.co acme.app --sort price
```

Checks all four variants and sorts results by cheapest available price.

---

### Find All Affordable Available Domains from a CSV

```sh
dh -i my-100-domains.csv --filter-status available --max-price 15 --sort price -o affordable.csv
```

From a large list, keeps only available domains under $15, sorts by price, saves to CSV.

---

### Get the Best SEO Domains, Save as Excel

```sh
dh -i domains.csv --min-seo 80 --filter-status available --sort seo --sort-dir desc -o top-picks.xlsx
```

Filters to available domains with an SEO score of 80+, best scores first, color-coded Excel output.

---

### Score Domains by Keyword Relevance

```sh
dh shopnow.com buystuff.io shopify.co mystore.net --keywords shop,store,buy --sort seo --sort-dir desc
```

Domains containing "shop", "store", or "buy" get a keyword SEO boost. Results sorted best-first.

---

### Import from Google Sheets, Export Results Back

```sh
dh -i 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms \
   -o 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
```

Reads domains from column A of a Google Sheet, checks them all, writes results back into the same sheet starting at row 1.

---

### Fast Bulk Check (500+ Domains)

```sh
dh -i 500-domains.csv --skip-pricing --concurrency 10 -o results.json
```

Checks 500 domains using only WHOIS (no registrar API calls), runs 10 at a time for speed, saves full data to JSON.

---

### Separate Available and Taken Into Different Files

```sh
dh -i domains.csv --filter-status available -o available.csv
dh -i domains.csv --filter-status taken -o taken.csv
```

Runs twice on the same input, saving available and taken domains to separate files.

---

### Check Domains and Just Print — Don't Save Anything

```sh
dh -i domains.csv --sort seo --sort-dir desc --filter-status available
```

No `--output` flag = results print to terminal and nothing is written to disk.

---

### Get a Quick Count of Available Domains

```sh
dh -i domains.csv --filter-status available --skip-pricing -o /tmp/avail.json && \
  bun -e "const r = await Bun.file('/tmp/avail.json').json(); console.log(r.length + ' available')"
```

---

## 12. Automation Examples

These examples show how to run DomainHunter automatically — on a schedule, inside scripts, or as part of a larger workflow.

---

### Shell Script: Daily Domain Availability Report

Create a file called `daily-check.sh`:

```sh
#!/bin/bash
# daily-check.sh — checks a domain watchlist and saves a dated report

DATE=$(date +%Y-%m-%d)
DOMAINHUNTER_DIR="/path/to/domainhunter"
INPUT="$DOMAINHUNTER_DIR/watchlist.csv"
REPORTS_DIR="$DOMAINHUNTER_DIR/reports"

mkdir -p "$REPORTS_DIR"

echo "Checking domains for $DATE..."

bun run "$DOMAINHUNTER_DIR/index.ts" \
  --input "$INPUT" \
  --filter-status available \
  --max-price 20 \
  --sort seo \
  --sort-dir desc \
  --output "$REPORTS_DIR/available-$DATE.csv"

echo "Done! Saved to $REPORTS_DIR/available-$DATE.csv"
```

Make it executable and run it:
```sh
chmod +x daily-check.sh
./daily-check.sh
```

---

### Cron Job: Run Every Morning at 8 AM

Cron jobs are scheduled tasks on Mac and Linux. To edit your schedule:

```sh
crontab -e
```

Add one of these lines:

```cron
# Every morning at 8:00 AM
0 8 * * * cd /path/to/domainhunter && bun run index.ts -i watchlist.csv --filter-status available -o reports/daily-$(date +\%Y-\%m-\%d).csv

# Every 6 hours
0 */6 * * * cd /path/to/domainhunter && bun run index.ts -i watchlist.csv --skip-pricing -o reports/check-$(date +\%Y-\%m-\%d-\%H).csv

# Every Monday at 9:00 AM
0 9 * * 1 cd /path/to/domainhunter && bun run index.ts -i watchlist.csv -o reports/weekly-$(date +\%Y-\%m-\%d).xlsx
```

**Cron time format:** `minute hour day-of-month month day-of-week`
- `0 8 * * *` = 8:00 AM every day
- `0 */6 * * *` = every 6 hours
- `0 9 * * 1` = every Monday at 9:00 AM

---

### Bun Script: Programmatic Usage in Your Own Code

You can use DomainHunter's internal modules directly in your own Bun scripts:

```ts
// my-domain-checker.ts
import { processDomains, applyFilter, applySort } from './src/pipeline/index.ts';
import { exportCsv } from './src/io/csv.ts';
import { exportExcel } from './src/io/excel.ts';

const domains = [
  'acme.com',
  'acme.io',
  'acme.co',
  'myapp.dev',
  'launchpad.app',
];

console.log('Checking domains...');

const results = await processDomains(
  domains,
  {
    keywords: ['app', 'launch'],  // boost SEO score for keyword matches
    concurrency: 5,
  },
  event => {
    if (event.type === 'result') {
      const r = event.result!;
      const icon = r.status === 'available' ? '✓' : '✗';
      console.log(`  ${icon} ${r.domain.name} — SEO: ${r.seoScore.total}/100`);
    }
  }
);

// Keep only available domains under $20 with SEO ≥ 70
const filtered = applyFilter(results, {
  status: 'available',
  maxPrice: 20,
  minSeo: 70,
});

// Sort best SEO first, then cheapest price
const sorted = applySort(filtered, {
  primary: { field: 'seo', direction: 'desc' },
  secondary: { field: 'price', direction: 'asc' },
});

console.log(`\nFound ${sorted.length} qualifying domain(s).`);

// Save to both CSV and Excel
await exportCsv(sorted, 'best-domains.csv');
await exportExcel(sorted, 'best-domains.xlsx');
console.log('Saved to best-domains.csv and best-domains.xlsx');
```

Run it:
```sh
bun run my-domain-checker.ts
```

---

### GitHub Actions: Automated Weekly Check

Create `.github/workflows/domain-check.yml` in your repository:

```yaml
name: Weekly Domain Check

on:
  schedule:
    - cron: '0 9 * * 1'    # Every Monday at 9:00 AM UTC
  workflow_dispatch:         # Also allow manual runs from the GitHub UI

jobs:
  check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repo
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Check domains
        env:
          GODADDY_API_KEY: ${{ secrets.GODADDY_API_KEY }}
          GODADDY_API_SECRET: ${{ secrets.GODADDY_API_SECRET }}
          NAMESILO_API_KEY: ${{ secrets.NAMESILO_API_KEY }}
          NAMECOM_USERNAME: ${{ secrets.NAMECOM_USERNAME }}
          NAMECOM_TOKEN: ${{ secrets.NAMECOM_TOKEN }}
        run: |
          bun run index.ts \
            --input watchlist.csv \
            --filter-status available \
            --max-price 20 \
            --sort seo \
            --sort-dir desc \
            --output results-${{ github.run_id }}.csv \
            --no-log \
            --debug

      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: domain-results-${{ github.run_id }}
          path: results-*.csv
          retention-days: 30
```

> Add your API keys/secrets to GitHub Settings → Secrets and Variables → Actions. The `--no-log` flag prevents log files from being written to the CI runner's disk. The `--debug` flag prints API warnings directly to the Actions run log instead.

---

### Watch a File for Changes (Auto Re-check)

Automatically re-run DomainHunter whenever you save changes to your domain list:

**Mac** (requires `fswatch` — install with `brew install fswatch`):
```sh
fswatch -o watchlist.csv | xargs -n1 -I{} \
  bun run index.ts -i watchlist.csv --filter-status available -o latest-results.csv && \
  echo "Updated!"
```

**Linux** (requires `inotify-tools` — install with `sudo apt install inotify-tools`):
```sh
while inotifywait -e modify watchlist.csv; do
  bun run index.ts -i watchlist.csv --filter-status available -o latest-results.csv
  echo "Results updated at $(date)"
done
```

---

### Email Results with a Shell Script

On Mac/Linux, you can email yourself the results using `mail` or `sendmail`:

```sh
#!/bin/bash
# email-report.sh — check domains and email results

bun run /path/to/domainhunter/index.ts \
  -i watchlist.csv \
  --filter-status available \
  --max-price 15 \
  -o /tmp/available-today.csv

# Send email with CSV attached (requires mail configured on your system)
echo "Your daily domain report is attached." | \
  mail -s "Domain Report $(date +%Y-%m-%d)" \
       -A /tmp/available-today.csv \
       you@example.com
```

---

### Multi-Step Pipeline: Check → Filter → Notify

```sh
#!/bin/bash
# pipeline.sh — full workflow example

INPUT="domains.csv"
TEMP="/tmp/dh-results.json"

# Step 1: Check all domains
echo "Step 1: Checking domains..."
bun run /path/to/domainhunter/index.ts \
  --input "$INPUT" \
  --concurrency 8 \
  --output "$TEMP"

# Step 2: Count results
TOTAL=$(bun -e "const r = await Bun.file('$TEMP').json(); console.log(r.length)")
AVAILABLE=$(bun -e "const r = await Bun.file('$TEMP').json(); console.log(r.filter(d => d.status === 'available').length)")
echo "Step 2: $AVAILABLE available out of $TOTAL total"

# Step 3: Save final report
bun run /path/to/domainhunter/index.ts \
  --input "$INPUT" \
  --filter-status available \
  --max-price 20 \
  --sort seo \
  --sort-dir desc \
  --output "report-$(date +%Y-%m-%d).xlsx"

echo "Step 3: Report saved."
```

---

## 13. Troubleshooting

### First step: enable debug mode
Add `--debug` to any command to see API errors printed to your terminal in real time:
```sh
dh example.com --debug
```
You'll see lines like `[WARN] godaddy example.com — HTTP 401` for each failure. This is usually enough to diagnose the problem without reading log files.

---

### "command not found: dh"
Run `bun link` from inside the DomainHunter folder, or use `bun run index.ts` instead of `dh` everywhere.

### Domains showing "Unknown" status
This means the availability check couldn't reach the registry. Possible causes:

- **Firewall blocking outbound HTTPS (port 443)** — RDAP uses HTTPS. Check that your network allows outbound HTTPS.
- **Firewall blocking TCP port 43** — WHOIS (ccTLD fallback) uses port 43. Some corporate networks block it.
- **Rate limiting** — reduce `--concurrency` to `2` or `3`
- Run with `--debug` to see which checker is failing and why

### Namecheap: "API access denied from IP" or all results error
Namecheap whitelists API access by IP address. If your IP changed (common in CI, cloud instances, or dynamic home connections), you must re-whitelist it:
1. Find your current IP: `curl ifconfig.me`
2. Log into Namecheap → Profile → Tools → API Access
3. Add your IP to the whitelist

### GoDaddy: all results return 401 Unauthorized
GoDaddy has two separate environments with different keys:
- **OTE (test)** keys only work against `api.ote-godaddy.com`
- **Production** keys work against `api.godaddy.com`

DomainHunter uses the production endpoint. Make sure you created a **Production** key at [developer.godaddy.com](https://developer.godaddy.com), not an OTE key.

### Prices not showing up
Registrar API keys are required for pricing. Check that:
1. Your `.env` file is inside the DomainHunter folder (not your home folder)
2. The variable names match exactly (e.g., `GODADDY_API_KEY`, not `GODADDY_KEY`)
3. Run with `--debug` to see which registrar is returning errors

### Google Sheets import/export fails
Make sure:
1. `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in `.env` points to the correct JSON file
2. The service account's email address has been shared with the spreadsheet (go to Share → paste the email → give Editor access)
3. The spreadsheet ID is correct — it's the long string in the URL between `/d/` and `/edit`

### TUI looks broken (boxes appear as random characters)
Your terminal doesn't support Unicode box-drawing characters. Switch to a modern terminal:
- **Mac:** [iTerm2](https://iterm2.com) (free)
- **Windows:** [Windows Terminal](https://aka.ms/terminal) (free, from Microsoft Store)
- **Linux:** GNOME Terminal, Konsole, or Alacritty

### Slow performance on large lists
- Increase `--concurrency` (try `10` or `20`) for faster parallel checking
- Use `--skip-pricing` to skip registrar API calls (much faster)
- Use `--skip-whois` if you only need SEO scores (instant, no network)

---

## 14. Environment Variables Reference

All variables go in a `.env` file in the DomainHunter folder. Bun loads this file automatically.

| Variable | Required? | Description |
|----------|-----------|-------------|
| `GODADDY_API_KEY` | Optional | GoDaddy API key — enables GoDaddy pricing |
| `GODADDY_API_SECRET` | Optional | GoDaddy API secret (required with the key) |
| `NAMECHEAP_API_KEY` | Optional | Namecheap API key — enables Namecheap availability + pricing |
| `NAMECHEAP_USERNAME` | Optional | Your Namecheap account username |
| `NAMECHEAP_CLIENT_IP` | Optional | Your whitelisted IP address for Namecheap |
| `NAMESILO_API_KEY` | Optional | Namesilo API key — enables Namesilo availability + pricing |
| `NAMECOM_USERNAME` | Optional | Name.com account username — enables Name.com availability + pricing |
| `NAMECOM_TOKEN` | Optional | Name.com API token (required with username) |
| `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` | Optional | Path to service account JSON — enables Google Sheets import/export |

**None are required.** Without them, DomainHunter uses RDAP/WHOIS for availability and skips registrar pricing. Porkbun pricing is fetched automatically with no key.

---

## 15. Debugging and Logs

DomainHunter writes a structured log file for every run, making it easy to diagnose third-party
service failures — especially in automated contexts where you can't watch the terminal.

### Log file location

```
~/.domainhunter/logs/YYYY-MM-DD.log
```

One file per day, appended across all runs. The directory is created automatically on first use.

### Enable real-time debug output

Add `--debug` to any command:
```sh
dh -i domains.csv --debug
```

WARN and ERROR entries print to stderr in real time alongside the progress indicator. This is the fastest way to see why a registrar isn't returning prices.

### Override or disable the log file

```sh
# Write logs to a specific path (useful in CI)
dh -i domains.csv --log-file /tmp/dh-run.log

# Disable log file entirely (no writes to disk)
dh -i domains.csv --no-log
```

### Reading logs

Each line is a JSON object:
```json
{"ts":"2026-05-27T10:30:00.000Z","level":"WARN","checker":"godaddy","domain":"example.com","msg":"HTTP 401","statusCode":401}
```

**Tail the log live during a run:**
```sh
tail -f ~/.domainhunter/logs/$(date +%Y-%m-%d).log
```

**Filter by checker with `jq`:**
```sh
jq 'select(.checker == "godaddy")' ~/.domainhunter/logs/$(date +%Y-%m-%d).log
```

**Show only errors:**
```sh
jq 'select(.level == "ERROR")' ~/.domainhunter/logs/$(date +%Y-%m-%d).log
```

**Count warnings per checker:**
```sh
jq -r '.checker' ~/.domainhunter/logs/$(date +%Y-%m-%d).log | sort | uniq -c | sort -rn
```

### Log levels

| Level | Meaning |
|---|---|
| `DEBUG` | Expected non-events (registrar not configured, TLD not in RDAP bootstrap) |
| `INFO` | General informational messages |
| `WARN` | Recoverable issues: HTTP 4xx errors, rate limit retries, Porkbun price fetch failures |
| `ERROR` | Serious failures: network errors, HTTP 5xx, RDAP bootstrap unavailable |

> **Log retention:** Logs are not automatically deleted. Clean them up manually with `rm ~/.domainhunter/logs/*.log` when disk space is a concern. Auto-rotation will be added in a future release.

---

## 16. Exit Codes

DomainHunter uses standard exit codes, which is essential for scripting and automation.

| Code | Meaning |
|---|---|
| `0` | Run completed successfully; results printed or written to output file |
| `1` | Fatal error — input file could not be read, or output file could not be written |

**Important:** individual checker failures (RDAP down, wrong API key, rate limited) do **not**
produce exit code 1. They produce `status: "unknown"` rows in the output and `WARN`/`ERROR` entries
in the log. This is intentional — a partial result across 100 domains is more useful than a failed
run because one registrar returned a 429.

### Using exit codes in shell scripts

```sh
#!/bin/bash
bun run /path/to/domainhunter/index.ts -i domains.csv -o results.csv
if [ $? -ne 0 ]; then
  echo "DomainHunter failed — check the log:"
  tail -20 ~/.domainhunter/logs/$(date +%Y-%m-%d).log
  exit 1
fi
echo "Done."
```

### In GitHub Actions

```yaml
- name: Check domains
  run: |
    bun run index.ts \
      --input watchlist.csv \
      --filter-status available \
      --output results.csv \
      --no-log \
      --debug
  # The step fails automatically if exit code is 1 (I/O error)
  # Use --debug so API warnings appear in the Actions log
```

---

## License

MIT — use it however you like.
