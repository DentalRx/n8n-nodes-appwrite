# @dentalrx/n8n-nodes-appwrite

An [n8n](https://n8n.io) community node for [Appwrite](https://appwrite.io), built on the modern **TablesDB** API — databases contain **tables** (formerly collections) made of **columns** (formerly attributes) and **rows** (formerly documents).

Powered by the official [`node-appwrite`](https://www.npmjs.com/package/node-appwrite) server SDK (v20+), so it speaks the current Appwrite API, including bulk row operations, upserts, atomic increments, database transactions, and spatial column types.

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter `@dentalrx/n8n-nodes-appwrite`.

Or on a self-hosted instance:

```bash
npm install @dentalrx/n8n-nodes-appwrite
```

> **Note:** this package ships with the `node-appwrite` SDK as a runtime dependency, which is supported for self-hosted community nodes.

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
| **Column** | Create, Delete, Get, Get Many, Update — all 13 column types: string, integer, float, boolean, datetime, email, enum, IP, URL, point, line, polygon, and relationship |
| **Index** | Create (key, unique, fulltext, spatial), Delete, Get, Get Many |
| **Row** | Create, Create Many, Delete, Delete Many, Get, Get Many, Update, Update Many, Upsert, Upsert Many, Increment Column, Decrement Column |
| **Transaction** | Create, Commit, Rollback, Create Operations, Delete, Get, Get Many |

Row operations support:

- **Query builder** — visual builder for Appwrite queries (equal, contains, search, between, order, cursor pagination, select, …) or raw JSON query strings.
- **Data modes** — define row data as individual fields (with automatic typing of numbers, booleans, and JSON) or as raw JSON.
- **Return All** — automatic cursor pagination when you want every row.
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
| **User** | Create, Delete, Get, Get Many, Update Email/Name/Password/Phone/Status/Labels/Preferences, Email & Phone Verification, Sessions (list/create/delete), Tokens & JWTs, Identities, Logs, Memberships |
| **Team** | Create, Delete, Get, Get Many, Update Name, Preferences, Memberships (create/get/get many/update/delete) |

### Messaging

| Resource | Operations |
| --- | --- |
| **Message** | Create/Update Email, Create/Update SMS, Create/Update Push, Delete, Get, Get Many, Get Many Logs, Get Many Targets |
| **Topic** | Create, Delete, Get, Get Many, Update, Subscribers (create/get/get many/delete) |

### Other

| Resource | Operations |
| --- | --- |
| **Avatar** | Get Browser Icon, Get Credit Card Icon, Get Favicon, Get Flag, Get Image, Get Initials, Get QR Code (binary image output) |
| **Locale** | Get, Continents, Countries, EU Countries, Currencies, Languages, Locale Codes, Phone Codes |
| **Health** | Get, Antivirus, Cache, Certificate, Database, PubSub, Storage, Storage Local, Time |

## Usage notes

- **IDs**: leave any ID field empty (or type `unique()`) on create operations to auto-generate a unique ID.
- **Permissions**: enter one permission string per line (or a JSON array), e.g. `read("any")`, `update("user:abc")`, `delete("team:abc/owner")`.
- **AI agents**: the node sets `usableAsTool`, so it can be used as a tool by n8n AI Agent nodes.
- **Legacy Databases API**: this node intentionally targets the TablesDB API. If you still run an Appwrite version without TablesDB (< 1.8), use a legacy community node instead.

## Compatibility

- Requires n8n 1.x and Node.js ≥ 18.17.
- Tested against Appwrite Cloud and self-hosted Appwrite 1.8+ (TablesDB).

## Resources

- [Appwrite documentation](https://appwrite.io/docs)
- [Appwrite TablesDB / Databases product docs](https://appwrite.io/docs/products/databases)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
