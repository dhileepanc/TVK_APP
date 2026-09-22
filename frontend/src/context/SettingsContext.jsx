import { useCallback, useEffect, useState } from 'react'
import { SettingsContext } from './settingsContext.js'
import { apiFetch } from '../api.js'
import { APP_NAME, ANDROID_APP_URL, IOS_APP_URL } from '../constants.js'

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({
        appName: APP_NAME,
        androidUrl: ANDROID_APP_URL,
        iosUrl: IOS_APP_URL,
        postings: {},
    })
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(() => {
        apiFetch('/app-settings')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setSettings({
                        appName: data.settings.app_name || APP_NAME,
                        androidUrl: data.settings.android_url || ANDROID_APP_URL,
                        iosUrl: data.settings.ios_url || IOS_APP_URL,
                        postings: data.settings.postings || {},
                    })
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    return (
        <SettingsContext.Provider value={{ settings, loading, refresh }}>
            {children}
        </SettingsContext.Provider>
    )
}