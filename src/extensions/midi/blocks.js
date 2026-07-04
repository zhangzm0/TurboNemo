// MIDI 积木编译器 — 将 Blockly XML 编译为 JavaScript 生成器代码
export const midiBlocks = {
  // ========== 事件积木 ==========
  'midi__on_play_section': {
    isHat: true,
    generator(c, b) {
      const audio = c.compileValue(b, 'audio');
      const column = c.compileValue(b, 'column');
      const doBody = c.compileStatement(b, 'DO');
      if (!doBody) return `    // midi__on_play_section (empty)\n`;
      return `\
    while (true) {
        const __col = yield { _yieldType: "pause", event: 'midi:playSection:' + ${audio} };
        const __colCheck = ${column};
        if (typeof __colCheck === 'number' && isFinite(__colCheck) && __colCheck > 0 && __col % __colCheck === 0) {
${doBody.replace(/^/gm, '        ')}
        }
    }
`;
    },
  },
  'midi__on_play_note': {
    isHat: true,
    generator(c, b) {
      const audio = c.compileValue(b, 'audio');
      const note = c.compileValue(b, 'note');
      const doBody = c.compileStatement(b, 'DO');
      if (!doBody) return `    // midi__on_play_note (empty)\n`;
      return `\
    while (true) {
        const __val = yield { _yieldType: "pause", event: 'midi:playNote:' + ${audio} + '_' + ${note} };
        const __noteCheck = ${note};
        if (Number.isInteger(__noteCheck) && __noteCheck > 0 && __noteCheck <= 22 && parseInt(__val, 10) === __noteCheck) {
${doBody.replace(/^/gm, '        ')}
        }
    }
`;
    },
  },

  // ========== 执行积木 ==========
  'midi__set_program': {
    generator(c, b) {
      const audio = c.compileValue(b, 'audio');
      const program = b.querySelector('field[name="program"]')?.textContent.trim() || 'poly_synth';
      return `    if (${audio}) __global__.__midi__.setInstrument(${audio}, '${program}');\n` + c.compileNext(b);
    },
  },
  'midi__set_speed_rate': {
    generator(c, b) {
      const rate = c.compileValue(b, 'rate');
      return `    if (typeof ${rate} === 'number' && isFinite(${rate}) && ${rate} > 0) { __global__.__midi__.setSpeed(${rate}); }\n` + c.compileNext(b);
    },
  },
  'midi__play_section': {
    generator(c, b) {
      const audio = c.compileValue(b, 'audio');
      const column = c.compileValue(b, 'column');
      // 变体：column_end 字段 — 值为 "column" 时表示与开始列相同
      const colEndField = b.querySelector('field[name="column_end"]');
      const colEndRaw = colEndField ? colEndField.textContent.trim() : null;
      const colEnd = (colEndRaw === null || colEndRaw === 'column') ? column : colEndRaw;
      return `    if (Number.isInteger(${column}) && Number.isInteger(${colEnd}) && ${column} > 0 && ${colEnd} > 0) { __global__.__midi__.playMidi(${audio}, null, ${column}, ${colEnd}); }\n` + c.compileNext(b);
    },
  },

  // ========== 返回值积木 ==========
  'midi__get_section_notes': {
    generator(c, b) {
      const audio = c.compileValue(b, 'audio');
      const column = c.compileValue(b, 'column');
      return `(() => { const __c = ${column}; if (!Number.isInteger(__c) || __c <= 0) return NaN; const __n = __global__.__midi__.getNotesByColumn(${audio}, __c); if (!__n || __n.length === 0) return 0; const __s = [...__n].sort((a,b) => a-b); return __s.length === 1 ? __s[0] : __s; })()`;
    },
  },
  'midi__get_bpm': {
    generator(c, b) {
      const audio = c.compileValue(b, 'audio');
      return `__global__.__midi__.getBPM(${audio})`;
    },
  },
  'midi__get_playing_column': {
    generator(c, b) {
      const audio = c.compileValue(b, 'audio');
      return `__global__.__midi__.getPlayingColumn(${audio})`;
    },
  },

  // ========== Shadow 下拉积木 ==========
  'midi_get': {
    generator(c, b) {
      const id = b.querySelector('field[name="audio"]')?.textContent.trim() || '';
      return `'${id}'`;
    },
  },
  'midi_get_all': {
    generator(c, b) {
      const id = b.querySelector('field[name="audio"]')?.textContent.trim() || '__any_midi';
      return `'${id}'`;
    },
  },
  'midi_get_note': {
    generator(c, b) {
      const note = b.querySelector('field[name="note"]')?.textContent.trim() || '8';
      return parseInt(note, 10) || 8;
    },
  },
};
