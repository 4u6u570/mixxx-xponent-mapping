// M-Audio (Torq) Xponent mapping for Mixxx 2.5
// MIDI layout taken from Mixco's Xponent script (C) 2013 Juan Pedro Bolivar Puente (GPLv3).
// Deck 1 = MIDI channel 1, Deck 2 = MIDI channel 2, global controls = channel 3.
//
// Quick tweaks (edit and restart Mixxx):
//   invertPitch   -> set true if the pitch slider goes the wrong way
//   jogSensitivity / scratch settings below

var Xponent = {};

Xponent.invertPitch = false;
Xponent.jogSensitivity = 0.125;   // nudge amount per wheel tick
Xponent.scratchIntervals = 128;   // wheel ticks per revolution
Xponent.ledsFromSysex = [0xF0, 0x00, 0x20, 0x08, 0x00, 0x00, 0x63, 0x0E, 0x16, 0x40, 0x00, 0x01, 0xF7];
Xponent.ledsOffSysex  = [0xF0, 0x00, 0x20, 0x08, 0x00, 0x00, 0x63, 0x0E, 0x16, 0x40, 0x00, 0x00, 0xF7];

Xponent.shift = [false, false];
Xponent.shiftUsed = [false, false];
Xponent.scratchMode = [false, false];
Xponent.rollSize = [1, 1];
Xponent.rollSizes = [0.0625, 0.125, 0.25, 0.5, 1, 2, 4];
Xponent.browseAccum = 0;
Xponent.connections = [];

Xponent.group = function(ch) { return "[Channel" + (ch + 1) + "]"; };
Xponent.eq = function(ch) { return "[EqualizerRack1_[Channel" + (ch + 1) + "]_Effect1]"; };
Xponent.toggle = function(group, key) { engine.setValue(group, key, !engine.getValue(group, key)); };
Xponent.led = function(ch, note, on) {
    midi.sendShortMsg(0x90 + ch, note, on ? 0x7F : 0x00);
    midi.sendShortMsg(0x95 + ch, note, on ? 0x7F : 0x00);
};
// Xponent bank A uses channels 1/2 (global 3), bank B uses 6/7 (global 8)
Xponent.deck = function(channel) { return channel >= 5 ? channel - 5 : channel; };

Xponent.init = function(id, debugging) {
    midi.sendSysexMsg(Xponent.ledsFromSysex, Xponent.ledsFromSysex.length);
    for (var ch = 0; ch < 2; ch++) {
        Xponent.bindLeds(ch);
    }
};

Xponent.shutdown = function() {
    for (var ch = 0; ch < 2; ch++) {
        for (var n = 0x00; n <= 0x2C; n++) { Xponent.led(ch, n, false); }
    }
    midi.sendSysexMsg(Xponent.ledsOffSysex, Xponent.ledsOffSysex.length);
};

Xponent.bindLeds = function(ch) {
    var g = Xponent.group(ch);
    var bind = function(group, key, note) {
        var c = engine.makeConnection(group, key, function(v) { Xponent.led(ch, note, v > 0); });
        if (c) { c.trigger(); Xponent.connections.push(c); }
    };
    bind(g, "sync_enabled", 0x02);
    bind(Xponent.eq(ch), "button_parameter1", 0x08);
    bind(Xponent.eq(ch), "button_parameter2", 0x09);
    bind(Xponent.eq(ch), "button_parameter3", 0x0A);
    bind(g, "mute", 0x0B);
    bind("[EffectRack1_EffectUnit1]", "group_" + g + "_enable", 0x0C);
    bind("[EffectRack1_EffectUnit2]", "group_" + g + "_enable", 0x0D);
    bind("[QuickEffectRack1_" + g + "]", "enabled", 0x0F);
    bind(g, "pfl", 0x14);
    for (var i = 1; i <= 5; i++) { bind(g, "hotcue_" + i + "_status", 0x16 + i); }
    bind(g, "keylock", 0x1E);
    bind(g, "reverse", 0x20);
    bind(g, "cue_indicator", 0x23);
    bind(g, "play_indicator", 0x24);
    bind(g, "beatloop_4_enabled", 0x25);
    bind(g, "beatloop_8_enabled", 0x26);
    bind(g, "beatloop_16_enabled", 0x27);
    bind(g, "beatloop_32_enabled", 0x28);
    bind(g, "loop_enabled", 0x2A);
    // VU meter (CC 0x12/0x13 on channel 4)
    var vu = engine.makeConnection(g, "vu_meter", function(v) {
        midi.sendShortMsg(0xB3, 0x12 + ch, Math.round(v * 127));
        midi.sendShortMsg(0xB8, 0x12 + ch, Math.round(v * 127));
    });
    if (vu) { Xponent.connections.push(vu); }
};

