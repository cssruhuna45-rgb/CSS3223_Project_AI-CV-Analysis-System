# Frontend Development Interview Knowledge Guide

```yaml
job_field: frontend_development
job_field_name: Frontend Development
canonical_topics:
  - html
  - css
  - javascript
  - typescript
  - dom
  - browser_fundamentals
  - react
  - components
  - state_management
  - routing
  - api_integration
  - asynchronous_javascript
  - web_accessibility
  - responsive_design
  - frontend_security
  - frontend_performance
  - frontend_testing
  - build_tools
  - frontend_deployment
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the **frontend_development**
job field. It owns HTML, CSS, JavaScript, TypeScript, the DOM, browser behaviour, React
component and state models, accessibility, and frontend performance. Server-side
concerns live in the backend guide; end-to-end integration concerns live in the full
stack guide.

---

## 1. Job Field Overview

```yaml
job_field: frontend_development
topic: job_field_overview
difficulty: easy
keywords: [frontend, ui_development, browser, client_side, responsibilities]
```

Frontend development builds the part of an application that runs in the user's browser:
markup, styling, interaction, state, and communication with backend APIs. The frontend
owns user experience, accessibility, and perceived performance. It cannot own security
or data integrity, because everything shipped to the browser is under the user's
control.

Typical responsibilities:

- Translate designs into semantic, accessible, responsive markup and styles.
- Build reusable UI components with clear props and predictable state.
- Manage client state and server state, including loading and error cases.
- Integrate with REST or GraphQL APIs and handle failures gracefully.
- Keep bundles small and interactions fast on real devices and networks.
- Test components and critical user flows.
- Ship through a build pipeline to a CDN or hosting platform.

**Key framing for interviews.** Any validation, authorization, or business rule enforced
only in the frontend is a UX affordance, not a control. The server must enforce it
again.

---

## 2. Core Competencies

```yaml
job_field: frontend_development
topic: core_competencies
difficulty: easy
keywords: [competencies, frontend_skills, evaluation]
```

1. **HTML semantics and UI development** — the right element for the job, forms, document
   structure, and translating a design into working interface code.
2. **CSS layout and cascade** — flexbox, grid, specificity, the box model.
3. **JavaScript language fluency** — closures, `this`, prototypes, the event loop,
   modules.
4. **TypeScript** — typing props, generics, unions, narrowing.
5. **DOM and browser APIs** — events, storage, fetch, observers.
6. **A component framework** — React or an equivalent: rendering model, props, state,
   lifecycle/effects, keys.
7. **State management** — local, lifted, context, server state, and global stores.
8. **Routing** — client-side navigation, route params, code splitting.
9. **Asynchronous programming** — promises, `async/await`, cancellation, race
   conditions.
10. **API integration** — request lifecycle, error and loading states, retries, caching.
11. **Accessibility** — semantics, keyboard operability, focus management, ARIA when
    needed.
12. **Responsive design** — fluid layout, breakpoints, mobile-first thinking.
13. **Frontend performance** — bundle size, rendering cost, Core Web Vitals.
14. **Frontend security** — XSS, CSRF, token storage, CSP.
15. **Testing** — component tests, integration tests, end-to-end flows.
16. **Build tooling and deployment** — bundlers, environment configuration, CDN caching.

---

## 3. Foundational Knowledge

### 3.1 HTML and Semantic Markup

```yaml
job_field: frontend_development
topic: html
difficulty: easy
keywords: [html, semantic_html, forms, landmarks, headings, attributes]
```

HTML defines document structure and meaning. Semantic elements carry that meaning to
assistive technology, search engines, and the browser's built-in behaviour.

- **Landmarks.** `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`, `<section>`, and
  `<article>` let screen reader users jump between regions. A page of nested `<div>`s
  offers no such structure.
- **Headings.** `<h1>` through `<h6>` form the document outline and should follow a
  logical order rather than being chosen for font size.
- **Interactive elements.** `<button>` is focusable, keyboard-activatable, and announced
  as a button for free. A `<div onClick>` is none of those things without extra work.
  `<a href>` navigates; `<button>` acts.
- **Forms.** Every input needs an associated `<label>` (via `for`/`id` or wrapping).
  Native input types (`email`, `number`, `date`) bring validation and the right mobile
  keyboard. `<fieldset>` and `<legend>` group related controls.
- **Images.** `alt` describes the image's purpose; a decorative image takes `alt=""` so
  it is skipped rather than announced by filename.

**Common mistake.** Using semantic elements purely for styling hooks, or using none at
all and then adding ARIA roles to compensate. Native semantics first, ARIA only when no
native element fits.

### 3.2 CSS Fundamentals

```yaml
job_field: frontend_development
topic: css
difficulty:
  - easy
  - medium
keywords: [css, box_model, specificity, cascade, flexbox, grid, position, custom_properties]
```

**The box model.** Every element is a content box surrounded by padding, border, and
margin. `box-sizing: border-box` makes `width` include padding and border, which is why
it is almost always the preferred default.

**The cascade and specificity.** When rules conflict, the winner is decided by origin
and importance, then specificity, then source order. Specificity is counted as
(inline, id, class/attribute/pseudo-class, element). `!important` overrides normal
declarations and is a maintenance hazard because the only way to beat it is another
`!important`.

**Layout systems.**

- **Flexbox** is one-dimensional: distribute space along a main axis with alignment on
  the cross axis. Best for toolbars, button rows, and centring.
- **Grid** is two-dimensional: define rows and columns explicitly. Best for page layout
  and card grids.
- These are complementary, not competing. Grid for the page skeleton, flexbox inside
  components is a common and sound pattern.

**Positioning.** `static` (default), `relative` (offset from normal position, creates a
containing block), `absolute` (positioned against the nearest positioned ancestor),
`fixed` (against the viewport), `sticky` (relative until a scroll threshold).

**Stacking context.** `z-index` only compares elements within the same stacking context.
Properties like `transform`, `opacity` below 1, and `filter` create a new stacking
context, which is why a high `z-index` sometimes "does nothing".

**Custom properties.** `--brand-color` variables cascade and can be changed at runtime,
which is what makes theming and dark mode straightforward without a rebuild.

### 3.3 JavaScript Language Fundamentals

```yaml
job_field: frontend_development
topic: javascript
difficulty:
  - easy
  - medium
  - hard
