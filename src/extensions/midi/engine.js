// MidiEngine — 基于 Tone.js 的 MIDI 播放引擎
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import {
  NOTES, NOTE_VALUE_MAP, INSTRUMENTS, GM_BY_ID,
  INSTRUMENT_SAMPLES, ACCOMPANY_MAP, ACCOMPANY_BY_CHANNEL,
  SPEED_STATE, SPEED_SUFFIX,
  DEFAULT_BPM, MAX_BPM, DEFAULT_PPQ, COLUMNS_PER_BAR, DEFAULT_INSTRUMENT,
} from './gm.js';

const SF_BASE = 'https://static.codemao.cn/nemo/midi/res/2/';

export class MidiEngine {
  constructor(eventBus, soundfontBaseUrl) {
    this._eventBus = eventBus;
    this._soundfontBase = soundfontBaseUrl || SF_BASE;
    this._midis = {};               // { id: MidiSound }
    this._players = {};             // { counter: PlayerState }
    this._sourceMap = {};           // { instrument: {note: ToneAudioBuffer} } — 共享缓冲池
    this._samplers = {};            // { counter: Sampler } — 每次播放独立采样器
    this._accompanySources = {};    // { name: ToneAudioBuffer } — 共享伴奏缓冲池
    this._accompanyPlayers = {};    // { counter: Player } — 每次播放独立伴奏播放器
    this._counter = 0;
    this._globalSpeed = 1;
    this._runtimeInstruments = {};  // { midiId: instrument }
    this._midiBufferCache = {};     // { id: ArrayBuffer } — 预加载的 MIDI 数据缓存
  }

  // ========== 加载/卸载 ==========

  loadMidi(sound) {
    let midiJson;
    if (sound.midi) {
      midiJson = this._parseBase64(sound.midi);
    }
    if (!midiJson && sound.url) {
      this._midis[sound.id] = { id: sound.id, name: sound.name, _pendingUrl: sound.url };
      return;
    }
    if (!midiJson) {
      midiJson = new Midi();
    }
    this._midis[sound.id] = this._buildMidiSound(sound.id, sound.name, midiJson);
  }

  unloadMidi(id) {
    delete this._midis[id];
  }

  // 设置预加载缓存（由扩展的 init 阶段通过 asset loader 统一加载后传入）
  setMidiBufferCache(cache) {
    this._midiBufferCache = cache;
  }

  // 公开预加载音色采样缓冲（install 阶段提前触发 MP3 下载）
  ensureSampler(instrument) {
    return this._ensureSourceMap(instrument);
  }

  async _ensureMidiLoaded(soundId) {
    if (this._midis[soundId] && !this._midis[soundId]._pendingUrl) return;
    const entry = this._midis[soundId];
    if (!entry || !entry._pendingUrl) return;
    const url = entry._pendingUrl.startsWith('http') ? entry._pendingUrl
      : `https://creation.bcmcdn.com/490/${entry._pendingUrl}`;
    try {
      let buf;
      if (this._midiBufferCache[soundId]) {
        buf = this._midiBufferCache[soundId];
        delete this._midiBufferCache[soundId];
      } else {
        const resp = await fetch(url);
        buf = await resp.arrayBuffer();
      }
      const midiJson = new Midi(buf);
      this._midis[soundId] = this._buildMidiSound(soundId, entry.name, midiJson);
    } catch (e) {
      console.warn('MIDI load failed:', url, e);
      this._midis[soundId] = this._buildMidiSound(soundId, entry.name, new Midi());
    }
  }

  async _ensureFetchMidi(matrix) {
    const midiJson = this._parseMatrix(matrix);
    return this._buildMidiSound('_matrix_' + (this._counter++), 'matrix', midiJson);
  }

  _buildMidiSound(id, name, midiJson) {
    const matrix = this._parseJSON(midiJson);
    const accompany = this._getAccompany(midiJson.tracks);
    return { id, name, json: midiJson, matrix, accompany, position: 0 };
  }

  // ========== 播放控制 ==========

  async playMidi(id, matrix, start, end, onFinish) {
    try {
      await this._playMidiImpl(id, matrix, start, end, onFinish);
    } catch (e) {
      console.error('MIDI play error:', e);
      if (onFinish) onFinish();
    }
  }

