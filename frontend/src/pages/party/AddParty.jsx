import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, FormField, Input, Select } from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import { LEVEL_LABELS, LEVEL_ORDER, LEVEL_PARENTS, levelLabel } from './levels.js'

const EMPTY_FORM = {
    title: '',
    level: 'district',
    parent_id: '',
}

function AddParty() {
    const navigate = useNavigate()
    const [flat, setFlat] = useState([])
    const [form, setForm] = useState(EMPTY_FORM)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

    useEffect(() => {
        apiFetch('/admin/party')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) setFlat(data.flat)
            })
            .catch(() => setError('Could not load the party tree.'))
    }, [])

    const allowedParents = LEVEL_PARENTS[form.level] || []
    const parentOptions = flat
        .filter((node) => allowedParents.includes(node.level))
        .map((node) => ({
            value: String(node.id),
            label: node.title,
        }))
    const isTopLevel = allowedParents.length === 0

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title.trim()) {
            setError('Title is required.')
            return
        }
        if (!isTopLevel && !form.parent_id) {
            setError(`Choose a parent ${allowedParents.map(levelLabel).join(' or ')} for this ${levelLabel(form.level)}.`)
            return
        }

        setSaving(true)
        setError('')
        setMessage('')
        try {
            const response = await apiFetch('/admin/party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    parent_id: form.parent_id ? Number(form.parent_id) : null,
                }),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to add tree node.')
                return
            }
            setMessage(`"${data.node.title}" was added as ${levelLabel(form.level)}.`)
            setForm(EMPTY_FORM)
        } catch {
            setError('Could not reach the backend. Make sure it is running.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card
            title="Add Party Details"
            subtitle="Add a tree node. Its name will appear in the party tree - member slots follow the posting plan for the chosen level"
        >
            {message && (
                <p className="demo__subtitle" role="status">
                    {message}
                </p>
            )}
            {error && (
                <p className="demo__subtitle" role="alert">
                    {error}
                </p>
            )}

            <form onSubmit={handleSubmit} noValidate>
                <FormField label="Level" required>
                    <Select
                        options={LEVEL_ORDER.map((level) => ({
                            value: level,
                            label: LEVEL_LABELS[level],
                        }))}
                        value={form.level}
                        onChange={set('level')}
                    />
                </FormField>
                <div className="demo__gap" />
                <FormField
                    label="Title"
                    required
                    hint={isTopLevel ? 'This becomes the top district node' : `Parent should be: ${allowedParents.map(levelLabel).join(', ')}`}
                >
                    <Input
                        value={form.title}
                        onChange={set('title')}
                        placeholder={isTopLevel ? 'e.g. Madurai North District' : `e.g. ${LEVEL_LABELS[form.level]} name`}
                    />
                </FormField>
                <div className="demo__gap" />
                <FormField
                    label="Parent node"
                    hint={isTopLevel ? 'Top level node - no parent needed.' : 'Select the node this belongs to'}
                >
                    <Select
                        options={parentOptions}
                        placeholder={isTopLevel ? '— No parent —' : 'Choose a parent...'}
                        value={form.parent_id}
                        onChange={set('parent_id')}
                    />
                </FormField>
                <div className="demo__gap" />
                <div className="demo__actions">
                    <Button type="submit" loading={saving}>
                        Add to party tree
                    </Button>
                    <Button variant="ghost" onClick={() => navigate('/admin/party-tree')}>
                        View party tree
                    </Button>
                </div>
            </form>
        </Card>
    )
}

export default AddParty