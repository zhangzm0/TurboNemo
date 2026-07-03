// src/blocks/base.js
export const baseBlocks = {
    'math_number': {
        generator(c, b) {
            // Nemo 数学框支持两种字段名：NUM（数值）和 TEXT（文本/变量名）
            let f = b.querySelector('field[name="NUM"]');
            let v = f ? f.textContent.trim() : '';
            let fromTEXT = false;
            if (v === '') {
                // 检查 TEXT 字段（过程参数默认值场景）
                f = b.querySelector('field[name="TEXT"]');
                if (f) { v = f.textContent.trim(); fromTEXT = true; }
            }
            if (!v) return '0';
            const n = Number(v);
            if (isNaN(n) || v === '') {
                // NUM 字段非数字 → 列表 "全部" 语义
                if (!fromTEXT) return '[]';
                // TEXT 字段非数字 → 过程参数默认字符串值
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