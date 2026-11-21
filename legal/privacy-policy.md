# Novyse Privacy Policy

**Version 2026.11 — effective 21 November 2026**

This policy explains what personal data Novyse processes, why, where it is stored and for how
long. It applies to the hosted service at `www.novyse.com`, `api.novyse.com`, `comms.novyse.com`
and `file.novyse.com`, and to the Novyse applications for Android, iOS, desktop and web.

## 1. Who is the controller

The processing described here is carried out by two joint controllers, who jointly decide its
purposes and its means:

- Samuele Orazio Durante — individual — Italy
- Matteo Magnani — individual — Italy

Both are reachable at **privacy@novyse.com**, the single contact point for every privacy request.
Under Article 26 GDPR we have agreed how our responsibilities are divided: each of us is
accountable to you for the whole processing, and a request addressed to one of us is handled by
both. What you read in this section is the essence of that arrangement; you can ask for the full
text at privacy@novyse.com.

"Controller" means the person who decides why and how the data is processed. We have not
appointed a Data Protection Officer: none of the conditions of Article 37 GDPR applies to
Novyse.

If you use an instance of Novyse that is hosted by someone else (a self-hosted deployment), that
operator is the controller of your data, not us. Section 14 explains what that means.

## 2. What Novyse is

Novyse is a messaging and collaboration platform: chats, subgroups, files, invitations, roles and
permissions, audio/video rooms, and a plugin system. It is free of charge today.

The service has no advertising, no behavioural profiling, no analytics SDK and no crash reporting
SDK. We do not sell personal data and we do not share it for advertising. We do not require an
email address to create an account: you register with a handle and a password.

## 3. Data we process

### 3.1 Account data

- the handle you choose, your display name and your user identifier (a UUID);
- optional profile information you decide to add: surname, birthday, biography, profile picture;
- an OPAQUE registration record. Passwords are never transmitted to or stored by the server: the
  client runs the OPAQUE protocol and the server only keeps the cryptographic registration
  record needed to verify you at login. We cannot recover or read your password;
- whether you accepted the Terms of Service and this policy, and your declaration that you are at
  least 16 years old.

### 3.2 Sessions and authentication data

When you sign in we create a session. We store the session identifier, the platform (Android,
iOS, desktop, web), the browser or app user agent, your IP address, the creation time, the last
rotation time, the expiry time and the last access time. Authentication tokens are short lived
(15 minutes) and the session lasts at most 30 days.

### 3.3 Content and activity data

- the messages you send, which are stored on our servers **in readable form** (see section 10 on
  encryption and on who can read a chat);
- the files, images and other attachments you upload;
- chat metadata: the name and type of a chat and of its subgroups, membership, roles and
  permissions, invitations, join requests, blocks between users;
- the notification channel settings associated with your account;
- the data produced by plugins you use inside a chat, including temporary files created by a
  plugin.

### 3.4 Synchronization events

Novyse stores events that describe what changed in a chat or in a profile (a message edited or
deleted, a member added, a role changed, a read receipt, a profile update). Clients that stayed
offline for a long time use these events to reconstruct the current state of a chat when they
come back, and administrators use them to review what happened in a chat. Events are kept for the
lifetime of the chat or of the account and are deleted together with them.

### 3.5 Presence

We keep in memory (Redis) whether a user is online, together with the session that is connected,
and we store the date of the last activity of an account. Presence entries are transient and are
discarded when the session ends.

### 3.6 Push notifications

On mobile, if you enable notifications, we store the push token issued by Firebase Cloud Messaging
and use it to deliver notifications about new messages. On desktop and web no push provider is
used.

### 3.7 Technical logs

The servers write technical logs: timestamp, service, request path, response status, IP address,
user agent, error details. Logs are rotated by size and deleted after 30 days.

### 3.8 Anti-abuse data

The web signup form is protected by Cloudflare Turnstile. Your browser sends a challenge token to
Cloudflare, which returns a score to us; we do not store the score. Cloudflare processes, for this
purpose, your IP address and technical information about your browser.

### 3.9 Communications with us

If you write to us, we process your email address, the content of the message and any attachment
for as long as needed to answer and to keep a record of the request.

### 3.10 GIF and sticker search

The GIF and sticker search inside the app sends your search terms directly from your device to
KLIPY (see section 6). Novyse does not relay or store those requests, but KLIPY sees your IP
address and your search terms.

## 4. Why we process the data and on which legal basis

