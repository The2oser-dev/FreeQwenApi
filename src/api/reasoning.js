export function resolveThinkingEnabled(body) {
    const value = body || {};
    if (value.enable_thinking !== undefined) {
        const enabled = value.enable_thinking;
        if (typeof enabled === 'boolean') return enabled;
        if (typeof enabled === 'string') {
            const normalized = enabled.trim().toLowerCase();
            if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
            if (['false', '0', 'no', 'off', 'disabled', 'none', ''].includes(normalized)) return false;
        }
        throw new TypeError('enable_thinking must be a boolean or boolean-like string');
    }
    if (value.reasoning_effort !== undefined) {
        if (typeof value.reasoning_effort !== 'string') {
            throw new TypeError('reasoning_effort must be a string');
        }
        const effort = value.reasoning_effort.trim().toLowerCase();
        if (['none', 'off', 'disabled', ''].includes(effort)) return false;
        if (['minimal', 'low', 'medium', 'high'].includes(effort)) return true;
        throw new TypeError('reasoning_effort must be one of none, minimal, low, medium, or high');
    }
    if (value.thinking !== undefined) {
        if (typeof value.thinking === 'boolean') return value.thinking;
        if (value.thinking && typeof value.thinking === 'object') {
            const type = String(value.thinking.type || '').trim().toLowerCase();
            if (type === 'enabled' || type === 'on') return true;
            if (type === 'disabled' || type === 'off') return false;
        }
        throw new TypeError('thinking must be a boolean or an object with type enabled/disabled');
    }
    return false;
}
