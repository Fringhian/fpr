# Price service

`apps/prices`, an internal HTTP service. It is the only block that calls the price provider, and the only writer of the `shares`, `prices`, and `manual_price_events` tables. Only the API calls it, over the private network, with the bearer token `PRICES_TOKEN`. It has no public hostname.

## Principle

Prices follow holdings. The service prices only the market shares someone holds, on a fixed schedule. Nothing a person views triggers a provider call: every screen reads Postgres.

A provider call happens only:

- on the schedule: the intraday refresh and the daily closes;
- when a member looks up a share by ISIN or ticker;
- when a held share is missing closes: its first holding, or a change dated over days with no stored close.

The number of calls depends on the number of held shares, not on the number of people using the app. Exchange rates come from a separate source and are not provider calls.

## Responsibilities

- Look up a share at the provider and store it.
- Fill a held share's daily closes over every period it is held.
- Refresh every held share's price on the refresh schedule, every 30 minutes during the trading day by default.
- Fetch every held share's daily close each morning.
- Create manual shares, and store, edit, and delete their value points, as forwarded by the API.
- Delete a share no share change refers to, as forwarded by the API.
- Turn a market share into a manual share, and run the refresh on demand, as forwarded by the API.
- Convert every price to EUR before storing it.
- Log every run, provider call, and error.

## Provider

The provider sits behind one interface, `PriceProvider`, in `apps/prices/src/providers/`:

| Method | Returns |
| --- | --- |
| `lookup(query)` | The listings matching an ISIN or a ticker: ISIN, name, provider symbol, exchange, trading currency |
| `latest(symbols)` | The latest price of several listings, with each price's time, in as few calls as the provider allows |
| `closes(symbol, from, to)` | Daily closing prices |

`PRICE_PROVIDER` selects the implementation and `PRICE_PROVIDER_API_KEY` holds its key. The implementation is `eodhd`.

A provider fits FPR when it:

- covers the exchanges and fund types the instance's members hold;
- returns the latest prices of several listings in one request;
- returns daily closes over a date range, as they were on their day, not adjusted for later stock splits;
- fits the call volume below within its plan.

A share the provider doesn't know is created as a manual share.

### EODHD

`PRICE_PROVIDER=eodhd`. The API is at `https://eodhd.com/api`, and takes the key as the `api_token` query parameter.

| Method | EODHD endpoint | Cost |
| --- | --- | --- |
| `lookup(query)` | `GET /search/{query}`: every listing of the ISIN or ticker, with its code, exchange, country, currency, ISIN, type, and whether it is the primary listing | 1 call |
| `latest(symbols)` | `GET /real-time/{symbol}?s={other symbols}`: the latest price of several listings in one request, with each price's time | 1 call per listing |
| `closes(symbol, from, to)` | `GET /eod/{symbol}?from=&to=`: one row per trading day. FPR stores `close`, the price as traded, and ignores `adjusted_close` | 1 call |

- A listing's symbol is its code and its exchange: `ABC.PA`, `ABC.XETRA`, `ABC.LSE`, `ABC.US`.
- A request for an unknown symbol is billed. `GET /user`, the account's usage, costs no call.
- Latest prices are delayed by 15 to 20 minutes.
- London listings are quoted in `GBX`.
- A fund (type `FUND`) has no latest price. It is priced by its daily closes alone, published one or two trading days late.

Plans:

- Free: 20 calls a day, one year of daily closes, and delayed latest prices. Extra calls are bought in packs, 100,000 calls for €5, and are spent once the day's 20 are used.
- EOD Historical All-World: €19.99 a month, 100,000 calls a day, and more than 30 years of daily closes.
- Every plan is licensed for personal, non-commercial use.

## Looking up a share

A member types an ISIN or a ticker and submits it. That is one provider call.

- The service stores each listing the provider returns that isn't stored yet, and returns the stored shares.
- For an ISIN listed on several exchanges, it keeps one listing: the primary listing. When the provider marks none as primary, it keeps the listing in the ISIN's country, given by the ISIN's first two letters, otherwise the first listing returned.
- Every share has an ISIN. A listing the provider returns without one is shown with an ISIN field, and is stored once the member fills it in from their statement.
- A share is stored without history. Its history is fetched when it is first held.

Typing in the Shares search filters stored shares only, in Postgres, at no cost: every share anyone has held, looked up, or created by hand.

## History

When a portfolio change makes a market share held over days that have no stored close, the API saves the change, then asks for history from that date without waiting for the answer. The service fetches the missing daily closes, from a week before that date to the last trading day, so the holding has a price on its first day even if it starts on a weekend or a holiday. It also fetches the latest price.

Until its history is stored, the share is pending: it shows "price pending" and its holder's balance is marked incomplete. Every intraday refresh and daily run starts by finding held shares with missing closes and fetching them, so a failed fetch is retried until it succeeds.

The provider's history has a start: one year back on EODHD's Free plan. When a fetch returns its first close later than the holding's first day, the service stores that close's date as the share's `history_starts_on`. Days before it are never missing and never fetched again. A holding before that date is valued at the share's earliest close, so it shows no gain before it, and the share shows "prices from" that date.

