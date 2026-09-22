import { useState } from 'react'
import { Button, Card, FormField, Input, Spinner } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import { useSettings } from '../../context/useSettings.js'
import { POST_TYPES, WING_POST_TYPES } from '../party/levels.js'

const makeId = () => 'post_' + Math.random().toString(36).slice(2, 9)

const POSTING_LEVELS = [
    {
        key: 'district',
        noun: 'district',
        title: 'District postings',
        hint: 'Posting names and member counts for top-level District nodes.',
        defaults: POST_TYPES,
    },
    {
        key: 'wing',
        noun: 'wing',
        title: 'Wing postings',
        hint: 'Posting names and member counts for Wing / District Wing nodes. Same plan applies to every wing.',
        defaults: WING_POST_TYPES,
    },
]

function toRows(saved, defaults) {
    if (Array.isArray(saved) && saved.length > 0) {
        return saved.map((item) => ({
            key: item.id,
            id: item.id,
            name: item.name || item.label,
            count: Number(item.count ?? item.slots) || 1,
        }))
    }
    return defaults.map((item) => ({
        key: item.id,
        id: item.id,
        name: item.label,
        count: item.slots,
    }))
}

function PostingsEditor({ noun, rows, onChange }) {
    const total = rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0)

    const updateRow = (key, patch) =>
        onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)))

    return (
        <div className="settings-postings">
            {rows.length === 0 && (
                <p className="demo__subtitle">No postings added. Add at least one posting.</p>
            )}
            {rows.map((row, index) => (
                <div key={row.key} className="settings-postings__row">
                    <Input
                        value={row.name}
                        onChange={(e) => updateRow(row.key, { name: e.target.value })}
                        placeholder={`Posting name ${index + 1}`}
                    />
                    <Input
                        type="number"
                        min="1"
                        value={row.count}
                        onChange={(e) => updateRow(row.key, { count: e.target.value })}
                        className="settings-postings__count"
                        placeholder="Count"
                    />
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                    >
                        Remove
                    </Button>
                </div>
            ))}
            <div className="demo__gap" />
            <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                    onChange([...rows, { key: makeId(), id: makeId(), name: '', count: 1 }])
                }
            >
                + Add posting
            </Button>
            <p className="demo__subtitle">Total members per {noun}: {total}</p>
        </div>
    )
}

function SettingsForm({ appName, androidUrl, iosUrl, postings, onSaved }) {
    const [name, setName] = useState(appName)
    const [android, setAndroid] = useState(androidUrl)
    const [ios, setIos] = useState(iosUrl)
    const [levelRows, setLevelRows] = useState(() =>
        POSTING_LEVELS.reduce((acc, level) => {
            acc[level.key] = toRows(postings?.[level.key], level.defaults)
            return acc
        }, {})
    )
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const updateRows = (key, rows) =>
        setLevelRows((prev) => ({ ...prev, [key]: rows }))

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!name.trim()) {
            setError('App name is required.')
            return
        }

        const postings = {}
        for (const level of POSTING_LEVELS) {
            postings[level.key] = levelRows[level.key]
                .map((row) => ({
                    id: row.id,
                    name: row.name.trim(),
                    count: Math.max(1, Number(row.count) || 1),
                }))
                .filter((row) => row.name)
        }

        if (POSTING_LEVELS.some((level) => postings[level.key].length === 0)) {
            setError('Add at least one posting in every level plan.')
            return
        }

        setError('')
        setMessage('')
        setSaving(true)

        try {
            const response = await apiFetch('/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_name: name.trim(),
                    android_url: android.trim(),
                    ios_url: ios.trim(),
                    postings,
                }),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to save settings.')
                return
            }
            setMessage('Settings saved.')
            onSaved?.()
        } catch {
            setError('Could not reach the backend. Make sure it is running.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <FormField
                label="App name"
                required
                id="settings-app-name"
                hint="Shown in the site title, footer, and landing page"
            >
                <Input
                    id="settings-app-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Spider Naam Jap"
                />
            </FormField>

            <div className="demo__gap" />
            <FormField
                label="Android app link"
                id="settings-android-url"
                hint="Google Play store URL for the Android app"
            >
                <Input
                    id="settings-android-url"
                    value={android}
                    onChange={(e) => setAndroid(e.target.value)}
                    placeholder="https://play.google.com/store/apps/details?id=..."
                />
            </FormField>

            <div className="demo__gap" />
            <FormField
                label="iOS app link"
                id="settings-ios-url"
                hint="Apple App Store URL for the iOS app"
            >
                <Input
                    id="settings-ios-url"
                    value={ios}
                    onChange={(e) => setIos(e.target.value)}
                    placeholder="https://apps.apple.com/app/id..."
                />
            </FormField>

            {POSTING_LEVELS.map((level) => (
                <div key={level.key}>
                    <div className="demo__gap" />
                    <FormField label={level.title} hint={level.hint}>
                        <PostingsEditor
                            noun={level.noun}
                            rows={levelRows[level.key]}
                            onChange={(rows) => updateRows(level.key, rows)}
                        />
                    </FormField>
                </div>
            ))}

            {error && (
                <p className="demo__subtitle" role="alert">
                    {error}
                </p>
            )}
            {message && <p className="demo__subtitle">{message}</p>}

            <div className="demo__gap" />
            <Button type="submit" loading={saving}>
                Save settings
            </Button>
        </form>
    )
}

function Settings() {
    const { settings, loading, refresh } = useSettings()

    return (
        <Card title="Settings" subtitle="App name, app store links, and member posting plans">
            {loading ? (
                <div className="demo__flex">
                    <Spinner size="sm" /> Loading settings...
                </div>
            ) : (
                <SettingsForm
                    appName={settings.appName}
                    androidUrl={settings.androidUrl}
                    iosUrl={settings.iosUrl}
                    postings={settings.postings}
                    onSaved={refresh}
                />
            )}
        </Card>
    )
}

export default Settings