keywords: [javascript, closure, this, prototype, hoisting, event_loop, modules, equality]
```

- **`var`, `let`, `const`.** `var` is function-scoped and hoisted as `undefined`; `let`
  and `const` are block-scoped and in a temporal dead zone before declaration. `const`
  prevents rebinding, not mutation of the referenced object.
- **Closures.** A function retains access to the scope in which it was defined. This
  powers module privacy, memoization, and event handlers that remember state — and it is
  also how stale values get captured in effects and loops.
- **`this`.** Determined by call site for regular functions (method call, plain call,
  `call`/`apply`/`bind`, `new`). Arrow functions have no own `this`; they inherit it
  lexically, which is why they are the safe default for callbacks.
- **Prototypes.** Objects delegate property lookup to their prototype chain. `class`
  syntax is sugar over this mechanism, not a separate system.
- **Equality.** `===` compares without type coercion; `==` coerces and produces
  surprising results. Use `===` and `Object.is` for edge cases like `NaN`.
- **Value vs reference.** Primitives copy by value; objects and arrays copy the
  reference. This is the root of most "why did my state mutate?" bugs.
- **Modules.** ES modules (`import`/`export`) are statically analysable, which enables
  tree shaking. CommonJS (`require`) is dynamic and is what Node historically used.

### 3.4 Asynchronous JavaScript and the Event Loop

```yaml
job_field: frontend_development
topic: asynchronous_javascript
difficulty:
  - medium
  - hard
keywords: [event_loop, promise, async_await, microtask, callback, race_condition, abort]
```

JavaScript in the browser is single-threaded. The **event loop** takes a task from the
task queue, runs it to completion, drains the **microtask queue** (promise callbacks,
`queueMicrotask`), then renders if needed.

Consequences a candidate should be able to state:

- **A long synchronous function freezes the UI**, including scrolling and input, because
  rendering cannot happen until the call stack empties. Heavy computation belongs in a
  Web Worker.
- **Microtasks run before the next task**, so a promise chain resolves before a
  `setTimeout(fn, 0)` scheduled earlier.
- **`async/await` is promise syntax**, not new concurrency. `await` inside a loop
  serialises requests; `Promise.all` runs them concurrently.
- **`Promise.all` rejects on the first failure; `Promise.allSettled` waits for all.**
  Choosing the wrong one silently drops successful results.
- **Race conditions are real in the browser.** A user typing quickly fires three
  searches; responses can arrive out of order and the stale one can overwrite the fresh
  one. Fix by cancelling with `AbortController`, or by ignoring responses that no longer
  match the current query.

---

## 4. Core Technical Topics

### 4.1 The DOM and Browser Events

```yaml
job_field: frontend_development
topic: dom
difficulty:
  - easy
  - medium
keywords: [dom, event_bubbling, delegation, reflow, repaint, document, node]
```

The **DOM** is the browser's in-memory tree representation of the parsed document,
exposed to JavaScript. HTML is the serialised source; the DOM is the live structure —
they are not the same thing, and the DOM can diverge from the HTML after scripts run.

- **Event flow** has three phases: capture (root down to target), target, and bubble
  (target back up). Most handlers listen in the bubble phase.
- **Event delegation** attaches one listener to a common ancestor and inspects
  `event.target`. It is the standard way to handle many similar children and to handle
  dynamically added nodes.
- **`preventDefault` vs `stopPropagation`.** The first cancels the browser's default
  action (form submit, link navigation); the second stops the event from continuing
  through the tree. They are unrelated and frequently confused.
- **Reflow and repaint.** Changing geometry (width, position, font size) forces the
  browser to recompute layout (reflow), which is expensive. Changing colour or
  visibility may only repaint. Reading a layout property (`offsetHeight`) immediately
  after a write forces a synchronous reflow — the classic "layout thrashing" pattern in
  a loop.
- **Modern observers.** `IntersectionObserver` for visibility (lazy loading, infinite
  scroll), `ResizeObserver` for element size, `MutationObserver` for DOM changes. These
  replace scroll-and-measure polling.

### 4.2 Browser Fundamentals

```yaml
job_field: frontend_development
topic: browser_fundamentals
difficulty:
  - medium
  - hard
keywords: [critical_rendering_path, cors, cookies, storage, cache, same_origin, service_worker]
```

**The critical rendering path.** HTML is parsed into the DOM, CSS into the CSSOM, they
combine into the render tree, then layout, paint, and composite. A blocking `<script>`
in `<head>` pauses parsing; `defer` runs after parsing in order, and `async` runs as
soon as it downloads in no guaranteed order. CSS is render-blocking by design.

**Same-origin policy and CORS.** An origin is scheme + host + port. The same-origin
policy stops one origin's scripts from reading another origin's responses. **CORS is a
relaxation mechanism, not a security feature of your API** — the server opts in with
`Access-Control-Allow-Origin` and related headers. A non-simple request triggers a
preflight `OPTIONS`. Two critical facts: CORS is enforced by the browser only (curl and
server-to-server calls are unaffected), and `Access-Control-Allow-Credentials: true`
cannot be combined with a wildcard origin.

**Client-side storage.**

- `localStorage` — persistent, synchronous, ~5 MB, string-only, readable by any script
  on the origin.
- `sessionStorage` — same but cleared when the tab closes.
- **Cookies** — sent automatically with requests to the origin, size-limited, and the
  only option that can be `HttpOnly` (invisible to JavaScript).
- `IndexedDB` — asynchronous, large, structured storage for offline data.

**HTTP caching from the browser's side.** `Cache-Control: max-age` avoids the request
entirely; `ETag`/`If-None-Match` allows a cheap `304`. The standard deployment pattern is
content-hashed asset filenames cached immutably for a year, with a short-cached HTML
entry point that references them.

**Service workers** are a programmable proxy for network requests, enabling offline
support and precaching. They also introduce a genuinely hard update-and-invalidation
problem, so they are not free.

### 4.3 TypeScript

```yaml
job_field: frontend_development
topic: typescript
difficulty:
  - easy
  - medium
  - hard
