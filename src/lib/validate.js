export function requireStr(field, name, max = 255) {
    if (!field || typeof field !== 'string') throw new Error(`${name} is required`);
    const trimmed = field.trim();
    if (!trimmed) throw new Error(`${name} is required`);
    if (trimmed.length > max) throw new Error(`${name} too long`);
    return trimmed;
}

export function optionalBool(val) {
    if (val === undefined || val === null || val === '') return undefined;
    return ['true', '1', 'on', 'yes'].includes(String(val).toLowerCase());
}

export function optionalInt(val, min, max) {
    if (val === undefined || val === null || val === '') return undefined;
    const n = Number(val);
    if (!Number.isInteger(n)) throw new Error(`Invalid integer`);
    if (min !== undefined && n < min) throw new Error(`Below min`);
    if (max !== undefined && n > max) throw new Error(`Above max`);
    return n;
}

export function enumOf(val, allowed, def) {
    if (!val && def) return def;
    if (!allowed.includes(val)) throw new Error(`Invalid option`);
    return val;
}
