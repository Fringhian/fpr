# User stories

Everything people do in FPR, grouped by activity, with every case to cover. Each path is drawn in `user-flows.md`. **Version** is `v1` for the first version, `later` for what comes after it.

FPR has four roles, detailed in `../architecture/auth.md`: the admin, who also manages people, access and shares and can record any member's portfolio; members, who record their own portfolio and keep manual shares; guests, who see what members see without a portfolio; and anonymous viewers, who see everything read-only, the admin area included, with pseudonyms and no euro amounts. Members and the admin are ranked; guests and anonymous viewers never are.

The race is closed: adding or removing shares moves no money in FPR. A member records what they hold, and sets their cash themselves when it changes.

Every screen that shows gains uses one period (1D, 1W, 1M, 3M, YTD, or all) and one unit (€ or %), a single setting shared by every screen and kept across visits.

## Access — get in and stay in

| ID | As a person given access, I want to… | So that… | Version |
| --- | --- | --- | --- |
| ACC-1 | open the link I was sent, see who it's for, and choose my password in one field I can reveal | my account is ready without a sign-up form | v1 |
| ACC-2 | sign in with my email and password | I get back to the race from any browser | v1 |
| ACC-3 | reset a forgotten password with my email and the reset key I was given, then my new password | I recover my account without any email being sent | v1 |
| ACC-4 | change my display name, photo, and colour in Settings | the others recognise me on every chart | v1 |
| ACC-5 | sign out | nobody else uses my session on a shared device | v1 |
| ACC-6 | change my password with my current one | I replace a password I typed in a hurry | v1 |
| ACC-7 | use FPR in English or French | I read it in my own language | v1 |
| ACC-8 | install FPR on my phone or computer and open it like an app | the race is one tap away | v1 |

**Cases to cover**

- An access link must be used within 7 days of its creation. After that it says it has expired and to ask the admin for a new one. Leaving before the password is set keeps it valid until then.
- A link already used leads to sign-in. A link the admin replaced says so, and to use the latest one.
- A link the admin revoked, or opened after the access end date, says that access has ended, even before its first use.
- The latest link of a person who already has a password, after a replacement, asks for no password: opening it leads to sign-in.
- A password has at least 12 characters.
- Revoked access, or access past its end date, refuses sign-in with "Your access has ended", and ends any open session at its next request, a password change included. A wrong password says only that the email or password is wrong, whatever the person's access.
- Five sign-in attempts from one address within a minute pause sign-in from that address, and no other, for a minute. Link checks, claims, anonymous sign-ins, and password resets are paused the same way, each on its own.
- A session that expires sends the person to sign-in, then back to the page they were on.
- A wrong email or reset key gives one generic error that doesn't say which is wrong. A reset key works once, for one person, for 24 hours. After the reset, every other session of that person ends. Changing the password also ends every other session.
- A person's picture is their initial on their colour, or an uploaded photo (JPEG, PNG, or WebP, up to 2 MB), kept upright, at most 512 pixels a side, without the location, camera, or other details the file carried. Removing the photo goes back to the initial.
- Each person has one of ten colours, given when they are added: the first nobody has. A colour someone else has can't be chosen, unless all ten are taken.
- Settings has no Save button: each setting is saved as soon as it changes, the name when the field is left.
- FPR is in French until a person picks a language, whatever their browser's language. Pages before sign-in are in French.
- A page that doesn't exist offers Go to Home. A failed load offers Retry, and a form keeps what was typed.
- Installed FPR opens without a connection and says it is offline, with Retry. It never shows data it doesn't have.
- A new version of FPR offers Reload, and never reloads by itself.
- An app installed on iOS asks to sign in once, since it doesn't share Safari's session. An anonymous viewer signs in there by pasting their access link on the sign-in page.

## Onboarding — the first steps

| ID | As a person signing in for the first time, I want to… | So that… | Version |
| --- | --- | --- | --- |
| ONB-1 | confirm or change the display name the admin gave me | the others know who I am | v1 |
| ONB-2 | pick my colour, and add a photo if I want | I find my curve and my row at a glance | v1 |
| ONB-3 | see the portfolio the admin prepared for me, read-only | I check it before I start | v1 |
| ONB-4 | be welcomed among everyone already in the race | I feel part of it from the first minute | v1 |

**Cases to cover**

- Onboarding runs once, right after the first password. Guests skip ONB-3. Anonymous viewers have none.
- A display name has 1 to 40 characters.
- Every step has a default: the admin's name and the person's colour. No step can be skipped, and none blocks.
- A colour taken by someone else meanwhile is refused, and the choices refresh.
- Closing onboarding midway starts it again at the first step next time, with what was already chosen kept.
- An empty portfolio shows "Your portfolio is being prepared". For the first admin, who prepares their own, it says to add their shares in Portfolio.
- Onboarding never mentions the race. The welcome step ends with Go to Home.

