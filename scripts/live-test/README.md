# Live test against Appwrite Cloud

The unit, smoke and API contract tests run the node against mocks and Appwrite's
published API description. This harness runs it for real: it builds an n8n
workflow with one Appwrite node per operation, chained so that each suite
creates what it needs, reads it, updates it, lists it and deletes it. Each
suite ends in a Summary Code node that reports every step's outcome.

It covers 494 of the node's 495 project-level operations. **Dedicated Database →
Create** is left out because it provisions a billed database. The organization,
organization project and domain resources need an organization API key and are
not included.

## Safety

- **Run it only against a throwaway project.** The suites create, change and
  delete users, databases, functions, sites, providers and project settings.
- Nothing is sent to real people:
  - messages are created as drafts;
  - messaging providers are created disabled, with fake credentials;
  - phone sign-in uses Appwrite mock numbers;
  - emails go to `example.com`.
- Webhooks, firewall rules and OAuth2 providers are created disabled.
- Dedicated database operations run against an ID that doesn't exist, so they
  test the request and the error handling without provisioning anything.
- Suites clean up after themselves. Every ID ends in the n8n execution ID, so a
  rerun never collides with leftovers from an earlier failed run.

## Set up

1. Create an Appwrite project for testing, with an API key that has every scope.
2. In n8n, add an **Appwrite API** credential for it and note its ID and name.
3. Create a workflow with a Manual Trigger connected to a Set node named `Run`.
   Every suite chains off `Run`.
4. Enable MCP access for the workflow so the n8n MCP server can edit and run it.

## Generate and add the nodes

```sh
npm run build
export LIVE_CREDENTIAL_ID=<credential ID> LIVE_CREDENTIAL_NAME='<credential name>'
node scripts/live-test/generate.mjs scripts/live-test/suites/01-misc-users-teams.mjs 0
node scripts/live-test/generate.mjs scripts/live-test/suites/02-account.mjs 3
node scripts/live-test/generate.mjs scripts/live-test/suites/03-tablesdb.mjs 4
node scripts/live-test/generate.mjs scripts/live-test/suites/04-documentsdb-vectorsdb.mjs 5
node scripts/live-test/generate.mjs scripts/live-test/suites/05-storage-functions-sites.mjs 7
node scripts/live-test/generate.mjs scripts/live-test/suites/06-messaging-project-oauth-backups.mjs 10
```

- The second argument is the suite file's first canvas row. The rows above keep
  the suites from overlapping.
- The generator checks every step against the node's description, and writes
  batches of at most 99 `update_workflow` operations to `out/<suite>/ops-N.json`.
- Apply the batches in order with the n8n MCP `update_workflow` tool.
- If a workflow already holds part of a suite, add
  `--start-after "<last node present>"`. The generator then emits only the
  missing nodes and connects them after that node.

## Run and read the results

1. Run the workflow with the n8n MCP `execute_workflow` tool (manual mode). A
   full run takes a few minutes: function and site builds and the TOTP window
   are waited for.
2. Read each suite's result with `get_workflow_execution`, passing
   `nodeNames: ["<Suite>: Summary", …]`. Each item names a step, says whether it
   succeeded, and for errors includes Appwrite's message and status code.
3. Some errors are the point of the step. Their names say so:
   - "(unknown ID)" and "(bad secret)" expect a 401 or 404;
   - "(invalid …)", "(no repository)", "(no DNS)" and "(SMTP off)" expect
     Appwrite to refuse the request;
   - every step in the Dedicated suite expects a 404.

To finish, delete the test project, for example with a **Project → Delete**
node. That also tests the one operation the suites leave out on purpose.