keywords: [typescript, types, interface, generics, narrowing, union, any, unknown]
```

TypeScript adds static types to JavaScript and erases them at compile time. It catches a
class of errors before runtime and makes editor tooling far more useful; it does not
provide any runtime guarantee.

- **`interface` vs `type`.** Interfaces support declaration merging and are conventional
  for object shapes; type aliases can express unions, intersections, tuples, and mapped
  types. Overlapping in most everyday use.
- **Union types and narrowing.** A discriminated union (`{ status: 'loading' } | {
  status: 'error', error: Error } | { status: 'ok', data: T }`) plus a switch is the
  idiomatic way to make impossible UI states unrepresentable.
- **`any` vs `unknown`.** `any` disables checking and spreads silently; `unknown` is safe
  and forces a narrowing check before use. Prefer `unknown` at boundaries.
- **Generics** allow reusable components and hooks that preserve the caller's types
  instead of collapsing to `any`.
- **Runtime validation is still required.** An API response typed as `User` is a
  compile-time assertion about data the compiler never saw. Validate untrusted input at
  the boundary with a schema validator.
- **Strict mode.** `strictNullChecks` in particular is where most of TypeScript's value
  comes from; a codebase with `strict: false` is getting a fraction of the benefit.

### 4.4 React — Rendering Model and Components

```yaml
job_field: frontend_development
topic: react
subtopic: rendering_model
difficulty:
  - easy
  - medium
  - hard
keywords: [react, component, props, jsx, virtual_dom, reconciliation, keys, rerender]
```

**React** is a library for building UIs from components that describe what the interface
should look like for a given state. React then updates the DOM to match.

- **Declarative rendering.** You describe the target UI as a function of state; React
  computes and applies the minimal DOM changes. You do not imperatively mutate nodes.
- **Virtual DOM and reconciliation.** React builds a lightweight tree of elements,
  diffs it against the previous one, and commits only the differences. The virtual DOM
  is not automatically "fast" — it is a strategy for making declarative updates
  predictable and usually fast enough.
- **Keys.** When rendering a list, `key` tells React which element corresponds to which
  item across renders. Using the array index as a key causes wrong state association and
  visual bugs when items are inserted, removed, or reordered. Use a stable id.
- **Props are read-only.** A component must not mutate its props; data flows down and
  events flow up.
- **Purity.** A component's render should be a pure function of props and state, with no
  side effects. Side effects belong in effects or event handlers.
- **Composition over configuration.** Passing `children` and render props usually beats a
  component with twenty boolean flags.

### 4.5 React — State, Effects, and Hooks

```yaml
job_field: frontend_development
topic: react
subtopic: hooks_and_state
difficulty:
  - medium
  - hard
keywords: [usestate, useeffect, usememo, usecallback, useref, custom_hook, stale_closure]
```

- **`useState`.** State updates are asynchronous with respect to the current render and
  are batched. Use the functional form `setCount(c => c + 1)` when the next value depends
  on the previous one, otherwise rapid updates can be lost.
- **`useEffect`.** Synchronises a component with an external system (subscriptions,
  timers, non-React widgets). The dependency array declares what the effect reads;
  omitting a dependency captures a stale value from an old render. The cleanup function
  must undo the effect (unsubscribe, clear timer, abort request).
- **You often do not need an effect.** Deriving state from props during render, or
  handling a user action in the event handler, is simpler and avoids an extra render.
  Effects are for synchronising with systems outside React.
- **`useMemo` and `useCallback`** memoize values and function identities to avoid
  unnecessary work or re-renders of memoized children. They have a cost themselves;
  applying them everywhere is a common anti-pattern.
- **`useRef`** holds a mutable value that persists across renders without triggering a
  re-render, and is also how you reach a DOM node.
- **`useContext`** reads a context value. Every consumer re-renders when the provider's
  value changes, so an unmemoized object literal as the provider value re-renders the
  whole subtree on every parent render.
- **Custom hooks** extract stateful logic for reuse. They are plain functions that call
  other hooks; they share logic, not state.
- **Rules of hooks.** Call hooks unconditionally at the top level of a component or
  custom hook, so the call order is identical on every render.

**Version-dependent behaviour.** React 19 introduced the `use` API for reading resources
during render, Actions with `useActionState` and `useOptimistic` for form and pending
state, `ref` available as a regular prop for function components, and stable React
Server Components in frameworks that support them. Verify availability against the React
version in the project before relying on these.

### 4.6 State Management

```yaml
job_field: frontend_development
topic: state_management
difficulty:
  - medium
  - hard
keywords: [state_management, local_state, context, redux, zustand, server_state, react_query]
```

The first question is not "which library" but "what kind of state is this".

- **Local UI state** — a dropdown's open flag. Keep it in the component.
- **Shared UI state** — a selected tab used by siblings. Lift it to the nearest common
  parent.
- **Global app state** — theme, current user, feature flags. Context or a small store.
- **Server state** — data owned by the backend and cached in the client. This is
  fundamentally different: it can be stale, needs refetching, deduplication,
  invalidation, and loading/error handling. Libraries such as TanStack Query or SWR exist
  because putting server state in Redux means reimplementing a cache badly.
- **URL state** — filters, pagination, and the current entity belong in the URL so pages
  are shareable and the back button works.
- **Form state** — often best handled by a dedicated form library because of validation,
  dirty tracking, and re-render cost.

**Context is not a state manager.** It is a dependency-injection mechanism for passing a
value down the tree without prop drilling. It has no built-in optimisation: any change
re-renders all consumers.

**When a global store earns its place.** Genuinely cross-cutting state mutated from many
places, time-travel debugging needs, or complex derived state. The cost is boilerplate
and indirection; a small app rarely needs it.

### 4.7 Routing

```yaml
job_field: frontend_development
topic: routing
difficulty:
  - easy
  - medium