// All per-deck buttons (notes 0x02..0x2C on channels 1 and 2) come here.
Xponent.button = function(channel, control, value, status, group) {
    var ch = Xponent.deck(channel);
    var g = Xponent.group(ch);
    var deck = ch + 1;
    var pressed = ((status & 0xF0) === 0x90) && value > 0;
    var shift = Xponent.shift[ch];
    if (shift && control !== 0x2C) { Xponent.shiftUsed[ch] = true; }

    // Hotcues 1-5
    if (control >= 0x17 && control <= 0x1B) {
        var n = control - 0x16;
        if (shift) {
            if (pressed) { engine.setValue(g, "hotcue_" + n + "_clear", 1); }
        } else {
            engine.setValue(g, "hotcue_" + n + "_activate", pressed ? 1 : 0);
        }
        return;
    }
    // Beatloops 4/8/16/32 (shift: 1/8, 1/2, 1, 2)
    if (control >= 0x25 && control <= 0x28) {
        if (!pressed) { return; }
        var sizes = shift ? ["0.125", "0.5", "1", "2"] : ["4", "8", "16", "32"];
        engine.setValue(g, "beatloop_" + sizes[control - 0x25] + "_toggle", 1);
        return;
    }

    switch (control) {
    case 0x2C: // green arrow: tap = load selected track, hold = shift
        if (pressed) {
            Xponent.shift[ch] = true;
            Xponent.shiftUsed[ch] = false;
        } else {
            if (Xponent.shift[ch] && !Xponent.shiftUsed[ch]) { engine.setValue(g, "LoadSelectedTrack", 1); }
            Xponent.shift[ch] = false;
        }
        break;
    case 0x02: if (pressed) { Xponent.toggle(g, "sync_enabled"); } break; // sync
    case 0x07: // punch-in: hold to cut crossfader to this deck
        if (pressed) {
            Xponent.punchSaved = engine.getValue("[Master]", "crossfader");
            engine.setValue("[Master]", "crossfader", ch === 0 ? -1 : 1);
        } else if (Xponent.punchSaved !== undefined) {
            engine.setValue("[Master]", "crossfader", Xponent.punchSaved);
            Xponent.punchSaved = undefined;
        }
        break;
    case 0x08: if (pressed) { Xponent.toggle(Xponent.eq(ch), "button_parameter1"); } break; // low kill
    case 0x09: if (pressed) { Xponent.toggle(Xponent.eq(ch), "button_parameter2"); } break; // mid kill
    case 0x0A: if (pressed) { Xponent.toggle(Xponent.eq(ch), "button_parameter3"); } break; // high kill
    case 0x0B: if (pressed) { Xponent.toggle(g, "mute"); } break;
    case 0x0C: if (pressed) { Xponent.toggle("[EffectRack1_EffectUnit1]", "group_" + g + "_enable"); } break;
    case 0x0D: if (pressed) { Xponent.toggle("[EffectRack1_EffectUnit2]", "group_" + g + "_enable"); } break;
    case 0x0E: // beat roll (size from knob 0x0E)
        engine.setValue(g, "beatlooproll_" + Xponent.rollSize[ch] + "_activate", pressed ? 1 : 0);
        break;
    case 0x0F: if (pressed) { Xponent.toggle("[QuickEffectRack1_" + g + "]", "enabled"); } break;
    case 0x10: engine.setValue(g, shift ? "rate_temp_down_small" : "rate_temp_down", pressed ? 1 : 0); break;
    case 0x11: engine.setValue(g, shift ? "rate_temp_up_small" : "rate_temp_up", pressed ? 1 : 0); break;
    case 0x12: // X: brake (shift: eject)
        if (shift) { if (pressed) { engine.setValue(g, "eject", 1); } } else { engine.brake(deck, pressed); }
        break;
    case 0x13: // -: spinback (shift: load selected track)
        if (shift) { if (pressed) { engine.setValue(g, "LoadSelectedTrack", 1); } } else { engine.spinback(deck, pressed); }
        break;
    case 0x14: if (pressed) { Xponent.toggle(g, "pfl"); } break;
    case 0x15: // scratch mode toggle
        if (pressed) {
            Xponent.scratchMode[ch] = !Xponent.scratchMode[ch];
            Xponent.led(ch, 0x15, Xponent.scratchMode[ch]);
        }
        break;
    case 0x16: // wheel touch
        if (pressed && Xponent.scratchMode[ch] && !shift) {
            engine.scratchEnable(deck, Xponent.scratchIntervals, 33 + 1 / 3, 1.0 / 8, (1.0 / 8) / 32);
        } else if (!pressed && engine.isScratching(deck)) {
            engine.scratchDisable(deck);
        }
        break;
    case 0x1C: if (pressed) { engine.setValue(g, shift ? "beatjump_1_backward" : "beatjump_4_backward", 1); } break;
    case 0x1D: if (pressed) { engine.setValue(g, shift ? "beatjump_1_forward" : "beatjump_4_forward", 1); } break;
    case 0x1E: if (pressed) { Xponent.toggle(g, "keylock"); } break;
    case 0x1F: if (pressed) { engine.setValue(g, "beats_translate_curpos", 1); } break;
    case 0x20: engine.setValue(g, "reverse", pressed ? 1 : 0); break;
    case 0x21: engine.setValue(g, "back", pressed ? 1 : 0); break;
    case 0x22: engine.setValue(g, "fwd", pressed ? 1 : 0); break;
    case 0x23: engine.setValue(g, "cue_default", pressed ? 1 : 0); break;
    case 0x24: if (pressed) { Xponent.toggle(g, "play"); } break;
    case 0x29: engine.setValue(g, shift ? "loop_halve" : "loop_in", pressed ? 1 : 0); break;
    case 0x2B: engine.setValue(g, shift ? "loop_double" : "loop_out", pressed ? 1 : 0); break;
    case 0x2A: if (pressed) { engine.setValue(g, "reloop_toggle", 1); } break;
    }
};

