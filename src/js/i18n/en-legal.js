/* ═══ i18n/en-legal ═══
   Inglés (de Estados Unidos): los textos legales de StrataFit (data/legal), el Aviso legal y condiciones de uso y la Política
   de privacidad, con las tarjetas de su resumen. Es una traducción: cada texto dice al empezar que, si hay diferencias, vale el
   español. Se descarga en lugar de data/legal con la app en inglés (core/lazy, loadLegal) y tiene sus mismos apartados, en el
   mismo orden (tests/legal.test.mjs lo comprueba). El formato, el de data/legal.
*/
import { setLegal } from '../profile/legal.js';
setLegal({
  terms: `
# Legal notice and terms of use

This is a translation provided for convenience. If there is any discrepancy, the Spanish version prevails.

## 1. Identification of the owner

StrataFit is a training, nutrition, and physical activity tracking application developed and managed by V. M. Rodriguez Mazuelas, referred to below as the owner.

- Owner: V. M. Rodriguez Mazuelas.
- Contact: from within the application, in [Profile → Bugs and suggestions](#contact); for matters concerning personal data, with the type “Privacy and data.”

Users may use this contact channel to report incidents, submit inquiries or complaints, and give notice of possible infringements of rights.

## 2. Purpose of the application

StrataFit offers tools to organize workouts, look up exercises, log food intake, track body measurements and physical progress, and help plan habits related to physical activity and well-being.

The application is intended for information, organization, and personal tracking. It is not a diagnostic service, medical treatment, or individualized health advice, and it is not intended to replace the care of qualified professionals.

## 3. Access and terms of use

Access to and use of StrataFit must comply with these terms and with applicable law. The contractual terms are made available to the user before they are accepted.

To create an account, you must be 16 or older and expressly accept these terms. The application keeps, linked to the account, the version accepted and the date of acceptance.

During the testing phase, the service is offered free of charge for personal, noncommercial use through its official channels. Merely using this version creates no obligation to pay. Any future paid option will be subject to prior information and, where applicable, an express purchase.

The user may stop using the application at any time, without prejudice to their rights over their personal data and to applicable legal provisions.

## 4. Testing phase and service availability

StrataFit is in a development and testing phase. Some features may be experimental, incomplete, or subject to change. Errors, interruptions, sync problems, incompatibilities, or total or partial loss of information may occur.

Uninterrupted availability and the complete absence of errors are not guaranteed. The owner will endeavor to take reasonable and legally required measures to maintain security, fix incidents, and reduce the risk of loss of information.

We recommend keeping an independent copy of important records and using the export or backup options when available.

The owner may carry out maintenance, apply updates, or change features for technical, legal, security, or service improvement reasons. Significant changes or the end of the testing phase will be communicated with reasonable notice where appropriate and possible, respecting the rights of users.

The experimental nature of the service does not remove the owner’s legal obligations or the rights that users cannot waive.

## 5. User account and security

When a feature requires an account, the user must keep their credentials confidential and use the service legitimately. We recommend using a strong password that is different from those used for other services.

The user must notify the owner, as soon as reasonably possible, of any suspected unauthorized access to or misuse of their account. The owner may take proportionate protective measures in response to security incidents, without prejudice to the owner’s own legal obligations.

The user may delete their account and the associated data at any time from within the application (Settings → Account → Delete account). Accounts that remain inactive for two years are deleted automatically along with their data, as set out in the Privacy policy.

## 6. Permitted use and prohibited conduct

The user agrees to use StrataFit lawfully, responsibly, and with respect for the rights of others. In particular, the following is not allowed:

- Accessing other people’s accounts, private data, or restricted areas without authorization.
- Bypassing access controls, maliciously interfering with the service, or introducing harmful code.
- Carrying out abusive automated extraction that compromises the operation of the service or infringes rights, without prejudice to uses covered by law or by open licenses.
- Impersonating others or using the application for fraudulent, unlawful, or harmful purposes.
- Reproducing or commercially exploiting the protected elements of StrataFit without authorization, unless a license or legal exception allows it.

## 7. Intellectual and industrial property

© 2026 V. M. Rodriguez Mazuelas. All rights reserved in StrataFit’s own content and elements.

The source code, visual identity, interface design, texts, illustrations, animations, graphic elements, and other original content are protected to the extent that intellectual and industrial property law applies to them. The rights belong to the owner or, where applicable, to their respective authors and licensors.

The user is granted a limited, nonexclusive, nontransferable authorization to use the application for its personal, noncommercial purpose during the testing phase, with no transfer of ownership of the rights.

Unless there is prior express authorization, an applicable license, or a legal provision that allows it, the reproduction, modification, distribution, public communication, transformation, resale, or commercial exploitation of the protected elements of StrataFit is not authorized. This limitation does not affect acts that the law allows without authorization, or the freedoms granted by third-party licenses.

Access to the code in a public repository does not, in itself, imply a general assignment of rights. If a component is distributed under a specific license, its terms prevail for that component.

Third-party trademarks, images, libraries, typefaces, databases, and other materials belong to their respective owners and are governed by their terms and licenses. No exclusive rights are claimed over third-party elements or over the user’s own data.

## 8. Information about training, health, and nutrition

The routines, exercises, illustrations, animations, nutritional recommendations, calculations, and other content of StrataFit are general and for guidance only. They may contain errors, simplifications, or estimates, and they are not necessarily adapted to each person’s individual circumstances.

Before starting or changing an exercise or eating program, especially if there are injuries, illnesses, pregnancy, allergies, intolerances, medical treatments, or other relevant circumstances, we recommend consulting a qualified professional.

The user must adapt intensity, loads, technique, eating, and rest to their state of health, experience, and physical ability. If the user experiences abnormal pain, dizziness, severe difficulty breathing, or other worrying symptoms, they must stop the activity and seek appropriate help. In an emergency, they must contact the relevant emergency services.

Estimates of calories, macronutrients, energy expenditure, and body changes are not clinical measurements and do not guarantee any specific result. Weight loss, muscle gain, improved performance, or any other particular physical result is not guaranteed.

The exercise illustrations and animations are visual references and do not replace the technical supervision of a qualified professional when it is needed. The application must not be used as the only source for making medical or nutritional decisions that may affect health.

## 9. Nutritional data and Open Food Facts

The food search results obtained from Open Food Facts come from a collaborative, open-access database. Its database is made available under the Open Database License (ODbL); individual contents are subject to the license applicable to the database and, where applicable, to the Database Contents License (DbCL). Product images from Open Food Facts, when used, are governed by the applicable Creative Commons Attribution-ShareAlike (CC BY-SA) license and by any third-party rights that may apply.

The information may be incomplete or out of date, or may contain transcription, composition, or product identification errors. Nutritional values, ingredients, and allergens must be checked directly on the product’s original label or with the manufacturer, especially if there are allergies or specific dietary needs.

StrataFit is not affiliated with Open Food Facts and is not necessarily endorsed by it. The rights and obligations of the open licenses remain in place for the corresponding data and resources.

Source: [Open Food Facts](https://world.openfoodfacts.org/). Database license: [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). See also its [terms of reuse](https://world.openfoodfacts.org/terms-of-use).

## 10. Content entered by the user

The user keeps whatever rights they hold over their records, photos, and other content they enter in StrataFit. They must hold the rights needed to contribute third-party content and must avoid entering information that is unlawful or that infringes the rights of others.

Using this content to provide the application’s features does not imply a general assignment of intellectual property rights to the owner. The processing of personal data is governed by the Privacy policy and applicable law.

## 11. Third-party services and links

StrataFit may use external services for its operation, storage, authentication, or information lookup, and may include links to third-party sites.

External services may be subject to their own terms, policies, and limitations. The owner does not necessarily control the content of external sites and does not guarantee their availability or accuracy. This does not exclude the obligations that the law places on the owner for selecting, integrating, or using those services.

## 12. Liability

The user must use the application prudently and take into account the limitations of the tools and content they use. To the extent permitted by applicable law, the owner will not be liable for harm attributable exclusively to unlawful or manifestly improper use of the service by the user, to actions of third parties beyond the owner’s reasonable control, or to force majeure events, when the corresponding legal requirements are met.

Nothing in this notice excludes or limits liability for willful misconduct, for personal injury attributable to the owner where such a limitation is prohibited, for breach of legal obligations on data protection, or in any other case in which liability cannot legally be excluded or limited.

All rights and guarantees of consumers and users that cannot be waived remain fully in place.

## 13. Privacy and data protection

The processing of personal data associated with the use of StrataFit is described in the application’s [Privacy policy](#privacy). It explains the purposes of the processing, the rights of users, and the channels available to exercise them.

Accepting the terms of use does not replace the specific consent that must be obtained for certain personal data processing operations, which the application requests separately.

## 14. Suspension or termination of access

The owner may limit or suspend access when there are justified reasons related to a significant breach of these terms, a security incident, a legal obligation, or the protection of the rights of others. The measures must be proportionate to the circumstances and will be communicated to the user where appropriate, unless legal or security reasons prevent it.

Suspension or termination of access is not a waiver of the user’s rights over their data, and it does not authorize any deletion contrary to applicable law.

## 15. Updates to the terms and commercial development

This notice may be updated to reflect technical, functional, legal, or organizational changes. The date of the current version will be shown, and significant changes will be communicated as required by applicable law. When a change requires a new acceptance, the application will request it expressly.

If subscriptions or paid features are offered in the future, their specific terms, total price, duration, renewal, cancellation, and, where applicable, withdrawal and refund rights will be provided beforehand. Using the free testing phase does not imply advance acceptance of future charges.

## 16. Applicable law, complaints, and jurisdiction

These terms are governed by Spanish law, without prejudice to any mandatory rules that protect the user in their place of habitual residence, where applicable.

In the event of an incident or dispute, the user may use the contact channel indicated in this notice. The user may also turn to the consumer bodies and courts that have jurisdiction under applicable law. No mandatory submission to a court is established that would deprive the consumer of the jurisdiction that the law grants them.

© 2026 V. M. Rodriguez Mazuelas — StrataFit. All rights reserved in its own elements, without prejudice to third-party licenses and rights.
`,
  privacy: `
# StrataFit privacy policy
> Your progress. Your data. Your privacy.

This is a translation provided for convenience. If there is any discrepancy, the Spanish version prevails.

At StrataFit, we consider the privacy and security of your information to be a fundamental part of your experience. Our goal is to offer you a tool for training, nutrition, and tracking your progress without collecting unnecessary personal information.

This policy explains what information we process, what we use it for, how we protect it, and what rights you have over it. It complements StrataFit’s [Legal notice](#terms). During the testing phase, the service is offered for personal use and free of charge, in accordance with the current Legal notice. It does not describe processing related to payments or subscriptions that are not in place.

## 1. Data controller

- Application: StrataFit.
- Data controller: V. M. Rodriguez Mazuelas, the owner identified in the Legal notice.
- Privacy contact: from within the application, in [Profile → Bugs and suggestions](#contact), with the type “Privacy and data.”

StrataFit has not appointed a data protection officer.

The processing is governed by Regulation (EU) 2016/679, the General Data Protection Regulation (GDPR), and by Spain’s Organic Law 3/2018 on the Protection of Personal Data and guarantee of digital rights (LOPDGDD).

## 2. Information we process

**Account data.** To sign up, you need a username and a password. You do not need to provide your real first and last name, personal email address, phone number, identity document, postal address, precise location, or bank details to use the features described in this policy. We recommend choosing a username that does not identify you directly. Credentials are managed through Firebase Authentication, which links your username to a technical identifier that is not a real mailbox; passwords are protected by cryptographic mechanisms and are not shown to the StrataFit administrator. The only exception is the temporary password that the administrator generates if you ask to reset yours: the administrator can see it for 24 hours in order to give it to you, and the application requires you to replace it with a new one when you sign in.

**Training, nutrition, and progress.** Depending on the features you use and the information you choose to enter, we may store routines, exercises, sessions, sets, reps, loads, records, training history, meals, calories, macronutrients, nutrition goals, weight, body measurements, and progress records. This data makes it possible to offer the requested features and to track your goals. Some of this data may reveal information about your health; that is why we ask for your explicit consent before processing it, when you create your account or, if your account predates this policy, when you open the application.

**Profile and preferences.** We may store the username, the sex indicated in the profile, the optional profile photo, the appearance, the units of measurement, the sound settings, the status of the introductory tour, and other settings you configure.

**Acceptance and consent.** We keep, linked to your account, the version of the terms of use you accepted and the version of the consent you gave, with their date and time and, if you withdraw it, the moment you did so.

**Bugs and suggestions.** If you send us a report from “Bugs and suggestions,” we keep its text, your username, the application version, and, only if you leave the box checked, technical data about the browser and the latest errors, so that we can handle it and reply to you.

**Technical information.** We keep the operating system category of the last device you used to access your account (iOS/iPhone, Android, or other), to obtain general compatibility statistics. Technology providers may process technical information needed for connection, authentication, and security, such as the IP address, browser characteristics, and session identifiers.

Even though no directly identifying data is requested, the username and other information associated with an account may constitute personal data.

## 3. Purposes of the processing

We use the information to create and manage accounts; authenticate access; store, retrieve, and sync records; personalize the experience; support training and nutrition tracking; show personal statistics; handle your reports and requests; maintain the security and availability of the service; prevent unauthorized access and abuse; improve technical compatibility; and comply with applicable legal obligations.

StrataFit does not sell, rent, or trade your personal data, and it does not use your training, eating, or physical progress records for advertising purposes.

## 4. Legal bases for the processing

Depending on the purpose, the processing is based on:

- **Performance of the service (Art. 6.1.b GDPR):** account management, authentication, storage, syncing, and operation of the requested features.
- **Consent (Art. 6.1.a):** optional information such as the profile photo.
- **Explicit consent (Art. 9.2.a, together with the applicable Art. 6 basis):** when data considered to be health data is processed and this is the applicable condition.
- **Legitimate interest (Art. 6.1.f):** protection of the infrastructure, abuse prevention, maintenance, and basic technical compatibility statistics, after assessing the need and the balance with your rights.
- **Legal obligation (Art. 6.1.c):** compliance with applicable legal obligations.

You can withdraw consent at any time, without affecting the lawfulness of the earlier processing. Not providing optional data or withdrawing consent for it may limit the features that depend on it, but not the others when they can be provided independently.

## 5. Storage and syncing

StrataFit combines local storage on your device with cloud storage associated with your account. Syncing makes it possible to recover records when you change devices, use them from different compatible devices, and reduce the risk of losing information.

During the testing phase, there is a risk of total or partial loss of records. Syncing does not guarantee recovery in every case; we recommend exporting a backup periodically and keeping it safe. This warning does not limit your data protection rights or StrataFit’s legal obligations regarding security, availability, and incident management.

We use Firebase, from Google, for authentication, storage, and syncing. StrataFit’s main database is configured in the Madrid, Spain, region. Other services, such as Firebase Authentication, may use infrastructure located outside Spain and the European Economic Area (EEA). See also the section on international transfers.

## 6. Access to your data and confidentiality

Ordinary access to your private records is tied to your account through authentication mechanisms and security rules. Your private records are not intended for other users.

From the administration panel, the administrator can see the username, the sex indicated, the date the account was created, the appearance, units, and sound preferences, the status of the introductory tour, the operating system category of the last device used, and the record of your acceptance and your consent. The administrator also reads the reports you send from “Bugs and suggestions,” in order to reply to them.

The ordinary administration panel does not allow anyone to see the password you choose, your workouts, routines, training history, food records, body measurements, physical progress, or profile photo.

Any privileged technical access to the infrastructure must be limited to what is strictly necessary for security, the resolution of justified incidents, or compliance with legal obligations, under guarantees of confidentiality and access control.

## 7. Profile photo

Adding a photo is voluntary. Its purpose is to personalize your profile, and it is uploaded to the cloud only after you authorize it. It is not shown to other users or in the ordinary administration panel. StrataFit does not use it for advertising, facial recognition, biometric identification, public distribution, or training artificial intelligence systems.

You can remove it at any time from “Profile.” Removing it ends the processing associated with that photo, without prejudice to any residual retention periods that may apply.

## 8. Food search and barcode scanner

We use Open Food Facts, an external database of food products whose database is distributed under the ODbL license, to look up nutritional information. The attribution and the terms of reuse of the information are explained in the Legal notice; using this service also involves the technical processing associated with the query. When you search, the text you enter or the barcode you scan is transmitted, along with the technical information inherent in the connection.

StrataFit does not send Open Food Facts your credentials, body measurements, training history, or personal food records. The camera images used to scan barcodes are processed locally and are not transmitted to that provider.

Using the camera requires your permission, and you can revoke it from your device or browser settings. Avoid entering personal information in the product search.

## 9. Information security

StrataFit uses protection mechanisms aimed at ensuring the confidentiality, integrity, and availability of information, including authentication through Firebase Authentication, HTTPS communications, cryptographic protection of credentials, encryption at rest in the services that support it, per-account access rules, and abuse prevention mechanisms.

No technology system guarantees absolute security. Use a strong, unique password, avoid sharing your credentials, and sign out when you use a shared device. If you detect possible unauthorized access, contact StrataFit.

## 10. Protection against automated access

StrataFit uses Firebase App Check and Google’s reCAPTCHA Enterprise to protect the services that support them against abusive requests or requests from unauthorized clients. This system usually works invisibly and may process technical information about the device, browser, connection, and requests to assess security risks.

Google processes that information on behalf of StrataFit, as a data processor, and only to provide and protect this service.

## 11. Advertising, cookies, and local storage

StrataFit does not show third-party advertising, does not use its own advertising tracking systems or behavioral analytics tools such as Google Analytics, and does not build commercial profiles based on your activity.

The application uses local storage technologies, session identifiers, and other mechanisms needed for its operation, authentication, security, and preferences. External security services, such as reCAPTCHA, may use technical cookies and process browser and connection information.

The internal statistics about operating systems have a technical purpose and are not used for commercial tracking. If nonessential technologies that require consent are added, consent will be requested before they are activated.

## 12. Technology providers and recipients

- **Firebase (Google):** authentication, storage, syncing, and infrastructure protection. [Privacy and security in Firebase](https://firebase.google.com/support/privacy).
- **Google reCAPTCHA Enterprise:** risk assessment and abuse prevention, as a data processor.
- **GitHub Pages:** hosting and distribution of the web application. It may log technical connection information, such as the IP address, for operational and security reasons. [GitHub privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- **Open Food Facts:** food and barcode lookups. [Open Food Facts official site](https://world.openfoodfacts.org/).

The information shared with these providers is limited to the purposes described. Providers acting as processors will process the data in accordance with the applicable contractual terms and safeguards; when they act as independent controllers, their own processing is governed by their respective policies.

We may also disclose information when there is a legal obligation or a valid request from a competent authority.

## 13. International data transfers

Although the main database is configured in Spain, certain technology services may process information outside the EEA. Firebase Authentication uses infrastructure located in the United States, and the database region does not by itself determine the location of all other processing.

Any international transfers will be carried out in accordance with the safeguards of the GDPR. Google LLC, the provider of Firebase and reCAPTCHA Enterprise, states that it adheres to the EU-U.S. Data Privacy Framework, recognized by the European Commission’s adequacy decision of July 10, 2023, and its data processing terms also incorporate the standard contractual clauses approved by the European Commission. GitHub states in its privacy statement that it applies standard contractual clauses to international data transfers. Open Food Facts is an association based in France.

You can request additional information and access to the applicable safeguards through the privacy contact.

## 14. Diagnostics and backups

Diagnostic reports and backups generated as files are not sent to the administrator automatically. They leave the device only when you decide to export or send them using the available options. The cloud backup is kept in your own account, alongside the rest of your records, and only your account can read it.

Before sharing a file, review its contents: it may include technical information or private records. Keep backups in a safe place and control who can access them. Backups you have exported are outside StrataFit’s direct control.

## 15. Data retention

The records associated with the account are kept for as long as they are needed to provide the requested features, without prejudice to your right to erasure and to applicable legal obligations. Optional data will be kept for as long as its purpose and the corresponding legal basis remain.

After deletion, there may be limited residual retention periods for justified reasons of security, backup copies, or legal obligations. Providers’ technical logs may have their own retention periods.

Specifically:

- **Account and records:** for as long as the account is active. If two years pass without activity, the account and all its data are deleted automatically. Opening the application while connected to the internet and signed in counts as activity.
- **Deleting data, withdrawing consent, and deleting the account:** these are carried out immediately. Anything that might remain (for example, data that another device uploads before it finds out) is removed in an automatic monthly cleanup.
- **“Bugs and suggestions” reports and the record of acceptance and consent:** for as long as the account exists; they are deleted with it.
- **Temporary passwords:** the administrator can see them for 24 hours; once expired, they are deleted in the next cleanup.
- **Providers:** according to its documentation, Firebase may take up to 180 days to remove a deleted account’s authentication data from its systems, including its backups, and it keeps the IP addresses it logs for a few weeks.

## 16. Controlling and deleting information

**Sign out.** Removes the session and the account’s private local data from the current device. Synced records remain in the cloud so that you can recover them when you sign in again.

**Delete all data.** Removes your records from both the device and synced storage, along with the profile photo, the sex indicated, and the cloud backup. It does not delete the sign-in account: your username and password, the application preferences, the record of acceptance and consent, and the reports you have sent are kept. Before you confirm, the application tells you the scope of the deletion. If you want to keep your records, make a backup first.

**Withdraw consent.** From “Privacy,” you can withdraw your consent to the processing of your health data. Because StrataFit cannot work without that data, withdrawing it deletes your records just as “Delete all data” does, and the application stops processing them; your account is kept and, if you want to use it again, we will ask for your consent again.

**Delete your account.** You can delete it yourself from Settings → Account → Delete account, or from “Privacy.” After asking for your password and your confirmation, all your data in the cloud (records, backup, photo, profile, record of acceptance and consent, and reports sent), the sign-in account, and the data stored on that device are deleted. This cannot be undone. Backups you have exported must be deleted manually from wherever you saved them.

## 17. Your rights

Under the GDPR, you can exercise the rights of access, rectification, erasure, restriction, portability, and objection, where applicable; withdraw consent; and not be subject to solely automated decisions that produce legal effects or similarly significant effects, as provided by law.

You can exercise many of them directly in the application: view and correct your records, get a copy in a reusable format (“Backup” and “Export data (CSV)”), delete your data, withdraw consent, or delete your account. For anything else, write to us through the [privacy contact](#contact). Because the report is sent from your account, we normally need no further information to check that you are its holder; if it were needed, we would ask only for what is essential. Requests will generally be handled within one month, which may be extended in the cases provided for by the GDPR after notifying you.

If you believe your rights have not been respected, you can lodge a complaint with the [Spanish Data Protection Agency (AEPD)](https://www.aepd.es/).

## 18. Privacy of minors

StrataFit is intended for people aged 16 or older: creating an account or using the application below that age is not allowed, and when you sign up you declare that you meet it. We do not collect your date of birth or check your age against documents. If we learn that an account belongs to a person under 16, we will delete it along with its data; if you believe that is the case, let us know through the privacy contact.

Information about minors will be processed in accordance with applicable law. When the involvement or authorization of their legal representatives is required, it must be obtained before the corresponding data is processed.

## 19. Changes to this policy

This policy may be updated to reflect new features, technological changes, security improvements, changes in the law, or changes in processing practices. When significant changes occur, we will inform users through the channels available in the application and will request new consents when necessary.

The current version will be available in the “Privacy” section of StrataFit. You can also read the [Legal notice](#terms) to learn about the general terms of use of the application.

## 20. Our commitment

StrataFit is committed to handling your information responsibly, transparently, and with respect for your privacy. Your training, eating, and physical progress data is there to help you reach your personal goals, not to become a commercial product.

**Your effort belongs to you. So does your progress.**

StrataFit — Training, nutrition, and personal progress.
`,
  cards: `
Sign-up with only the essentials|No need to provide your real name, email address, or phone number.
Protected information|Your records are tied to your account through authentication and security mechanisms.
Storage and syncing|Database configured in Madrid, with syncing between devices. Other services may operate outside Spain.
No advertising or commercial tracking|We do not sell your data or use it to personalize ads.
Private scanner|The images used to scan food are processed on your device.
You are in control|Manage, export, or delete your information and exercise your privacy rights.
`
});
