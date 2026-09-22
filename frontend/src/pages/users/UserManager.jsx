import { useCallback, useEffect, useState } from 'react'
import {
    Badge,
    Button,
    Card,
    FormField,
    Input,
    Modal,
    Select,
    Spinner,
    Table,
} from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'

const EMPTY_FORM = {
    name: '',
    email: '',
    mobile: '',
    posting_name: '',
    is_party_member: false,
}

function initials(name) {
    if (!name) return '?'
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('')
}

function UserAvatar({ user, size = 'md' }) {
    return user.profile_image ? (
        <img
            className={`user-avatar user-avatar--${size}`}
            src={user.profile_image}
            alt={user.name || 'User profile'}
        />
    ) : (
        <span className={`user-avatar user-avatar--${size} user-avatar--fallback`}>
            {initials(user.name)}
        </span>
    )
}

function EditForm({ initial, onSaved, onError }) {
    const [form, setForm] = useState({
        name: initial.name || '',
        email: initial.email || '',
        mobile: initial.mobile || '',
        posting_name: initial.posting_name || '',
        is_party_member: Boolean(initial.is_party_member),
    })
    const [saving, setSaving] = useState(false)

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) {
            onError?.('Name is required.')
            return
        }
        if (!form.email.trim()) {
            onError?.('Email is required.')
            return
        }

        setSaving(true)
        try {
            const response = await apiFetch(`/admin/users/${initial.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await response.json()
            if (!data.success) {
                onError?.(data.message || 'Failed to update user.')
                return
            }
            onSaved?.(data)
        } catch {
            onError?.('Could not reach the backend. Make sure it is running.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <FormField label="Name" required id="user-name">
                <Input id="user-name" value={form.name} onChange={set('name')} placeholder="e.g. Dhileepan" />
            </FormField>
            <div className="demo__gap" />
            <FormField label="Email" required id="user-email">
                <Input id="user-email" type="email" value={form.email} onChange={set('email')} placeholder="user@example.com" />
            </FormField>
            <div className="demo__gap" />
            <FormField label="Mobile" id="user-mobile">
                <Input id="user-mobile" value={form.mobile} onChange={set('mobile')} placeholder="e.g. 9840012345" />
            </FormField>
            <div className="demo__gap" />
            <FormField
                label="Posting name"
                id="user-posting"
                hint="Official posting role shown for party members"
            >
                <Input id="user-posting" value={form.posting_name} onChange={set('posting_name')} placeholder="e.g. District Secretary" />
            </FormField>
            <div className="demo__gap" />
            <FormField label="Member type" id="user-party">
                <Select
                    id="user-party"
                    value={form.is_party_member ? 'party' : 'regular'}
                    options={[
                        { value: 'party', label: 'Party member' },
                        { value: 'regular', label: 'Regular user' },
                    ]}
                    onChange={(e) =>
                        setForm((prev) => ({
                            ...prev,
                            is_party_member: e.target.value === 'party',
                        }))
                    }
                />
            </FormField>
            <div className="demo__gap" />
            <Button type="submit" loading={saving}>
                Update user
            </Button>
        </form>
    )
}

function GrievanceStats({ grievances }) {
    if (!grievances || grievances.total === 0) {
        return <p className="demo__subtitle">No grievances applied yet.</p>
    }

    const rows = [
        { label: 'Approved', count: grievances.approved, percent: grievances.approvedPercent, variant: 'success' },
        { label: 'Pending', count: grievances.pending, percent: grievances.pendingPercent, variant: 'warning' },
        { label: 'Rejected', count: grievances.rejected, percent: grievances.rejectedPercent, variant: 'danger' },
    ]

    return (
        <div className="grievance-stats">
            <p className="grievance-stats__total">
                {grievances.total} grievance(s) applied
            </p>
            {rows.map((row) => (
                <div key={row.label} className="grievance-stat">
                    <div className="grievance-stat__head">
                        <Badge variant={row.variant}>{row.label}</Badge>
                        <span className="grievance-stat__meta">
                            {row.count} · {row.percent}%
                        </span>
                    </div>
                    <div className="grievance-bar" role="progressbar" aria-valuenow={row.percent} aria-valuemin="0" aria-valuemax="100">
                        <span
                            className={`grievance-bar__fill grievance-bar__fill--${row.variant}`}
                            style={{ width: `${row.percent}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

function UserManager({ type = 'all' }) {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [viewTarget, setViewTarget] = useState(null)
    const [editTarget, setEditTarget] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const isParty = type === 'party'

    const reload = useCallback(() => {
        const url = isParty ? '/admin/users?type=party' : '/admin/users'
        apiFetch(url)
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setUsers(data.users)
                    setMessage('')
                } else {
                    setMessage(data.message || 'Failed to fetch users.')
                }
            })
            .catch(() => setMessage('Failed to fetch users.'))
            .finally(() => setLoading(false))
    }, [isParty])

    const fetchOne = async (id) => {
        const response = await apiFetch(`/admin/users/${id}`)
        const data = await response.json()
        if (!data.success) {
            setError(data.message || 'Failed to fetch user detail.')
            setMessage(data.message || 'Failed to fetch user detail.')
            return null
        }
        return data.user
    }

    const openView = async (user) => {
        const full = await fetchOne(user.id)
        if (full) setViewTarget(full)
    }

    const openEdit = async (user) => {
        const full = await fetchOne(user.id)
        if (full) setEditTarget({ ...EMPTY_FORM, ...full })
    }

    useEffect(() => {
        reload()
    }, [reload])

    const handleDelete = async () => {
        if (!deleteTarget) return
        const response = await apiFetch(`/admin/users/${deleteTarget.id}`, {
            method: 'DELETE',
        })
        const data = await response.json()
        if (!data.success) {
            setError(data.message || 'Failed to delete user.')
        }
        setDeleteTarget(null)
        reload()
    }

    const columns = [
        {
            key: 'name',
            label: 'Name',
            render: (user) => (
                <span className="user-name-cell">
                    <UserAvatar user={user} size="sm" />
                    {user.name}
                </span>
            ),
        },
        { key: 'email', label: 'Email' },
        {
            key: 'mobile',
            label: 'Mobile',
            render: (user) => user.mobile || '—',
        },
        {
            key: 'posting_name',
            label: 'Posting Name',
            render: (user) =>
                user.is_party_member ? (
                    user.posting_name ? (
                        <Badge variant="info">{user.posting_name}</Badge>
                    ) : (
                        <Badge>—</Badge>
                    )
                ) : (
                    '—'
                ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (user) => (
                <div className="demo__flex">
                    <Button size="sm" variant="secondary" onClick={() => openView(user)}>
                        View
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(user)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(user)}>
                        Delete
                    </Button>
                </div>
            ),
        },
    ]

    return (
        <Card
            title={isParty ? 'Party Members' : 'All Users'}
            subtitle={`${users.length} member(s) from the database`}
            actions={
                <Button size="sm" variant="secondary" onClick={reload}>
                    Reload
                </Button>
            }
        >
            {message && <p className="demo__subtitle">{message}</p>}

            <Table columns={columns} data={users} loading={loading} rowKey="id" />

            <Modal
                open={Boolean(viewTarget)}
                onClose={() => setViewTarget(null)}
                title="User details"
                size="lg"
            >
                {viewTarget ? (
                    <div className="user-view">
                        <div className="user-view__header">
                            <UserAvatar user={viewTarget} size="lg" />
                            <div className="user-view__head-info">
                                <h3 className="user-view__name">{viewTarget.name}</h3>
                                {viewTarget.posting_name && (
                                    <span className="user-view__posting">{viewTarget.posting_name}</span>
                                )}
                                <div className="user-view__type">
                                    {viewTarget.is_party_member ? (
                                        <Badge variant="info">Party member</Badge>
                                    ) : (
                                        <Badge>Regular user</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="user-view__grid">
                            <div className="user-view__group">
                                <h4 className="user-view__group-title">Contact</h4>
                                <div className="user-view__rows">
                                    <div className="user-view__row">
                                        <span className="user-view__label">Name</span>
                                        <span className="user-view__value">{viewTarget.name}</span>
                                    </div>
                                    <div className="user-view__row">
                                        <span className="user-view__label">Mobile</span>
                                        <span className="user-view__value">{viewTarget.mobile || '—'}</span>
                                    </div>
                                    <div className="user-view__row">
                                        <span className="user-view__label">Email</span>
                                        <span className="user-view__value">{viewTarget.email}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="user-view__group">
                                <h4 className="user-view__group-title">Login info</h4>
                                <div className="user-view__rows">
                                    <div className="user-view__row">
                                        <span className="user-view__label">Device</span>
                                        <span className="user-view__value">
                                            {viewTarget.last_login_device || '—'}
                                        </span>
                                    </div>
                                    <div className="user-view__row">
                                        <span className="user-view__label">Location</span>
                                        <span className="user-view__value">
                                            {viewTarget.last_login_location || '—'}
                                        </span>
                                    </div>
                                    <div className="user-view__row">
                                        <span className="user-view__label">Last login</span>
                                        <span className="user-view__value">
                                            {viewTarget.last_login_at
                                                ? new Date(viewTarget.last_login_at).toLocaleString()
                                                : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="user-view__group">
                            <h4 className="user-view__group-title">Grievances</h4>
                            <GrievanceStats grievances={viewTarget.grievances} />
                        </div>
                    </div>
                ) : error ? (
                    <p className="demo__subtitle" role="alert">
                        {error}
                    </p>
                ) : (
                    <div className="demo__flex">
                        <Spinner size="sm" /> Loading...
                    </div>
                )}
            </Modal>

            <Modal
                open={Boolean(editTarget)}
                onClose={() => {
                    setEditTarget(null)
                    setError('')
                }}
                title="Edit User"
                size="md"
                footer={
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setEditTarget(null)
                            setError('')
                        }}
                    >
                        Cancel
                    </Button>
                }
            >
                {editTarget && (
                    <EditForm
                        initial={editTarget}
                        onError={(err) => setError(err)}
                        onSaved={() => {
                            setEditTarget(null)
                            setError('')
                            reload()
                        }}
                    />
                )}
                {error && (
                    <p className="demo__subtitle" role="alert">
                        {error}
                    </p>
                )}
            </Modal>

            <Modal
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                title="Delete User"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDelete}>
                            Delete
                        </Button>
                    </>
                }
            >
                {deleteTarget && (
                    <p>
                        Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This
                        will also remove their grievances.
                    </p>
                )}
            </Modal>
        </Card>
    )
}

export default UserManager