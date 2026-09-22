import { Button, Footer } from '../components/ui/index.js'
import { usePageTitle } from '../usePageTitle.js'
import { useSettings } from '../context/useSettings.js'
import './Landing.css'

function Landing() {
  const { settings } = useSettings()
  usePageTitle()

  return (
    <div className="landing">
      <main className="landing__main">
        <div className="landing__hero">
          <h1 className="landing__title">{settings.appName}</h1>
          <p className="landing__tagline">Chant. Count. Connect.</p>
          <div className="landing__stores">
            <Button href={settings.androidUrl} size="lg">
              Get it on Google Play
            </Button>
            <Button href={settings.iosUrl} size="lg" variant="secondary">
              Download on the App Store
            </Button>
          </div>
        </div>
      </main>

      <Footer
        brand={settings.appName}
        text="Chanting made simple"
        links={[
          { label: 'Privacy', to: '/privacy' },
          { label: 'Terms', to: '/terms' },
          { label: 'Support', href: '#support' },
        ]}
      />
    </div>
  )
}

export default Landing