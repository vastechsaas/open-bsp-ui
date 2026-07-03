import LegalPage from "@/components/LegalPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" updated="July 4, 2026">
      <section>
        <p>
          This Privacy Policy explains how <strong>Vastech Technologies</strong>
          {" "}(&quot;Vastech,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) collects, uses, stores, and shares information when
          you use <strong>Social Connect</strong>, including its website,
          dashboard, messaging tools, and integrations with the WhatsApp
          Business Platform.
        </p>
        <p>
          Social Connect helps authorized businesses connect their WhatsApp
          Business accounts, manage customer conversations, and send and
          receive business messages. This policy applies to organization
          administrators, team members, and individuals whose communications
          are processed through Social Connect.
        </p>
      </section>

      <section>
        <h2>1. Who is responsible for your information</h2>
        <p>
          Vastech Technologies operates Social Connect and is responsible for
          the operation and security of the service. A business using Social
          Connect may separately determine why it communicates with its
          customers and how those communications are used. In that situation,
          the business is also responsible for its own notices, permissions,
          and compliance obligations.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p>Depending on how you use Social Connect, we may process:</p>
        <ul>
          <li>
            <strong>Account information:</strong> name, email address, profile
            image, authentication identifiers, organization membership, role,
            and login information.
          </li>
          <li>
            <strong>WhatsApp Business information:</strong> business account
            identifiers, business portfolio identifiers, WhatsApp Business
            Account IDs, phone-number IDs, display phone numbers, business
            profile information, message templates, and integration status.
          </li>
          <li>
            <strong>Messages and contacts:</strong> sender and recipient
            identifiers, phone numbers, profile names, message text, media,
            documents, message timestamps, replies, reactions, and delivery,
            read, or failure status.
          </li>
          <li>
            <strong>Credentials and connection data:</strong> access tokens,
            authorization codes, webhook configuration, and other credentials
            required to connect to Meta services. We do not request or store
            your Facebook password.
          </li>
          <li>
            <strong>Technical and usage information:</strong> browser and
            device information, IP address, timestamps, diagnostic events,
            security events, function and API logs, and actions taken within
            the service.
          </li>
          <li>
            <strong>Information you provide:</strong> organization details,
            member invitations, support requests, API and webhook
            configuration, and other content submitted through the service.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <p>We use information only as reasonably necessary to:</p>
        <ul>
          <li>authenticate users and administer organizations and roles;</li>
          <li>connect and maintain WhatsApp Business integrations;</li>
          <li>
            display, send, receive, route, store, and synchronize business
            communications and media;
          </li>
          <li>
            provide message templates, delivery status, conversation history,
            webhooks, and customer-support functionality;
          </li>
          <li>
            protect the service, prevent abuse, investigate errors, and enforce
            our Terms of Service;
          </li>
          <li>
            provide support, maintain service reliability, and improve features
            based on operational information; and
          </li>
          <li>comply with applicable law and valid legal obligations.</li>
        </ul>
        <p>
          We do not sell Meta Platform Data. We do not use WhatsApp message
          content for advertising, data-broker services, or training
          general-purpose artificial-intelligence models.
        </p>
      </section>

      <section>
        <h2>4. Legal grounds for processing</h2>
        <p>
          Where applicable law requires a legal basis, we process information
          to perform our contract with users and customer organizations, to
          pursue legitimate interests such as securing and operating the
          service, to comply with legal obligations, and with consent where
          consent is required. A customer organization is responsible for
          establishing an appropriate legal basis for the messages it sends and
          for obtaining any required customer permissions.
        </p>
      </section>

      <section>
        <h2>5. How information is shared</h2>
        <p>We may share information with:</p>
        <ul>
          <li>
            <strong>Meta and WhatsApp:</strong> as necessary to connect accounts
            and send or receive messages through the WhatsApp Business
            Platform.
          </li>
          <li>
            <strong>Supabase, Inc.:</strong> our managed database,
            authentication, storage, logging, realtime, and serverless-function
            provider.
          </li>
          <li>
            <strong>Vercel Inc.:</strong> our website hosting provider, which
            may process ordinary web-request and operational metadata.
          </li>
          <li>
            <strong>Authorized organization users:</strong> administrators and
            team members who are permitted to access their organization&apos;s
            conversations and settings.
          </li>
          <li>
            <strong>Customer-directed integrations:</strong> webhook
            destinations, media-processing providers, or other external
            services that an authorized organization administrator explicitly
            configures. Data is sent to those services only according to that
            organization&apos;s instructions.
          </li>
          <li>
            <strong>Professional advisers and authorities:</strong> when
            reasonably necessary to obtain professional advice, protect rights
            and safety, or respond to a valid and lawful request.
          </li>
          <li>
            <strong>Business transfers:</strong> if all or part of the service
            is involved in a merger, acquisition, financing, or sale, subject
            to appropriate confidentiality and legal safeguards.
          </li>
        </ul>
        <p>
          Service providers may process information only to provide contracted
          services to us and are subject to contractual or legal data-protection
          obligations. We do not permit them to use Meta Platform Data for
          their own advertising purposes.
        </p>
      </section>

      <section>
        <h2>6. Data retention and deletion</h2>
        <p>
          We retain account and organization information while the relevant
          account or organization remains active and retain message data for as
          long as needed to provide conversation history and the requested
          service. Organization owners can delete an organization from the
          dashboard. Associated active database records are deleted through the
          service&apos;s cascading deletion process, and associated stored
          media is normally removed by an automated cleanup process within
          approximately one hour.
        </p>
        <p>
          Limited information may remain temporarily in encrypted backups,
          security logs, or provider recovery systems until the applicable
          retention cycle expires. We may retain information where required by
          law, to resolve disputes, prevent fraud or abuse, or enforce
          agreements. Detailed instructions are available on our{" "}
          <a href="/data-deletion">Data Deletion page</a>.
        </p>
      </section>

      <section>
        <h2>7. Security</h2>
        <p>
          We use administrative, technical, and organizational safeguards
          designed to protect information, including encrypted transport,
          access controls, role-based authorization, tenant-level data
          isolation, restricted production access, and monitoring. No method of
          transmission or storage is completely secure, and we cannot guarantee
          absolute security. Users must protect their credentials and promptly
          report suspected unauthorized access.
        </p>
      </section>

      <section>
        <h2>8. International processing</h2>
        <p>
          Our service providers may process information in countries other than
          the country where you live. Where required, we use contractual and
          other recognized safeguards intended to protect information during
          international transfers.
        </p>
      </section>

      <section>
        <h2>9. Your choices and rights</h2>
        <p>
          Depending on your location, you may have rights to request access,
          correction, deletion, restriction, objection, or portability of your
          personal information, and to withdraw consent where processing relies
          on consent. You may also have the right to complain to a local
          data-protection authority.
        </p>
        <p>
          Organization users should first use available dashboard controls.
          WhatsApp end users may contact the business with which they
          communicated or contact us directly. We may request information
          necessary to verify identity, authority, and the organization or
          phone number associated with a request.
        </p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>
          Social Connect is a business service and is not directed to children
          under 18. Customer organizations must not knowingly use the service
          to collect children&apos;s information in violation of applicable
          law.
        </p>
      </section>

      <section>
        <h2>11. Changes to this policy</h2>
        <p>
          We may update this policy to reflect changes to the service, law, or
          our data practices. We will publish the revised policy here and
          update its effective date. Material changes may also be communicated
          through the service or by email where appropriate.
        </p>
      </section>

      <section>
        <h2>12. Contact us</h2>
        <p>
          Questions, privacy requests, and complaints may be sent to{" "}
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
