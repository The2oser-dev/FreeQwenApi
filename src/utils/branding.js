export const _WATERMARK = '';

export function printWatermark() {
    console.log(`\n: ${_WATERMARK}\n`);
}

export function formatWatermark(prefix = '') {
    return `${prefix}: ${_WATERMARK}`;
}
