# User stories

Everything people do in FPR, grouped by activity. Each path, with its edge cases, is drawn in `user-flows.md`. **Version** is `v1` for the first version, `later` for what comes after it.

FPR has four roles:

| Role | Sees | Own portfolio | Admin area | Changes data |
| --- | --- | --- | --- | --- |
| Admin | Everything, real names and amounts | Yes | Yes | Own portfolio, any member's portfolio, people, access, and shares |
| Member | Everything outside the admin area, real names and amounts | Yes | No | Own portfolio, manual shares |
| Guest | Everything outside the admin area, real names and amounts | No | No | Own profile |
| Anonymous | Everything, with pseudonyms, initials instead of photos, and no euro amounts | No | Yes, read-only | Nothing |

Members and the admin are ranked. Guests and anonymous viewers are never ranked.

The race is closed: no new money enters it. Adding or removing shares moves no money in FPR. A member records what they hold, and sets their cash themselves when it changes.

Every screen that shows gains uses one period (1D, 1W, 1M, 3M, YTD, or all) and one unit (€ or %). They are a single setting shared by every screen, kept across visits.

## Access — get in and stay in

| ID | As a person given access, I want to… | So that… | Version |
| --- | --- | --- | --- |
| ACC-1 | open the link I was sent, see who it's for, and choose my password in one field I can reveal | my account is ready without filling a sign-up form | v1 |
| ACC-2 | sign in with my email and password | I get back to the race from any browser | v1 |
| ACC-3 | reset a forgotten password: my email and the reset key I was given, then my new password | I recover my account without any email being sent | v1 |
| ACC-4 | change my display name, photo, and colour in Settings | the others recognise me on every chart | v1 |
| ACC-5 | sign out | nobody else uses my session on a shared device | v1 |
| ACC-6 | change my password with my current one | I replace a password I typed in a hurry | v1 |
| ACC-7 | use FPR in English or French | I read it in my own language | v1 |
| ACC-8 | install FPR on my phone or computer and open it like an app | the race is one tap away | v1 |

**Cases to cover**

- A link opened after its first-use deadline (7 days after creation) shows that it has expired and to ask the admin for a new one.
- A link already used for setup leads to the sign-in page.
- A link the admin replaced says so, and to use the latest link.
- Leaving before the password is set keeps the link valid until its deadline.
- Revoked access, or access past its end date, refuses sign-in with "Your access has ended", and ends any open session at its next request.
- A wrong email or reset key gives one generic error that does not say which of the two is wrong.
- A reset key works once, for one person, for 24 hours. After the reset, every other session of that person ends.
- A person's picture is their initial on their colour, or an uploaded photo (JPEG, PNG, or WebP, up to 2 MB). Removing the photo goes back to the initial.
- Each person has one of ten colours, set when they are added to the first colour nobody has. A colour someone else has can't be chosen, unless all ten are taken.
- Each setting is saved as soon as it changes, the name when the field is left. Settings has no Save button.
- Until a person picks a language, FPR follows their browser's language.
- Installed FPR opens without a connection and says it is offline, with Retry. It never shows data it doesn't have.
- A new version of FPR shows "A new version is ready" with Reload, and never reloads by itself.
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
- Every step has a default: the admin's name and the person's colour. No step can be skipped, and none blocks.
- Closing onboarding midway starts it again at the first step next time, with what was already chosen kept.
- An empty portfolio shows "Your portfolio is being prepared". For the first admin, who prepares their own, it shows "Your portfolio is empty: add your shares in Portfolio".
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
- A sale, edit, or deletion that would take a holding below zero at any moment is refused, and the message names the entry it would break.
- Two removals sent at the same time on the same holding: the second sees the first. If the holding no longer covers it, it is refused.
- A moment in the future is refused. A quantity of zero or below is refused.
- Quantities keep their decimals as entered: 74.328 units.
- The first holding of a market share, or an entry dated before its stored history, is saved at once, and its prices are fetched right after. Until they arrive, the share shows "price pending" and the member's total is marked incomplete, never counted at €0. A failed fetch is retried every 30 minutes.
- Removing shares doesn't change cash, and adding shares doesn't spend it.
- A manual share shows its value with "as of" the date of its last value point.
- Leaving the change flow midway asks to confirm. Changes already saved in the session stay.
- A change saved twice by a double press is saved once.
- A stock split is recorded as a purchase of the new shares on the split day. A dividend paid in cash is recorded by setting cash. FPR doesn't detect either.

## Shares — find and follow them

