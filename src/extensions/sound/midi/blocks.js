// MIDI 积木编译器 — 将 Blockly XML 编译为 JavaScript 生成器代码
import { def } from '../../../blocks/def.js';

export const midiBlocks = {
  // ========== 事件积木 ==========
  'midi__on_play_section': def({
    isHat: true,
    args0: [
      { type: 'input_value', name: 'audio' },
      { type: 'input_value', name: 'column' },
      { type: 'input_statement', name: 'DO' },
    ],
    js({values, statements}) {
      const doBody = statements.DO;
      if (!doBody) return `    // midi__on_play_section (empty)\n`;
      return `\
    while (true) {
        const __col = yield { _yieldType: "pause", event: 'midi:playSection:' + ${values.audio} };
        const __colCheck = ${values.column};
        if (typeof __colCheck === 'number' && isFinite(__colCheck) && __colCheck > 0 && __col % __colCheck === 0) {
${doBody.replace(/^/gm, '        ')}
        }
    }
`;
    },
  }),
  'midi__on_play_note': def({
    isHat: true,
    args0: [
      { type: 'input_value', name: 'audio' },
      { type: 'input_value', name: 'note' },
      { type: 'input_statement', name: 'DO' },
    ],
    js({values, statements}) {
      const doBody = statements.DO;
      if (!doBody) return `    // midi__on_play_note (empty)\n`;
      return `\
    while (true) {
        const __val = yield { _yieldType: "pause", event: 'midi:playNote:' + ${values.audio} + '_' + ${values.note} };
        const __noteCheck = ${values.note};
        if (Number.isInteger(__noteCheck) && __noteCheck > 0 && __noteCheck <= 22 && parseInt(__val, 10) === __noteCheck) {
${doBody.replace(/^/gm, '        ')}
        }
    }
`;
    },
  }),

  // ========== 执行积木 ==========
  'midi__set_program': def({
    args0: [
      { type: 'input_value', name: 'audio' },
      { type: 'field_dropdown', name: 'program' },
    ],
    js: 'if ({audio}) __global__.__midi__.setInstrument({audio}, \'{$program}\')',
  }),
  'midi__set_speed_rate': def({
    args0: [{ type: 'input_value', name: 'rate' }],
    js: 'if (typeof {rate} === \'number\' && isFinite({rate}) && {rate} > 0) { __global__.__midi__.setSpeed({rate}); }',
  }),
  'midi__play_section': def({
    args0: [
      { type: 'input_value', name: 'audio' },
      { type: 'input_value', name: 'column' },
      { type: 'field_dropdown', name: 'column_end' },
    ],
    js({values, fields, next}) {
      const colEndRaw = fields.column_end;
      const colEnd = (!colEndRaw || colEndRaw === 'column') ? values.column : colEndRaw;
      return `    if (Number.isInteger(${values.column}) && Number.isInteger(${colEnd}) && ${values.column} > 0 && ${colEnd} > 0) { __global__.__midi__.playMidi(${values.audio}, null, ${values.column}, ${colEnd}); }\n` + next;
    },
  }),

  // ========== 返回值积木 ==========
  'midi__get_section_notes': def({
    output: 'Number',
    args0: [
      { type: 'input_value', name: 'audio' },
      { type: 'input_value', name: 'column' },
    ],
    js({values}) {
      return `(() => { const __c = ${values.column}; if (!Number.isInteger(__c) || __c <= 0) return NaN; const __n = __global__.__midi__.getNotesByColumn(${values.audio}, __c); if (!__n || __n.length === 0) return 0; const __s = [...__n].sort((a,b) => a-b); return __s.length === 1 ? __s[0] : __s; })()`;
    },
  }),
  'midi__get_bpm': def({
    output: 'Number',
    args0: [{ type: 'input_value', name: 'audio' }],
    js: '__global__.__midi__.getBPM({audio})',
  }),
  'midi__get_playing_column': def({
    output: 'Number',
    args0: [{ type: 'input_value', name: 'audio' }],
    js: '__global__.__midi__.getPlayingColumn({audio})',
  }),

  // ========== Shadow 下拉积木 ==========
  'midi_get': def({
    output: 'String',
    args0: [{ type: 'field_dropdown', name: 'audio' }],
    js: '\'{$audio}\'',
  }),
  'midi_get_all': def({
    output: 'String',
    args0: [{ type: 'field_dropdown', name: 'audio' }],
    js: '\'{$audio}\'',
  }),
  'midi_get_note': def({
    output: 'Number',
    args0: [{ type: 'field_dropdown', name: 'note' }],
    js({fields}) { return parseInt(fields.note || '8', 10) || 8; },
  }),
};
