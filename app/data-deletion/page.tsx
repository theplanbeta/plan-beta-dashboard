export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Data Deletion Instructions</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <p className="text-sm text-gray-500 mb-4">Last Updated: October 2025</p>
            <p>
              At Plan Beta, we respect your right to privacy and control over your personal data.
              This page provides instructions on how to request deletion of your data from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">What Data We Collect</h2>
            <p className="mb-3">
              When you interact with Plan Beta through our website, Instagram, or enrollment process,
              we may collect and store:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Personal information (name, email, phone number)</li>
              <li>Instagram username and profile information</li>
              <li>Instagram comments and direct messages sent to our business account</li>
              <li>Course enrollment information and language level preferences</li>
              <li>Payment transaction records</li>
              <li>Communication history with our team</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">How to Request Data Deletion</h2>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
              <p className="font-semibold text-blue-900 mb-2">Quick Request Methods:</p>
              <ul className="space-y-2 text-blue-800">
                <li>📧 <strong>Email:</strong> bosdeepak@gmail.com</li>
                <li>💬 <strong>Instagram:</strong> Send us a DM on Instagram</li>
              </ul>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-3">Method 1: Email Request</h3>
            <p className="mb-3">Send an email to <strong>bosdeepak@gmail.com</strong> with the following information:</p>
            <div className="bg-gray-50 p-4 rounded border mb-4">
              <p className="font-mono text-sm">
                Subject: Data Deletion Request<br/><br/>

                Body:<br/>
                - Full Name: [Your name]<br/>
                - Email Address: [Email used for registration]<br/>
                - Instagram Username: [If applicable]<br/>
                - Phone Number: [If provided]<br/>
                - Reason for deletion: [Optional]<br/>
              </p>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-6">Method 2: Instagram Direct Message</h3>
            <p className="mb-3">
              Send us a direct message on Instagram with your data deletion request. Include:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your full name</li>
              <li>Email address associated with your account</li>
              <li>Explicit request to delete your data</li>
            </ul>

            <h3 className="text-lg font-semibold text-gray-800 mb-3 mt-6">Method 3: Facebook App Data Deletion</h3>
            <p className="mb-3">
              If you've connected via our Facebook/Instagram app:
            </p>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Go to your Facebook Settings & Privacy</li>
              <li>Click "Settings"</li>
              <li>Click "Apps and Websites"</li>
              <li>Find "Plan Beta Dashboard"</li>
              <li>Click "Remove" to revoke access and request deletion</li>
            </ol>
            <p className="mt-3">
              Alternatively, you can visit this URL to manage app permissions:
              <a
                href="https://www.facebook.com/settings?tab=applications"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline ml-1"
              >
                Facebook Apps Settings
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">What Happens After Your Request</h2>

            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-3">
                  <span className="text-blue-600 font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Verification (Within 24 hours)</h4>
                  <p className="text-gray-700">
                    We'll verify your identity to ensure the security of your data. You may be asked
                    to confirm additional details.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-3">
                  <span className="text-blue-600 font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Processing (7-14 days)</h4>
                  <p className="text-gray-700">
                    We'll process your deletion request and remove your data from our active systems.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-3">
                  <span className="text-blue-600 font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Confirmation (Within 30 days)</h4>
                  <p className="text-gray-700">
                    You'll receive confirmation via email once your data has been deleted.
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 bg-blue-100 rounded-full p-2 mr-3">
                  <span className="text-blue-600 font-bold">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Backup Removal (30-90 days)</h4>
                  <p className="text-gray-700">
                    Your data will be removed from backup systems within 90 days.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">What Gets Deleted</h2>
            <p className="mb-3">When you request data deletion, we will remove:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your personal contact information (name, email, phone)</li>
              <li>Your Instagram username and conversation history</li>
              <li>Your course enrollment preferences and notes</li>
              <li>Your lead and student records</li>
              <li>Any stored messages or comments from Instagram</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Data We May Retain</h2>
            <p className="mb-3">
              In certain cases, we may retain some information as required by law or for legitimate business purposes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Financial Records:</strong> Payment transaction records may be retained for up to 7 years
                for tax and accounting compliance
              </li>
              <li>
                <strong>Legal Obligations:</strong> Data required to comply with legal obligations, resolve disputes,
                or enforce our agreements
              </li>
              <li>
                <strong>Aggregated Data:</strong> Anonymized, aggregated data that cannot identify you personally
                may be retained for analytics
              </li>
              <li>
                <strong>Backup Systems:</strong> Data may persist in backup systems for up to 90 days before
                permanent deletion
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Important Notes</h2>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
              <p className="font-semibold text-yellow-900 mb-2">⚠️ Account Consequences</p>
              <p className="text-yellow-800">
                Deleting your data will permanently remove your account and all associated information.
                This action cannot be undone. If you wish to use our services again in the future,
                you will need to create a new account.
              </p>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <p className="font-semibold text-blue-900 mb-2">ℹ️ Active Enrollment</p>
              <p className="text-blue-800">
                If you have an active course enrollment, we recommend first completing or canceling
                your enrollment before requesting data deletion. You may lose access to course materials
                and certificates.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Alternative: Data Export</h2>
            <p className="mb-3">
              Before deleting your data, you may request a copy of your personal information.
              Contact us at <strong>bosdeepak@gmail.com</strong> with "Data Export Request" in the subject line.
            </p>
            <p>
              We'll provide a machine-readable file containing all your personal data within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Questions or Concerns</h2>
            <p className="mb-3">
              If you have questions about data deletion or our privacy practices:
            </p>
            <ul className="space-y-2">
              <li>📧 Email: <strong>bosdeepak@gmail.com</strong></li>
              <li>📄 Privacy Policy: <a href="/privacy" className="text-blue-600 hover:underline">View our Privacy Policy</a></li>
              <li>📋 Terms of Service: <a href="/terms" className="text-blue-600 hover:underline">View our Terms of Service</a></li>
            </ul>
          </section>

          <section className="border-t pt-6 mt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Your Rights Under GDPR</h2>
            <p className="mb-3">
              If you are located in the European Economic Area (EEA), you have the following rights:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
              <li><strong>Right to Erasure:</strong> Request deletion of your data (this page)</li>
              <li><strong>Right to Restriction:</strong> Request limitation of processing</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Right to Object:</strong> Object to processing of your data</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us using the methods outlined above.
            </p>
          </section>

          <section className="bg-gray-50 p-6 rounded-lg mt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <div className="space-y-2 text-gray-700">
              <p>✉️ <strong>Email us:</strong> bosdeepak@gmail.com with "Data Deletion Request"</p>
              <p>⏱️ <strong>Timeline:</strong> Verified within 24 hours, deleted within 30 days</p>
              <p>🔒 <strong>Permanent:</strong> This action cannot be undone</p>
              <p>📋 <strong>Retained:</strong> Only financial records for legal compliance (up to 7 years)</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
