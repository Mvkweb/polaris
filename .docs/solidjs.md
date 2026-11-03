# SolidJS Best Practices & Reactivity Handbook

## Overview
Polaris uses SolidJS for its user interface. SolidJS differs fundamentally from React: components execute **only once** as setup functions. Reactivity is governed by a fine-grained dependency graph that updates individual DOM nodes directly.

Follow these strict rules based on modern SolidJS best practices.

---

## 1. Never Destructure Props

### The Problem
In Solid, component props are wrapped in reactive getters. When you destructure props, you unpack the raw value and break the connection to Solid's tracking context:

```tsx
// WRONG: name will NEVER update if parent changes it!
function User(props: { name: string }) {
  const { name } = props;
  return <h1>{name}</h1>;
}

// CORRECT: property read inside JSX preserves getter and reactivity
function User(props: { name: string }) {
  return <h1>{props.name}</h1>;
}
```

If you must separate props (e.g., splitting HTML attributes from custom props), use `splitProps`:
```tsx
import { splitProps } from 'solid-js';

function Button(props: ComponentProps) {
  const [local, rest] = splitProps(props, ['label', 'variant']);
  return <button class={local.variant} {...rest}>{local.label}</button>;
}
```

---

## 2. Call Functions When Passing Signals to JSX Props

Components should treat their props uniformly. Do not force child components to differentiate between reactive accessors and static values:

```tsx
// WRONG: Child has to know whether 'id' is a signal function
<User id={id} />

// CORRECT: Read signal in JSX, letting Solid track the dependency
<User id={id()} />
```

---

## 3. Wrap Non-JSX Signal Reads in Functions or Memos

The body of a Solid component runs **only once** on initialization. Reading a signal directly in the component body produces a static, one-time value:

```tsx
// WRONG: doubled is computed once and never updates
function Counter() {
  const [count, setCount] = createSignal(0);
  const doubled = count() * 2;
  return <div>{doubled}</div>;
}

// CORRECT: use createMemo for derived computations
function Counter() {
  const [count, setCount] = createSignal(0);
  const doubled = createMemo(() => count() * 2);
  return <div>{doubled()}</div>;
}
```

---

## 4. Always Use `<Show>` and `<For>` Control-Flow Components

Avoid JavaScript inline conditionals (`&&`, ternary) and `.map()` inside JSX. Solid's built-in control flow components optimize DOM mounting and key tracking:

```tsx
// WRONG: Inefficient DOM thrashing
{isOpen() && <Sidebar />}
{items().map(item => <Item {...item} />)}

// CORRECT: Preserves DOM identity and minimal updates
<Show when={isOpen()}>
  <Sidebar />
</Show>

<For each={items()}>
  {(item) => <Item item={item} />}
</For>
```

---

## 5. Use `createEffect` Sparingly

Do NOT use `createEffect` to synchronize state or derive values.
- **State derivation**: Always use `createMemo` or pure accessor functions.
- **Valid uses of `createEffect`**: Interacting with external imperative APIs (e.g., synchronizing with an xterm instance, attaching non-React window event listeners, manipulating third-party DOM nodes).

---

## 6. Use Stores (`createStore`) for Nested & Complex Objects

Signals replace the whole object reference upon mutation. When managing multi-level UI state (e.g. open directories, selected files, layout panel dimensions), use `createStore`:

```tsx
import { createStore } from 'solid-js/store';

const [state, setState] = createStore({
  currentPath: '/mnt/storage',
  sidebarOpen: true,
  drawerHeight: 280,
  selectedFiles: [] as string[]
});

// Fine-grained path updates:
setState('selectedFiles', (prev) => [...prev, newFilePath]);
```
Reading `state.currentPath` inside JSX only re-renders the path label, without triggering re-renders in unrelated panels.