// Jog wheel (CC 0x16, relative, centre 64)
Xponent.wheel = function(channel, control, value, status, group) {
    var ch = Xponent.deck(channel);
    var deck = ch + 1;
    var delta = value - 64;
    if (Xponent.shift[ch]) {             // browse library
        Xponent.shiftUsed[ch] = true;
        Xponent.browseAccum += delta;
        if (Math.abs(Xponent.browseAccum) >= 4) {
            engine.setValue("[Library]", "MoveVertical", Xponent.browseAccum > 0 ? 1 : -1);
            Xponent.browseAccum = 0;
        }
    } else if (engine.isScratching(deck)) {
        engine.scratchTick(deck, delta);
    } else {
        engine.setValue(Xponent.group(ch), "jog", delta * Xponent.jogSensitivity);
    }
};

// Pitch slider (14-bit pitch bend)
Xponent.pitch = function(channel, lsb, msb, status, group) {
    var v = ((msb << 7) | lsb) / 16383;  // 0..1
    if (Xponent.invertPitch) { v = 1 - v; }
    engine.setParameter(Xponent.group(Xponent.deck(channel)), "rate", v);
};

// Beat-roll size knob (CC 0x0E)
Xponent.rollKnob = function(channel, control, value, status, group) {
    var idx = Math.min(Xponent.rollSizes.length - 1, Math.floor(value / 128 * Xponent.rollSizes.length));
    Xponent.rollSize[Xponent.deck(channel)] = Xponent.rollSizes[idx];
};

// Touch-pad buttons in MIDI mode: left = up, right = down in the library (hold to repeat)
Xponent.browseTimer = 0;
Xponent.padButton = function(channel, control, value, status, group) {
    var pressed = ((status & 0xF0) === 0x90) && value > 0;
    if (Xponent.browseTimer) { engine.stopTimer(Xponent.browseTimer); Xponent.browseTimer = 0; }
    if (!pressed) { return; }
    var dir = (control === 0x00) ? -1 : 1;
    engine.setValue("[Library]", "MoveVertical", dir);
    Xponent.browseTimer = engine.beginTimer(400, function() {
        if (Xponent.browseTimer) { engine.stopTimer(Xponent.browseTimer); }
        Xponent.browseTimer = engine.beginTimer(120, function() {
            engine.setValue("[Library]", "MoveVertical", dir);
        });
    }, true);
};
