# Price service

`apps/prices`, an internal HTTP service. It is the only block that calls the price provider, and the only writer of the `shares`, `prices`, and `manual_price_events` tables. Only the API calls it, over the private network, with the bearer token `PRICES_TOKEN`. It has no public hostname.

## Principle

Prices follow holdings. The service prices only the market shares someone holds, on a fixed schedule. Nothing a person views triggers a provider call: every screen reads Postgres.

A provider call happens only:

- on the schedule: the intraday refresh and the daily closes;
- when a member looks up a share by ISIN or ticker;
- when a held share is missing closes: its first holding, or a change dated over days with no stored close.

The number of calls depends on the number of held shares, not on the number of people using the app.

The service also stores manual shares and their value points, deletes shares, and turns market shares into manual ones, as forwarded by the API. It converts every price to EUR before storing it, and logs every run, provider call, and error.

## Provider

The provider sits behind one interface, in `apps/prices/src/providers/`, with three operations: look up the listings matching an ISIN or a ticker, get the latest price of several listings, and get a listing's daily closes over a date range. `PRICE_PROVIDER` selects the implementation, `eodhd`, and `PRICE_PROVIDER_API_KEY` holds its key.

- Prices come back in the listing's trading currency, as decimal strings exactly as the provider sent them, never through a floating-point number. A listing with no latest price, such as a fund, is left out of the latest prices.
- A failed call fails as `not_found` for a symbol the provider doesn't carry, `unavailable` for any other failure, timeout, or unreadable answer, and `call_budget_used`, unsent, past the day's cap (see Call volume). A request times out after 15 seconds and is sent once: retries are the schedule's.

A provider fits FPR when it:

- covers the exchanges and fund types the instance's members hold;
- returns the latest prices of several listings in one request;
- returns daily closes over a date range, as they were on their day, not adjusted for later stock splits;
- fits the call volume below within its plan.

A share the provider doesn't know is created as a manual share.

### EODHD

The API is at `https://eodhd.com/api` and takes the key as the `api_token` query parameter.

| Operation | EODHD endpoint | Cost |
| --- | --- | --- |
| Lookup | `GET /search/{query}?limit=50`: every listing of the ISIN or ticker, with its code, exchange, currency, ISIN, type, and whether it is the primary listing | 1 call |
| Latest prices | `GET /real-time/{symbol}?s={other symbols}`: up to 20 listings per request, with each price's time. More listings take one request per 20, in sequence, and a failed request stops the rest | 1 call per listing |
| Daily closes | `GET /eod/{symbol}?from=&to=`: one row per trading day. FPR stores `close`, the price as traded, and ignores `adjusted_close` | 1 call |

- A listing's symbol is its code and its exchange: `ABC.PA`, `ABC.XETRA`, `ABC.LSE`, `ABC.US`.
- A request for an unknown symbol is billed. `GET /eod` answers it with `404`; `GET /real-time` answers `200` with a row of `"NA"` values, which is left out. `GET /user`, the account's usage, costs no call.
- Latest prices are delayed by 15 to 20 minutes. London listings are quoted in `GBX`.
- A fund (type `FUND`) has no latest price. It is priced by its daily closes alone, published one or two trading days late.

Plans, all licensed for personal, non-commercial use:

- Free: 20 calls a day, one year of daily closes, delayed latest prices. Extra calls come in packs of 100,000 for €5, spent once the day's 20 are used.
- EOD Historical All-World: €19.99 a month, 100,000 calls a day, more than 30 years of daily closes.

## Looking up a share

A member types an ISIN or a ticker and submits it: one provider call.

- The service stores each returned listing that isn't stored yet, and returns the stored shares.
- For an ISIN listed on several exchanges, it keeps one listing: the primary one. When the provider marks none as primary, it keeps the listing in the ISIN's country, given by its first two letters, otherwise the first one returned.
- A listing returned without an ISIN is returned unstored. The member fills the ISIN in from their statement, and storing it looks the symbol up again: one more call.
- A share is stored without history. Its history is fetched when it is first held.

Searching the Shares screen filters stored shares in Postgres, at no cost.

## History

