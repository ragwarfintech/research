# Ragwar Fintech Research

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

## Contentful profile setup

The **About Ragwar Fintech** view uses a built-in profile until a published Contentful entry is available.

1. In your Contentful space and environment, create a content type named **Research Profile** with API ID `researchProfile`. Add these required plain-text fields.

   | API field ID | Field type |
   | --- | --- |
   | `name` | Short text |
   | `tagline` | Short text |
   | `overview` | Long text |
   | `researchFocus` | Long text |
   | `methodology` | Long text |

2. Create and publish one entry. Use `defaultProfile` in `src/contentful.js` as seed copy, and copy the published entry ID.
3. Create a Content Delivery API token authorized for that environment. Set `CONTENTFUL_SPACE_ID`, `CONTENTFUL_PROFILE_ENTRY_ID`, `CONTENTFUL_DELIVERY_TOKEN`, and optionally `CONTENTFUL_ENVIRONMENT` (default `master`) in the server environment. Store the token as a deployment secret.
4. For local development, copy `.env.example` to `.env`, fill it in, and run `node --env-file=.env scripts/preview.mjs`. On the deployed Site, set the same variables in its environment and redeploy.

The Worker reads the published profile via the Content Delivery API. The browser calls only the Site's `/api/profile` endpoint. Unavailable or incomplete CMS entries use the built-in profile.
