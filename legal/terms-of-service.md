# Novyse Terms of Service

**Published:** 21 November 2026
**Effective:** 21 December 2026 *(Effective immediately for new accounts created on or after the latest update; effective 30 days after publication for existing accounts)*

These terms govern your use of the hosted Novyse service and of the Novyse applications. By
creating an account, or by using the service, you accept them. If you do not accept them, do not
use the service.

## 1. Who we are

The service is operated jointly by Samuele Orazio Durante and Matteo Magnani, individuals
established in Italy and joint controllers under Article 26 GDPR. Contact: **privacy@novyse.com**.
In these terms "we", "us" and "Novyse" mean both of them; "you" means the person who uses the
service.

## 2. Software licence and service are two different things

This distinction matters, so it comes first.

**The client software** (the applications for Android, iOS, desktop and web) is free software
released under the **GNU General Public License, version 3.0**. The full text is bundled with the
application and is published in the source repository. The GPL gives you the right to use, study,
modify and redistribute the client, under the conditions of that licence, including the obligation
to keep derivative works under the same licence.

**The hosted service** — the servers, the database, the storage, the relays, the domain, the
infrastructure and the operations — is **not** covered by the GPL and is not distributed to you.
Using the hosted service is governed by these terms, not by the GPL. We grant you a personal,
limited, non-exclusive, non-transferable, revocable right to access the service for your own use,
for as long as your account is active and these terms are respected.

**The name and the logo** "Novyse" are trademarks. The trademark policy published in the source
repository governs their use; the GPL does not grant you the right to use them to identify a
modified version of the software as if it were ours.

**The server code** is not published as open source. Nothing in these terms or in the GPL of the
client grants you a licence on the server code.

**Self-hosted and external infrastructure (BYOS).** You may run the client against infrastructure
that you control or that a third party provides to you, including your own S3-compatible object
storage and your own LiveKit server (BYOS — Bring Your Own Storage). Those components are
operated by you or by the provider you chose, not by us. We do not administer them, we have no
access to the data stored in them, and we are not responsible for their availability, security,
configuration, retention, backup or compliance with the law. If you configure an external storage
or media server, its operator may process your content and the content of the chats that use it;
those terms and that operator's privacy policy apply to that processing, and the guarantees in our
Privacy Policy about where the data is stored no longer describe your deployment.

## 3. Eligibility

You must be at least 16 years old. We ask you to declare it at signup and the applications enforce
it. If you are between 16 and the age of majority in your country, you confirm that you have the
authorisation of your legal guardian where the law requires it. You must be able to enter into a
binding contract.

## 4. Your account

- Provide accurate information and keep it up to date.
- Your password never reaches our servers: authentication uses OPAQUE, so your device proves
  knowledge of the password. This also means that **we cannot reset your password** and cannot
  recover an account whose password is lost.
- Keep your credentials and your devices secure. You are responsible for the activity performed
  through your account, unless you prove that it was not attributable to you.
- Do not share your account, sell it or transfer it.
- Tell us immediately at privacy@novyse.com if you suspect unauthorised access.
- One account per person. Creating additional accounts to evade a ban, a limit or a moderation
  decision is prohibited.

You can delete your account at any time from the settings of the application. The deletion is
immediate and irreversible; section 11 explains its effects.

## 5. Acceptable use

You may not, and may not help anyone to:

- publish or transmit content that is illegal, that incites violence or hatred, that sexualises
  minors, that harasses or threatens a person, or that violates the rights of others;
- distribute malware, phishing or spam, or use the service to send unsolicited bulk messages;
- attempt to access an account, a chat, a server or a storage partition that is not yours, or
  probe, scan or test the vulnerability of the service without our written permission;
- interfere with the operation of the service: overload it, circumvent rate limits or storage
  limits, automate the creation of accounts, scrape the platform;
- reverse engineer, decompile or extract the server code or the data of other users, except to the
  extent that the law expressly permits it;
- use the service to build a competing dataset, to train models on other users' content, or to
  resell access to it;
- impersonate another person, a moderator or Novyse itself;
- use the service for a purpose that requires a licence or an authorisation you do not have.

Zero tolerance: content that sexualises minors is removed immediately, the account is terminated
and, where required, the competent authorities are informed.

## 6. Your content

