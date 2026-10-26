import LegalPage from "@/components/LegalPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/data-deletion")({
  component: DataDeletion,
});

function DataDeletion() {
  return (
    <LegalPage title="Data Deletion Instructions" updated="October 26, 2026">
      <section>
        <p>
          You may request deletion of information processed through{" "}
          <strong>Social Connect</strong>. The appropriate method depends on
          whether you administer a Social Connect organization, have a Social
          Connect login, or communicated through WhatsApp or Instagram with a
          business using Social Connect.
        </p>
      </section>

      <section>
        <h2>1. Request organization deletion</h2>
        <p>
          If you are an organization owner, you can archive the organization and
          request permanent deletion:
        </p>
        <ul>
          <li>Sign in to Social Connect.</li>
          <li>
            Open <strong>Settings</strong>.
          </li>
          <li>
            Select <strong>Organization</strong>.
          </li>
          <li>
            Use the archive control if you want to stop organization access.
            Archiving retains data and does not fulfill a deletion request.
          </li>
          <li>
            Email <a href="mailto:info@vastech.biz">info@vastech.biz</a> from
            your owner account&apos;s email address, identify the organization,
            and request permanent deletion. We verify authority before an
            authorized administrator completes deletion under the applicable
            retention and recovery safeguards.
          </li>
        </ul>
        <p>
          Organization deletion is irreversible. It removes the
          organization&apos;s active database records, including connected
          account records, contacts, conversations, messages, templates,
          members, API keys, webhook configuration, and related operational
          records. Associated media files are normally removed by an automated
          cleanup process within approximately one hour.
        </p>
        <p>
          Deleting an organization does not automatically delete your login
          identity if that identity can access another organization or is needed
          to complete an account-level request.
        </p>
      </section>

      <section>
        <h2>2. Request complete account deletion</h2>
        <p>
          To request deletion of your Social Connect login and personal
          information, email{" "}
          <a href="mailto:info@vastech.biz?subject=Social%20Connect%20Data%20Deletion%20Request">
            info@vastech.biz
          </a>{" "}
          with the subject <strong>Social Connect Data Deletion Request</strong>{" "}
          and include:
        </p>
        <ul>
          <li>the email address used to sign in;</li>
          <li>your organization name, if applicable;</li>
          <li>
            whether you want the login account, a specific organization, a
            WhatsApp or Instagram integration, or particular information
            deleted; and
          </li>
          <li>
            sufficient information for us to verify your identity and authority
            over the requested account.
          </li>
        </ul>
        <p>
          Do not send passwords, access tokens, API keys, or full message
          histories by email. We may request additional verification before
          acting to protect organizations and users from unauthorized deletion.
        </p>
      </section>

      <section>
        <h2>3. Requests from WhatsApp or Instagram users</h2>
        <p>
          If you communicated with a business that uses Social Connect, the
          fastest option is to contact that business directly because it
          controls the business relationship and can identify the relevant
          conversation. You may also email us at{" "}
          <a href="mailto:info@vastech.biz?subject=Messaging%20Data%20Deletion%20Request">
            info@vastech.biz
          </a>{" "}
          and provide:
        </p>
        <ul>
          <li>
            your WhatsApp phone number, including country code, or Instagram
            username;
          </li>
          <li>the name of the business you contacted;</li>
          <li>the approximate date of the communication; and</li>
          <li>a description of the information you want deleted.</li>
        </ul>
        <p>
          We may coordinate with the relevant business and request verification
          that you control the phone number or Instagram account. We will not
          disclose conversation data while verifying a request.
        </p>
      </section>

      <section>
        <h2>4. Disconnect WhatsApp or Instagram access</h2>
        <p>
          An authorized organization owner may disconnect an account through
          Social Connect&apos;s Integrations screen and may also revoke the
          app&apos;s access through the applicable Meta or Instagram account
          settings. Revoking access prevents future access through the revoked
          credential, but it may not by itself delete information previously
          stored in Social Connect. Follow the organization or email deletion
          process above to request removal of stored information.
        </p>
      </section>

      <section>
        <h2>5. What happens after a request</h2>
        <ul>
          <li>We acknowledge email requests after they are received.</li>
          <li>We verify the requester&apos;s identity and authority.</li>
          <li>
            We identify the relevant active systems, organization, integration,
            and records.
          </li>
          <li>
            We delete or anonymize eligible information and disconnect relevant
            credentials.
          </li>
          <li>
            We provide confirmation when the request is completed or explain why
            specific information must be retained.
          </li>
        </ul>
        <p>
          We normally complete verified requests within 30 days. If applicable
          law requires a different period or permits an extension, we will
          notify the requester.
        </p>
      </section>

      <section>
        <h2>6. Information that may be retained temporarily</h2>
        <p>
          Some information may remain for a limited period in encrypted backups,
          security logs, fraud-prevention records, or service-provider recovery
          systems until normal retention cycles expire. We may also retain the
          minimum information required to comply with law, establish or defend
          legal claims, resolve billing or security incidents, or document that
          a deletion request was fulfilled. Retained information is restricted
          from ordinary product use and deleted or anonymized when the
          applicable reason or retention period ends.
        </p>
      </section>

      <section>
        <h2>7. Contact</h2>
        <p>
          Data-deletion questions and requests may be sent to{" "}
          <a href="mailto:info@vastech.biz">info@vastech.biz</a>.
        </p>
        <p>
          Vastech Technologies
          <br />
          35-K, Lower Ground Floor, Commercial Area, Phase 1, DHA
          <br />
          Lahore, Pakistan
        </p>
      </section>
    </LegalPage>
  );
}
