export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-800">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-semibold">Privacy Policy — Rivu</h1>
        <p className="mb-8 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">What data we collect</h2>
          <p className="mb-2 text-sm leading-relaxed">
            Rivu is a review-collection app for Shopify stores. To provide its features, we
            process the following data:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>
              <strong>Product data</strong> — product titles, images, and IDs, read from the
              merchant&apos;s Shopify store to display alongside reviews and generate QR codes.
            </li>
            <li>
              <strong>Order data</strong> — customer email and name, and which products were
              purchased, used only to (a) look up what a customer bought when they scan a
              review QR code, and (b) send an optional automated review-reminder email after
              purchase, if the merchant has enabled that feature.
            </li>
            <li>
              <strong>Review content</strong> — the review text, star rating, reviewer name,
              optional email, and optional photo that a customer submits directly through our
              review form.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">Why we collect it</h2>
          <p className="text-sm leading-relaxed">
            All data above is used strictly to power Rivu&apos;s core functionality: collecting
            and displaying product reviews, generating review-request QR codes, and sending
            optional post-purchase review reminders. We do not sell customer data, and we do
            not use it for advertising or any purpose unrelated to these features.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">How long we keep it</h2>
          <p className="text-sm leading-relaxed">
            Review content is kept for as long as the merchant has Rivu installed, since it
            powers their storefront reviews. Order-tracking records used only for review
            reminders (customer email + purchased product, with no review yet submitted) are
            automatically deleted after 90 days if unused, to avoid keeping personal data
            longer than needed.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">Opting out of reminder emails</h2>
          <p className="text-sm leading-relaxed">
            Every automated review-reminder email includes an unsubscribe link. Clicking it
            immediately and permanently stops further reminder emails to that address, for that
            store.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">How we protect it</h2>
          <p className="text-sm leading-relaxed">
            Data is encrypted in transit (HTTPS) and at rest (our database provider encrypts
            data and backups by default). Access to the underlying systems is limited to the
            app&apos;s developer.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium">Contact</h2>
          <p className="text-sm leading-relaxed">
            Questions about this policy or your data can be sent to the store owner, who can
            reach us as Rivu&apos;s developer on your behalf. See also our{" "}
            <a href="/dpa" className="underline">Data Protection Agreement</a> and{" "}
            <a href="/security-policy" className="underline">Security &amp; Incident Response Policy</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
