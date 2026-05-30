// src/blocks/base.js
export const baseBlocks = {
    'math_number': {
        generator(c, b) {
            const f = b.querySelector('field[name="NUM"]');
            const v = f ? f.textContent.trim() : '0';
            const n = Number(v);
            return isNaN(n) || v === '' ? v : n;
        },
    },
    'text': {
        generator(c, b) {
            const f = b.querySelector('field[name="TEXT"]');
            const v = f ? f.textContent.trim() : '';
            return `'${v.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
        },
    },
};