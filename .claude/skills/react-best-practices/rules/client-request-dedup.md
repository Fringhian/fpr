---
title: Deduplicate Requests Through a Query Cache
impact: MEDIUM-HIGH
impactDescription: automatic deduplication
tags: client, deduplication, data-fetching, cache
---

## Deduplicate Requests Through a Query Cache

Fetch server data through a query cache keyed by request, not through `useEffect` + `useState` in each component. A shared cache deduplicates concurrent requests, reuses cached results across components, and handles revalidation and mutations in one place. The dashboard's data-fetching library is not yet chosen; TanStack Query is the natural pairing with TanStack Router.

**Incorrect (no deduplication, each instance fetches):**

```tsx
function ListingCount() {
  const [listings, setListings] = useState([])
  useEffect(() => {
    fetch('/api/listings')
      .then(r => r.json())
      .then(setListings)
  }, [])
}
```

**Correct (every instance shares one request and one cache entry):**

```tsx
function ListingCount() {
  const { data: listings } = useQuery({ queryKey: ['listings'], queryFn: fetchListings })
}
```

**For data that never changes during a session:** give the query an infinite `staleTime` so it's fetched once.

**For mutations:** use the library's mutation hook and invalidate the affected query keys on success, so every component showing that data refreshes together.
