---
title: Lazy-Load Heavy Components and Routes
impact: CRITICAL
impactDescription: directly affects TTI and LCP
tags: bundle, dynamic-import, code-splitting, react-lazy, tanstack-router
---

## Lazy-Load Heavy Components and Routes

Use `React.lazy` with `Suspense` to load large components that aren't needed on initial render, and split routes so each screen's code loads only when it's visited.

**Incorrect (Monaco bundles with main chunk ~300KB):**

```tsx
import { MonacoEditor } from './monaco-editor'

function CodePanel({ code }: { code: string }) {
  return <MonacoEditor value={code} />
}
```

**Correct (Monaco loads on demand):**

```tsx
import { lazy, Suspense } from 'react'

const MonacoEditor = lazy(() =>
  import('./monaco-editor').then(m => ({ default: m.MonacoEditor }))
)

function CodePanel({ code }: { code: string }) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <MonacoEditor value={code} />
    </Suspense>
  )
}
```

**Routes:** with TanStack Router's file-based routing, turn on `autoCodeSplitting` in the router plugin so each route's component is split into its own chunk automatically, while its loader stays in the main route tree for fast data fetching.

Reference: [React lazy](https://react.dev/reference/react/lazy), [TanStack Router code splitting](https://tanstack.com/router/latest/docs/framework/react/guide/code-splitting)
