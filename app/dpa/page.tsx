export default function DPAPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-800">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-semibold">Data Protection Agreement — Rivu</h1>
        <p className="mb-8 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

        <p className="mb-6 text-sm leading-relaxed">
          This Data Protection Agreement ("DPA") forms part of the agreement between the
          merchant installing Rivu ("Merchant") and Rivu's developer ("Processor"), and
          describes how Processor handles personal data on Merchant's behalf while providing
          Rivu's review-collection and review-reminder features.
        </p>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">1. Roles</h2>
          <p className="text-sm leading-relaxed">
            Merchant is the data controller for its customers&apos; personal data. Processor
            acts as a data processor, handling personal data only as instructed by Merchant
            through Merchant&apos;s use of Rivu&apos;s features, and only for the purposes
            described below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">2. Scope of data processed</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>Product data (title, image, ID) — to display alongside reviews and generate QR codes</li>
            <li>
              Order data (customer name, email, purchased product) — to look up purchases via
              QR scan and to send optional post-purchase review reminders
            </li>
            <li>Review content (text, rating, reviewer name/email, optional photo)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">3. Purpose limitation</h2>
          <p className="text-sm leading-relaxed">
            Processor uses this data solely to provide Rivu&apos;s stated functionality —
            collecting and displaying reviews, QR-based review requests, and optional automated
            review reminders. Processor does not sell personal data, and does not use it for
            advertising, profiling, or any purpose beyond what Merchant has enabled within Rivu.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">4. Retention</h2>
          <p className="text-sm leading-relaxed">
            Review content is retained for as long as Rivu remains installed on Merchant&apos;s
            store. Order-tracking records used only to schedule review reminders are
            automatically deleted after 90 days if no review is submitted. Merchant may request
            deletion of any data at any time by uninstalling Rivu or contacting Processor.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">5. Security measures</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            <li>Data encrypted in transit (HTTPS) and at rest, including backups</li>
            <li>Access to production systems limited to Processor&apos;s own account, protected by strong authentication</li>
            <li>See the full <a href="/security-policy" className="underline">Security &amp; Incident Response Policy</a> for details</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">6. Sub-processors</h2>
          <p className="text-sm leading-relaxed">
            Processor uses the following sub-processors to deliver Rivu&apos;s functionality:
            a managed Postgres database provider (for storing reviews and order-tracking
            records) and a transactional email provider (for sending review reminder emails,
            only if Merchant enables that feature). Both are contractually bound to protect
            data with security measures consistent with this agreement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">7. Customer rights</h2>
          <p className="text-sm leading-relaxed">
            Customers may unsubscribe from review reminder emails at any time via the link
            included in every reminder. Merchants can request removal of any customer&apos;s
            data by contacting Processor.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium">8. Contact</h2>
          <p className="text-sm leading-relaxed">
            For questions about this agreement or to request data deletion, Merchants can reach
            Processor through the contact details provided in the Rivu app listing.
          </p>
        </section>
      </div>
    </main>
  );
}
