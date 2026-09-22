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
} from '../../components/ui/index.js'
import { apiFetch } from '../../api.js'
import { useSettings } from '../../context/useSettings.js'
import {
    LEVEL_LABELS,
    LEVEL_ORDER,
    LEVEL_PARENTS,
    levelLabel,
    postTypesForLevel,
} from './levels.js'

const LEVEL_BADGE_VARIANT = {
    district: 'success',
    'district-wing': 'info',
    union: 'success',
    'city-panchayat': 'warning',
    panchayat: 'info',
    ward: 'warning',
    wing: 'info',
}

function levelVariant(level) {
    return LEVEL_BADGE_VARIANT[level] || 'default'
}

function TreeNode({ node, depth, onSelect, expandedSet, onToggle, postings }) {
    const hasChildren = node.children && node.children.length > 0
    const isOpen = expandedSet.has(node.id)
    const memberSlots = postTypesForLevel(node.level, postings).reduce(
        (sum, post) => sum + post.slots,
        0
    )

    return (
        <div className="party-tree__branch">
            <div className="party-tree__row" style={{ paddingLeft: `${depth * 18}px` }}>
                <button
                    type="button"
                    className="party-tree__toggle"
                    onClick={() => hasChildren && onToggle(node.id)}
                    disabled={!hasChildren}
                    aria-label={hasChildren ? (isOpen ? 'Collapse' : 'Expand') : 'No children'}
                >
                    {hasChildren ? (isOpen ? '▾' : '▸') : '·'}
                </button>
                <button
                    type="button"
                    className="party-tree__node"
                    onClick={() => onSelect(node)}
                >
                    <span className="party-tree__title">{node.title}</span>
                    <Badge variant={levelVariant(node.level)}>{levelLabel(node.level)}</Badge>
                    <Badge variant="default">
                        Members: {node.member_count || 0}/{memberSlots}
                    </Badge>
                    {hasChildren ? <Badge variant="default">{node.children.length}</Badge> : null}
                </button>
            </div>
            {isOpen &&
                node.children?.map((child) => (
                    <TreeNode
                        key={child.id}
                        node={child}
                        depth={depth + 1}
                        onSelect={onSelect}
                        expandedSet={expandedSet}
                        onToggle={onToggle}
                        postings={postings}
                    />
                ))}
        </div>
    )
}

function MemberPhoto({ src, name }) {
    if (!src) return <span className="member-photo member-photo--fallback">{(name || '?').charAt(0).toUpperCase()}</span>
    return <img className="member-photo" src={src} alt={name || 'Member'} />
}

function MemberRow({ member, onEdit, onDelete }) {
    return (
        <li className="member-row">
            <MemberPhoto src={member.photo} name={member.name} />
            <div className="member-row__body">
                <strong className="member-row__name">{member.name}</strong>
                {member.mobile && <span className="member-row__meta">Mobile: {member.mobile}</span>}
                {member.email && <span className="member-row__meta">Email: {member.email}</span>}
                {member.voter_id_number && <span className="member-row__meta">Voter ID: {member.voter_id_number}</span>}
                {member.aadhar_number && <span className="member-row__meta">Aadhaar: ••••{String(member.aadhar_number).slice(-4)}</span>}
                {member.address && <span className="member-row__meta">Address: {member.address}</span>}
                <div className="member-row__actions">
                    <Button size="sm" variant="secondary" onClick={() => onEdit(member)}>
                        Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => onDelete(member)}>
                        Delete
                    </Button>
                </div>
            </div>
        </li>
    )
}