You keep all rights on the content you create and share: messages, files, images, audio, video,
profile information.

To operate the service we need a licence, and you grant us one that is worldwide, non-exclusive,
royalty-free and limited to what is necessary to host, store, transmit, display and deliver your
content to the members of the chats you take part in, to synchronise it with your devices, to
produce previews and notifications, and to allow moderation as described in section 7. This
licence ends when the content is deleted, except for the copies that other members of a chat have
legitimately received and for the technical time needed to remove it from the infrastructure.

You confirm that you have the rights needed to share the content you upload and that it does not
violate the rights of third parties.

## 7. Moderation, roles and administration

Novyse organises chats with roles: an owner, administrators, moderators and members. Each role has
permissions, and a chat can restrict what a member can do (send messages, attach files, invite,
manage roles, delete messages).

If you are a member of a chat, the administrators of that chat can:

- read the history of the chat, including messages you sent before they became administrators;
- delete messages, remove files, remove members and change your role;
- consult the event log of the chat, which records who did what and when.

If you create a chat, you are responsible for how you exercise these powers and for the content
that circulates in it, and you must inform its members of how the chat is managed. Roles and
permissions are a product feature, not a guarantee: a misconfiguration is possible, and we are not
responsible for the decisions of a chat administrator.

We can intervene on our own initiative when content or behaviour violates these terms or the law:
we can remove content, restrict a feature, suspend or terminate an account. Where possible we tell
you what happened and why. You can contest a decision by writing to privacy@novyse.com.

## 8. Files, storage and limits

Every account receives a personal storage quota, currently 2 GB, generated automatically when
the account is created. Storage is shared with the files of the chats you take part in, and a
chat can have its own partition.

The limits of the service — the storage quota, the resolution and frame rate of screen sharing
(up to 1080p at 30 frames per second), the maximum number of participants in a room (10), the
maximum bitrate shown in the application, the maximum size of a single file — are published in the
application or on the website and **may change at any time**, including being reduced. We will give
reasonable notice of a reduction that affects you. Exceeding a limit is not a breach if the
platform accepted the operation; we may nevertheless refuse an upload when the quota is full.

We do not guarantee that a file will be available forever: a file can be removed with its message,
with the chat, with the account, or by the storage maintenance that removes objects no longer
linked to the database (normally within 24–48 hours of the deletion of the row).

## 9. Third-party services

Some features rely on third parties: the GIF and sticker search uses KLIPY, push notifications on
mobile use Firebase Cloud Messaging, the download of the applications and the plugin registry use
GitHub. Those services have their own terms and privacy policies, which apply to the part of the
processing they perform. If a third-party service is unavailable, the corresponding feature may
not work; the rest of the platform keeps working.

Plugins are provided by third parties, including the community. We do not control their content or
their behaviour, we do not warrant them, and installing a plugin is your choice. A plugin runs
with the permissions the platform grants to it: install only plugins you trust.

## 10. Availability, changes and no warranty

The service is provided **"as is"** and **"as available"**, without any service level agreement
and without warranties of any kind, express or implied, including merchantability, fitness for a
particular purpose and non-infringement, to the maximum extent permitted by law.

We may modify, suspend or discontinue a feature, a chat type, a plugin interface or the whole
service. For a substantial change that affects you negatively we give reasonable notice in the
application, normally 30 days, except when the change is required by law or by a security
emergency.

Maintenance can interrupt the service. We try to announce it, but we do not guarantee it.

**There are no backups.** The platform does not keep backup copies of the data. A deletion is
final, and an infrastructure failure, a hardware fault or an operational error can cause the loss
of messages and files that have not been deleted. You are responsible for keeping your own copy of
anything you cannot lose.

## 11. Suspension and termination

You can stop using the service at any time and delete your account from the settings. The deletion
is immediate. It removes your profile, your handles, the messages you sent (from the chats of the
other members as well), your files, your sessions and the events attached to your account. The
chats you created are not deleted: they remain available to their members, without you. Files are
removed from the object storage by the scheduled sweep, normally within 24–48 hours.

We can suspend or terminate your account if you violate these terms, if the law requires it, or if
your use exposes the service or other users to a risk. In case of a serious violation the
termination can be immediate. Where it is reasonable, we warn you first and give you the
possibility to remedy.