When a portfolio change makes a market share held over days with no stored close, the API saves the change, then asks for history from that date without waiting. The service fetches the missing closes from a week before that date to the last trading day, so the holding has a price on its first day even if it starts on a weekend or a holiday, and fetches the latest price.

Until its history is stored, the share is pending: it shows "price pending" and its holder's balance is marked incomplete. Every intraday refresh and daily run first fetches the missing closes of held shares, so a failed fetch is retried until it succeeds.

The provider's history has a start: one year back on EODHD's Free plan. When a fetch returns its first close later than the holding's first day, the service stores that close's date as the share's `history_starts_on`. Days before it are never fetched again. A holding before that date is valued at the share's earliest close, so it shows no gain before it, and the share shows "prices from" that date. A share's chart starts at its earliest holding, or at `history_starts_on` when that is later.

A stored close is never fetched again. Closes keep the price of their day, so a later stock split doesn't rewrite the past values of quantities recorded before it.

## Schedule

The schedule runs inside the service with `croner`. The service runs as one instance.

### Intraday refresh

On `REFRESH_SCHEDULE`, by default every 30 minutes from 09:00 to 22:30 in `RACE_TIMEZONE`, Monday to Friday, the service gets the latest price of every held market share in one batch and converts them with the latest exchange rates. A price is stored as `intraday` when its time is newer than the share's latest stored price, so a closed exchange or a fund stores nothing new.

### Daily closes

At 07:00 in `RACE_TIMEZONE`, Tuesday to Saturday, the service fetches the closes of every held market share for every trading day since its last stored close, so a missed day fills itself on the next run. A close is stored at 23:59:59 of its trading day in `RACE_TIMEZONE`. A share that fails is retried every hour, three times; a day still missing after that is logged as an error. The same run deletes `intraday` prices older than 7 days.

## Call volume

With 20 held market shares, on EODHD:

| What | Calls per trading day |
| --- | --- |
| Intraday refresh, 28 runs of 20 listings | 560 |
| Daily closes | 20 |
| Lookups and history fills | 1 each, when members add shares |
| Refreshes the admin runs | 20 each, plus 1 per share missing its history |

That is about 600 calls per trading day. On the Free plan, about 12,500 calls a month come from extra-call packs, so a pack of 100,000 lasts about 8 months. Exchange rates cost no provider call.

`PROVIDER_DAILY_CALL_LIMIT` caps the calls spent in a day, 1,000 by default. The count is kept in memory, restarts at zero at midnight in `RACE_TIMEZONE` and when the service restarts, and is logged with every run as `callsToday`, `callsLeft`, and `callLimit`.

- Every request counts its billed calls before it is sent, since the provider bills a failed request. A request that would pass the cap is not sent and fails with `call_budget_used`, and a batch of latest prices stops there. The schedule then waits for the next day.
- Each schedule reserves the calls it still makes until midnight. A lookup or a history fill runs only when the calls left after it still cover those, and is refused with `call_budget_used` otherwise, so lookups never use the schedule's share.

## Currency

The service converts every price from the share's `trading_currency` to EUR, then stores it.

- Exchange rates are the European Central Bank's reference rates, read from Frankfurter, a free API with no key, at `RATES_URL`. They are how much of each currency one euro buys.
- The ECB publishes one rate per currency each working day, around 16:00 Central European Time. A price is converted with the rate of its day, or the last rate published before it: on weekends, on holidays, and for an intraday price before its day's rate is out.
- A price quoted in pence (`GBX`) is divided by 100 and converted from GBP.
- Rates are not stored. Each run fetches them for its date range in one request, `GET /v1/{from}..{to}`, which starts with the last working day on or before `from`. A run whose prices are all in EUR sends none.
- A EUR price is stored as the provider sent it. Any other price is divided by its rate with exact decimal arithmetic (`big.js`), and rounded once, half away from zero, to 6 decimal places, trailing zeros dropped.
- A price in a currency the ECB doesn't publish, or one that rounds to zero, is logged as a failure for its share and day, and nothing is stored.
- A failed rates request, sent once with a 15-second timeout, fails the run's conversions and is logged as an error.

## Endpoints

