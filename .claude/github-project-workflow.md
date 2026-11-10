# GitHub Project workflow

How a ticket is created and wired into the project board: the repository owner's GitHub Project number 5. Every command runs from the repository, so `gh` reads the repository from its remote, and `@me` is the owner.

## Creating a ticket

1. Create the issue, with its milestone:
   ```
   gh issue create --title "..." --body "..." --milestone "<name>"
   ```
   The milestone is a property of the issue, not a project field. Milestones are numbered in build order: `01 · Foundations`, `02 · API contracts`, `03 · Infrastructure`, `04 · Database`, `05 · Design system: foundations and atoms`, `06 · Design system: molecules, organisms, templates`, `07 · Accounts and access API`, `08 · Price service`, `09 · Portfolio and shares API`, `10 · Race API`, `11 · App shell`, `12 · Screens: access and onboarding`, `13 · Screens: race, members, portfolio`, `14 · Screens: shares, settings, help, admin`, `15 · Launch`, and `Later`.

2. Add it to the project, as its own step:
   ```
   gh project item-add 5 --owner "@me" --url <issue-url>
   ```
   `gh issue create --project` does not attach the item reliably.

3. Set each field by name, one call per field:
   ```
   gh project item-edit 5 --owner "@me" --url <issue-url> --field "Status" --value "In Progress"
   gh project item-edit 5 --owner "@me" --url <issue-url> --field "Area" --value "Doc"
   ```
   Fields:
   - **Status**: Todo, In Progress, Done.
   - **Area**: Web, API, Database, Auth, Prices, Deployment, Overall, Doc.
   - **Priority**: P0 (critical path), P1 (needed for the first version), P2 (polish), P3 (later).
   - **Track**: Base (milestones 01 to 04), Front (05, 06), Back (07 to 10), Together (11 to 15), Later.
   - **Kind**: Spike, Setup, Contract, Infra, Schema, Component, Core logic, Endpoint, Job, Plumbing, Screen, Audit, Release, Story.
   - **Size**: S (a day or less), M (two or three days), L (about a week).

4. Verify with `gh issue view <number>`. `gh project item-list` can show a newly attached item as missing for several minutes.

## Dependencies

A ticket that needs another one finished first lists it under "Depends on" in its body, and is marked "blocked by" it on GitHub:

```
gh api graphql -f query='mutation { addBlockedBy(input: { issueId: "<blocked issue node id>", blockingIssueId: "<blocking issue node id>" }) { clientMutationId } }'
```

A small, self-contained ticket carries the `good first issue` label.

## Coverage checklist

Every ticket body has a checklist of concrete, checkable items specific to its problem, not a generic template. Together they define what solved means for that ticket. The ticket closes only when every item is checked.