keywords: [routing, spa, history_api, nested_routes, code_splitting, guards, deep_link]
```

Client-side routing swaps components based on the URL without a full page load, using
the History API.

- **Nested routes** map a URL hierarchy to a component hierarchy with shared layouts.
- **Route params and query strings** carry entity ids and filter state; keeping filters
  in the query string makes views shareable and restores them on reload.
- **Code splitting by route** is the highest-value application of lazy loading: users
  download only the routes they visit.
- **Route guards** redirect unauthenticated users. This is a UX measure only — the API
  must independently reject unauthorised requests.
- **Server configuration matters.** A single-page app served from static hosting needs a
  fallback rewrite to `index.html`, otherwise a deep link refresh returns `404`.
- **Scroll restoration and focus management** are commonly forgotten: after navigation,
  move focus to the new heading so screen reader users know the view changed.

### 4.8 API Integration from the Frontend

```yaml
job_field: frontend_development
topic: api_integration
difficulty:
  - medium
  - hard
keywords: [fetch, error_handling, loading_state, retry, abort, optimistic_update, cors]
```

Every remote call has four states — idle, loading, success, error — and shipping only
the success path is the most common frontend defect.

- **`fetch` does not reject on HTTP errors.** A `500` resolves normally; you must check
  `response.ok` yourself. Only network failures reject.
- **Cancellation.** `AbortController` cancels in-flight requests when a component
  unmounts or the query changes, preventing stale responses and state updates on unmounted
  components.
- **Retries.** Retry idempotent `GET`s with backoff; do not silently retry a `POST` that
  creates something.
- **Optimistic updates** apply the expected result immediately and roll back on failure.
  Excellent for perceived performance; requires a real rollback path.
- **Error surfaces.** Distinguish an expected domain error (`409 Conflict`, validation
  failure) shown inline from an unexpected fault shown as a generic message plus a
  correlation id.
- **Empty, loading, and error UI** should be designed, not improvised — skeletons that
  match final layout avoid layout shift.
- **CORS failures** appear in the browser console and never reach your `catch` with
  useful detail. The fix is server-side headers, not client code.

### 4.9 Web Accessibility

```yaml
job_field: frontend_development
topic: web_accessibility
difficulty:
  - easy
  - medium
  - hard
keywords: [accessibility, a11y, wcag, aria, keyboard, screen_reader, focus, contrast]
```

Accessibility means people with disabilities can perceive, operate, understand, and
navigate the interface. **WCAG** (Web Content Accessibility Guidelines) is the recognised
W3C standard, organised around four principles — Perceivable, Operable, Understandable,
Robust — with conformance levels A, AA, and AAA. AA is the level most organisations and
regulations target.

Practical requirements:

- **Keyboard operability.** Every interactive control must be reachable with `Tab` and
  activatable with `Enter` or `Space`, in a logical order, with a visible focus
  indicator. Removing focus outlines without replacing them is an accessibility failure.
- **Semantic HTML first.** Native elements bring roles, states, and keyboard behaviour.
  ARIA adds semantics to elements that lack them; it changes nothing about behaviour.
  The first rule of ARIA is not to use ARIA when a native element will do.
- **Names and labels.** Every control needs an accessible name — a `<label>`,
  `aria-label`, or `aria-labelledby`. Icon-only buttons are a frequent failure.
- **Focus management.** When a modal opens, move focus into it, trap focus while open,
  and return focus to the trigger on close. Announce route changes.
- **Colour contrast.** WCAG 2.x requires at least 4.5:1 for normal text at level AA (3:1
  for large text). Colour alone must never be the only signal of meaning.
- **Live regions.** `aria-live="polite"` announces asynchronous updates such as "3
  results found" without stealing focus.
- **Respect user preferences.** `prefers-reduced-motion` should disable non-essential
  animation.

**Automated tools catch a minority of issues.** Keyboard-only testing and a screen reader
pass are required for real coverage.

### 4.10 Responsive Design

```yaml
job_field: frontend_development
topic: responsive_design
difficulty:
  - easy
  - medium
keywords: [responsive, mobile_first, media_query, breakpoint, viewport, container_query, fluid]
```

Responsive design adapts a single codebase to varying viewport sizes, input methods, and
device capabilities.

- **Mobile-first.** Write the base styles for the smallest layout and add complexity at
  larger breakpoints with `min-width` queries. It produces simpler CSS than stripping a
  desktop layout down.
- **The viewport meta tag** (`width=device-width, initial-scale=1`) is required, or
  mobile browsers render at a virtual desktop width and scale down.
- **Fluid over fixed.** Percentages, `fr` units, `min()`/`max()`/`clamp()`, and
  `minmax()` in grid reduce the number of breakpoints needed.
- **Breakpoints should follow the content**, not specific device model widths.
- **Container queries** style a component by its own container's size rather than the
  viewport, which is what actually makes a component reusable in a sidebar and in a main
  column.
- **Responsive images.** `srcset` and `sizes` let the browser choose an appropriately
  sized file; this is often the single biggest mobile payload win.
- **Touch targets** need adequate size and spacing, and hover-only interactions must have
  a touch-accessible equivalent.

### 4.11 Frontend Build Tools

```yaml
job_field: frontend_development
topic: build_tools
difficulty:
  - medium
