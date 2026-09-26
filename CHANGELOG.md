### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

#### 0.1.1

> 26 September 2026

Fixes from running every operation against Appwrite Cloud [`#17`](https://github.com/DentalRx/n8n-nodes-appwrite/pull/17):

- Health › Get Certificate: Domain is now a required field. Appwrite refuses the request without it, so the default configuration always failed. A 0.1.0 workflow that set Domain under Options needs it entered again.
- Webhook › Create and Update: blank HTTP username and password are left out. Appwrite refuses empty credentials, so updating any webhook without basic authentication failed.
- OAuth2 server errors now show Appwrite's reason (`error_description`) instead of "Request failed with status code 400".

#### 0.1.0


- Cover the Appwrite 2.3 server API, including organizations, domains and the OAuth2 server; pick records with resource locators; and check every request, its types and its credentials against Appwrite's OpenAPI description [`#14`](https://github.com/DentalRx/n8n-nodes-appwrite/pull/14)
- Fix all defects from the verification-readiness review [`#7`](https://github.com/DentalRx/n8n-nodes-appwrite/pull/7)
- Fix config-destroying updates, query/pagination bugs, and silent enum failures [`#6`](https://github.com/DentalRx/n8n-nodes-appwrite/pull/6)
- Meet n8n node UI design standards and verification guidelines [`#5`](https://github.com/DentalRx/n8n-nodes-appwrite/pull/5)
- Fix 17 defects found by adversarial review [`#4`](https://github.com/DentalRx/n8n-nodes-appwrite/pull/4)
- Complete the Appwrite node: all 18 resources, green build and lint [`#3`](https://github.com/DentalRx/n8n-nodes-appwrite/pull/3)
- Complete the Appwrite node: remaining resources, security fix, green build [`#2`](https://github.com/DentalRx/n8n-nodes-appwrite/pull/2)
- Appwrite n8n community node built on the TablesDB API [`#1`](https://github.com/DentalRx/n8n-nodes-appwrite/pull/1)
- Re-derive the review fixes against PR #5's transport layer [`0bcb42d`](https://github.com/DentalRx/n8n-nodes-appwrite/commit/0bcb42df1da56f53a362409268f64c5909a593f7)
- Merge main (PR #5's transport rewrite) into the review-fix branch [`00cc820`](https://github.com/DentalRx/n8n-nodes-appwrite/commit/00cc820fe762ada3ee268bbab203dd6f448d142a)
- Meet n8n verification guidelines: drop the runtime dependency [`4f7dbcb`](https://github.com/DentalRx/n8n-nodes-appwrite/commit/4f7dbcbd3e55065a27bc0ffb7a2eb84b8e37afd4)