Each endpoint is an oRPC contract in `pricesContract`, in `packages/contracts/src/prices/`, left out of the OpenAPI document. Bodies are camelCase JSON, prices are decimal strings in EUR above zero, and moments are ISO 8601 with their offset. Schemas, error codes, and the error envelope are the API's (`api.md` › Errors).

Every endpoint refuses a request without `Authorization: Bearer <PRICES_TOKEN>` with `401 unauthenticated`, an invalid body or path param with `400 invalid_request`, and answers an unexpected failure with `500 internal_error`. A call that needs the provider can also fail with `call_budget_used` or `provider_unavailable`.

| Endpoint | Purpose | Other refusals |
| --- | --- | --- |
| `POST /lookup` | Look up a share by ISIN or ticker. Returns the stored shares and the listings returned without an ISIN | |
| `POST /shares/market` | Store a listing returned without an ISIN, with the ISIN the member typed | `not_found`; `isin_taken` |
| `POST /shares/manual` | Create a manual share with its first value point | `isin_taken`; `future_moment` |
| `PATCH /shares/:id` | Edit a manual share's name or ISIN | `not_found` for a missing or market share; `isin_taken` |
| `POST /shares/:id/history` | Make sure closes are stored from a day. Returns `historyStartsOn` once they are | `not_found` |
| `POST /shares/:id/manual-prices` | Add a value point to a manual share | `not_found`; `value_changed` when one exists at that moment; `future_moment` |
| `PATCH /shares/:id/manual-prices/:at` | Edit a value point's price, given the price the member saw | `not_found`; `value_changed` when it differs |
| `DELETE /shares/:id/manual-prices/:at` | Delete a value point, given the price the member saw | `not_found`; `value_changed`; `last_value_point` |
| `DELETE /shares/:id` | Delete a share with its prices and value edits | `not_found`; `share_in_use` when a share change refers to it |
| `POST /shares/:id/make-manual` | Turn a market share that needs attention into a manual share. Its prices stay, and its latest price becomes a value point entered by the admin; a share with no price takes one from the request | `not_found`; `share_not_needing_attention`; `future_moment` |
| `POST /refresh` | Run the intraday refresh now: missing closes first, then latest prices. Returns once the run ends | `refresh_running` |

`:at` is a value point's moment, percent-encoded as one path segment. Any offset names the same moment.

Every value point added, edited, or deleted writes a `manual_price_events` row in the same transaction, with the member the API names as its author. Creating a manual share and making a share manual each add a value point, recorded as `added`.

## Logs

The service logs with pino (`overview.md`): a line for every run, with the shares priced and the day's call count, and for every failure, with its share and day.

- Each provider call logs the provider, the endpoint, the symbols or query, the calls billed, `callsToday`, the HTTP status, and the duration. A failed call is logged at `error`, or `warn` for an unknown symbol; a call refused at the cap at `warn`.
- Each rates request logs `source: "frankfurter"`, its date range, the days returned, the status, and the duration, at `error` when it fails.
- Rows returned without a usable value, such as a listing without a currency, are dropped and counted in a `warn` line.
- The API key travels in the request URL, so the URL is never logged, and pino's `redact` removes the key from any other field.
- Each daily-closes run logs the calls left on the EODHD account, from `GET /user`.

Tests mock the provider's and Frankfurter's HTTP responses: each takes its `fetch` as an option. No test reaches the network, and CI needs no provider key.

## Configuration

| Variable | Purpose |
| --- | --- |
| `PORT` | The port it listens on. Default `3000` |
| `DATABASE_URL` | Postgres |
| `PRICES_TOKEN` | The bearer token the API sends |
| `PRICE_PROVIDER`, `PRICE_PROVIDER_API_KEY` | The provider implementation, `eodhd`, and its key |
| `RATES_URL` | The exchange-rate API. Default `https://api.frankfurter.dev` |
| `PROVIDER_DAILY_CALL_LIMIT` | The daily call cap. Default `1000` |
| `REFRESH_SCHEDULE` | The intraday refresh, as a cron expression. Default `*/30 9-22 * * 1-5` |
| `RACE_TIMEZONE` | The time zone of the schedules and of the daily call count's midnight. Default `Europe/Paris` |
