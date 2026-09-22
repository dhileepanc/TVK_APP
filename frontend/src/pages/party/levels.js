export const LEVEL_LABELS = {
    district: 'District',
    'district-wing': 'District Wing',
    union: 'Union',
    'city-panchayat': 'City Panchayat',
    panchayat: 'Panchayat',
    ward: 'Ward',
    wing: 'Wing',
}

export const LEVEL_PARENTS = {
    district: [],
    'district-wing': ['district'],
    union: ['district'],
    'city-panchayat': ['district'],
    panchayat: ['union'],
    ward: ['city-panchayat'],
    wing: ['union', 'city-panchayat', 'panchayat', 'ward'],
}

export const LEVEL_ORDER = [
    'district',
    'district-wing',
    'union',
    'city-panchayat',
    'panchayat',
    'ward',
    'wing',
]

export function levelLabel(level) {
    return (level && LEVEL_LABELS[level]) || 'Node'
}

export const POST_TYPES = [
    { id: 'secretary', label: 'Secretary', slots: 1 },
    { id: 'joint_secretary', label: 'Joint Secretary', slots: 1 },
    { id: 'treasurer', label: 'Treasurer', slots: 1 },
    { id: 'deputy_secretary', label: 'Deputy Secretary', slots: 2 },
    { id: 'ec_member', label: 'Executive Committee Member', slots: 10 },
]

export const WING_POST_TYPES = [
    { id: 'organizer', label: 'Organizer', slots: 1 },
    { id: 'joint_organizer', label: 'Joint Organizer', slots: 10 },
]

export function postTypesForLevel(level, savedPostings) {
    const list = savedPostings?.[level]
    if (Array.isArray(list) && list.length > 0) {
        return list.map((item) => ({
            id: item.id,
            label: item.name || item.label,
            slots: Number(item.count ?? item.slots) || 1,
        }))
    }

    const isWingLevel = level === 'wing' || level === 'district-wing'
    if (isWingLevel) {
        const wing = savedPostings?.wing
        if (Array.isArray(wing) && wing.length > 0) {
            return wing.map((item) => ({
                id: item.id,
                label: item.name || item.label,
                slots: Number(item.count ?? item.slots) || 1,
            }))
        }
        return WING_POST_TYPES
    }

    return POST_TYPES
}

export function postLabel(id) {
    return POST_TYPES.find((post) => post.id === id)?.label || id
}