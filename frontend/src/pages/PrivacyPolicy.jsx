import LegalPage from './LegalPage.jsx'
import { useSettings } from '../context/useSettings.js'

function PrivacyPolicy() {
    const { settings } = useSettings()

    return (
        <LegalPage title="Privacy Policy" updated="January 15, 2026">
            <section>
                <h2>1. Information we collect</h2>
                <p>
                    {settings.appName} collects the information you provide directly, such as your
                    name and email address, along with activity data like your chanting counts and
                    session history.
                </p>
            </section>
            <section>
                <h2>2. How we use your information</h2>
                <p>
                    We use your information to operate and improve the app, track your japa progress,
                    and provide customer support. We never sell your personal data.
                </p>
            </section>
            <section>
                <h2>3. Data storage</h2>
                <p>
                    Your data is stored securely on our servers and is only accessible to authorised
                    administrators. We keep it only as long as necessary to provide our services.
                </p>
            </section>
            <section>
                <h2>4. Your rights</h2>
                <p>
                    You may request access to, correction of, or deletion of your personal data at any
                    time by contacting our support team.
                </p>
            </section>
            <section>
                <h2>5. Contact</h2>
                <p>
                    For privacy questions, email us at{' '}
                    <a href="mailto:support@naamjap.com">support@naamjap.com</a>.
                </p>
            </section>
        </LegalPage>
    )
}

export default PrivacyPolicy