## Portfolio — record what I hold

| ID | As a member, I want to… | So that… | Version |
| --- | --- | --- | --- |
| POR-1 | see my portfolio: my balance with the time of the latest prices, my gain over the period, how it splits between shares and cash, and each share with its quantity, value, and gain over the period | I know where I stand right now | v1 |
| POR-2 | record a purchase: what changed, which share, when (today by default), how many, then a review | recording a purchase takes a few seconds | v1 |
| POR-3 | record a sale, seeing how many I held on that day, with an "all" option | recording a sale is as quick as a purchase | v1 |
| POR-4 | set my cash on a day: "from that day, I have €X" | the money I hold outside shares counts in the race | v1 |
| POR-5 | see every share change and cash balance I recorded, and edit or delete any entry | a typo or a forgotten entry is fixed, and every leaderboard follows | v1 |
| POR-6 | see my balance over time as a chart, with my purchases and sales marked | I see my own progress, not only my rank | v1 |
| POR-7 | record several changes in one go: after each save, record another with the same date, and undo any change saved in the session | catching up on a week of changes takes one sitting | v1 |

**Cases to cover**

- No portfolio yet: an empty state that explains recording a change with its date, and "Record a change".
- The date is chosen before the quantity: what can be sold depends on what was held that day.
- A sale, edit, deletion, or undo that would take a holding below zero at any moment is refused, and the message names the entry it would break.
- Two removals on the same holding at the same time: the second sees the first, and is refused if the holding no longer covers it.
- A day in the future is refused, and so is a quantity or a share value of zero or below. Cash can't be below zero.
- Quantities keep their decimals as entered: 74.328 units.
- The first holding of a market share, or an entry dated before its stored history, is saved at once, and its prices are fetched right after. Until they arrive, the share shows "price pending" and is left out of the member's balance, which is marked incomplete on every screen, never counted at €0. A failed fetch is retried every 30 minutes.
- Removing shares doesn't change cash, and adding shares doesn't spend it.
- Setting cash twice for the same moment keeps both entries in the log; the one recorded last is the cash from that moment.
- A manual share shows its value "as of" the date of its last value point.
- Leaving the change flow midway asks to confirm. Changes already saved in the session stay.
- A change or cash balance sent twice, by a double press or a retry, is saved once.
- A stock split is recorded as a purchase of the new shares on the split day. A dividend paid in cash is recorded by setting cash. FPR detects neither.

## Shares — find and follow them

| ID | As a member or guest, I want to… | So that… | Version |
| --- | --- | --- | --- |
| SHR-1 | find a share among FPR's, or look it up at the price provider | I add what I own, even if nobody in the race holds it yet | v1 |
| SHR-2 | open a share's page: latest price with its time, change over the period, price chart, exchange, currency, ISIN, and my position (quantity, value, gain since I bought) next to Buy and Sell | I know what I hold before I buy or sell | v1 |
| SHR-3 | see a held share's price refreshed every 30 minutes during the trading day | the race moves during the day | v1 |
| SHR-4 | see on a share's chart when each member added or removed it, and how each holder is doing on it | I compare who got in at the better moment | v1 |
| SHR-5 | create a manual share (ISIN, name, first value) when a lookup finds nothing, and fix any manual share's name or ISIN | a fund or certificate with no public price still counts | v1 |
| SHR-6 | add, edit, or delete a value point on any manual share: "on Monday at 05:10, one unit was worth €40" | every holder's value updates at once, and anyone can fix a typo | v1 |
| SHR-7 | see every share FPR knows, with its price, change over the period, and who holds it | I see what the others bought | v1 |

**Cases to cover**

- The Shares page lists the shares held in the race first, most holders first, then the shares nobody holds.
- Typing filters FPR's own shares and costs no provider call. A full ISIN is looked up at the provider by itself; any other text is looked up with one button. A lookup is one provider call.
- A lookup that finds nothing offers "Create a manual share" with the ISIN filled in. Manual creation is offered only after a lookup.
- When the provider is unavailable, or FPR's daily call budget is used, the lookup says so and still offers manual creation.
- A listing returned without an ISIN asks the member to type it before it can be added. A listing whose ISIN is already in FPR opens that share.
- An ISIN is stored once, and the filter finds it: creating a second share with it, or giving a manual share an ISIN another share has, is refused with a link to that share. An ISIN listed on several exchanges is stored on its primary listing.
- A manual share always keeps at least one value point.
- Two members editing the same value point: the second save shows the new value and asks to confirm.
- Adding a value point at a moment that already has one is refused, and shows the value already there.
- Two members deleting a manual share's last two value points at once: one deletion is refused, so the share keeps one.
- A market share held since before the provider's history starts is valued at its earliest close until that day: it shows no gain before it, and its page says "prices from <date>".
- A fund has no price during the day: its value is its latest daily price, one or two trading days late, shown with its date.
- A share quoted in another currency is shown in EUR, converted when its price was fetched.
- Outside trading hours, the latest price is the last close, marked as such.
- A share's chart starts at its earliest holding in the race, or where the provider's history starts when that is later. A share nobody has held has no chart yet.
- The gain since I bought values each purchase at the share's price on that day.
- The provider being down never blocks a screen: every screen shows the latest stored prices with their time.
- The number of people looking at the app never changes the number of provider calls.

