# AVP Digital Currency

A mobile-first, frontend-only AVP internal digital reward currency demo.

## Files

- `index.html` — app structure
- `style.css` — responsive styling
- `script.js` — authentication, wallet, earning, store, inventory, leaderboard, admin tools, and localStorage persistence
- `vercel.json` — Vercel configuration
- `README.md` — this guide

## Deploy to Vercel

### GitHub method

1. Extract this ZIP.
2. Create or open a GitHub repository.
3. Upload all 5 files to the repository root.
4. Open Vercel and choose **Add New → Project**.
5. Import the GitHub repository.
6. Do not add a framework, database, environment variables, or API keys.
7. Deploy.

The project is a static HTML/CSS/JavaScript site, so no build command or output directory is required.

### Demo accounts

**Admin**
- Name: `Aaditya`
- Password: `admin123`

**Student**
- Name: `Student`
- Password: `student123`

## Important data limitation

AVP uses browser `localStorage` because this project intentionally has no backend or database.

That means each browser/device has its own separate data. It does **not** synchronize balances between different phones or users.

This is therefore a demo/internal client-side system, not a secure production financial system.

## Currency disclaimer

AVP is an internal digital reward currency and has no real-world monetary value.

It does not provide cryptocurrency trading, cash withdrawal, bank transfers, real-money exchange, or investment functionality.