keywords: [bundler, vite, webpack, transpile, tree_shaking, code_splitting, source_map, env]
```

A modern frontend build turns source modules into optimised browser assets.

- **Transpilation** converts modern syntax and JSX/TypeScript into JavaScript the target
  browsers support.
- **Bundling** resolves the module graph into a small number of files, reducing request
  count and enabling optimisation.
- **Tree shaking** removes unreferenced exports. It relies on static ES module syntax and
  is defeated by side-effectful modules and dynamic `require`.
- **Code splitting** produces separate chunks loaded on demand — per route, and for heavy
  components such as editors or charts.
- **Content hashing** in filenames enables long-lived immutable caching with correct
  invalidation on deploy.
- **Source maps** map minified code back to source for debugging; publishing them to
  production is a deliberate decision, since they expose original source.
- **Dev server behaviour differs from production.** Hot module replacement, unminified
  code, and a proxy for API calls exist in development only — "works in dev" is not
  evidence.
- **Environment variables** in a frontend build are inlined at build time and are visible
  in the shipped bundle. Nothing secret can go there. This is a frequent and serious
  interview discriminator.

### 4.12 Frontend Testing

```yaml
job_field: frontend_development
topic: frontend_testing
difficulty:
  - medium
keywords: [component_testing, testing_library, jest, vitest, e2e, playwright, msw, snapshot]
```

- **Component tests** render a component and assert on what the user sees and can do.
  Querying by accessible role and label (the Testing Library approach) tests behaviour and
  incidentally verifies accessibility; querying by CSS class tests implementation detail
  and breaks on refactors.
- **Mocking the network.** Intercept at the network layer (for example with Mock Service
  Worker) rather than stubbing the `fetch` function, so the component exercises its real
  data-fetching code.
- **End-to-end tests** drive a real browser through critical flows — sign in, checkout —
  and are the only tests that prove the whole stack works. They are slow and the most
  flake-prone, so keep the set small and high-value.
- **Snapshot tests** are cheap to write and easy to rubber-stamp when they fail. Useful
  for stable, small output; harmful as a substitute for assertions.
- **Async assertions.** Use `findBy*` queries and explicit waiting rather than arbitrary
  timeouts, which is the number one source of flaky frontend tests.

Test strategy, flaky-test triage, and automation frameworks are covered in depth in the
QA / Test Engineering guide.

### 4.13 Frontend Deployment

```yaml
job_field: frontend_development
topic: frontend_deployment
difficulty:
  - medium
keywords: [deployment, cdn, static_hosting, ssr, csr, caching, spa_fallback, preview]
```

- **Static hosting plus CDN** is the default for a single-page app: build once, upload
  hashed assets, serve from edge locations.
- **Cache strategy.** Hashed assets get `Cache-Control: max-age=31536000, immutable`;
  `index.html` gets a short max-age or `no-cache` so new deploys are picked up.
- **SPA fallback.** Configure the host to serve `index.html` for unknown paths, or deep
  links break on refresh.
- **CSR, SSR, SSG, and hydration.** Client-side rendering ships an empty shell and
  renders in the browser (fast to deploy, slower first paint, weaker SEO). Server-side
  rendering produces HTML per request (better first paint and SEO, needs a server).
  Static generation pre-renders at build time (fastest, only for content known ahead of
  time). Hydration attaches interactivity to server-rendered HTML and has a real cost;
  partial or streaming approaches exist to reduce it.
- **Preview deployments** per pull request make review concrete and catch environment
  issues early.
- **Runtime configuration.** Because build-time env vars are baked in, per-environment
  values either require separate builds or a small runtime config file fetched at
  startup.

### 4.14 Version Control for Frontend Work

```yaml
job_field: frontend_development
topic: git
difficulty:
  - easy
  - medium
keywords: [git, branching, pull_request, lock_file, code_review, conflict, monorepo]
```

Git fundamentals are covered in the software engineering guide; what matters specifically in
frontend work:

- **Lock files belong in Git.** `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml` are what
  make an install reproducible across machines and CI. Deleting a lock file to "fix" a
  conflict silently changes transitive dependency versions.
- **Lock file merge conflicts** should be resolved by re-running the package manager's install
  after merging `package.json`, not by hand-editing the lock file.
- **Build output does not belong in Git.** `dist/` and `build/` are generated artifacts;
  committing them creates constant conflicts and stale deploys.
- **Pull request review of UI changes** benefits from a preview deployment and a screenshot or
  video, because a diff of JSX and CSS does not show what the user will see.
- **Feature branches should be short-lived.** Long-running frontend branches accumulate
  conflicts fastest, because component files change frequently and formatting tools touch many
  lines.
- **Monorepos** are common for frontend estates sharing a component library. They enable atomic
  cross-package changes at the cost of build tooling complexity and larger checkouts.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: frontend_development
topic: easy_level_knowledge
difficulty: easy
keywords: [frontend_basics, definitions, html_basics, css_basics, js_basics, junior]
```

- **What is the DOM?** The browser's live tree representation of the document, which
  JavaScript can read and modify.
- **What is semantic HTML and why does it matter?** Elements that describe meaning;
  they give assistive technology structure and bring built-in behaviour.
- **What is the difference between `id` and `class`?** Unique identifier versus a
  reusable grouping hook; ids also carry higher CSS specificity.
- **What is the CSS box model?** Content, padding, border, margin, and how `box-sizing`
  changes width calculation.
- **What is the difference between `display: none` and `visibility: hidden`?** Removed
  from layout entirely versus invisible but still occupying space.
- **What is the difference between `let`, `const`, and `var`?** Block scope and
  rebinding rules versus function scope and hoisting.
- **What is a promise?** An object representing the eventual result of an asynchronous
  operation, with pending, fulfilled, and rejected states.
- **What is a React component?** A function returning UI described from props and state.
- **What are props and state?** Props are inputs passed from the parent and are
  read-only; state is data the component owns and can update.
- **Why does React need `key` in a list?** To identify which item is which across
  renders so state and DOM nodes stay associated correctly.
- **What is the difference between `==` and `===`?** Coercing versus strict comparison.
- **What is a media query?** A CSS rule applied conditionally based on viewport or device
  characteristics.
- **What does `alt` text do?** Describes an image to users who cannot see it, including
  screen reader users and when the image fails to load.