  async _playMidiImpl(id, matrix, start, end, onFinish) {
    let midiSound;
    if (Array.isArray(matrix)) {
      midiSound = await this._ensureFetchMidi(matrix);
      if (id) this._midis[id] = midiSound;
    } else if (id) {
      await this._ensureMidiLoaded(id);
      midiSound = this._midis[id];
    }
    if (!midiSound) return;
    if (start != null && end != null && (end < start || end > midiSound.matrix.length + 1)) return;

    // 确保 Tone.js AudioContext 已启动
    await Tone.start();
    if (Tone.context.state !== 'running') {
      await Tone.context.resume();
    }

    midiSound = JSON.parse(JSON.stringify(midiSound));
    midiSound.position = start ? start - 1 : 0;
    midiSound.start = start;
    midiSound.end = end;
    midiSound.onFinish = onFinish;

    const instrument = this._runtimeInstruments[midiSound.id]
      || this._getDefaultInstrument(midiSound.json);
    const bpm = Math.min(this._getBPM(midiSound.json) * this._globalSpeed, MAX_BPM);
    const counter = (this._counter++).toString();

    // 预加载音色缓冲（共享缓冲池），然后创建独立的 Sampler
    await this._ensureSourceMap(instrument);
    this._createSampler(counter, instrument);

    const interval = 30 / bpm;
    midiSound._eventId = Tone.Transport.scheduleRepeat(
      (time) => this._onEighthNote(midiSound, counter, time),
      interval,
    );

    if (midiSound.accompany) {
      await this._ensureAccompanySource(midiSound.accompany, bpm);
    }

    this._players[counter] = { midi: midiSound, instrument };
    Tone.Transport.start();

    if (midiSound.accompany) {
      this._playAccompany(counter, midiSound.accompany, bpm);
    }
  }

  stopMidi(id) {
    if (!id) {
      this._stopAll();
      return;
    }
    for (const [counter, state] of Object.entries(this._players)) {
      if (state.midi.id === id) {
        this._stopPlayer(counter, id);
      }
    }
  }

  stopAll() {
    this._stopAll();
  }

  _stopAll() {
    Tone.Transport.cancel();
    Tone.Transport.stop();
    for (const s of Object.values(this._samplers)) {
      try { s.dispose(); } catch(e) {}
    }
    for (const p of Object.values(this._accompanyPlayers)) {
      try { p.stop(); p.dispose(); } catch(e) {}
    }
    this._samplers = {};
    this._accompanyPlayers = {};
    this._players = {};
    this._runtimeInstruments = {};
    this._globalSpeed = 1;
    Tone.getTransport().bpm.value = DEFAULT_BPM;
  }

  _stopPlayer(counter, midiId) {
    const state = this._players[counter];
    if (!state) return;
    if (state.midi._eventId != null) {
      Tone.Transport.clear(state.midi._eventId);
    }
    // 释放并销毁该次播放的独立采样器
    if (this._samplers[counter]) {
      try { this._samplers[counter].dispose(); } catch(e) {}
      delete this._samplers[counter];
    }
    this._stopAccompany(counter);
    delete this._players[counter];
  }

  // ========== 运行时控制 ==========

  async setInstrument(midiId, instrument) {
    this._runtimeInstruments[midiId] = instrument;
    await this._ensureSourceMap(instrument);
    for (const [counter, state] of Object.entries(this._players)) {
      if (state.midi.id === midiId) {
        state.instrument = instrument;
        // 为该次播放重建新音色的采样器
        this._createSampler(counter, instrument);
      }
    }
  }

  setSpeed(rate) {
    if (typeof rate !== 'number' || rate <= 0) return;
    this._globalSpeed = Math.min(10, rate);
    Tone.getTransport().bpm.value = Math.min(DEFAULT_BPM * rate, MAX_BPM);
    for (const player of Object.values(this._accompanyPlayers)) {
      player.playbackRate = rate;
    }
  }

  getBPM(id) {
    if (!id || !this._midis[id]) return DEFAULT_BPM;
    const midi = this._midis[id];
    const tempo = this._getBPM(midi.json);
    const playing = Object.values(this._players).find(p => p.midi.id === id);
    return Math.min(Math.round(tempo * (playing ? this._globalSpeed : 1)), MAX_BPM);
  }

