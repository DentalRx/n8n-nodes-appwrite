# @dentalrx/n8n-nodes-appwrite

[![CI](https://github.com/DentalRx/n8n-nodes-appwrite/actions/workflows/ci.yml/badge.svg)](https://github.com/DentalRx/n8n-nodes-appwrite/actions/workflows/ci.yml)

This is an [n8n](https://n8n.io) community node. It lets you use [Appwrite](https://appwrite.io) in your n8n workflows.

Appwrite is an open-source backend platform providing databases, authentication, file storage, serverless functions, hosting and messaging through one REST API, available as Appwrite Cloud or self-hosted.

The node covers the Appwrite server API as of **Appwrite 2.3**: TablesDB (tables, rows, columns, transactions), DocumentsDB and VectorsDB, dedicated MongoDB/MySQL/PostgreSQL databases, Storage, Functions and Sites, users, teams and the signed-in user's Account, Messaging, and project administration (API keys, platforms, OAuth2 providers, policies, webhooks, proxy and firewall rules, backups). It talks to the REST API through n8n's own HTTP helpers, so the package ships with **zero runtime dependencies** and nothing extra is installed into your n8n instance.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)
[Development](#development)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In n8n: **Settings → Community Nodes → Install**, then enter `@dentalrx/n8n-nodes-appwrite`.

On a self-hosted instance you can also install it into the n8n user folder directly:

```bash
npm install @dentalrx/n8n-nodes-appwrite
```

### How this differs from other Appwrite nodes

npm hosts older Appwrite community nodes, but they target the deprecated Collections/Documents API and depend on the Appwrite SDK, a runtime dependency that n8n's verification guidelines disallow. This package is a from-scratch integration of the current API with no runtime dependencies, published with npm provenance from a GitHub Action, and every request it can make is checked in CI against Appwrite's published OpenAPI description.

## Operations

The node has one resource per Appwrite concept. Every **Get Many** operation offers **Return All** (automatic pagination) or a **Limit**, and a **query builder** (equal, contains, search, between, order, cursor pagination, select and more) or raw JSON query strings. Wide models (users, functions, sites, files, databases and others) offer a **Simplify** toggle that trims the output to its most useful fields.

### Databases: TablesDB

| Resource        | Operations                                                                                                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database**    | Create, Delete, Get, Get Many, Update; for databases on dedicated compute: Get Status, Get Replicas, Get Many Operations, Trigger Failover, Migrations (create, get, get many, delete, cutover), Get Many Specifications  |
| **Table**       | Create, Delete, Get, Get Many, Update (permissions, row security, enabled)                                                                                                                                                |
| **Column**      | Create, Delete, Get, Get Many, Update. All column types: varchar, text, medium text, long text, integer, big integer, float, boolean, datetime, email, enum, IP, URL, point, line, polygon, relationship, string (legacy) |
| **Index**       | Create (key, unique, fulltext, spatial), Delete, Get, Get Many                                                                                                                                                            |
| **Row**         | Create, Create Many, Create or Update (upsert), Create or Update Many, Delete, Delete Many, Get, Get Many (with a Sort collection), Update, Update Many, Increment Column, Decrement Column                               |
| **Transaction** | Create, Commit, Roll Back, Create Operations, Delete, Get, Get Many                                                                                                                                                       |

Row data can be entered field by field (numbers, booleans and JSON are typed automatically) or as raw JSON, and every row operation accepts an optional **Transaction ID** so multi-step writes commit or roll back atomically.

### Databases: DocumentsDB and VectorsDB

| Resource                                         | Operations                                                                                                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DocumentsDB Database**, **VectorsDB Database** | Create, Delete, Get, Get Many, Update, Get Status, Get Replicas, Trigger Failover, Get Many Operations, Get Many Specifications, Transactions (create, get, get many, commit, roll back, delete, create operations) |
| **DocumentsDB Collection**                       | Create, Delete, Get, Get Many, Update, Indexes (create, get, get many, delete: key, unique, fulltext)                                                                                                               |
| **VectorsDB Collection**                         | Create (with the embedding dimension), Delete, Get, Get Many, Update, Indexes (cosine, dot product and Euclidean vector indexes, key, unique, object)                                                               |
| **DocumentsDB Document**                         | Create, Create Many, Create or Update, Create or Update Many, Delete, Delete Many, Get, Get Many, Update, Update Many, Increment Attribute, Decrement Attribute                                                     |
| **VectorsDB Document**                           | Search (similarity search), Create, Create Many, Create or Update, Create or Update Many, Delete, Delete Many, Get, Get Many, Update, Update Many                                                                   |

### Databases: dedicated MongoDB, MySQL and PostgreSQL

| Resource               | Operations                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dedicated Database** | Create, Delete, Get, Get Many, Update, **Execute SQL** (MySQL, PostgreSQL), Get Status, Get Replicas, Get Recovery Window, Get Many Operations, Get Many Specifications, Rotate Credentials, Trigger Failover, Migrate, Upgrade Version, Update Maintenance Window, Backups, Backup Policies, Update Backup Storage, Branches, Restore, Restorations, Connection Pooler (MySQL, PostgreSQL), Extensions (PostgreSQL) |

### Storage

| Resource   | Operations                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------ |
| **Bucket** | Create, Delete, Get, Get Many, Update                                                                        |
| **File**   | Upload (from binary data), Download, Get View, Get Preview (resize/transform), Delete, Get, Get Many, Update |
| **Token**  | Create, Delete, Get, Get Many, Update (expiring file access tokens)                                          |

### Functions and Sites

| Resource      | Operations                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Function**  | Create, Delete, Get, Get Many, Update, Get Many Runtimes, Get Many Specifications, Deployments (create from a code upload, a template or Git; duplicate; activate; cancel; download; get; get many; delete), Variables         |
| **Execution** | Create (sync or async, with method, path, headers, body and scheduling), Delete, Get, Get Many                                                                                                                                 |
| **Site**      | Create, Delete, Get, Get Many, Update, Get Many Frameworks, Get Many Specifications, Deployments (create from a code upload, a template or Git; duplicate; activate; cancel; download; get; get many; delete), Logs, Variables |

### Auth

| Resource    | Operations                                                                                                                                                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **User**    | Create, Create with Password Hash (Argon2, Bcrypt, MD5, PHPass, Scrypt, Scrypt Modified, SHA), Delete, Get, Get Many, Preferences, Update Email/Name/Password/Phone/Status/Labels, Email and Phone Verification, Sessions, Tokens and JWTs, Identities, Memberships, Targets, MFA (factors, authenticators, recovery codes, challenges), Update Impersonator |
| **Team**    | Create, Delete, Get, Get Many, Update Name, Preferences, Memberships (create, get, get many, update, delete), Accept Membership Invitation, App Installations                                                                                                                                                                                                |
| **Account** | Acts as one of your users: Get, Preferences, Update Email/Name/Password/Phone/Status, Sessions, Identities, MFA, consents, email and phone verification. With the API key: Create, Create Email Password/Anonymous/ID Token Session, Create Session (from a token), Create Email/Magic URL/Phone Token, Create and Complete Password Recovery                |

### Messaging

| Resource     | Operations                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Message**  | Create/Update Email, Create/Update SMS, Create/Update Push, Delete, Get, Get Many, Get Many Targets                                                 |
| **Topic**    | Create, Delete, Get, Get Many, Update, Subscribers (create, get, get many, delete)                                                                  |
| **Provider** | Create, Delete, Get, Get Many, Update. Amazon SES, APNs, Appwrite, FCM, Mailgun, MSG91, Resend, SendGrid, SMTP, Telesign, Textmagic, Twilio, Vonage |

### Project administration

| Resource              | Operations                                                                                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project**           | Get, Delete, Update Labels, Update Auth Method, Update Service, Update Protocol, Update SMTP, Send Test Email, Update OAuth2 Server, Policies (16 security policies) |
| **API Key**           | Create Ephemeral Key, Delete, Get, Get Many, Update                                                                                                                  |
| **Platform**          | Create, Delete, Get, Get Many, Update (web, Apple, Android, Windows, Linux)                                                                                          |
| **OAuth2 Provider**   | Get, Get Many, Update (48 sign-in providers, each with its own settings)                                                                                             |
| **Project Variable**  | Create, Delete, Get, Get Many, Update                                                                                                                                |
| **Mock Phone Number** | Create, Delete, Get, Get Many, Update                                                                                                                                |
| **Email Template**    | Get, Get Many, Update                                                                                                                                                |
| **Webhook**           | Create, Delete, Get, Get Many, Update, Update Secret                                                                                                                 |
| **Proxy Rule**        | Create (API, function, redirect, site), Delete, Get, Get Many, Purge Cache, Verify Domain                                                                            |
| **Firewall Rule**     | Create and Update for each action (bypass, challenge, deny, rate limit, redirect) with a conditions builder, Delete, Get, Get Many                                   |
| **App**               | Create, Delete, Get, Get Many, Update, Update Labels, Transfer to Team, Revoke All Tokens, Keys, Secrets, Installations, Scopes                                      |
| **Backup**            | Archives, Policies (create, get, get many, update, delete), Restorations                                                                                             |
| **Activity**          | Get Event, Get Many Events (the project's audit trail)                                                                                                               |
| **Advisor**           | Reports (get, get many, delete), Insights (get, get many)                                                                                                            |

### Other

| Resource      | Operations                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Avatar**    | Get Browser Icon, Get Credit Card Icon, Get Favicon, Get Flag, Get Image, Get Initials, Get Photo, Get QR Code, Get Screenshot (binary image output)      |
| **Locale**    | Get, Get Many Continents, Get Many Countries, Get Many Currencies, Get Many EU Countries, Get Many Languages, Get Many Locale Codes, Get Many Phone Codes |
| **GraphQL**   | Execute Query, Execute Mutation (with variables and an operation name)                                                                                    |
| **Embedding** | Create Text Embeddings                                                                                                                                    |
| **Presence**  | Create or Update, Delete, Get, Get Many, Update                                                                                                           |
| **Health**    | Ping, Get Antivirus, Get Cache, Get Certificate, Get Database, Get HTTP, Get Local Storage, Get PubSub, Get Storage, Get Time                             |

### Not covered

- **The legacy Databases API** (collections, attributes, documents): Appwrite deprecated all 70 of its endpoints in favour of TablesDB, which reads and writes the same data. Use the Database, Table, Column, Index and Row resources.
- **Deprecated aliases**: where Appwrite kept an old method name on the same endpoint (`createSms`, `createMfaAuthenticator` and so on), the node calls the endpoint through its current name. The phone and magic URL session endpoints Appwrite deprecated in 1.6 are replaced by Account → Create Session.

## Credentials

You need an Appwrite project and an API key.

1. Sign in to the [Appwrite Console](https://cloud.appwrite.io) (or your self-hosted console) and open your project.
2. Under **Overview → Integrations → API Keys**, create an API key and give it the scopes for the operations you plan to use. The credential test lists databases, so the key needs at least `databases.read`.
3. In n8n, create an **Appwrite API** credential:

| Field      | Description                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint   | `https://cloud.appwrite.io/v1`, your region endpoint (for example `https://nyc.cloud.appwrite.io/v1`), or the URL of your self-hosted instance |
| Project ID | Found in the Appwrite Console under **Settings → Project ID**                                                                                  |
| API Key    | The key created above                                                                                                                          |

A `401` or `403` from Appwrite usually means a missing scope on the key rather than a bad key: each operation needs the scope Appwrite documents for its endpoint (for example `rows.write` to create rows, `files.read` to download files). The credential test deliberately does not use `/ping`, which Appwrite answers for unauthenticated callers and which would therefore pass for any key.

### Acting as one of your users (Account)

An API key acts as your server, never as a user, so Appwrite's Account endpoints need the user's own credential. Account operations therefore offer an **Authentication** choice:

- **User JWT**: a JSON Web Token for the user, from **User → Create JWT** in this node or `account.createJWT()` in your app (passed to n8n through a webhook). JWTs are valid for 15 minutes by default.
- **User Session Secret**: the `secret` of a session created with the API key, for example by **Account → Create Email Password Session**. Appwrite only returns it to API-key calls, which is the server-side-rendering pattern Appwrite documents. Update MFA, Verify MFA Authenticator and Complete MFA Challenge need a session secret, because Appwrite records the factor on that session. So do Get MFA Recovery Codes, Regenerate MFA Recovery Codes and Delete MFA Authenticator, which Appwrite only allows within 30 minutes of completing an MFA challenge on that session.
- **API Key**: signing up, signing in, sending sign-in tokens and password recovery run with the credential's API key (scope `sessions.write`), like Appwrite's server SDKs.

User-authenticated requests carry the project ID and the user's JWT or session, and never the API key: Appwrite rejects a request that carries both. Completing an email or phone verification, and accepting a team invitation, send only the project ID, because the user ID and secret from the message are the proof. Accepting an invitation also verifies the user's email address and opens a session for them, as it does in a browser.

**Rate limits**: Appwrite rate-limits requests made as a user or a guest by route and IP address, and every such request comes from your n8n server's IP. Limits such as 10 password updates or 10 phone verifications per hour therefore apply to all your users together. API-key requests are exempt, so for bulk jobs use the **User** resource's equivalents (for example **User → Update Password**).

## Compatibility

- **n8n**: 1.85 or newer, including 2.x. The node uses `NodeConnectionTypes`, which n8n-workflow exports from 1.83.0 onwards. Tested end to end in n8n 2.40.
- **Node.js**: whatever your n8n version requires (current n8n 2.x releases need Node.js 24).
- **Appwrite**: Appwrite Cloud and self-hosted Appwrite 1.8 or newer (TablesDB). Each resource works on the Appwrite versions that have its API: DocumentsDB, VectorsDB, dedicated databases, Sites, webhooks, the Project and App APIs and the other services added in Appwrite 1.9 to 2.3 need a server that has them, and some (Backups, Activity, Advisor, dedicated databases) are Appwrite Cloud features. Health is served to API keys with the `health.read` scope although Appwrite 1.9 dropped it from its SDKs. Account consents are an Appwrite Cloud feature: self-hosted Appwrite 2.3 answers them with a 404.
- If you still run an Appwrite version without TablesDB (older than 1.8), use a legacy community node instead.

## Usage

Ready-to-import workflows are in [`examples/`](examples): [save form submissions to a table](examples/save-form-submissions-to-a-table.json), [store a downloaded file in Storage](examples/store-a-downloaded-file-in-storage.json) and [a daily digest of new rows](examples/daily-digest-of-new-rows.json). In n8n, open **Workflows → Import from File** and pick one.

### Append a row to a table

1. Add a **Schedule Trigger** (or any trigger).
2. Add the **Appwrite** node and pick your **Appwrite API** credential.
3. Set **Resource** to `Row` and **Operation** to `Create`.
4. Pick your **Database** and **Table** from the lists.
5. Leave **Row ID** empty so Appwrite generates one.
6. Set **Data Mode** to `Define Fields Below` and add a field per column, or switch to `JSON` and pass an expression such as `={{ $json }}`.

### Look up rows and act on them

1. **Appwrite** → **Resource** `Row`, **Operation** `Get Many`.
2. Turn on **Return All**, or leave it off and set a **Limit**.
3. Under **Queries**, add conditions with the builder, for example **Type** `Equal`, **Column** `status`, **Value** `active`. Each row comes out as its own n8n item.

### Store a file from a previous node

1. Any node that produces binary data (for example **HTTP Request** with a file response).
2. **Appwrite** → **Resource** `File`, **Operation** `Upload`.
3. Pick the **Bucket**, and set **Input Data Field Name** to the field holding the file (`data` by default). Files larger than 5 MB are uploaded in chunks automatically.

### Store and search embeddings (VectorsDB)

1. **VectorsDB Collection → Create** with the **Dimension** your embedding model outputs (for example 1536 for OpenAI `text-embedding-3-small`).
2. **VectorsDB Document → Create** with **Embeddings** set to the vector (for example `={{ $json.embedding }}`) and **Metadata** to a JSON object such as `{"text": "...", "source": "faq"}`.
3. **VectorsDB Document → Search** with the query text's embedding as **Vector** and the collection's similarity metric. Results come back most similar first.

### Run SQL on a dedicated database

**Dedicated Database → Execute SQL** runs one statement on a MySQL or PostgreSQL database. Put values in **Options → Bindings** as a JSON array (`["open", 10]`, referenced as `?` in MySQL or `$1, $2` in PostgreSQL) or an object for named placeholders; they are never interpolated into the SQL. Each result row becomes an item.

### Use Appwrite as an AI agent tool

The node sets `usableAsTool`, so you can attach it to an **AI Agent** node and let the model read from or write to your Appwrite project.

### Usage notes

- **Pick from a list, paste a link or type an ID**: databases, tables, collections, buckets, files, functions, sites, teams, topics, users, providers, webhooks and the other records you pick are resource locators. **From List** searches your project, **By URL** takes a link copied from the Appwrite Console, and **ID** takes the bare ID; all three also accept expressions.
- **Auto-generated IDs**: leave an ID field empty (or type `unique()`) on create operations to have a unique ID generated.
- **Permissions**: enter one permission string per line (or a JSON array), for example `read("any")`, `update("user:abc")`, `delete("team:abc/owner")`. Leaving the field blank on an update keeps the existing permissions; enter `[]` to clear them.
- **Updates are non-destructive**: where Appwrite's update endpoint replaces the whole configuration (buckets, functions, sites, webhooks, apps, API keys, platforms, the OAuth2 server), the node reads the current record first and resends every setting you did not change.
- **Lists**: fields that take several values (file extensions, execute roles, events, scopes, labels, index columns, `Select` queries) accept a comma-separated string or a JSON array.
- **Expressions**: every field accepts expressions, including ones that resolve to numbers, booleans or arrays.
- **Delete confirmations**: delete operations output a single `{"deleted": true, ...}` item (with the deleted IDs echoed, or the `total` for Delete Many) so the next node always receives something to act on.
- **Bulk writes**: Create, Upsert and Update Many output one item per row or document Appwrite returns. Inside a transaction Appwrite only stages them and returns none, so the node outputs one `{"total": ..., "transactionId": ...}` item and the next node (for example the transaction's Commit) still runs. Update Many and Delete Many refuse to run without a query that selects the records, unless **Apply to All Rows** (or Documents) is on.
- **Secrets in the output**: some operations return credentials by design (a created webhook's signing secret, an app's client secret, an ephemeral API key, a dedicated database's connection string, a session secret). With the API key, Account's Create Email/Magic URL/Phone Token and Create Password Recovery return the live `secret` that signs the user in or resets their password, and Get Many Identities and Sessions include the OAuth providers' access and refresh tokens unless Simplify is on. Anyone who can read your execution history can use these, so treat their output as sensitive, or turn off saving successful executions for such workflows.
- **Errors**: Appwrite's own error message and HTTP status are surfaced on the node error. With **Continue On Fail** enabled, the failed item carries `error`, `description` and `httpCode` fields for an error-handling branch.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Appwrite documentation](https://appwrite.io/docs)
- [Appwrite API reference](https://appwrite.io/docs/references)
- [Appwrite API keys and scopes](https://appwrite.io/docs/advanced/platform/api-keys)
- [Appwrite server-side rendering (sessions with an API key)](https://appwrite.io/docs/products/auth/server-side-rendering)

## Version history

### 0.1.0

Initial release: the Appwrite 2.3 server API across databases (TablesDB, DocumentsDB, VectorsDB, dedicated databases), Storage, Functions, Sites, auth (users, teams, accounts), Messaging and project administration, with resource locators, a query builder, Return All pagination, Simplify, example workflows and AI agent tool support.

See [CHANGELOG.md](CHANGELOG.md) for the detailed per-release history.

## Development

This package is built, linted and released with n8n's official [`n8n-node`](https://docs.n8n.io/integrations/creating-nodes/build/n8n-node) tool and tested with [Vitest](https://vitest.dev).

```bash
npm ci
npm run build          # n8n-node build
npm run lint           # n8n-node lint: n8n's community-node rule set
npm test               # unit, smoke and API contract tests
npm run typecheck      # type-check the test suite
npm run format:check   # prettier
npm run dev            # run a local n8n with this node loaded
```

The test suite runs every operation of every resource against a mocked Appwrite API: with n8n's defaults, with every field filled in, with every dropdown and toggle alternative, with each resource locator in By URL mode, and with numbers in every text field (as an expression can produce). Each request is also checked against Appwrite's published API: [`test/fixtures/appwrite-api.json`](test/fixtures/appwrite-api.json) is derived from the official [OpenAPI description](https://github.com/appwrite/specs), and [`test/api-contract.test.ts`](test/api-contract.test.ts) fails if the node calls an endpoint Appwrite does not document for server SDKs, sends a parameter it does not accept, uses an invalid enum value, or leaves out a required parameter. To move to a newer Appwrite version, regenerate the fixture:

```bash
git clone --depth 1 https://github.com/appwrite/specs /tmp/appwrite-specs
node scripts/generate-api-fixture.mjs /tmp/appwrite-specs/specs/<version>/open-api3-<version>.json
```

### Releasing

Releases are published from the `Publish` GitHub Action with [npm provenance](https://docs.npmjs.com/generating-provenance-statements), which n8n requires for verified community nodes, so every published version is traceable to the commit it was built from.

1. On a clean `main` checkout, run `npm run release`. It lints, builds, prompts for the version bump, regenerates `CHANGELOG.md`, commits, tags, pushes and creates the GitHub release.
2. The pushed tag triggers `.github/workflows/publish.yml`, which runs the tests and publishes that exact commit to npm. The workflow file documents the one-time npm trusted-publisher (or `NPM_TOKEN`) setup.

## License

[MIT](LICENSE)
