// src/blocks/base.js
export const baseBlocks = {
    'math_number': {
        generator(c, b) {
            const f = b.querySelector('field[name="NUM"]');
            const v = f ? f.textContent.trim() : '0';
            const n = Number(v);
            if (isNaN(n) || v === '') {
                // allow_text="true" — non-numeric placeholder like a param name
                // Return quoted string to avoid ReferenceError
                return `'${v.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
            }
            return n;
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