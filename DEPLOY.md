# Deploy QueryLab

QueryLab uses SQLite for accounts, sessions and progress. The production setup runs one web instance with a persistent database volume, Caddy for HTTPS, and an internal SQL runner with separate resource limits and no database mount. Use PostgreSQL for account storage if you later need multiple web replicas. The practice databases run in SQLite independently of the account database.

## Start on a Linux VPS

1. Point your domain's DNS record to the VPS. Install Docker Engine with the Compose plugin and allow inbound TCP on ports 80 and 443.
2. Copy the project source to the server. Keep any existing progress database private.
3. Create an .env file with QUERYLAB_DOMAIN set to your hostname, for example QUERYLAB_DOMAIN=sql.example.com.
4. Run docker compose up -d --build from the project directory. Open the HTTPS URL and check /healthz, /favicon.png, /robots.txt and /sitemap.xml. Register a test account and submit a practice query.
5. Submit sitemap.xml in Google Search Console after verifying domain ownership.

Only the reverse proxy needs a public port. Keep the application and runner ports private. Keep the database and certificate volumes across updates. Back up the database using SQLite's online backup API or stop the web service before taking a consistent copy of its volume. Test restores and apply Node and container updates regularly.

Accounts use usernames and passwords. Anonymous attempts from older local versions have no verified owner and are kept separately in the existing SQLite file. Password reset and email verification are not included. The checks performed here cover core application behavior and do not replace a production security review.

## Deploy the web app to Vercel

The Vercel project can deploy this repository without a custom build command. Select Node.js 24.x. Set these variables for Production and redeploy:

- PUBLIC_ORIGIN = https://query-lab-eight.vercel.app (or your production domain).
- DATABASE_URL = the Neon PostgreSQL connection string. The app initializes the schema.
- RUNNER_URL = https://your-runner-domain.example/evaluate.
- RUNNER_TOKEN = a random secret shared only with the runner.

To deploy the runner, point RUNNER_DOMAIN at a Docker host and set RUNNER_DOMAIN and RUNNER_TOKEN on that host. Use a random 32-byte or longer token. Run docker compose -f compose.runner.yaml up -d --build. Caddy terminates HTTPS, and the runner has no account database credentials or disk mount. Keep the runner and the app on matching commits.

Without DATABASE_URL the catalog is available and account mutations return 503. Without an HTTPS runner URL and token, signed-in query requests return 503. Local and full Docker Compose deployments continue to use SQLite. The Vercel deployment starts with a separate PostgreSQL database.
