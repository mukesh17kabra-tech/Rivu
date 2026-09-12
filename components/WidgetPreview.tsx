/**
 * Miniature mockups of each storefront widget.
 *
 * A merchant comparing review apps decides from the widgets page, before
 * installing anything. The old page described the widgets in prose, which
 * asked them to imagine the result — so the honest comparison against an app
 * that shows thumbnails is one we lose without the shopper ever seeing Rivu.
 *
 * Drawn as markup rather than screenshots on purpose: screenshots go stale the
 * moment a widget changes and have to be re-exported per theme, and eleven
 * images is a slow page. These are small enough to stay truthful with the
 * real widgets, and they cost no network at all.
 *
 * Deliberately light-on-white even though the admin is dark: the preview is
 * standing in for a storefront, and a dark mockup would misrepresent how the
 * widget lands on the merchant's actual product page.
 */

/** A row of stars. `filled` may be fractional — the widgets render halves. */
function Stars({ n = 5, size = 6, color = "#f5b301" }: { n?: number; size?: number; color?: string }) {
  return (
    <span className="inline-flex items-center gap-[2px]" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 1,
            background: i < n ? color : "#dcdcdc",
            // A star at 6px reads as a square; the clip keeps the silhouette.
            clipPath:
              "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
          }}
        />
      ))}
    </span>
  );
}

/** A line of body copy. */
function Line({ w = "100%", h = 3, tone = "#d6d6d6" }: { w?: string; h?: number; tone?: string }) {
  return <span className="block rounded-full" style={{ width: w, height: h, background: tone }} />;
}

/** A customer photo. */
function Photo({ h = 26, tone = "#c9d4e3" }: { h?: number; tone?: string }) {
  return <span className="block rounded" style={{ height: h, background: tone }} />;
}

function Frame({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <div
      className="flex h-[124px] items-center justify-center overflow-hidden rounded-lg p-3"
      style={{ background: tint }}
    >
      <div className="w-full rounded-md bg-white p-2.5 shadow-sm">{children}</div>
    </div>
  );
}

const TINT = {
  green: "#d8f3e3",
  blue: "#d6e8fb",
  lilac: "#e2ddf7",
  sand: "#f6e7d2",
  mint: "#ddf1ef",
  rose: "#fadfe4",
} as const;

/* ---------------------------------------------------------------- previews */

export function PreviewAppEmbed() {
  return (
    <Frame tint={TINT.green}>
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-emerald-500 text-[6px] font-black text-white">
            R
          </span>
          <Line w="45%" h={4} tone="#333" />
          <span className="ml-auto h-3 w-5 rounded-full bg-emerald-500" />
        </div>
        <Line w="100%" />
        <Line w="70%" />
      </div>
    </Frame>
  );
}

export function PreviewReviews() {
  return (
    <Frame tint={TINT.green}>
      <div className="space-y-1.5">
        <Line w="40%" h={4} tone="#333" />
        <div className="flex gap-2">
          <div className="w-[34%] space-y-1 border-r border-neutral-200 pr-2">
            <Line w="60%" h={5} tone="#333" />
            <Stars />
            <Line w="80%" h={2} />
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <Line w="14%" h={2} />
                <span className="h-[3px] flex-1 rounded-full bg-neutral-200">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${s * 18}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1 border-t border-neutral-200 pt-1.5">
          <Stars size={5} />
          <Line w="100%" />
          <Line w="65%" />
        </div>
      </div>
    </Frame>
  );
}

export function PreviewRatingBadge() {
  return (
    <Frame tint={TINT.blue}>
      <div className="space-y-2">
        <Line w="72%" h={5} tone="#333" />
        <div className="flex items-center gap-1.5">
          <Stars size={8} />
          <Line w="26%" h={3} tone="#555" />
        </div>
        <Line w="30%" h={4} tone="#999" />
        <span className="block h-4 rounded bg-neutral-800" />
      </div>
    </Frame>
  );
}

export function PreviewRatingStrip() {
  return (
    <Frame tint={TINT.blue}>
      <div className="flex items-center justify-center gap-2 py-2">
        <span className="text-[13px] font-extrabold leading-none text-neutral-800">4.8</span>
        <Stars size={9} />
        <span className="h-4 w-px bg-neutral-300" />
        <Line w="34px" h={3} tone="#666" />
      </div>
    </Frame>
  );
}

