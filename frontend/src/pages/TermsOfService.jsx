import LegalPage from './LegalPage.jsx'
import { useSettings } from '../context/useSettings.js'

function TermsOfService() {
    const { settings } = useSettings()

    return (
        <LegalPage title="Terms of Service" updated="January 15, 2026">
            <section>
                <h2>1. Acceptance of terms</h2>
                <p>
                    By using {settings.appName}, you agree to these Terms of Service. If you do not
                    agree, please do not use the app.
                </p>
            </section>
            <section>
                <h2>2. Use of the service</h2>
                <p>
                    You agree to use the app only for lawful purposes and in a way that does not
                    infringe the rights of others or restrict their use of the service.
                </p>
            </section>
            <section>
                <h2>3. Limitation of liability</h2>
                <p>
                    The app is provided &quot;as is&quot; without warranties of any kind. We are not
                    liable for any indirect or consequential damages arising from its use.
                </p>
            </section>
            <section>
                <h2>4. Changes to terms</h2>
                <p>
                    We may update these terms from time to time. Continued use of the app after changes
                    are posted means you accept the revised terms.
                </p>
            </section>
        </LegalPage>
    )
}

export default TermsOfService