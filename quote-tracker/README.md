# Ragwar Fintech Quote Tracker

Source for the Ragwar Ethical Investments Platform, a paper portfolio and investment research workspace.

## Run locally

Use Node.js 24. There are no dependencies to install.

```sh
npm run dev
```

Open http://localhost:3000. The local preview stores workspace edits in an in-memory SQLite database that resets when the process stops.

```sh
npm run build
```

The build produces a Worker entry point at `dist/server/index.js`. A hosted deployment requires its own project ID, the `DB` D1 binding, the migration in `drizzle/`, and an access gate protecting the workspace and its API.

The seed model contains hypothetical allocations. Performance requires verified total-return observations. Google Finance tracking is a manual handoff in this version.
