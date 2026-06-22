# Layout examples

## Hero section

```tsx
<section className="bg-white px-6 py-24 text-brand-navy">
  <div className="mx-auto max-w-6xl">
    <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-brand-secondary">
      Energy platform
    </p>

    <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
      Manage customer journeys and operations in one place
    </h1>

    <p className="mt-6 max-w-2xl text-lg leading-8 text-brand-muted">
      A modern cloud platform for sales, service, automation, and operational
      workflows.
    </p>

    <div className="mt-10 flex flex-wrap gap-4">
      <button className="rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:opacity-90">
        Book a demo
      </button>

      <button className="rounded-full bg-brand-blueSoft px-6 py-3 font-semibold text-brand-primary transition hover:opacity-90">
        Learn more
      </button>
    </div>
  </div>
</section>
```

---

## Soft feature section

```tsx
<section className="bg-brand-soft px-6 py-20">
  <div className="mx-auto max-w-6xl">
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-secondary">
        Features
      </p>

      <h2 className="mt-3 text-4xl font-bold tracking-tight text-brand-navy">
        Everything needed to manage energy customers
      </h2>

      <p className="mt-4 text-lg text-brand-muted">
        Combine automation, service workflows, and customer-facing journeys in
        one clean interface.
      </p>
    </div>

    <div className="mt-12 grid gap-6 md:grid-cols-3">
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-brand-blueSoft text-brand-primary">
          ⚡
        </div>

        <h3 className="text-xl font-semibold text-brand-navy">
          Sales journeys
        </h3>

        <p className="mt-3 text-brand-muted">
          Build guided product and service flows for customers.
        </p>
      </div>

      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-brand-blueSoft text-brand-primary">
          🔁
        </div>

        <h3 className="text-xl font-semibold text-brand-navy">
          Workflow automation
        </h3>

        <p className="mt-3 text-brand-muted">
          Automate repeatable operational processes across teams.
        </p>
      </div>

      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-brand-blueSoft text-brand-primary">
          📊
        </div>

        <h3 className="text-xl font-semibold text-brand-navy">
          Operations overview
        </h3>

        <p className="mt-3 text-brand-muted">
          Track progress, customer status, and internal actions clearly.
        </p>
      </div>
    </div>
  </div>
</section>
```

---

## Dark CTA section

```tsx
<section className="bg-brand-dark px-6 py-20 text-white">
  <div className="mx-auto max-w-4xl text-center">
    <p className="text-sm font-semibold uppercase tracking-wide text-brand-blueSoft">
      Ready to modernize operations?
    </p>

    <h2 className="mt-4 text-4xl font-bold tracking-tight">
      Build better customer and service workflows
    </h2>

    <p className="mt-5 text-lg text-white/75">
      Use a clean platform-style interface with strong CTAs and clear
      information hierarchy.
    </p>

    <div className="mt-10 flex justify-center gap-4">
      <button className="rounded-full bg-white px-6 py-3 font-semibold text-brand-primary transition hover:opacity-90">
        Get started
      </button>

      <button className="rounded-full bg-brand-blueSoft px-6 py-3 font-semibold text-brand-primary transition hover:opacity-90">
        Contact sales
      </button>
    </div>
  </div>
</section>
```

---

## Dashboard shell

```tsx
<div className="min-h-screen bg-brand-soft text-brand-navy">
  <header className="border-b border-brand-border bg-white">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <div className="font-bold text-brand-navy">Product</div>

      <nav className="flex items-center gap-6 text-sm font-medium text-brand-muted">
        <a className="text-brand-primary" href="#">
          Dashboard
        </a>
        <a className="hover:text-brand-navy" href="#">
          Customers
        </a>
        <a className="hover:text-brand-navy" href="#">
          Workflows
        </a>
      </nav>
    </div>
  </header>

  <main className="mx-auto max-w-7xl px-6 py-8">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-brand-navy">Dashboard</h1>

      <p className="mt-2 text-brand-muted">
        Overview of customer activity and operational workflows.
      </p>
    </div>

    <div className="grid gap-6 md:grid-cols-3">
      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-brand-muted">Active customers</p>

        <p className="mt-3 text-3xl font-bold text-brand-navy">1,284</p>
      </div>

      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-brand-muted">Open workflows</p>

        <p className="mt-3 text-3xl font-bold text-brand-primary">342</p>
      </div>

      <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-brand-muted">Completed tasks</p>

        <p className="mt-3 text-3xl font-bold text-brand-success">96%</p>
      </div>
    </div>
  </main>
</div>
```