## Home — the race

| ID | As a member or guest, I want to… | So that… | Version |
| --- | --- | --- | --- |
| LDB-1 | see the standings by total balance, as of the last market close | I see who leads the race | v1 |
| LDB-2 | see the standings by gain in euros over the period, as of the last close | I see who earned the most over a period | v1 |
| LDB-3 | switch the gain to percent | a smaller portfolio can still win on performance | v1 |
| LDB-4 | see the best pick: each member's best holding, in percent since it entered their portfolio | the best single choice gets credit | later |
| LDB-5 | see the event feed: shares added and removed, cash set, manual share values added, edited, or deleted, overtakes, and a new number one | I follow what happens between two visits | later |
| LDB-6 | see personal records in the event feed, such as a member's best week | the feed celebrates more than rank changes | later |
| LDB-7 | see my result for the period in one sentence, with who leads and the best share of the period | I know how the race stands at a glance | v1 |

**Cases to cover**

- Standings show no rank numbers: the order and each member's bar show the ranking. On tablet and desktop the first three are marked gold, silver, and bronze.
- On a phone, Home's sentence names the leader only; the star share shows in a member's lane when it opens.
- The sentence adapts: the person leads, everyone is down, or the person is alone in the race. A guest or an anonymous viewer has no result of their own: the sentence names who leads, with their gain.
- A member with no entries yet is listed under the standings as not started.
- A member whose history is shorter than the period is measured from their first entry, with a marker.
- Standings use daily closes only. Removing shares in the morning and adding others in the afternoon never shows on them.
- A missing close for a held share is valued at its latest stored price, and Home says "prices as of <date>".
- Editing or deleting a past entry recalculates every leaderboard from that moment.
- Every share change, cash balance, and manual value edit stays recorded: who made it, when, and from what to what. v1 shows no feed.
- On every page, scrolling past the page bar brings a compact bar to the top with the page's name and the period, which changes everything as the page bar's does. On a phone it holds the period button and the account button, hides while scrolling down, and comes back on the first scroll up or when keyboard focus reaches it. On tablet and desktop it stays, with the unit too. It never covers the focused element, and on a phone it and the tab bar each keep to their own edge.

## Comparison — side by side

| ID | As a member or guest, I want to… | So that… | Version |
| --- | --- | --- | --- |
| CMP-1 | see the race chart: every member's gain over the period on one chart, each line ending with its owner's picture, my curve and the focused member's in colour | I compare everyone's progress at a glance | v1 |
| CMP-2 | see the race in euros or in percent | portfolios of different sizes compare on performance | v1 |
| CMP-3 | focus one member from their curve or their row: their curve stands out, and I see what moved their period, holding by holding | I understand why a line jumped | v1 |
| CMP-4 | see every member with their curve against mine, their gain, balance, and top holdings | I get to know everyone's portfolio | v1 |
| CMP-5 | open a member's page: their curve against mine and every holding they have | I see exactly what someone holds | v1 |

**Cases to cover**

- Past days are drawn at their close. The current day follows the 30-minute prices, dashed and labelled "today, not final", and becomes a normal point at the close.
- Members are listed with the person first, then alphabetically. The period never changes the order.
- A member with no shares yet shows "No shares yet" and no chart.
- My own member page is my Portfolio.

## Help — understand the app

| ID | As anyone with access, I want to… | So that… | Version |
| --- | --- | --- | --- |
| HLP-1 | read How FPR works: one page of short sections, each with its own link | I understand the race whenever I want | v1 |
| HLP-2 | open a short explanation next to an idea that needs one, with a link to its section | I get the answer where the question comes up | v1 |

**Cases to cover**

- Nothing opens by itself: no tour and no pop-up on a first visit.
- How FPR works is reached from the account menu and Settings.

## Admin — people, access, and shares