| Purpose                                                                            | Data             | Legal basis (GDPR)                                                         |
| ---------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------- |
| Creating and operating your account, delivering messages, files and calls          | 3.1, 3.2, 3.3    | Performance of a contract, Art. 6(1)(b)                                    |
| Keeping chats synchronized across devices and letting administrators review a chat | 3.4              | Performance of a contract, Art. 6(1)(b)                                    |
| Showing presence and delivering notifications you enabled                          | 3.5, 3.6         | Performance of a contract, Art. 6(1)(b)                                    |
| Protecting the service: rate limits, abuse prevention, bot protection, moderation  | 3.2, 3.7, 3.8    | Legitimate interests, Art. 6(1)(f): keeping the platform secure and usable |
| Answering your requests and handling legal claims                                  | 3.9              | Legitimate interests, Art. 6(1)(f) and legal obligations, Art. 6(1)(c)     |
| Complying with the law, including orders of authorities                            | any of the above | Legal obligation, Art. 6(1)(c)                                             |

We do not use your data for automated decision-making with legal effects and we do not build
profiles for advertising. Where a purpose would require consent, we ask for it separately and you
can withdraw it at any time; no such processing is active today.

## 5. Who can read your messages

Messages are stored on the server and are **not** end-to-end encrypted. This is a deliberate
design choice and you should know it before using the service:

- the server can read the content of messages and files;
- members of a chat with an administrative role can read the history of that chat, delete
  messages and see the event log of the chat;
- our personnel accesses content only when it is necessary to operate the service, to investigate
  abuse, or when the law requires it.

If you need confidential communication with a guarantee that the operator cannot read it, do not
use this service for that conversation.

## 6. Recipients and sub-processors

We share data with the providers that run the service. They act as processors under Article 28
GDPR and are bound by a data processing agreement.

| Provider                          | Role                                                             | Location          | Data                                                                   |
| --------------------------------- | ---------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------- |
| Oracle Cloud Infrastructure       | Hosting of all servers and of the object storage                 | Milan, Italy (EU) | All data of sections 3.1–3.4, 3.6, 3.7                                 |
| Cloudflare, Inc.                  | Authoritative DNS, TLS certificates, Turnstile bot protection    | Global network    | IP address and technical data of the signup request (3.8); DNS queries |
| Google (Firebase Cloud Messaging) | Push notification delivery, mobile only                          | EU/US             | Push token and notification payload (3.6)                              |
| KIKLIKO, Inc. (KLIPY)             | GIF and sticker search                                           | United States     | Search terms and IP address of the request (3.10)                      |
| GitHub, Inc.                      | Distribution of the applications, plugin registry, licence texts | United States     | IP address of the download; no account data                            |

Application traffic is not proxied through Cloudflare: Cloudflare is used for DNS, for
certificates and for Turnstile, not as a content delivery network of the chats.

Audio and video rooms, the TURN relay and the file storage (`comms.novyse.com`,
`file.novyse.com`) run on our own servers on Oracle Cloud in Milan. They are not
third-party services, but they necessarily see the IP addresses of the participants of a call:
in a peer-to-peer call the other participants can see your IP address as well.

We may disclose data when the law requires it, when a competent authority orders it, or when it
is necessary to establish, exercise or defend a legal claim.

## 7. International transfers

All servers that store your account, your messages and your files are in the European Union
(Milan, Italy). Some providers listed in section 6 are established outside the European Economic
Area: transfers to them are covered by the Standard Contractual Clauses approved by the European
Commission and, where the provider is certified, by the EU–US Data Privacy Framework. Transfers
are limited to what each provider needs to perform its function.

## 8. How long we keep the data

| Data                       | Retention                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Account and profile        | Until you delete the account; the deletion is immediate and cascades to the related rows                                                        |
| Messages and chat metadata | Until the sender or an administrator with the permission deletes them, or until the chat or the account is deleted                              |
| Files and attachments      | The row is deleted with the file or the account; the stored object is removed by the storage sweep of the platform, normally within 24–48 hours |
| Synchronization events     | For the lifetime of the chat or of the account, then deleted with them                                                                          |
| Sessions                   | 30 days from creation, less if you log out                                                                                                      |
| Presence and last activity | Presence is discarded when the session ends; the last activity date is updated while the account exists                                         |
| Push tokens                | Until you disable notifications, the app is uninstalled or the account is deleted                                                               |
| Technical logs             | 30 days, then rotated out and deleted                                                                                                           |
| Turnstile challenge        | Seconds, the time of the verification                                                                                                           |
| Requests you send us       | 24 months                                                                                                                                       |