- **What is an HTTP status code the frontend commonly handles?** `401` to redirect to
  login, `403` to show a permission message, `404` for a not-found view, `500` for a
  generic error state.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: frontend_development
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_frontend, react_state, debugging, comparison, integration, trade_offs]
```

- **How do you decide where state should live in a React app?** Start local, lift to the
  nearest common ancestor when shared, use context for genuinely global values, and use a
  server-state library for API data. Justify each step by who needs to read and write it.
- **Why is using an array index as a `key` a problem?** On insert, delete, or reorder the
  index no longer identifies the same item, so React reuses the wrong DOM node and
  component state attaches to the wrong row.
- **How would you prevent a component from re-rendering unnecessarily?** Identify why it
  re-renders first (parent render, changed context, new object identity in props), then
  apply the appropriate fix: memoization, stable callbacks, splitting context, or moving
  state down. Measure with the profiler rather than guessing.
- **How do you handle a race condition between two API calls triggered by typing?**
  Debounce input, cancel the previous request with `AbortController`, and ignore responses
  that do not match the current query.
- **Explain CORS and how you would fix a CORS error.** The browser blocks cross-origin
  reads unless the server opts in; the fix is server-side `Access-Control-Allow-Origin`
  and related headers, or a same-origin proxy. It cannot be fixed from client code.
- **How do you make a custom dropdown accessible?** Native `<select>` if possible;
  otherwise correct role and state attributes, full keyboard support including arrow keys
  and `Escape`, managed focus, and an accessible name.
- **How would you reduce a 4 MB JavaScript bundle?** Analyse the bundle, split by route,
  lazy-load heavy components, replace oversized dependencies, verify tree shaking, and
  remove duplicated transitive versions.
- **Flexbox or grid for a given layout — which and why?** One-dimensional distribution
  versus two-dimensional placement, with a concrete example each.
- **Where do you store an auth token in the browser?** Compare `localStorage` (readable
  by any script, so XSS steals it) with an `HttpOnly` cookie (not script-readable but
  needs CSRF protection). State the trade-off rather than naming a single "correct"
  answer.
- **How do you debug a layout that breaks only on mobile?** Device emulation and a real
  device, check the viewport meta tag, look for fixed widths and overflow, and inspect
  which breakpoint rules actually apply in the cascade.
- **What is hydration and why can it be slow?** Attaching event handlers and rebuilding
  component state on top of server-rendered HTML; it costs main-thread time proportional
  to the tree size.
- **How do you test a component that fetches data?** Intercept at the network layer,
  assert the loading state, the success state, and the error state.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: frontend_development
topic: hard_level_knowledge
difficulty: hard
keywords: [frontend_architecture, performance, rendering, scale, design_system, offline]
```

- **Design the frontend architecture for a large multi-team application.** Module or
  route ownership, a shared design system with versioning, contract boundaries between
  teams, build performance at scale, and the trade-offs of micro-frontends (independent
  deployment versus duplicated dependencies, inconsistent UX, and harder shared state).
- **How would you render a table of 100,000 rows?** Virtualise the list so only visible
  rows are in the DOM, keep row components pure and memoized, avoid per-row inline object
  and function creation, move filtering and sorting off the main thread or to the server,
  and handle variable row heights and accessibility of a virtualised grid.
- **How do you diagnose and fix a Core Web Vitals regression?** Interpret Largest
  Contentful Paint (loading), Interaction to Next Paint (responsiveness, which replaced
  First Input Delay as a Core Web Vital), and Cumulative Layout Shift (visual stability).
  Trace each to causes: unoptimised hero images and render-blocking resources for LCP;
  long tasks and heavy event handlers for INP; images without dimensions and late-injected
  banners for CLS. Distinguish lab data from field data.
- **How do you design a component library other teams will actually use?** Composable
  primitives over configuration flags, accessible by default, themeable via design
  tokens, semantic versioning with a deprecation path, documented usage, and visual
  regression testing.
- **How would you make an application work offline?** Service worker caching strategy per
  resource type, IndexedDB for queued mutations, conflict resolution when reconnecting,
  and honest UI about sync state. Then explain why offline support is expensive and when
  it is not worth it.
- **How do you handle authentication securely in a single-page app?** Authorization Code
  flow with PKCE, short-lived access tokens, refresh handling, the XSS-versus-CSRF
  trade-off in token storage, and why any client-side route guard is cosmetic.
- **How do you keep a 60 fps interaction under heavy computation?** Move work to a Web
  Worker, break long tasks into yielded chunks, use `requestAnimationFrame` for visual
  updates, prefer compositor-friendly properties (`transform`, `opacity`) over ones that
  trigger layout, and avoid synchronous layout reads inside loops.
- **How do you manage state consistency between multiple browser tabs?** Broadcast
  Channel or storage events, a single source of truth on the server, and defined
  behaviour when one tab logs out.
