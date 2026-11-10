---
title: Defer Non-Critical Third-Party Libraries
impact: MEDIUM
impactDescription: keeps them out of the initial bundle
tags: bundle, third-party, analytics, defer
---

## Defer Non-Critical Third-Party Libraries

Analytics, logging, and error tracking don't block user interaction. Load them after the app has mounted, in their own chunk.

**Incorrect (in the initial bundle):**

```tsx
import { initErrorTracking } from 'some-error-tracker'

initErrorTracking()

export function App() {
  return <RouterProvider router={router} />
}
```

**Correct (loaded after mount, in a separate chunk):**

```tsx
import { useEffect } from 'react'

export function App() {
  useEffect(() => {
    void import('some-error-tracker').then(m => m.initErrorTracking())
  }, [])

  return <RouterProvider router={router} />
}
```

For work that isn't even needed right after mount, schedule the import in idle time — see `js-request-idle-callback`.
