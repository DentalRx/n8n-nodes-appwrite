# @dentalrx/n8n-nodes-appwrite

An [n8n](https://n8n.io) community node for [Appwrite](https://appwrite.io), built on the modern **TablesDB** API — databases contain **tables** (formerly collections) made of **columns** (formerly attributes) and **rows** (formerly documents).

It talks to the Appwrite REST API directly through n8n's own HTTP helpers, so the package ships with **zero runtime dependencies** — nothing extra is installed into your n8n instance. It tracks the current Appwrite API (Appwrite 2.0 / server 1.9), including bulk row operations, upserts, atomic increments, database transactions, and all 18 column types.

## Why this package

npm hosts older Appwrite community nodes, but they target the deprecated Collections/Documents API and depend on the Appwrite SDK (a runtime dependency n8n's verification guidelines disallow). This package is a from-scratch integration of the modern TablesDB API — tables, rows, columns, transactions, bulk operations, spatial and large-text column types — with zero runtime dependencies, published with npm provenance from a GitHub Action.

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter `@dentalrx/n8n-nodes-appwrite`.

Or on a self-hosted instance:

```bash
npm install @dentalrx/n8n-nodes-appwrite
```

## Credentials

Create an **Appwrite API** credential with:

| Field | Description |
| --- | --- |
| Endpoint | `https://cloud.appwrite.io/v1`, your region endpoint (e.g. `https://nyc.cloud.appwrite.io/v1`), or your self-hosted URL |
| Project ID | Found in the Appwrite Console under **Settings → Project ID** |
| API Key | Created under **Overview → Integrations → API Keys**; give it the scopes for the operations you plan to use |

## Resources and operations

### TablesDB (databases, tables, columns, indexes, rows, transactions)

| Resource | Operations |
| --- | --- |
| **Database** | Create, Delete, Get, Get Many, Update |
| **Table** | Create, Delete, Get, Get Many, Update (permissions, row security, enabled) |
| **Column** | Create, Delete, Get, Get Many, Update — all 18 column types: string, text, medium text, long text, varchar, integer, big integer, float, boolean, datetime, email, enum, IP, URL, point, line, polygon, and relationship |
| **Index** | Create (key, unique, fulltext, spatial), Delete, Get, Get Many |
| **Row** | Create, Create Many, Create or Update (upsert), Create or Update Many, Delete, Delete Many, Get, Get Many, Update, Update Many, Increment Column, Decrement Column |
| **Transaction** | Create, Commit, Rollback, Create Operations, Delete, Get, Get Many |

Every **Get Many** operation in the node — not just rows — supports:

- **Query builder** — visual builder for Appwrite queries (equal, contains, search, between, order, cursor pagination, select, …) or raw JSON query strings.
- **Return All** — automatic pagination when you want every result.

Get and Get Many on the wide models (users, functions, files, buckets, messages, tables) also offer a
**Simplify** toggle that trims the response to its ten most useful fields, and Row → Get Many has a
dedicated **Sort** collection.

Row operations additionally support:

- **Data modes** — define row data as individual fields (with automatic typing of numbers, booleans, and JSON) or as raw JSON.
- **Transactions** — every row operation accepts an optional Transaction ID, so multi-step writes can commit or roll back atomically.

### Storage

| Resource | Operations |
| --- | --- |
| **Bucket** | Create, Delete, Get, Get Many, Update |
| **File** | Upload (from binary data), Download, Get View, Get Preview (resize/transform), Delete, Get, Get Many, Update |
| **Token** | Create, Delete, Get, Get Many, Update — expiring file access tokens |

### Serverless functions

| Resource | Operations |
| --- | --- |
| **Function** | Create, Delete, Get, Get Many, Update, Activate Deployment, Get/Get Many/Delete Deployments, Create/Get/Get Many/Update/Delete Variables |
| **Execution** | Create (sync or async, with method/path/headers/body/scheduling), Delete, Get, Get Many |

### Auth

| Resource | Operations |
| --- | --- |
| **User** | Create, Delete, Get, Get Many, Get/Update Preferences, Update Email/Name/Password/Phone/Status/Labels, Email & Phone Verification, Sessions (list/create/delete one/delete all), Tokens & JWTs, Identities, Logs, Memberships |
| **Team** | Create, Delete, Get, Get Many, Update Name, Preferences, Memberships (create/get/get many/update/delete) |

### Messaging

| Resource | Operations |
| --- | --- |
| **Message** | Create/Update Email, Create/Update SMS, Create/Update Push, Delete, Get, Get Many, Get Many Targets |
| **Topic** | Create, Delete, Get, Get Many, Update, Subscribers (create/get/get many/delete) |

### Other

| Resource | Operations |
| --- | --- |
| **Avatar** | Get Browser Icon, Get Credit Card Icon, Get Favicon, Get Flag, Get Image, Get Initials, Get QR Code (binary image output) |
| **Locale** | Get, Get Many Continents, Get Many Countries, Get Many Currencies, Get Many EU Countries, Get Many Languages, Get Many Locale Codes, Get Many Phone Codes |
| **Health** | Get Antivirus, Get Cache, Get Certificate, Get Database, Get HTTP, Get Local Storage, Get PubSub, Get Storage, Get Time |

## Example workflows

### Append a row to a table

1. Add a **Schedule Trigger** (or any trigger).
2. Add the **Appwrite** node and pick your **Appwrite API** credential.
3. Set **Resource** to `Row` and **Operation** to `Create`.
4. Choose your **Database Name or ID** and **Table Name or ID** from the dropdowns.
5. Leave **Row ID** empty so Appwrite generates one.
6. Set **Data Mode** to `Define Fields Below` and add a field per column, or switch to `JSON` and pass an
   expression such as `={{ $json }}`.

### Look up rows and act on them

1. **Appwrite** → **Resource** `Row`, **Operation** `Get Many`.
2. Turn on **Return All**, or leave it off and set a **Limit**.
3. Under **Queries**, add conditions with the builder — for example **Type** `Equal`,
   **Column** `status`, **Value** `active`. Each row comes out as its own n8n item.

### Store a file from a previous node

1. Any node that produces binary data (for example **HTTP Request** with a file response).
2. **Appwrite** → **Resource** `File`, **Operation** `Upload`.
3. Pick the **Bucket Name or ID**, and set **Input Data Field Name** to the field holding
   the file (`data` by default). Files larger than 5 MB are uploaded in chunks
   automatically.

### Use Appwrite as an AI agent tool

The node sets `usableAsTool`, so you can attach it to an **AI Agent** node and let the model
read from or write to your Appwrite project.

## Usage notes

- **Pick from a list or type an ID**: fields such as **Database Name or ID** and
  **Table Name or ID** load the real values from your project. You can always switch the field
  to an expression to supply an ID computed at runtime.
- **Pasting console URLs**: the **Database**, **Table** (and **Related Table**), **Row**,
  **Bucket**, **File**, **Function**, **Team** and **Topic** ID fields also accept a URL copied
  out of the Appwrite Console — the ID is extracted for you. Every other ID field (users,
  deployments, executions, messages, sessions, memberships and the rest) wants the bare ID.
- **Auto-generated IDs**: leave any ID field empty (or type `unique()`) on create operations to
  have a unique ID generated.
- **Permissions**: enter one permission string per line (or a JSON array), e.g. `read("any")`,
  `update("user:abc")`, `delete("team:abc/owner")`. Leaving the field blank on an update keeps the
  resource's existing permissions; enter `[]` to clear them.
- **Updates are non-destructive**: Appwrite's bucket and function update endpoints replace the
  whole configuration, so the node reads the current bucket/function first and resends any setting
  you did not change. Renaming a bucket will not clear its extension allowlist, and renaming a
  function will not drop its schedule, event triggers or linked repository.
- **Lists**: fields that take several values (file extensions, execute roles, events, scopes,
  index columns, `Select` queries) accept either a comma-separated string or a JSON array.
- **API key scopes**: each operation needs the matching scope on your Appwrite API key. A
  `401`/`403` from Appwrite usually means a missing scope rather than a bad key. The credential
  test lists databases, so it needs `databases.read`; it deliberately does not use `/ping`, which
  Appwrite answers for unauthenticated callers and which would therefore pass for any key.
- **Delete confirmations**: delete operations output a single `{"deleted": true, ...}` item (with the
  deleted IDs echoed) so the following node always receives something to act on.
- **Legacy Databases API**: this node intentionally targets the TablesDB API. If you still run an
  Appwrite version without TablesDB (< 1.8), use a legacy community node instead.
- **Account API**: Appwrite's Account endpoints authenticate as a logged-in end user (session/JWT) and
  never accept an API key, so a server-key node cannot implement them by design. The server-side
  equivalent is the **User** resource, including Create Token, Create Session, and Create JWT for
  minting user-scoped credentials.
- **Not (yet) covered**: some Appwrite 2.0 areas are out of scope for now — vector databases
  (vectorsDB), the schemaless documentsDB, Sites hosting, Backups, messaging provider management,
  admin MFA operations, hashed-password user imports, and creating function deployments (code upload).

## Compatibility

- Requires n8n 1.85 or newer (including 2.x) and Node.js ≥ 18.17. The node uses `NodeConnectionTypes`, which n8n-workflow only exports from 1.83.0 onwards.
- Tested against Appwrite Cloud and self-hosted Appwrite 1.8+ (TablesDB).

## Development

This package is built and linted with n8n's official [`n8n-node`](https://docs.n8n.io/integrations/creating-nodes/build/n8n-node) tool.

```bash
npm ci
npm run build     # n8n-node build
npm run lint      # n8n-node lint - n8n's community-node rule set
npm run dev       # run a local n8n with this node loaded
```

Releases are published from the `Publish` GitHub Action with [npm provenance](https://docs.npmjs.com/generating-provenance-statements), so every published version is traceable to the commit it was built from.

## Resources

- [Appwrite documentation](https://appwrite.io/docs)
- [Appwrite TablesDB / Databases product docs](https://appwrite.io/docs/products/databases)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
