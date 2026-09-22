import { useEffect } from 'react'
import { useSettings } from './context/useSettings.js'

export function usePageTitle(title) {
    const { settings } = useSettings()

    useEffect(() => {
        document.title = title ? `${title} | ${settings.appName}` : settings.appName
    }, [title, settings.appName])
}