function PartyTree() {
    const { settings } = useSettings()
    const [tree, setTree] = useState([])
    const [flat, setFlat] = useState([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [expandedSet, setExpandedSet] = useState(new Set())
    const [detail, setDetail] = useState(null)
    const [members, setMembers] = useState(null)
    const [memberForm, setMemberForm] = useState(null)
    const [deleteMember, setDeleteMember] = useState(null)
    const [editTarget, setEditTarget] = useState(null)
    const [importOpen, setImportOpen] = useState(false)
    const [importing, setImporting] = useState(false)
    const [file, setFile] = useState(null)
    const [importNodeId, setImportNodeId] = useState('')
    const [importResult, setImportResult] = useState('')

    const reload = useCallback(() => {
        apiFetch('/admin/party')
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setTree(data.tree)
                    setFlat(data.flat)
                    setMessage('')
                } else {
                    setMessage(data.message || 'Failed to fetch party tree.')
                }
            })
            .catch(() => setMessage('Failed to fetch party tree.'))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        reload()
    }, [reload])

    const openDetail = async (node) => {
        try {
            const response = await apiFetch(`/admin/party/${node.id}`)
            const data = await response.json()
            if (data.success) {
                setDetail(data.node)
                setMembers(data.members)
                setExpandedSet((prev) => new Set(prev).add(node.id))
            } else {
                setMessage(data.message || 'Failed to fetch node detail.')
            }
        } catch {
            setMessage('Failed to fetch node detail.')
        }
    }

    const refreshDetail = async (nodeId) => {
        try {
            const response = await apiFetch(`/admin/party/${nodeId}`)
            const data = await response.json()
            if (data.success) {
                setDetail(data.node)
                setMembers(data.members)
            }
        } catch {
            setMessage('Failed to refresh node detail.')
        }
    }

    const openAdd = (post) => {
        setMemberForm({ mode: 'add', postType: post || '' })
    }

    const openEdit = (member) => {
        setMemberForm({ mode: 'edit', postType: member.post_type, member })
    }

    const afterMemberSaved = () => {
        setMemberForm(null)
        if (detail) refreshDetail(detail.id)
        reload()
    }

    const handleDeleteMember = async () => {
        if (!deleteMember) return
        try {
            const response = await apiFetch(`/admin/party/members/${deleteMember.id}`, {
                method: 'DELETE',
            })
            const data = await response.json()
            if (!data.success) setMessage(data.message || 'Failed to remove member.')
            setDeleteMember(null)
            if (detail) refreshDetail(detail.id)
            reload()
        } catch {
            setMessage('Failed to remove member.')
        }
    }

    const openEditNode = (node) => {
        setEditTarget({
            title: node.title,
            level: node.level || '',
            parent_id: node.parent_id ? String(node.parent_id) : '',
        })
    }

    const handleDeleteNode = async () => {
        if (!detail) return
        try {
            const response = await apiFetch(`/admin/party/${detail.id}`, { method: 'DELETE' })
            const data = await response.json()
            if (!data.success) setMessage(data.message || 'Failed to delete node.')
            setDetail(null)
            reload()
        } catch {
            setMessage('Failed to delete node.')
        }
    }

    const handleImport = async () => {
        if (!file) {
            setImportResult('Please choose an Excel file first.')
            return
        }
        if (!importNodeId) {
            setImportResult('Select the tree node to import members into.')
            return
        }
        setImporting(true)
        setImportResult('')
        const body = new FormData()
        body.append('file', file)
        body.append('node_id', importNodeId)
        try {
            const response = await apiFetch('/admin/party/import', {
                method: 'POST',
                body,
            })
            const data = await response.json()
            if (!data.success) {
                setImportResult(data.message || 'Import failed.')
            } else {
                setImportResult(data.message || 'Import finished.')
                setFile(null)
                if (detail) refreshDetail(detail.id)
            }
        } catch {
            setImportResult('Could not reach the backend. Make sure it is running.')
        } finally {
            setImporting(false)
        }
    }

    const nodeOptions = flat.map((node) => ({
        value: String(node.id),
        label: `${node.title} (${levelLabel(node.level)})`,
    }))

    const levelPosts = postTypesForLevel(detail?.level, settings.postings)
    const levelTotalSlots = levelPosts.reduce((sum, post) => sum + post.slots, 0)

    return (
        <Card
            title="Party Tree"
            subtitle="Structure of the party - click any node to view or add its members"
            actions={
                <>
                    <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
                        Upload Excel
                    </Button>
                    <Button size="sm" variant="secondary" onClick={reload}>
                        Reload
                    </Button>
                </>
            }
        >
            {message && (
                <p className="demo__subtitle" role="alert">
                    {message}
                </p>
            )}

            {loading ? (
                <div className="demo__flex">
                    <Spinner size="sm" /> Loading party tree...
                </div>
            ) : tree.length === 0 ? (
                <p className="demo__subtitle">
                    No party nodes yet. Add party details to build the tree.
                </p>
            ) : (
                <div className="party-tree">
                    {tree.map((node) => (
                        <TreeNode
                            key={node.id}
                            node={node}
                            depth={0}
                            onSelect={openDetail}
                            expandedSet={expandedSet}
                            onToggle={(id) =>
                                setExpandedSet((prev) => {
                                    const next = new Set(prev)
                                    if (next.has(id)) next.delete(id)
                                    else next.add(id)
                                    return next
                                })
                            }
                            postings={settings.postings}
                        />
                    ))}
                </div>
            )}

            <Modal
                open={Boolean(detail)}
                onClose={() => setDetail(null)}
                title={detail?.title || 'Party detail'}
                size="lg"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDetail(null)}>
                            Close
                        </Button>
                        <Button variant="secondary" onClick={() => openEditNode(detail)}>
                            Edit
                        </Button>
                        <Button variant="danger" onClick={handleDeleteNode}>
                            Delete
                        </Button>
                    </>
                }
            >
                {detail && (
                    <div className="party-detail">
                        <div className="party-detail__head">
                            <div className="party-detail__head-title">{detail.title}</div>
                            <Badge variant={levelVariant(detail.level)}>{levelLabel(detail.level)}</Badge>
                        </div>

                        {detail.children?.length > 0 && (
                            <div className="party-detail__group">
                                <h4 className="party-detail__group-title">Sub nodes</h4>
                                <div className="party-detail__chips">
                                    {detail.children.map((child) => (
                                        <button
                                            key={child.id}
                                            type="button"
                                            className="party-detail__chip"
                                            onClick={() => openDetail(child)}
                                        >
                                            {child.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="party-detail__group">
                            <div className="party-detail__group-head">
                                <h4 className="party-detail__group-title">
                                    Members ({members?.total || 0}/{members?.totalSlots || levelTotalSlots})
                                </h4>
                                <Button size="sm" variant="secondary" onClick={() => openAdd('')}>
                                    + Add member
                                </Button>
                            </div>

                            <div className="member-posts">
                                {(members?.groups || []).map((group) => (
                                    <div key={group.post_type} className="member-post">
                                        <div className="member-post__head">
                                            <strong>{group.label}</strong>
                                            <Badge
                                                variant={group.filled ? 'success' : 'default'}
                                            >
                                                {group.count}/{group.slots}
                                            </Badge>
                                            {!group.filled && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => openAdd(group.post_type)}
                                                >
                                                    + {group.slots - group.count} left
                                                </Button>
                                            )}
                                        </div>
                                        {group.members.length === 0 ? (
                                            <p className="member-post__empty">No member added yet.</p>
                                        ) : (
                                            <ul className="member-post__list">
                                                {group.members.map((member) => (
                                                    <MemberRow
                                                        key={member.id}
                                                        member={member}
                                                        onEdit={openEdit}
                                                        onDelete={setDeleteMember}
                                                    />
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {memberForm && (
                <MemberForm
                    nodeId={detail?.id}
                    postings={levelPosts}
                    initialPostType={memberForm.postType}
                    member={memberForm.mode === 'edit' ? memberForm.member : null}
                    onClose={() => setMemberForm(null)}
                    onSaved={afterMemberSaved}
                />
            )}

            <Modal
                open={Boolean(editTarget)}
                onClose={() => setEditTarget(null)}
                title="Edit Tree Node"
                size="md"
                footer={
                    <Button variant="ghost" onClick={() => setEditTarget(null)}>
                        Cancel
                    </Button>
                }
            >
                {editTarget && (
                    <NodeEditForm
                        initial={editTarget}
                        id={detail?.id}
                        flat={flat}
                        onSaved={() => {
                            setEditTarget(null)
                            setDetail(null)
                            reload()
                        }}
                    />
                )}
            </Modal>

            <Modal
                open={Boolean(deleteMember)}
                onClose={() => setDeleteMember(null)}
                title="Remove Member"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteMember(null)}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleDeleteMember}>
                            Remove
                        </Button>
                    </>
                }
            >
                {deleteMember && (
                    <p>
                        Remove <strong>{deleteMember.name}</strong> from {detail?.title}?
                    </p>
                )}
            </Modal>

            <Modal
                open={importOpen}
                onClose={() => setImportOpen(false)}
                title="Upload Excel to add members"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setImportOpen(false)}>
                            Cancel
                        </Button>
                        <Button loading={importing} onClick={handleImport}>
                            Import members
                        </Button>
                    </>
                }
            >
                <p className="demo__subtitle">
                    Choose the tree node, then upload a .xlsx / .xls file. Expected columns:{' '}
                    <strong>Name</strong>, <strong>Post</strong> (matches the node's posting
                    plan), <strong>Email</strong>, <strong>Mobile</strong>, <strong>Address</strong>,{' '}
                    <strong>Voter ID</strong>, <strong>Aadhar</strong>, <strong>Photo</strong>.
                    Rows that do not fit the node's member plan are skipped.
                </p>
                <div className="demo__gap" />
                <FormField label="Tree node" required>
                    <Select
                        options={nodeOptions}
                        placeholder="Choose a tree node..."
                        value={importNodeId}
                        onChange={(e) => setImportNodeId(e.target.value)}
                    />
                </FormField>
                <div className="demo__gap" />
                <FormField label="Excel file" required>
                    <Input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                </FormField>
                {importResult && (
                    <p className="demo__subtitle" role="status">
                        {importResult}
                    </p>
                )}
            </Modal>
        </Card>
    )
}

function MemberForm({ nodeId, postings, initialPostType, member, onClose, onSaved }) {
    const [form, setForm] = useState({
        post_type: member?.post_type || initialPostType || '',
        name: member?.name || '',
        email: member?.email || '',
        mobile: member?.mobile || '',
        address: member?.address || '',
        voter_id_number: member?.voter_id_number || '',
        aadhar_number: member?.aadhar_number || '',
        photo: member?.photo || '',
    })
    const [photoName, setPhotoName] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const readPhoto = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPhotoName(file.name)
        const reader = new FileReader()
        reader.onload = () => setForm((prev) => ({ ...prev, photo: reader.result }))
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.name.trim()) {
            setError('Name is required.')
            return
        }
        if (!form.post_type) {
            setError('Choose a post.')
            return
        }
        setSaving(true)
        setError('')
        try {
            const url = member
                ? `/admin/party/members/${member.id}`
                : `/admin/party/${nodeId}/members`
            const response = await apiFetch(url, {
                method: member ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to save member.')
                return
            }
            onSaved?.()
        } catch {
            setError('Could not reach the backend.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={member ? 'Edit Member' : 'Add Member'}
            size="lg"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit" form="member-form" loading={saving}>
                        {member ? 'Save changes' : 'Add member'}
                    </Button>
                </>
            }
        >
            <form id="member-form" onSubmit={handleSubmit} noValidate>
                <FormField label="Post" required>
                    <Select
                        options={[
                            ...postings.map((post) => ({ value: post.id, label: post.label })),
                            ...(member?.post_type &&
                            !postings.some((post) => post.id === member.post_type)
                                ? [{ value: member.post_type, label: member.post_type }]
                                : []),
                        ]}
                        value={form.post_type}
                        onChange={set('post_type')}
                    />
                </FormField>
                <div className="demo__gap" />
                <FormField label="Name" required>
                    <Input value={form.name} onChange={set('name')} placeholder="e.g. R. Murugan" />
                </FormField>
                <div className="demo__gap" />
                <div className="demo__row">
                    <FormField label="Mobile">
                        <Input value={form.mobile} onChange={set('mobile')} placeholder="e.g. 9840012345" />
                    </FormField>
                    <FormField label="Email">
                        <Input type="email" value={form.email} onChange={set('email')} placeholder="member@example.com" />
                    </FormField>
                </div>
                <div className="demo__gap" />
                <FormField label="Address">
                    <Input value={form.address} onChange={set('address')} placeholder="Street, area, pincode" />
                </FormField>
                <div className="demo__gap" />
                <div className="demo__row">
                    <FormField label="Voter ID number">
                        <Input value={form.voter_id_number} onChange={set('voter_id_number')} placeholder="e.g. ABC1234567" />
                    </FormField>
                    <FormField label="Aadhaar card number">
                        <Input value={form.aadhar_number} onChange={set('aadhar_number')} placeholder="e.g. 1234 5678 9012" />
                    </FormField>
                </div>
                <div className="demo__gap" />
                <FormField label="Photo" hint={photoName || 'JPG / PNG up to 2 MB'}>
                    <Input type="file" accept="image/*" onChange={readPhoto} />
                </FormField>
                {form.photo && (
                    <div className="member-photo-preview">
                        <MemberPhoto src={form.photo} name={form.name} />
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setForm((prev) => ({ ...prev, photo: '' }))
                                setPhotoName('')
                            }}
                        >
                            Remove photo
                        </Button>
                    </div>
                )}
                {error && (
                    <p className="demo__subtitle" role="alert">
                        {error}
                    </p>
                )}
            </form>
        </Modal>
    )
}

function NodeEditForm({ initial, id, flat, onSaved }) {
    const [form, setForm] = useState({
        title: initial.title,
        level: initial.level || 'district',
        parent_id: initial.parent_id,
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

    const allowedParents = LEVEL_PARENTS[form.level] || []
    const parentOptions = flat
        .filter((node) => node.level && allowedParents.includes(node.level))
        .map((node) => ({ value: String(node.id), label: node.title }))
    const isTopLevel = allowedParents.length === 0

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.title.trim()) {
            setError('Title is required.')
            return
        }
        setSaving(true)
        setError('')
        try {
            const response = await apiFetch(`/admin/party/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    parent_id: form.parent_id ? Number(form.parent_id) : null,
                }),
            })
            const data = await response.json()
            if (!data.success) {
                setError(data.message || 'Failed to update.')
                return
            }
            onSaved?.()
        } catch {
            setError('Could not reach the backend.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate>
            <FormField label="Level" required>
                <Select
                    options={LEVEL_ORDER.map((level) => ({ value: level, label: LEVEL_LABELS[level] }))}
                    value={form.level}
                    onChange={set('level')}
                />
            </FormField>
            <div className="demo__gap" />
            <FormField label="Title" required>
                <Input value={form.title} onChange={set('title')} />
            </FormField>
            <div className="demo__gap" />
            <FormField
                label="Parent node"
                hint={isTopLevel ? 'Top level node - no parent needed.' : `Parent should be: ${allowedParents.map(levelLabel).join(', ')}`}
            >
                <Select
                    options={parentOptions}
                    placeholder={isTopLevel ? '— No parent —' : 'Choose a parent...'}
                    value={form.parent_id}
                    onChange={set('parent_id')}
                />
            </FormField>
            {error && (
                <p className="demo__subtitle" role="alert">
                    {error}
                </p>
            )}
            <div className="demo__gap" />
            <Button type="submit" loading={saving}>
                Save changes
            </Button>
        </form>
    )
}

export default PartyTree