Sections that by their nature survive termination — content licence for the copies legitimately
received, limitation of liability, indemnity, governing law — remain in force.

## 12. Limitation of liability

To the maximum extent permitted by law, we are not liable for indirect, incidental, special,
consequential or punitive damages, nor for the loss of data, of profits, of revenue, of goodwill or
of business opportunities, arising from the use of, or the impossibility to use, the service.

Our total liability for the claims connected to the service, in any twelve-month period, is limited
to the greater of (a) the amount you paid us in that period and (b) one hundred euro (EUR 100).

Nothing in these terms limits liability for wilful misconduct or gross negligence, for death or
personal injury, for the violation of mandatory provisions of consumer law, or for any other
liability that cannot be limited by law. If you are a consumer, you keep all the rights that the
law of your country of residence grants you.

## 13. Indemnity

If you use the service for a business or professional activity, you indemnify us against the
claims of third parties — including reasonable legal costs — that arise from the content you
shared, from your violation of these terms or from your violation of the law.

## 14. Paid plans

The service is free today. We reserve the right to introduce paid plans, additional storage,
higher limits or optional paid features. If we do, we will announce prices, what is included and
the conditions before charging anything, and no existing free feature will become paid without
notice.

For paid plans the following will apply: billing in advance, renewal at the end of the period
unless cancelled, the right of withdrawal of 14 days for distance contracts for digital services
(unless the service has been fully performed with your consent), suspension of the account in case
of failed payment after a reminder, and invoices with the VAT required by law. A change of price
will be announced at least 30 days in advance and will apply from the next renewal.

## 15. Changes to these terms

We may unilaterally modify these terms when there is a justified reason, in particular: the
introduction of new features or of paid plans; a change in the technical or organisational
operation of the service; a security requirement; the need to comply with a law, a regulation or a
decision of a competent authority; or infrastructure maintenance. The version, the publication
date and the effective date are at the top of the document.

We communicate material changes through the **official Novyse system account inside the
application**, at least **30 days** before the effective date. The notice states which documents
changed, summarises the changes and indicates the effective date. We do not use email for this
notice because an email address is not required to create an account.

During the 30-day notice period you may keep using the service under the version in force. From
the effective date, **continuing to use the service means that you accept the modified terms**
(tacit acceptance). If you do not accept the changes, you have the right to withdraw from these
terms and to delete your account at any time before the effective date, from the settings of the
application, **without any penalty and without losing the rights accrued until that moment**. The
deletion is immediate and irreversible; section 11 describes its effects.

**New accounts** created on or after the date of the update accept the updated documents at
signup, and the new version applies to them immediately. **Existing accounts** are bound by the
previous version until the effective date, which is 30 days after publication.

Changes required by law, by a binding order of an authority, or by an urgent security need may
take effect earlier than 30 days. In that case the notice explains the reason and the shorter
date, and the right to withdraw and delete the account remains available.

Non-material changes (typos, formatting, clarifications that do not alter your rights or our
obligations) are published immediately and do not trigger the 30-day notice.

## 16. Governing law and jurisdiction

These terms are governed by Italian law, without prejudice to the mandatory provisions that
protect consumers in their country of residence.

If you are a consumer, you can bring proceedings before the court of your place of residence or
domicile, or before the court of the place where we are established; the same rule applies to us.
If you are not a consumer, the competent court is the court of the place where we are established,
and the jurisdiction is exclusive.

European consumers can use the online dispute resolution platform of the European Commission. We
are not obliged, and we do not commit, to participate in alternative dispute resolution procedures
before a consumer arbitration body.

## 17. Miscellaneous

- **Entire agreement.** These terms, the Privacy Policy and the licence of the client are the
  whole agreement about the service.
- **Severability.** If a clause is invalid, the others remain in force and the invalid clause is
  replaced by the rule that comes closest to its purpose.
- **No waiver.** If we do not enforce a right, we do not waive it.
- **Assignment.** You may not assign your account or these terms. We may assign them together with
  the service, giving you notice.
- **Language.** These terms are published in English only; the English version is the binding one.
- **Notices.** Communications to you happen in the application; communications to us happen at
  privacy@novyse.com.

## 18. Contact

For legal matters, moderation appeals, reports of abuse and requests about your data:

**privacy@novyse.com**

Samuele Orazio Durante and Matteo Magnani, Italy.
