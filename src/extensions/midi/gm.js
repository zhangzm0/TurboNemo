// GM 定义：音符、乐器、伴奏映射
export const NOTES = [
  'C3','D3','E3','F3','G3','A3','B3',
  'C4','D4','E4','F4','G4','A4','B4',
  'C5','D5','E5','F5','G5','A5','B5',
  'C6',
];

export const NOTE_VALUE_MAP = {};
NOTES.forEach((n, i) => { NOTE_VALUE_MAP[n] = i + 1; });

// 6 种 Nemo 乐器
export const INSTRUMENTS = {
  poly_synth: 'poly_synth',
  piano_merlin: 'piano_merlin',
  music_box: 'music_box',
  organ_1: 'organ_1',
  organ_2: 'organ_2',
  guitar_nylon_x: 'guitar_nylon_x',
};

// GM program number → 乐器名
export const GM_BY_ID = {
  0: 'piano_merlin',
  10: 'music_box',
  16: 'organ_1',
  17: 'organ_2',
  24: 'guitar_nylon_x',
  90: 'poly_synth',
};

// 每件乐器的采样映射 (note -> filename)
export const INSTRUMENT_SAMPLES = {
  poly_synth: {
    A3:'A3.mp3', A4:'A4.mp3', A5:'A5.mp3',
    B3:'B3.mp3', B4:'B4.mp3', B5:'B5.mp3',
    C3:'C3.mp3', C4:'C4.mp3', C5:'C5.mp3', C6:'C6.mp3',
    D3:'D3.mp3', D4:'D4.mp3', D5:'D5.mp3',
    E3:'E3.mp3', E4:'E4.mp3', E5:'E5.mp3',
    F3:'F3.mp3', F4:'F4.mp3', F5:'F5.mp3',
    G3:'G3.mp3', G4:'G4.mp3', G5:'G5.mp3',
  },
  piano_merlin: {
    A3:'A3.mp3', A4:'A4.mp3', A5:'A5.mp3',
    B3:'B3.mp3', B4:'B4.mp3', B5:'B5.mp3',
    C3:'C3.mp3', C4:'C4.mp3', C5:'C5.mp3', C6:'C6.mp3',
    D3:'D3.mp3', D4:'D4.mp3', D5:'D5.mp3',
    E3:'E3.mp3', E4:'E4.mp3', E5:'E5.mp3',
    F3:'F3.mp3', F4:'F4.mp3', F5:'F5.mp3',
    G3:'G3.mp3', G4:'G4.mp3', G5:'G5.mp3',
  },
  music_box: {
    A3:'A3.mp3', A4:'A4.mp3', A5:'A5.mp3',
    B3:'B3.mp3', B4:'B4.mp3', B5:'B5.mp3',
    C3:'C3.mp3', C4:'C4.mp3', C5:'C5.mp3', C6:'C6.mp3',
    D3:'D3.mp3', D4:'D4.mp3', D5:'D5.mp3',
    E3:'E3.mp3', E4:'E4.mp3', E5:'E5.mp3',
    F3:'F3.mp3', F4:'F4.mp3', F5:'F5.mp3',
    G3:'G3.mp3', G4:'G4.mp3', G5:'G5.mp3',
  },
  organ_1: {
    A3:'A3.mp3', A4:'A4.mp3', A5:'A5.mp3',
    B3:'B3.mp3', B4:'B4.mp3', B5:'B5.mp3',
    C3:'C3.mp3', C4:'C4.mp3', C5:'C5.mp3', C6:'C6.mp3',
    D3:'D3.mp3', D4:'D4.mp3', D5:'D5.mp3',
    E3:'E3.mp3', E4:'E4.mp3', E5:'E5.mp3',
    F3:'F3.mp3', F4:'F4.mp3', F5:'F5.mp3',
    G3:'G3.mp3', G4:'G4.mp3', G5:'G5.mp3',
  },
  organ_2: {
    A3:'A3.mp3', A4:'A4.mp3', A5:'A5.mp3',
    B3:'B3.mp3', B4:'B4.mp3', B5:'B5.mp3',
    C3:'C3.mp3', C4:'C4.mp3', C5:'C5.mp3', C6:'C6.mp3',
    D3:'D3.mp3', D4:'D4.mp3', D5:'D5.mp3',
    E3:'E3.mp3', E4:'E4.mp3', E5:'E5.mp3',
    F3:'F3.mp3', F4:'F4.mp3', F5:'F5.mp3',
    G3:'G3.mp3', G4:'G4.mp3', G5:'G5.mp3',
  },
  guitar_nylon_x: {
    A3:'A3.mp3', A4:'A4.mp3', A5:'A5.mp3',
    B3:'B3.mp3', B4:'B4.mp3', B5:'B5.mp3',
    C3:'C3.mp3', C4:'C4.mp3', C5:'C5.mp3', C6:'C6.mp3',
    D3:'D3.mp3', D4:'D4.mp3', D5:'D5.mp3',
    E3:'E3.mp3', E4:'E4.mp3', E5:'E5.mp3',
    F3:'F3.mp3', F4:'F4.mp3', F5:'F5.mp3',
    G3:'G3.mp3', G4:'G4.mp3', G5:'G5.mp3',
  },
};

// 伴奏类型
export const ACCOMPANY_MAP = {
  Punk: 'Punk', Jazz: 'Jazz', Latin: 'Latin',
  Dance: 'Dance', Hiphop: 'Hiphop', Rock: 'Rock',
};

// GM channel → 伴奏类型
export const ACCOMPANY_BY_CHANNEL = {
  1: 'Punk', 2: 'Jazz', 3: 'Latin',
  4: 'Dance', 5: 'Hiphop', 6: 'Rock',
};

// 速度状态
export const SPEED_STATE = { Low:0, MidLow:1, Normal:2, MidHigh:3, High:4 };

// 速度状态 → 伴奏文件名后缀
export const SPEED_SUFFIX = ['_low', '_mid_low', '', '_mid_high', '_high'];

export const DEFAULT_BPM = 120;
export const MAX_BPM = 240;
export const DEFAULT_PPQ = 480;
export const COLUMNS_PER_BAR = 8;
export const DEFAULT_INSTRUMENT = 'poly_synth';