- **Micro-frontends: when are they justified?** Multiple autonomous teams with genuinely
  separate release cycles and a tolerance for the integration cost. Rarely justified for
  a single team.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: frontend_development
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, frontend_incident, performance_problem, ui_bug, debugging]
```

### Scenario A — The application feels slow on mobile

Users on mid-range Android phones report a multi-second wait before anything is usable.

- **Initial question.** How do you find out what is actually slow?
- **Expected reasoning.** Measure first with a throttled CPU and network profile and with
  field data; separate network time (bundle size, waterfall, unoptimised images) from
  main-thread time (parse/execute, hydration, long tasks).
- **Follow-up.** The main bundle is 3 MB. What are your first three actions?
- **Deeper.** After splitting, LCP improved but INP did not. What does that suggest?
  (Long tasks and expensive event handlers, not download size.)
- **Trade-off.** Server-side rendering would improve first paint but adds a server to
  operate and can worsen time to interactive if hydration is heavy.

### Scenario B — A component shows stale data after an update

A user edits a record, the save succeeds, and the list still shows the old value.

- **Initial question.** Where do you look?
- **Expected reasoning.** Determine which copy of the data is being displayed: a cached
  query result not invalidated, state derived once in an effect and never re-derived, or
  a stale closure capturing an old value.
- **Follow-up.** How would an optimistic update change this, and how do you roll it back
  on failure?
- **Deeper.** Why does refreshing the page fix it? (The cache is client-only; the server
  is correct.)

### Scenario C — Users report the form loses their input

Occasionally, typed text disappears while the user is filling a long form.

- **Expected reasoning.** Suspect a re-render remounting the subtree (component defined
  inside another component's render, or a changing `key`), a controlled input whose value
  is overwritten by a fetch response, or an effect resetting state on a dependency
  change.
- **Deeper.** How would you confirm remounting specifically? (Mount/unmount logging or
  the profiler.)

### Scenario D — The app works locally but the deployed build shows a blank page

- **Expected reasoning.** Check the browser console for a module error, verify the asset
  base path, confirm the SPA fallback rewrite, check for a mixed-content or CSP block,
  and confirm environment variables were present at build time.
- **Follow-up.** Why can this class of bug never appear in the dev server? (Different
  serving model, unminified code, proxying, no CDN caching.)

### Scenario E — An accessibility audit failed before launch

The report lists missing form labels, an unreachable modal, and low contrast.

- **Expected reasoning.** Triage by user impact: keyboard traps and unlabelled controls
  block use entirely; contrast is serious but not blocking. Fix with native labels, focus
  management and an escape path for the modal, and token-level contrast fixes.
- **Deeper.** How would you prevent regressions? (Automated checks in CI, accessible
  queries in component tests, and a keyboard pass in the review checklist — while being
  explicit that automation catches only part of the problem.)

### Scenario F — A third-party script slowed the whole site

- **Expected reasoning.** Identify its main-thread cost in a trace, load it `async` or
  `defer`, delay it until interaction or idle, sandbox it in a worker if possible, or
  remove it. Discuss the security angle: a third-party script has full access to the page
  and its data.

---

## 9. Troubleshooting Knowledge

```yaml
job_field: frontend_development
topic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [debugging, devtools, console_error, network_tab, memory_leak, hydration_error]
```

**Reading the network tab.** Distinguish a request that never went out (blocked by CORS
preflight failure, CSP, or an ad blocker) from one that returned an error status. Check
timing breakdown to separate DNS/TLS from server wait time from download.

**"Cannot read property of undefined".** The data has not arrived yet, the shape differs
from the assumption, or an array is empty. Render explicit loading and empty states
rather than defensive optional chaining everywhere.

**Infinite render loop.** Almost always an effect that sets state with a dependency that
changes on every render — typically a new object, array, or function identity.

**Memory growth in a long-lived SPA.** Listeners added without cleanup, timers never
cleared, subscriptions not unsubscribed in the effect's return function, and detached DOM
nodes retained by closures. Compare heap snapshots over time.

**Hydration mismatch warnings.** Server and client rendered different markup — commonly
from `Date.now()`, `Math.random()`, locale formatting, or reading `window` during render.

**A style is not applying.** Check specificity and source order in the computed styles
panel, confirm the element actually matches the selector, look for a shorthand property
overriding a longhand later in the cascade, and check for a stacking-context issue if
`z-index` seems ignored.

**Works in one browser only.** Check for an unsupported API, a vendor-prefixed property,
or differing date and number parsing behaviour.

---

## 10. Architecture and System Design

```yaml
job_field: frontend_development
topic: frontend_architecture
difficulty:
  - medium
  - hard
keywords: [frontend_architecture, component_design, design_system, rendering_strategy, monorepo]
```

Frontend architecture decisions that shape a codebase for years:

- **Rendering strategy.** CSR, SSR, SSG, or a hybrid per route. Driven by SEO needs,
  time-to-first-paint targets, data freshness, and the willingness to operate a server.
- **Component boundaries.** Presentational components that take data as props and are
  trivially testable, versus container components that fetch and orchestrate. The
  boundary matters more than the naming convention.
- **Folder structure.** Feature-based (colocating a feature's components, hooks, and
  tests) generally scales better than type-based (`components/`, `hooks/`, `utils/`
  directories spanning the whole app).
- **Design system and tokens.** Centralising colour, spacing, and typography as tokens is
  what makes theming, dark mode, and contrast compliance tractable.
- **Shared code.** A monorepo with a versioned internal package library is the common
  approach for multiple apps sharing UI.
- **Data layer.** Deciding once how the app fetches, caches, and invalidates server data
  prevents each feature from inventing its own pattern.
- **Error boundaries.** A React error boundary catches render errors in a subtree and
  shows a fallback instead of unmounting the entire application.

---

## 11. Security

```yaml
job_field: frontend_development
topic: frontend_security
difficulty:
  - medium
  - hard
keywords: [xss, csrf, csp, token_storage, clickjacking, dependencies, sanitization]
```

**The governing principle: the frontend cannot enforce security.** Everything shipped to
the browser can be read and modified by the user. Client-side validation and route guards
improve UX; the server must re-check everything.

- **XSS (cross-site scripting).** Untrusted input rendered as markup or script. React
  escapes interpolated values by default, which is why `dangerouslySetInnerHTML` is named
  the way it is — sanitise with a vetted library before using it. Also avoid injecting
  user data into `href` (`javascript:` URLs), `eval`, and dynamic `<script>` sources.
- **CSRF (cross-site request forgery).** A malicious site causes the browser to send an
  authenticated request using automatically attached cookies. Defences: `SameSite`
  cookies, anti-CSRF tokens, and requiring a custom header that a cross-site form cannot
  set. **CSRF is not XSS**: XSS runs attacker script in your origin, CSRF abuses the
  browser's automatic credential attachment without reading the response.
- **Token storage trade-off.** `localStorage` is readable by any script on the origin, so
  an XSS becomes full account takeover. `HttpOnly` cookies are not script-readable but
  are sent automatically and therefore need CSRF protection. Neither is unconditionally
  correct.
- **Content Security Policy.** A response header restricting where scripts, styles, and
  connections may come from. A strong CSP substantially reduces XSS impact and is
  meaningful defence in depth.
- **Clickjacking.** Prevent framing with `X-Frame-Options: DENY` or CSP
  `frame-ancestors`.
- **Never put secrets in the frontend.** API keys inlined at build time are visible in the
  bundle. If a key must be secret, the call must go through your backend.
- **Third-party dependencies and scripts.** Any script on the page runs with full page
  privileges. Audit dependencies, pin versions, and use Subresource Integrity for
  externally hosted scripts. Software supply chain failures are a top-ten OWASP category
  in the 2025 list.

---

## 12. Performance and Scalability

```yaml
job_field: frontend_development
topic: frontend_performance
difficulty:
  - medium
  - hard
