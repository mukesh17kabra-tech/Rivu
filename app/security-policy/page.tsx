export default function SecurityPolicyPage() {
  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-800">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-semibold">Security &amp; Incident Response Policy — Rivu</h1>
        <p className="mb-8 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">Data encryption</h2>
          <p className="text-sm leading-relaxed">
            All data is encrypted in transit using HTTPS/TLS. Data at rest, including database
            backups, is encrypted by our infrastructure providers (database and hosting) by
            default.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">Environment separation</h2>
          <p className="text-sm leading-relaxed">
            Production data (live merchant stores) is kept in a separate database from any
            development or testing environment. Development work is done against test data
            only, never against real merchant or customer data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">Data loss prevention</h2>
          <p className="text-sm leading-relaxed">
            Our database provider performs automatic, encrypted backups and supports
            point-in-time recovery, protecting against accidental data loss or corruption.
            Access credentials (API keys, database connection strings) are stored only as
            environment variables in our hosting provider's secret manager, never committed to
            source code or shared outside what's operationally necessary.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">Access control</h2>
          <p className="text-sm leading-relaxed">
            Access to production systems (hosting, database, email provider) is limited to the
            app's operator and protected by strong, unique passwords and, where supported,
            multi-factor authentication.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-2 text-lg font-medium">Incident response</h2>
          <p className="mb-2 text-sm leading-relaxed">
            In the event of a suspected security incident or data breach, we follow these steps:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed">
            <li>
              <strong>Identify &amp; contain</strong> — assess the scope of the incident and
              take immediate action to stop ongoing unauthorized access (e.g. rotating
              credentials, revoking access tokens).
            </li>
            <li>
              <strong>Assess impact</strong> — determine what data was affected and which
              merchants/customers are impacted.
            </li>
            <li>
              <strong>Notify</strong> — inform affected merchants without undue delay, and
              provide guidance on any steps they should take.
            </li>
            <li>
              <strong>Remediate</strong> — fix the underlying vulnerability that allowed the
              incident to occur.
            </li>
            <li>
              <strong>Review</strong> — document what happened and what changes (technical or
              process) will prevent recurrence.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium">Reporting a concern</h2>
          <p className="text-sm leading-relaxed">
            If you believe you've found a security issue with Rivu, please reach out through
            the contact details in the Rivu app listing.
          </p>
        </section>
      </div>
    </main>
  );
}