  getNotesByColumn(id, column) {
    const midi = this._midis[id];
    if (!midi || !midi.matrix[column - 1]) return undefined;
    return midi.matrix[column - 1].map(n => n.value);
  }

  getPlayingColumn(id) {
    const playing = Object.values(this._players).find(p => p.midi.id === id);
    return playing ? playing.midi.position : 0;
  }

  // ========== 内部: 八分音符回调 ==========

  _onEighthNote(midiSound, counter, time) {
    const matrix = midiSound.matrix;
    const column = matrix[midiSound.position];
    const prevColumn = midiSound.position > 0 ? matrix[midiSound.position - 1] : [];
    midiSound.position++;

    if (!column || (midiSound.end && midiSound.end < midiSound.position)) {
      if (midiSound._eventId != null) Tone.Transport.clear(midiSound._eventId);
      this._stopAccompany(counter);
      if (midiSound.onFinish) midiSound.onFinish();
      delete this._players[counter];
      if (this._samplers[counter]) {
        delete this._samplers[counter];
      }
      return;
    }

    const sampler = this._samplers[counter];
    if (!sampler) return;

    if (prevColumn) {
      prevColumn.forEach(n => { if (n.is_last) sampler.triggerRelease(n.name, time); });
    }

    column.forEach(n => {
      if (n.is_head) sampler.triggerAttack(n.name, time, n.velocity);
    });

    this._emitSectionEvent(midiSound.id, midiSound.position);
    column.forEach(n => {
      if (n.is_head) this._emitNoteEvent(midiSound.id, n.value);
    });
  }

  // ========== 内部: 采样器管理 ==========

  // 预加载音色采样到共享缓冲池（同乐器只加载一次）
  async _ensureSourceMap(instrument) {
    if (this._sourceMap[instrument]) return;
    if (!INSTRUMENT_SAMPLES[instrument]) instrument = DEFAULT_INSTRUMENT;
    if (this._sourceMap[instrument]) return;

    const samples = INSTRUMENT_SAMPLES[instrument];
    this._sourceMap[instrument] = {};
    const promises = Object.entries(samples).map(([note, file]) => {
      const url = this._soundfontBase + 'soundfont/' + instrument + '/' + file;
      return Tone.ToneAudioBuffer.fromUrl(url).then(buf => {
        this._sourceMap[instrument][note] = buf;
      }).catch(() => {});
    });
    // 超时保护，防止某个音色文件卡住
    const timeout = new Promise(resolve => setTimeout(resolve, 8000));
    await Promise.race([Promise.all(promises), timeout]);
  }

  // 从共享缓冲池创建该次播放的独立 Sampler（同步操作，无需等待网络）
  _createSampler(counter, instrument) {
    const map = this._sourceMap[instrument];
    if (!map) return;
    if (this._samplers[counter]) {
      try { this._samplers[counter].dispose(); } catch(e) {}
    }
    this._samplers[counter] = new Tone.Sampler({
      urls: map,
      baseUrl: '',
    }).toDestination();
  }

  // ========== 内部: 伴奏管理 ==========

  // 预加载伴奏到共享缓冲池
  async _ensureAccompanySource(accompanyType, bpm) {
    const name = this._getAccompanyName(accompanyType, bpm);
    if (this._accompanySources[name]) return;
    const url = this._soundfontBase + 'accompany/' + name + '.mp3';
    const timeout = new Promise(resolve => setTimeout(resolve, 10000));
    const load = Tone.ToneAudioBuffer.fromUrl(url).then(buf => {
      this._accompanySources[name] = buf;
    }).catch(() => {});
    await Promise.race([load, timeout]);
  }

  // 为该次播放创建独立的伴奏 Player
  _playAccompany(counter, accompanyType, bpm) {
    const name = this._getAccompanyName(accompanyType, bpm);
    const source = this._accompanySources[name];
    if (!source) return;
    const player = new Tone.Player(source).toDestination();
    player.loop = true;
    player.playbackRate = this._getAccompanyRate(bpm);
    player.start();
    this._accompanyPlayers[counter] = player;
  }