We keep **no backups** of the platform data. This means that a deletion is final, and also that a
failure of the infrastructure can cause the loss of data that has not been deleted. Section 12 of
the Terms of Service describes the consequences of this choice.

## 9. Cookies and local storage

Novyse does not use advertising cookies, analytics cookies or tracking pixels, and does not embed
third-party trackers in the applications. There is therefore no consent banner: the only
technologies used are strictly necessary to run the service.

**Web application.** The session is kept in the local storage of your browser and in IndexedDB;
your local database (SQLite compiled to WebAssembly) is stored in IndexedDB; a service worker
caches the application shell so that it loads offline. These are not cookies and are not shared
with third parties. Clearing the site data of your browser removes them and logs you out.

**Turnstile.** During a web signup, Cloudflare may set its own technical cookies to run the
challenge. They are necessary to protect the registration form from automated abuse.

**DNS and certificates.** Cloudflare resolves the domain and issues certificates; this does not
set cookies in your browser.

**Mobile and desktop applications.** Credentials are kept in the secure storage of the operating
system (Keychain, Keystore); the local database and the downloaded files are kept in the
application sandbox and are deleted at logout. Notification tokens are kept in the preferences of
the application.

You can remove all local data at any time by logging out, by clearing the application data or by
clearing the site data of your browser.

## 10. Security

We adopt technical and organisational measures proportionate to the risk:

- passwords never leave your device: authentication uses the OPAQUE protocol, so the server only
  holds a registration record that cannot be turned back into a password;
- TLS protects the traffic between the applications and the servers;
- tokens are signed with EdDSA and expire after 15 minutes; sessions expire after 30 days and are
  rotated every 24 hours;
- access to the database and to the storage is restricted by role and by store partition; each
  user has a dedicated storage partition;
- administrative actions inside a chat are recorded in the event log of the chat;
- access to the servers is limited to the operator, with key-based authentication;
- logs are rotated and deleted after 30 days.

No system is perfectly secure. If a personal data breach occurs that is likely to result in a
high risk for your rights, we will inform you and, where required, the Italian supervisory
authority within 72 hours of becoming aware of it.

## 11. Your rights

You have the right to:

- **access** your data and obtain a copy of it (Art. 15);
- **correct** inaccurate data (Art. 16) — most of it you can edit directly in your profile;
- **delete** your data (Art. 17) — the deletion of the account is available in the settings of the
  application and is immediate;
- **restrict** the processing (Art. 18);
- **receive** the data you provided in a structured, commonly used, machine-readable format
  (Art. 20);
- **object** to the processing based on legitimate interests (Art. 21);
- **complain** to a supervisory authority (Art. 77). In Italy: Garante per la protezione dei dati
  personali, Piazza Venezia 11, 00187 Roma, `protocollo@pec.gpdp.it`, `www.garanteprivacy.it`.

Write to privacy@novyse.com. We answer within one month; if the request is complex we may extend
the term by two months and we will tell you why. We may ask for information to verify that the
request comes from the account holder.

Note on deletion: when you delete your account, the messages you sent are removed from the chats
of the other members as well, because they belong to your account. The chats themselves are not
deleted, and an administrator of a chat may have kept a copy of the content, exactly as any
participant of a conversation can.

## 12. Children

Novyse is not for children. The minimum age is 16, we ask you to declare it at signup and the
applications enforce it. If we learn that an account belongs to a person under 16, we delete the
account and the related data. If you believe that a minor is using the service, write to
privacy@novyse.com.

## 13. Changes to this policy

We may update this policy when the service changes. The version and the effective date are at the
top of the document. For material changes we notify you in the application at least 30 days
before they take effect, and the application asks you to accept the new version. You can always
delete your account if you do not agree. The previous versions remain available on request.

## 14. Self-hosted instances

The source code of the Novyse client is free software under the GNU General Public License v3.0.
Anyone can run their own instance of the platform. If you use an instance that is not operated by
us, the person or organisation that runs it is the controller of your data: this policy does not
apply, and we have no access to that instance and no responsibility for it.

## 15. Contact

For anything related to this policy, to your data or to the exercise of your rights:

**privacy@novyse.com**

Samuele Orazio Durante and Matteo Magnani, Italy.