keywords: [performance, core_web_vitals, lcp, inp, cls, bundle_size, lazy_loading, rendering]
```

**Core Web Vitals** are Google's user-centred metrics: **LCP** (Largest Contentful Paint,
loading), **INP** (Interaction to Next Paint, responsiveness — it replaced First Input
Delay as a Core Web Vital), and **CLS** (Cumulative Layout Shift, visual stability).

**Loading performance.**

- Reduce and split the JavaScript bundle; ship less code before ship faster code.
- Serve appropriately sized, modern-format images with explicit `width` and `height` to
  prevent layout shift.
- Preload the LCP resource; avoid render-blocking scripts and fonts.
- Use `font-display: swap` and subset fonts to avoid invisible text.

**Runtime performance.**

- Avoid unnecessary re-renders; find them with the profiler, not intuition.
- Virtualise long lists.
- Keep tasks short — anything over ~50 ms on the main thread blocks input.
- Prefer `transform` and `opacity` for animation, since they can run on the compositor
  without layout or paint.
- Debounce or throttle high-frequency handlers (scroll, resize, input).

**Perceived performance** matters as much as measured performance: skeleton screens,
optimistic updates, and instant feedback on interaction change how fast the app feels
without changing the numbers much.

**Scalability for a frontend** mostly means codebase and team scalability — build times,
component reuse, and clear ownership — plus CDN distribution for traffic.

---

## 13. Common Candidate Mistakes

```yaml
job_field: frontend_development
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, frontend_pitfalls]
```

- Claiming the virtual DOM is "faster than the real DOM" as if it were free; it is a
  reconciliation strategy, and it still writes to the real DOM.
- Using array index as a React `key` and not knowing why it matters.
- Wrapping everything in `useMemo` and `useCallback` without measuring, adding cost and
  complexity.
- Believing client-side validation or a route guard provides security.
- Storing secrets or API keys in frontend environment variables.
- Confusing CORS (a browser relaxation mechanism) with a server-side security control.
- Confusing XSS with CSRF.
- Treating `useEffect` as a general-purpose "run some logic" hook rather than a
  synchronisation tool.
- Using `<div>` with a click handler instead of `<button>`, then discovering it is not
  keyboard accessible.
- Adding ARIA attributes to fix problems that native HTML already solves.
- Ignoring loading and error states; only building the happy path.
- Not knowing that `fetch` resolves on `500` and only rejects on network failure.
- Testing implementation details (class names, internal state) instead of user-visible
  behaviour.

---

## 14. Interview Evaluation Points

```yaml
job_field: frontend_development
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, frontend_signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **The rendering model** — why a component re-rendered, and what React actually does to
  the DOM.
- **State ownership** — that "where does this state live" is a design decision, and that
  server state is a distinct category.
- **Asynchronous reality** — that responses arrive out of order, requests need
  cancellation, and every call has four states.
- **The browser as a platform** — event flow, the same-origin policy, caching, and
  storage options with their trade-offs.
- **Accessibility as a requirement** — whether they reach for semantic HTML first and can
  describe keyboard operation, not just recite "add ARIA".
- **Performance reasoning** — whether they measure before optimising and can name which
  metric a change targets.
- **Security boundaries** — that the frontend enforces nothing, and where XSS and CSRF
  actually differ.
- **CSS competence** — whether they can debug a cascade or stacking-context problem
  rather than adding `!important`.

**Adaptive guidance.** A strong React answer should escalate toward rendering
performance, architecture, or Core Web Vitals. A weak answer on React internals should
step back to HTML semantics, CSS layout, or basic JavaScript rather than another React
hooks question.

---

## 15. Cross-Topic Relationships

```yaml
job_field: frontend_development
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, frontend_dependencies]
```

Distinctions that must not be collapsed:

- **HTML is not the DOM.** HTML is serialised source text; the DOM is the live tree the
  browser builds and scripts mutate.
- **JavaScript is not React.** React is a library written in JavaScript; framework
  knowledge does not substitute for language fundamentals.
- **TypeScript is not runtime type safety.** Types are erased at compile time.
- **CORS is not authentication or authorization.** It controls cross-origin reading in
  the browser, nothing more.
- **XSS is not CSRF.** Script execution in your origin versus forged authenticated
  requests from another origin.
- **Accessibility is not ARIA.** ARIA is one tool; native semantics, keyboard support,
  contrast, and focus management do most of the work.
- **Responsive design is not mobile-specific CSS.** It is one adaptive system, not a
  separate mobile site.
- **State management is not a library choice.** It is a classification problem first.
- **Client-side routing is not server routing.** The server must still be configured for
  deep links.

Topic progression for adaptive interviews (easy to hard):

`html -> css -> javascript -> dom -> asynchronous_javascript -> react -> state_management -> frontend_performance -> frontend_architecture`

Breadth track when the candidate stalls on the React line:

`web_accessibility -> responsive_design -> browser_fundamentals -> build_tools -> frontend_security -> frontend_testing`

Canonical depth lives elsewhere for:

- HTTP semantics, REST design, auth flows on the server —
  `backend_development_interview_guide.md`
- End-to-end integration, deployment of a full application —
  `full_stack_development_interview_guide.md`
- CDN, hosting infrastructure, CI/CD pipelines — `devops_cloud_interview_guide.md`
- OWASP categories, CSP detail, threat modelling — `cybersecurity_interview_guide.md`
- Test strategy, Playwright and Selenium, flaky tests —
  `qa_testing_interview_guide.md`
- Data structures, algorithms, general design principles —
  `software_engineering_interview_guide.md`
