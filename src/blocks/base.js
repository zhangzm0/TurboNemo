// src/blocks/base.js
import { def } from './def.js';

export const baseBlocks = {
    'math_number': def({
        args0: [
            { type: 'field_input', name: 'NUM', text: '0' },
            { type: 'field_input', name: 'TEXT', text: '' },
        ],
        output: 'Number',
        js({ fields }) {
            let v = fields.NUM;
            let fromTEXT = false;
            if (v === '') {
                v = fields.TEXT;
                fromTEXT = true;
            }
            if (!v) return '0';
            const n = Number(v);
            if (isNaN(n)) {
                if (!fromTEXT) return '[]';
                return `'${v.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
            }
            return String(n);
        },
    }),
    'text': def({
        args0: [
            { type: 'field_input', name: 'TEXT', text: '' },
        ],
        output: 'String',
        js({ fields }) {
            const v = fields.TEXT;
            return `'${v.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
        },
    }),
};
