// src/blocks/base.js
export const baseBlocks = {
    'math_number': {
        generator(c, b) {
            // Nemo 数学框支持两种字段名：NUM（数值）和 TEXT（文本/变量名）
            // 当 allow_text="true" 且非数值时，作为列表参数的默认值处理
            let f = b.querySelector('field[name="NUM"]');
            let v = f ? f.textContent.trim() : '';
            if (v === '') {
                // 检查 TEXT 字段（procedures_2 的列表参数默认值场景）
                f = b.querySelector('field[name="TEXT"]');
                if (f) v = f.textContent.trim();
            }
            // 默认值
            if (!v) return '0';
            const n = Number(v);
            if (isNaN(n) || v === '') {
                // allow_text="true" — 非数值文本，作为变量名/占位符
                // Nemo 约定：过程调用的列表参数默认值为空数组
                return '[]';
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