| ID | As a member or guest, I want to… | So that… | Version |
| --- | --- | --- | --- |
| SHR-1 | find a share: FPR's shares filter as I type, a full ISIN is looked up at the price provider by itself, and any other text can be looked up with one button | I add what I own, even if nobody in the race holds it yet | v1 |
| SHR-2 | open a share's page: latest price with its time, change over the period, price chart, exchange, currency, ISIN, and my position (quantity, value, gain since I bought) next to Buy and Sell | I know what I hold before I buy or sell | v1 |
| SHR-3 | see a held share's price refreshed every 30 minutes during the trading day | the race moves during the day | v1 |
| SHR-4 | see on a share's chart when each member added or removed it, and how each holder is doing on it | I compare who got in at the better moment | v1 |
| SHR-5 | create a manual share (ISIN, name, first value) when a lookup finds nothing, and fix any manual share's name or ISIN | a fund or certificate with no public price still counts | v1 |
| SHR-6 | add, edit, or delete a value point on any manual share: "on Monday at 05:10, one unit was worth €40" | every holder's value updates at once, and anyone can fix a typo | v1 |
| SHR-7 | see every share FPR knows, with its price, change over the period, and who holds it | I see what the others bought | v1 |

**Cases to cover**

- The Shares page lists the shares held in the race first, most holders first, then the shares nobody holds.
- Filtering as I type reads FPR's own shares only and costs no provider call.
- A lookup is one provider call. A lookup that finds nothing offers "Create a manual share" with the ISIN filled in. Manual creation is only offered after a lookup.
- When the provider is unavailable, or FPR's daily call budget is used, the lookup says so and manual creation is still offered.
- A listing the provider returns without an ISIN asks the member to type it in before it can be added.
- A manual share always keeps at least one value point.
- Changing a manual share's ISIN to one another share already has is refused.
- An ISIN already in FPR is found by the filter, and creating a second share with it is refused.
- An ISIN listed on several exchanges is stored once, on its primary listing.
- A market share held since before the provider's history starts is valued at its earliest close until that day: it shows no gain before it, and its page says "prices from <date>".
- A fund has no price during the day: its value is its latest daily price, one or two trading days late, shown with its date.
- A share quoted in another currency is shown in EUR, converted when its price was fetched.
- Every price shows its time. Outside trading hours, the latest price is the last close, marked as such.
- A share's chart starts at its earliest holding in the race, or where the provider's history starts when that is later. A share nobody has held has no chart yet.
- The gain since I bought values each purchase at the share's price on that day.
- Two members editing the same value point: the second save shows the new value and asks to confirm.
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
- A member with no entries yet is listed under the standings as not started.
- A member whose history is shorter than the period is measured from their first entry, with a marker.
- Standings use daily closes only. Removing shares in the morning and adding others in the afternoon never shows on them.
- A missing close for a held share is valued at its latest stored price, and Home says "prices as of <date>".
- A share whose prices haven't arrived yet is left out of its holder's balance, and their row is marked "incomplete" until it arrives.
- Editing or deleting a past entry recalculates every leaderboard from that moment.
- The sentence adapts: the person leads, everyone is down, or the person is alone in the race.
- Every share change, cash balance, and manual value edit stays recorded with who made it and when. v1 shows no feed.

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

- An access link is shown once. Closing it without copying means generating a new one.
- The last admin's access can't be revoked, and the last admin can't be deleted or change role.
- A person with portfolio entries can't become a guest. Nobody becomes or stops being anonymous.
- Deleting a person asks for their name to confirm. It deletes their share changes and cash balances. The manual shares and value points they created stay, since others may hold them.
- A share needs attention when it is held and has no price yet, or its latest close is older than the last trading day.
- A share any share change refers to can't be deleted.
- Turning a share manual can't be undone. Its past prices stay, its latest price becomes its first value point, and the price service stops refreshing it. A share with no price at all needs a first value from the admin.
- A refresh runs the scheduled job at once: missing histories, then the latest prices in one batch. It is refused while a run is going and once the day's call cap is reached.
- A member whose access is revoked or has ended stays in the race with their data. Deleting them removes them from it.
- After adding a member, the link dialog offers to prepare their portfolio: it opens their member page in edit mode.
- The admin area works on tablet and desktop. On a phone it says so.
- On a fresh install, the first admin signs up with the bootstrap key from the environment. It works only while no admin exists.

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

- Every change is refused by the API, and the screens hide the controls.
- The access link works as a password: it disappears from the address bar once opened.
- No real name, email, photo, euro amount, or quantity held reaches an anonymous viewer's browser: the API replaces them before sending. Holdings show as weights in percent of the portfolio.
- A pseudonym is the same for the same person on every screen and every visit.
- Two people who would get the same pseudonym are told apart by a suffix.
- An anonymous viewer sees the € / % switch on % only, and the standings by gain only.
- Access ends at its end date or on revocation, even in the middle of a session.

## Later

| ID | As a member, I want to… | So that… | Version |
| --- | --- | --- | --- |
| LTR-1 | import my bank statement instead of entering changes by hand | updating my portfolio takes no typing | later |
