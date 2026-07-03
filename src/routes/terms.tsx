import LegalPage from "@/components/LegalPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: TermsOfService,
});

function TermsOfService() {
  return (
    <LegalPage title="Terms of Service" updated="July 4, 2026">
      <section>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern access to and use of
          <strong> Social Connect</strong>, a business messaging service
          operated by <strong>Vastech Technologies</strong> (&quot;Vastech,
          &quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By
          accessing or using Social Connect, you agree to these Terms. If you
          use the service for an organization, you represent that you are
          authorized to accept these Terms for that organization.
        </p>
      </section>

      <section>
        <h2>1. The service</h2>
        <p>
          Social Connect enables authorized organizations to connect supported
          business-messaging accounts, manage contacts and conversations, send
          and receive messages and media, manage templates, invite team
          members, and use related integration tools. Features may change as
          the service and third-party platforms evolve.
        </p>
      </section>

      <section>
        <h2>2. Eligibility and authority</h2>
        <p>
          You must be at least 18 years old and legally able to enter into a
          binding agreement. You may connect only accounts, phone numbers,
          business portfolios, and data that you are authorized to administer.
          You must provide accurate account information and keep it current.
        </p>
      </section>

      <section>
        <h2>3. Accounts and security</h2>
        <p>
          You are responsible for maintaining the confidentiality of login
          credentials, access tokens, API keys, and connected accounts, and for
          all activity performed through your organization. You must assign
          appropriate member roles, promptly revoke access that is no longer
          required, and notify us at{" "}
          <a href="mailto:info@vastech.biz">info@vastech.biz</a> if you suspect
          unauthorized access or a security incident.
        </p>
      </section>

      <section>
        <h2>4. Meta and WhatsApp requirements</h2>
        <p>
          Social Connect is an independent service and is not owned or endorsed
          by Meta. Your use of Meta and WhatsApp products remains subject to
          their applicable terms, policies, documentation, commerce rules, and
          messaging requirements, including requirements concerning user
          consent, message templates, service windows, opt-outs, and prohibited
          content.
        </p>
        <p>
          You are responsible for maintaining an eligible WhatsApp Business
          account and for any action Meta takes concerning that account. We do
          not control approval, suspension, message delivery, template
          classification, quality ratings, pricing, or availability of Meta
          services.
        </p>
      </section>

      <section>
        <h2>5. Acceptable use</h2>
        <p>You must not use Social Connect to:</p>
        <ul>
          <li>
            send spam, unsolicited messages, deceptive communications, or
            messages to recipients without required notice or permission;
          </li>
          <li>
            violate privacy, intellectual-property, consumer-protection,
            telecommunications, export-control, sanctions, or other applicable
            laws;
          </li>
          <li>
            transmit illegal, fraudulent, threatening, exploitative, hateful,
            or malicious content;
          </li>
          <li>
            collect, use, or disclose sensitive or personal information without
            a lawful purpose and appropriate safeguards;
          </li>
          <li>
            circumvent platform restrictions, interfere with security, probe
            other tenants, introduce malware, or disrupt the service;
          </li>
          <li>
            sell, license, scrape, or use Meta Platform Data for unauthorized
            profiling, surveillance, advertising, or data-broker activities;
            or
          </li>
          <li>
            allow unauthorized persons to access the service or falsely
            represent identity, affiliation, or authority.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Your responsibilities</h2>
        <p>
          You determine the purpose and content of your business
          communications. You are responsible for providing legally required
          privacy notices, honoring opt-outs, responding to data-subject
          requests, maintaining records of consent where required, and ensuring
          that your instructions and use of the service are lawful. You must
          not instruct us to process information in a manner that violates
          applicable law or third-party platform rules.
        </p>
      </section>

      <section>
        <h2>7. Your content and data</h2>
        <p>
          As between you and Vastech, you retain your rights in the content and
          business data you submit or receive through the service. You grant us
          a limited, non-exclusive right to host, transmit, reproduce, format,
          and otherwise process that content only as necessary to operate,
          secure, support, and comply with legal obligations relating to Social
          Connect.
        </p>
        <p>
          You represent that you have all rights, permissions, and lawful bases
          required for us and our service providers to process that content
          according to your instructions.
        </p>
      </section>

      <section>
        <h2>8. Privacy and data protection</h2>
        <p>
          Our collection and use of information is described in our{" "}
          <a href="/privacy">Privacy Policy</a>. Instructions for requesting
          deletion are available on our{" "}
          <a href="/data-deletion">Data Deletion page</a>. You agree not to
          provide information that the service is not designed or authorized to
          process.
        </p>
      </section>

      <section>
        <h2>9. Third-party services</h2>
        <p>
          Social Connect depends on services provided by Meta, WhatsApp,
          Supabase, Vercel, telecommunications providers, and other vendors.
          Third-party services are governed by their own terms and may change,
          restrict, or discontinue functionality. We are not responsible for
          third-party acts, omissions, outages, policy decisions, or changes
          outside our reasonable control.
        </p>
      </section>

      <section>
        <h2>10. Fees</h2>
        <p>
          If you purchase a paid plan or professional service, applicable fees,
          taxes, usage limits, billing intervals, and payment terms will be
          disclosed in an order, invoice, dashboard, or separate written
          agreement. Meta or telecommunications charges may apply separately
          and remain your responsibility unless expressly stated otherwise.
        </p>
      </section>

      <section>
        <h2>11. Service availability and changes</h2>
        <p>
          We work to keep Social Connect available and secure, but we do not
          guarantee uninterrupted or error-free operation. We may perform
          maintenance, impose reasonable usage or security limits, change
          features, or discontinue parts of the service. Where practicable, we
          will provide reasonable notice of material changes that adversely
          affect active customers.
        </p>
      </section>

      <section>
        <h2>12. Suspension and termination</h2>
        <p>
          You may stop using the service at any time and organization owners
          may delete their organization through the dashboard. We may restrict
          or suspend access when reasonably necessary to address security risk,
          unlawful activity, non-payment, platform-policy violations, harm to
          users or third parties, or a material breach of these Terms.
        </p>
        <p>
          Upon termination, your right to use the service ends. Provisions that
          by their nature should survive—including provisions concerning
          ownership, payment, disclaimers, liability, and disputes—will remain
          effective. Data is handled according to our Privacy Policy and
          deletion process.
        </p>
      </section>

      <section>
        <h2>13. Intellectual property</h2>
        <p>
          Social Connect branding, service design, documentation, and
          proprietary materials are owned by Vastech or its licensors. These
          Terms do not transfer ownership of those materials. Components
          distributed under open-source licenses remain governed by their
          applicable licenses. Meta, Facebook, WhatsApp, and related marks
          belong to their respective owners.
        </p>
      </section>

      <section>
        <h2>14. Disclaimers</h2>
        <p>
          To the maximum extent permitted by law, the service is provided
          &quot;as is&quot; and &quot;as available.&quot; We disclaim implied
          warranties of merchantability, fitness for a particular purpose,
          non-infringement, and any warranty arising from course of dealing.
          We do not warrant that messages will be delivered, that third-party
          approvals will be granted, or that the service will meet every legal
          or business requirement.
        </p>
      </section>

      <section>
        <h2>15. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Vastech and its affiliates,
          officers, employees, and suppliers will not be liable for indirect,
          incidental, special, consequential, exemplary, or punitive damages,
          or for lost profits, revenue, data, goodwill, or business
          opportunities arising from or related to the service. Any aggregate
          liability will not exceed the amount you paid to Vastech for Social
          Connect during the six months preceding the event giving rise to the
          claim. Nothing in these Terms limits liability that cannot lawfully be
          limited.
        </p>
      </section>

      <section>
        <h2>16. Indemnity</h2>
        <p>
          To the extent permitted by law, you will defend and indemnify Vastech
          against third-party claims, damages, and reasonable costs arising
          from your content, your business communications, your violation of
          law or third-party platform rules, or your material breach of these
          Terms.
        </p>
      </section>

      <section>
        <h2>17. Governing law</h2>
        <p>
          These Terms are governed by the laws of Pakistan, without regard to
          conflict-of-law principles. Subject to any mandatory consumer rights,
          courts located in Lahore, Pakistan will have jurisdiction over
          disputes arising from these Terms or the service.
        </p>
      </section>

      <section>
        <h2>18. Changes to these Terms</h2>
        <p>
          We may update these Terms to reflect legal, technical, or service
          changes. We will post the revised Terms with a new effective date.
          Continued use after the updated Terms become effective constitutes
          acceptance where permitted by law.
        </p>
      </section>

      <section>
        <h2>19. Contact</h2>
        <p>
          Questions about these Terms may be sent to{" "}
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
