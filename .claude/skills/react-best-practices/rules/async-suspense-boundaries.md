---
title: Strategic Suspense Boundaries
impact: HIGH
impactDescription: faster initial paint
tags: async, suspense, deferred-data, layout-shift
---

## Strategic Suspense Boundaries

Don't make a whole screen wait for its slowest data. Start the fetch early, render the layout immediately, and let only the section that needs the data suspend.

**Incorrect (the entire screen waits for one slow query):**

```tsx
export const Route = createFileRoute('/listings/$id')({
  loader: async ({ params }) => ({
    listing: await fetchListing(params.id),
    similar: await fetchSimilarListings(params.id), // slow, blocks navigation
  }),
  component: ListingScreen,
})
```

The screen can't render until both requests finish, even though only one panel needs `similar`.

**Correct (critical data awaited, slow data deferred):**

```tsx
export const Route = createFileRoute('/listings/$id')({
  loader: async ({ params }) => ({
    listing: await fetchListing(params.id),
    similarPromise: fetchSimilarListings(params.id), // started, not awaited
  }),
  component: ListingScreen,
})

function ListingScreen() {
  const { listing, similarPromise } = Route.useLoaderData()
  return (
    <Layout>
      <ListingDetail listing={listing} />
      <Suspense fallback={<SimilarSkeleton />}>
        <SimilarListings similarPromise={similarPromise} />
      </Suspense>
    </Layout>
  )
}

function SimilarListings({ similarPromise }: { similarPromise: Promise<Listing[]> }) {
  const similar = use(similarPromise) // suspends only this panel
  return <ListingList items={similar} />
}
```

The layout and the listing render as soon as the critical request resolves; only the panel waits for the slow one. Several components can `use()` the same promise, so it's fetched once.

**When NOT to use this pattern:**

- Critical data needed for layout decisions (affects positioning)
- Small, fast queries where suspense overhead isn't worth it
- When you want to avoid layout shift (loading → content jump)

**Trade-off:** Faster initial paint vs potential layout shift. Choose based on your UX priorities.

Reference: [TanStack Router deferred data loading](https://tanstack.com/router/latest/docs/framework/react/guide/deferred-data-loading), [React use](https://react.dev/reference/react/use)
