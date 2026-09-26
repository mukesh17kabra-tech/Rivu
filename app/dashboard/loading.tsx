/**
 * What the merchant sees while a dashboard page fetches its data.
 *
 * Without this file every dashboard route sent nothing at all until Postgres
 * answered. `requireShop` awaits a `Shop` lookup before the page returns a
 * single byte, and Neon suspends its compute endpoint when idle — so the first
 * visit after a quiet spell waited for a database to wake up before the
 * browser had anything to paint. That is the 3.3s Largest Contentful Paint:
 * not slow rendering, just a page that had not started.
 *
 * A `loading.tsx` makes Next wrap the route in a Suspense boundary, so this
 * shell streams immediately and the data swaps in when it arrives. The paint
 * now happens at roughly time-to-first-byte rather than after the round trip.
 *
 * Deliberately shaped like the real page — a title block, then cards — rather
 * than a spinner. A spinner tells a merchant to wait; a skeleton tells them
 * what is coming, and it keeps Cumulative Layout Shift at the 0.0 it is
 * already at, because the real content lands in the same places.
 */

function Bar({ w, h = 12 }: { w: string; h?: number }) {
  return (
    <span
      className="block rounded-md bg-white/[0.06]"
      style={{ width: w, height: h }}
    />
  );
}

function CardSkeleton() {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="space-y-3">
        <Bar w="38%" h={14} />
        <Bar w="100%" h={10} />
        <Bar w="72%" h={10} />
      </div>
    </section>
  );
}

export default function DashboardLoading() {
  return (
    // aria-busy and the visually hidden line give a screen reader the same
    // information the skeleton gives everyone else: this is loading, not empty.
    <div aria-busy="true" className="animate-pulse">
      <span className="sr-only">Loading…</span>

      <header className="mb-7 space-y-2.5">
        <Bar w="220px" h={26} />
        <Bar w="330px" h={12} />
      </header>

      <div className="space-y-5">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