  _stopAccompany(counter) {
    const player = this._accompanyPlayers[counter];
    if (player) {
      try { player.stop(); player.dispose(); } catch(e) {}
      delete this._accompanyPlayers[counter];
    }
  }

  _getAccompanyName(accompanyType, bpm) {
    const level = bpm / 15;
    let idx;
    if (level < 5) idx = 0;
    else if (level < 7) idx = 1;
    else if (level < 9) idx = 2;
    else if (level < 11) idx = 3;
    else idx = 4;
    const type = accompanyType.charAt(0).toLowerCase() + accompanyType.slice(1);
    return type + SPEED_SUFFIX[idx];
  }

  _getAccompanyRate(bpm) {
    const level = bpm / 15;
    if (level < 5) return bpm / 60;
    if (level < 7) return bpm / 90;
    if (level < 9) return bpm / 120;
    if (level < 11) return bpm / 150;
    return bpm / 180;
  }

  // ========== 内部: MIDI 解析 ==========

  _parseBase64(base64) {
    try {
      const data = atob(base64);
      const buffer = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) buffer[i] = data.charCodeAt(i);
      return new Midi(buffer);
    } catch(e) {
      console.error('MIDI parse error:', e);
      return new Midi();
    }
  }

  _parseJSON(midiJson) {
    const matrix = [];
    const ppq = midiJson.header.ppq || DEFAULT_PPQ;
    const ppe = ppq / 2;
    let total = midiJson.durationTicks / ppe;
    const rem = total % COLUMNS_PER_BAR;
    total = rem ? (total - rem + COLUMNS_PER_BAR) : total;
    for (let i = 0; i < total; i++) matrix[i] = [];

    midiJson.tracks.forEach(track => {
      if (track.notes.length <= 0 || track.channel !== 0) return;
      const instrument = track.instrument.number;
      track.notes.forEach(note => {
        const col = Math.floor(note.ticks / ppe);
        const dur = Math.floor(note.durationTicks / ppe);
        for (let i = 0; i < dur; i++) {
          if (!matrix[col + i]) return;
          matrix[col + i].push({
            name: note.name,
            velocity: note.velocity,
            value: NOTES.indexOf(note.name) + 1,
            duration: dur,
            is_head: !i,
            is_last: i === dur - 1,
            track: 0,
            instrument,
            time: note.time,
            ticks: note.ticks,
          });
        }
      });
    });
    return matrix;
  }

  _parseMatrix(matrix) {
    const midi = new Midi();
    midi.header.setTempo(DEFAULT_BPM);
    const track = midi.addTrack();
    matrix.forEach((col, idx) => {
      if (!Array.isArray(col)) col = [col];
      col = [...new Set(col.flat(Infinity))];
      col.forEach(note => {
        if (typeof note === 'string' && /^\d+$/.test(note)) note = parseInt(note, 10);
        if (!Number.isInteger(note) || note <= 0) return;
        if (note > 22) note = 22;
        track.addNote({
          name: NOTES[note - 1],
          ticks: midi.header.ppq / 2 * idx,
          durationTicks: midi.header.ppq / 2,
        });
      });
    });
    return midi;
  }

  _getAccompany(tracks) {
    const t = tracks.find(t => t.channel !== 0);
    if (!t) return null;
    return ACCOMPANY_BY_CHANNEL[t.channel] || null;
  }

  _getDefaultInstrument(midiJson) {
    const num = midiJson.tracks[0]?.instrument?.number;
    return GM_BY_ID[num] || DEFAULT_INSTRUMENT;
  }

  _getBPM(midiJson) {
    return midiJson.header?.tempos?.[0]?.bpm || DEFAULT_BPM;
  }

  // ========== 事件发射 ==========

  _emitSectionEvent(midiId, column) {
    this._eventBus.emit(`midi:playSection:${midiId}`, column);
  }

  _emitNoteEvent(midiId, noteValue) {
    this._eventBus.emit(`midi:playNote:${midiId}_${noteValue}`, noteValue);
    this._eventBus.emit(`midi:playNote:__any_midi_${noteValue}`, noteValue);
  }
}