| ID | As the admin, I want to… | So that… | Version |
| --- | --- | --- | --- |
| ADM-1 | add a person with a display name, an email (not for anonymous), a role, and an optional access end date, then copy their access link, shown once | I invite someone without them filling a sign-up form | v1 |
| ADM-2 | see every person, grouped by role, and the status of their access: waiting for first use, active, expired, ended, or revoked | I know who can get in | v1 |
| ADM-3 | revoke a person's access, and restore it | I cut someone off immediately, and undo it | v1 |
| ADM-4 | replace a lost or expired link with a new one | a lost link costs nothing | v1 |
| ADM-5 | change a person's display name, email, role, or access end date | I fix a typo, promote a guest to member, or extend a reviewer who needs more time | v1 |
| ADM-6 | generate a reset key for a person | they recover a forgotten password | v1 |
| ADM-7 | edit any member's portfolio and cash, with the same screens they use | I prepare a portfolio before sending the link, and fix mistakes | v1 |
| ADM-8 | delete a person | someone who leaves the race leaves the data too | v1 |
| ADM-9 | see every share FPR knows, grouped as needing attention, tracked, manual, or not held, with the time of its latest price | I see what the price service follows and what is stuck | v1 |
| ADM-10 | delete a share nobody has ever held | a share looked up by mistake doesn't stay in the list | v1 |
| ADM-11 | turn a market share that needs attention into a manual share | a share the provider never prices still counts | v1 |
| ADM-12 | refresh every held share's price now | I don't wait 30 minutes after fixing a problem | v1 |

**Cases to cover**

- An email already used, or an end date in the past, is refused.
- An access link or a reset key is shown once, with Copy; if the browser refuses to copy, the text is selected to copy by hand. Closing it without copying means generating a new one. A new reset key replaces one not yet used.
- After adding a member, the link dialog offers to prepare their portfolio: it opens their member page in edit mode.
- The last admin's access can't be revoked, and the last admin can't be deleted or change role.
- A person with portfolio entries can't become a guest. Nobody becomes or stops being anonymous.
- A member whose access is revoked or has ended stays in the race with their data. Restoring access lets them sign in again.
- Deleting a person asks for their name to confirm, and removes them from the race with their share changes and cash balances. The manual shares and value points they created stay, since others may hold them.
- A share needs attention when it is held and has no price yet, or no close in the last 5 trading days. A fund priced a day or two late, or a market closed for a holiday, doesn't need attention.
- A share any share change refers to can't be deleted.
- Turning a share manual can't be undone. Its past prices stay, its latest price becomes its first value point, and the price service stops refreshing it. A share with no price at all needs a first value from the admin. A share that gets a price while the admin types that first value is made manual with the price it got, and the typed value is not stored.
- A refresh runs the scheduled job at once: missing histories, then the latest prices in one batch. It is refused while a run is going and once the day's call cap is reached.
- The admin area works on tablet and desktop. On a phone it says so.
- On a fresh install, the first admin signs up with the bootstrap key from the environment. It works only while no admin exists. Once an admin exists, the setup says so whatever key is typed, and two setups sent at once create one admin.

## Viewing without a portfolio

| ID | As a guest, I want to… | So that… | Version |
| --- | --- | --- | --- |
| GST-1 | browse every member screen with real names and amounts, without changing anything | I follow the race without taking part | v1 |

| ID | As an anonymous viewer, I want to… | So that… | Version |
| --- | --- | --- | --- |
| ANO-1 | open the link I was sent and be in, with no email or password, every time until my access ends | I look at the project without creating an account | v1 |
| ANO-2 | browse every screen and the admin area, read-only, with pseudonyms and initials in place of names and photos | I see how the whole tool works on real data | v1 |
| ANO-3 | see percentages and charts in percent in place of euro amounts | the data stays meaningful without exposing anyone's money | v1 |

**Cases to cover**

- Every change is refused, and a control the viewer can't use is hidden, not disabled: an anonymous viewer has no € / % switch, since every amount is in %, and the standings rank by gain only.
- The access link works as a password: it leaves the address bar once opened. Opening it again, or pasting it on sign-in, starts a new session when the last one has ended.
- No real name, email, photo, euro amount, or quantity held reaches an anonymous viewer's browser. Holdings show as weights in percent of the portfolio.
- A pseudonym is an English adjective and animal, such as Calm Otter, in both languages, and is the same for the same person on every screen and every visit.
- Two people who would get the same pseudonym are told apart by a number suffix: the person added first keeps it, and the next is Calm Otter 2.
- Access ends at its end date or on revocation, even in the middle of a session.

## Later

| ID | As a member, I want to… | So that… | Version |
| --- | --- | --- | --- |
| LTR-1 | import my bank statement instead of entering changes by hand | updating my portfolio takes no typing | later |