A share's chart starts at its earliest holding, or at its `history_starts_on` when that is later. Nothing is fetched for a share nobody holds.

A stored close is never fetched again. Closes keep the price of their day, so a later stock split doesn't rewrite the past values of quantities recorded before it.

## Schedule

The schedule runs inside the service with `croner`. The service runs as one instance.

### Intraday refresh

On `REFRESH_SCHEDULE`, by default every 30 minutes from 09:00 to 22:30 in `RACE_TIMEZONE`, Monday to Friday, the service asks the provider for the latest price of every held market share in one batch, and converts them with the latest exchange rates. A price is stored as `intraday` when its time is newer than the share's latest stored price. A share whose exchange is closed returns the same price, so nothing new is stored for it. A fund returns no latest price and keeps its latest close.

### Daily closes

At 07:00 in `RACE_TIMEZONE`, Tuesday to Saturday, the service fetches the closes of every held market share for every trading day since its last stored close, so a missed day fills itself on the next run. A close is stored at 23:59:59 of its trading day in `RACE_TIMEZONE`. The same run deletes `intraday` prices older than 7 days.

- A share that fails is retried every hour, three times.
- A day still missing after the retries is logged as an error.

## Call volume

With 20 held market shares, on EODHD:

| What | Calls per trading day |
| --- | --- |
| Intraday refresh, 28 runs of 20 listings | 560 |
| Daily closes | 20 |
| Lookups and history fills | 1 each, when members add shares |
| Refreshes the admin runs | 20 each, plus 1 per share missing its history |

That is about 600 calls per trading day. On the Free plan, about 12,500 calls a month come from extra-call packs, so a pack of 100,000 lasts about 8 months. Exchange rates cost no provider call.

`PROVIDER_DAILY_CALL_LIMIT` caps the calls the service spends in a day, 1,000 by default. Lookups are refused with a message once the calls left in the day are no more than the day's remaining scheduled calls, so lookups never use the schedule's share. Once the cap is reached, the schedule waits for the next day. The count is kept in memory, restarts at zero at midnight and when the service restarts, and is logged with every run.

## Currency

Each share's `trading_currency` is the currency the provider quotes it in. The service converts every price to EUR, then stores it.

- Exchange rates are the European Central Bank's reference rates, read from Frankfurter, a free API with no key, at `RATES_URL`.
- The ECB publishes one rate per currency each working day, around 16:00 Central European Time. A price is converted with the rate of its day, or the last rate published before it on weekends, holidays, and intraday.
- A price quoted in pence (`GBX`) is divided by 100 before converting from GBP.
- Rates are not stored. The service fetches them for each run's date range.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /lookup` | Look up a share: `{ query }`. Returns the stored shares |
| `POST /shares/manual` | Create a manual share with its first value: `{ isin, name, price_eur, at, created_by }` |
| `PATCH /shares/:id` | Edit a manual share's name or ISIN: `{ name, isin }` |
| `POST /shares/:id/history` | Make sure closes are stored from a date: `{ from }`. Returns once they are |
| `POST /shares/:id/manual-prices` | Store a value point for a manual share: `{ at, price_eur, entered_by }` |
| `PATCH /shares/:id/manual-prices/:at`, `DELETE …` | Edit a value point's price, or delete it. A manual share keeps at least one |
| `DELETE /shares/:id` | Delete a share with its prices and value edits. Refused with `409` when a share change refers to it |
| `POST /shares/:id/make-manual` | Set `kind` to `manual`, clear `provider_symbol` and `exchange`, keep its prices, and store its latest price as a `manual` value point, or the given `{ price_eur, at }` when it has none. Writes a `manual_price_events` row |
| `POST /refresh` | Run the intraday refresh now: missing closes first, then the latest prices in one batch. Refused while a run is going or once the daily cap is reached |

Every value point added, edited, or deleted also writes a row to `manual_price_events`, in the same transaction.

## Logs

The service logs with pino, as described in `overview.md`. It writes a line for every run, provider call, and error: the run, the shares priced, the day's call count, and each failure with its share and day. Each daily-closes run also logs the calls left on the provider account, read from EODHD's `GET /user` at no cost.

## Tests

Tests replace the HTTP responses of the provider and of Frankfurter with Vitest mocks. No test reaches the network, and CI needs no provider key.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres |
| `PRICES_TOKEN` | The bearer token the API sends |
| `PRICE_PROVIDER`, `PRICE_PROVIDER_API_KEY` | The provider implementation, `eodhd`, and its key |
| `RATES_URL` | The exchange-rate API. Default `https://api.frankfurter.dev` |
| `PROVIDER_DAILY_CALL_LIMIT` | The daily call cap. Default `1000` |
| `REFRESH_SCHEDULE` | The intraday refresh, as a cron expression. Default `*/30 9-22 * * 1-5` |
| `RACE_TIMEZONE` | The schedules' time zone. Default `Europe/Paris` |