export function PreviewGrid() {
  return (
    <Frame tint={TINT.lilac}>
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-1 rounded border border-neutral-200 p-1">
            <Stars size={4} />
            <Line w="100%" h={2} />
            <Line w="70%" h={2} />
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function PreviewCarousel() {
  return (
    <Frame tint={TINT.lilac}>
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-3 shrink-0 rounded-full bg-neutral-200" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 space-y-1 rounded border border-neutral-200 p-1.5">
            <Stars size={4} />
            <Line w="100%" h={2} />
            <Line w="80%" h={2} />
            <Line w="45%" h={2} tone="#e8e8e8" />
          </div>
        ))}
        <span className="h-3 w-3 shrink-0 rounded-full bg-neutral-800" />
      </div>
    </Frame>
  );
}

export function PreviewWall() {
  // Masonry is only recognisable if the columns visibly disagree: equal-height
  // cards in three columns is the grid preview, and an earlier version of this
  // was indistinguishable from it. The offsets stagger where each column
  // starts, the heights stagger where each card ends.
  const columns = [
    { offset: 0, heights: [40, 20] },
    { offset: 10, heights: [22, 34] },
    { offset: 3, heights: [30, 26] },
  ];
  return (
    <Frame tint={TINT.mint}>
      <div className="flex h-[72px] gap-1.5 overflow-hidden">
        {columns.map((col, c) => (
          <div key={c} className="flex-1 space-y-1.5" style={{ paddingTop: col.offset }}>
            {col.heights.map((h, i) => (
              <div
                key={i}
                className="space-y-1 overflow-hidden rounded border border-neutral-200 p-1"
                style={{ height: h }}
              >
                <Stars size={3} />
                <Line w="100%" h={2} />
                <Line w="70%" h={2} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function PreviewTestimonials() {
  return (
    <Frame tint={TINT.sand}>
      <div className="space-y-1.5 py-1 text-center">
        {/* No fixed height: clipping the line box drops the glyph onto the
            quote text underneath, which reads as a strikethrough. */}
        <p className="text-[22px] font-black leading-none text-neutral-300">&ldquo;</p>
        <div className="mx-auto w-[80%] space-y-1.5">
          <Line w="100%" h={3} tone="#555" />
          <Line w="70%" h={3} tone="#555" />
        </div>
        <div className="flex justify-center">
          <Stars size={6} />
        </div>
        <div className="mx-auto w-[30%]">
          <Line w="100%" h={2} tone="#aaa" />
        </div>
      </div>
    </Frame>
  );
}

export function PreviewPhotoReviews() {
  return (
    <Frame tint={TINT.rose}>
      <div className="grid grid-cols-4 gap-1.5">
        {["#c9d4e3", "#e3d2c9", "#d2e3c9", "#e3c9dd"].map((tone, i) => (
          <div key={i} className="space-y-1">
            <Photo h={30} tone={tone} />
            <Stars size={3} />
            <Line w="100%" h={2} />
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function PreviewPhotoGallery() {
  return (
    <Frame tint={TINT.rose}>
      <div className="relative">
        <div className="grid grid-cols-4 gap-1">
          {["#c9d4e3", "#e3d2c9", "#d2e3c9", "#e3c9dd", "#d9c9e3", "#e3dcc9", "#c9e3de", "#e3c9c9"].map(
            (tone, i) => (
              <Photo key={i} h={22} tone={tone} />
            )
          )}
        </div>
        {/* The lightbox is what separates this from a plain photo strip — but
            it has to sit over a corner, not the whole wall, or the preview
            stops showing the wall it opened from. */}
        <div className="absolute -bottom-1 right-0 flex w-[62%] gap-1.5 rounded border border-neutral-300 bg-white p-1.5 shadow-lg">
          <span className="block w-[38%] shrink-0 rounded" style={{ background: "#c9d4e3" }} />
          <div className="flex-1 space-y-1 py-0.5">
            <Stars size={4} />
            <Line w="100%" h={2} />
            <Line w="80%" h={2} />
            <span className="block h-2.5 w-[60%] rounded-sm bg-neutral-800" />
          </div>
        </div>
      </div>
    </Frame>
  );
}

export function PreviewTrustBadge() {
  return (
    <Frame tint={TINT.mint}>
      <div className="flex items-center justify-center gap-2 rounded border border-neutral-200 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-black text-white">
          ✓
        </span>
        <div className="space-y-1">
          <Line w="52px" h={3} tone="#333" />
          <div className="flex items-center gap-1">
            <Stars size={5} />
            <Line w="18px" h={2} tone="#999" />
          </div>
        </div>
      </div>
    </Frame>
  );
}
