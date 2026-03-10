// Ethiopian Scale Guide — jsui visual component
// For Max for Live 12 using live.miditool
// Inlet 0: messages from js logic (noteon, noteoff, setscale, setroot)
// Inlet 1: scale index  — direct int from live.menu Scale
// Inlet 2: root note    — direct int from live.menu Root
// Inlet 3: note dictionary from live.miditool.in
// Outlet 0: note dictionary to live.miditool.out

mgraphics.init();
mgraphics.relative_coords = 0;
mgraphics.autofill = 0;

inlets  = 4;
outlets = 1;

var dict = new Dict();

function processMIDI(noteDict) {
	if (inlet === 3 && noteDict) {
		var pitch = noteDict.get("pitch");
		var velocity = noteDict.get("velocity");
		var duration = noteDict.get("duration");
		var time = noteDict.get("time");
		var chain = noteDict.get("chain");
		var prob = noteDict.get("probability");
		
		if (pitch !== undefined && velocity > 0) {
			var snappedPitch = snapToScale(pitch);
			
			dict.clear();
			dict.set("pitch", snappedPitch);
			if (velocity !== undefined) dict.set("velocity", velocity);
			if (duration !== undefined) dict.set("duration", duration);
			if (time !== undefined) dict.set("time", time);
			if (chain !== undefined) dict.set("chain", chain);
			if (prob !== undefined) dict.set("probability", prob);
			
			outlet(0, dict);
			noteon(snappedPitch, velocity);
		} else if (pitch !== undefined && velocity === 0) {
			var snappedPitch = snapToScale(pitch);
			noteoff(snappedPitch);
		}
	}
}

var SCALES = {
	"Tizita Major":   [0, 2, 4, 7, 9],
	"Tizita Minor":   [0, 2, 3, 7, 8],
	"Bati Major":     [0, 4, 5, 7, 8],
	"Bati Minor":     [0, 3, 5, 7, 10],
	"Ambassel Major": [0, 2, 5, 7, 9],
	"Ambassel Minor": [0, 1, 5, 7, 8],
	"Anchihoye":      [0, 1, 5, 6, 9]
};
var SCALE_NAMES = Object.keys(SCALES);
var NOTE_NAMES  = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

var rootNote          = 0;
var scaleIndex        = 0;
var activeNotes       = [];
var scalePitchClasses = [];
// false = note names on keys, KB letters in strip  (default / MIDI mode)
// true  = KB letters on keys, note names in strip  (laptop keyboard mode)
var kbOnKeys = false;
var _btnX = 0, _btnY = 0, _btnW = 42, _btnH = 14;

function updateScalePitchClasses() {
	var intervals = SCALES[SCALE_NAMES[scaleIndex]];
	scalePitchClasses = [];
	for (var i = 0; i < intervals.length; i++) {
		scalePitchClasses.push((rootNote + intervals[i]) % 12);
	}
	scalePitchClasses.sort(function(a, b) { return a - b; });
}
updateScalePitchClasses();

function snapToScale(pitch) {
	var pc = pitch % 12;
	var octave = Math.floor(pitch / 12) - 1;
	var nearest = scalePitchClasses[0];
	var minDist = Math.abs(pc - nearest);
	
	for (var i = 1; i < scalePitchClasses.length; i++) {
		var dist = Math.abs(pc - scalePitchClasses[i]);
		if (dist < minDist) {
			minDist = dist;
			nearest = scalePitchClasses[i];
		}
	}
	
	if (pc < nearest && minDist > 0) {
		if (pc < rootNote && nearest > rootNote) {
			octave--;
		}
	} else if (pc > nearest && minDist > 0) {
		if (pc > rootNote && nearest < rootNote) {
			octave++;
		}
	}
	
	return (octave + 1) * 12 + nearest;
}

function msg_int(v) {
	if (inlet === 1) {
		scaleIndex = Math.max(0, Math.min(SCALE_NAMES.length - 1, v));
		updateScalePitchClasses();
		mgraphics.redraw();
	} else if (inlet === 2) {
		rootNote = Math.max(0, Math.min(11, v));
		updateScalePitchClasses();
		mgraphics.redraw();
	}
}

function setroot(n)  { rootNote = Math.max(0, Math.min(11, Math.floor(n))); updateScalePitchClasses(); mgraphics.redraw(); }
function setscale(n) { scaleIndex = Math.max(0, Math.min(SCALE_NAMES.length-1, Math.floor(n))); updateScalePitchClasses(); mgraphics.redraw(); }

function noteon(pitch, vel) {
	if (vel > 0) {
		if (activeNotes.indexOf(pitch) < 0) activeNotes.push(pitch);
	} else {
		var idx = activeNotes.indexOf(pitch);
		if (idx >= 0) activeNotes.splice(idx, 1);
	}
	mgraphics.redraw(); // single redraw regardless of vel
}
function noteoff(pitch) {
	var idx = activeNotes.indexOf(pitch);
	if (idx >= 0) activeNotes.splice(idx, 1);
	mgraphics.redraw();
}

// Key layout
var WHITE_OFFSETS     = [0, 2, 4, 5, 7, 9, 11];
var BLACK_OFFSETS     = [1, 3, 6, 8, 10];
var BLACK_AFTER_WHITE = [0, 1, 3, 4, 5];
var NUM_OCTAVES       = 2;
var KB_WHITES         = 9;
var KB_BLACK_OCTS     = 2;

// Ableton computer-keyboard layout
//   White : A  S  D  F  G  H  J  K  L     (C D E F G A B C D)
//   Black : W  E  T  Y  U  |  O            (C# D# F# G# A# | C#4)
var KB_WHITE     = ['A','S','D','F','G','H','J','K','L'];
var KB_BLACK_OCT = [['W','E','T','Y','U'], ['O','','','','']];

// ── Colors ──────────────────────────────────────────────────────────────────
var COL_BG        = [0.038, 0.038, 0.040, 1.0];
var COL_STRIP     = [0.025, 0.025, 0.027, 1.0];
var COL_SEP       = [0.22,  0.22,  0.22,  1.0];

var COL_KEY_WHITE = [0.94,  0.92,  0.88,  1.0];
var COL_SCALE_W   = [0.96,  0.64,  0.14,  0.72];
var COL_ROOT_W    = [0.98,  0.67,  0.10,  1.0];
var COL_ACTIVE_W  = [1.00,  0.93,  0.45,  1.0];
var COL_OUTLINE_W = [0.20,  0.20,  0.20,  0.85];

var COL_KEY_BLACK = [0.10,  0.10,  0.11,  1.0];
var COL_SCALE_BK  = [0.50,  0.30,  0.04,  1.0];
var COL_ROOT_BK   = [0.66,  0.42,  0.05,  1.0];
var COL_ACTIVE_BK = [1.00,  0.93,  0.45,  1.0];
var COL_OUTLINE_B = [0.04,  0.04,  0.05,  1.0];

// Labels on keys (dark text on light key background)
var COL_NM_ON_W   = [0.14,  0.12,  0.10,  1.0];
var COL_NM_OFF_W  = [0.42,  0.40,  0.38,  1.0];
var COL_NM_ON_BK  = [0.95,  0.84,  0.60,  1.0];
var COL_NM_OFF_BK = [0.52,  0.50,  0.46,  1.0];
// Labels in strip (light text on dark strip background)
var COL_KB_W      = [0.78,  0.76,  0.72,  1.00];
var COL_KB_BK     = [0.78,  0.76,  0.72,  1.00];

var COL_ORANGE    = [0.96,  0.64,  0.12,  1.0];

function paint() {
	var w = box.rect[2] - box.rect[0];
	var h = box.rect[3] - box.rect[1];

	var STRIP_H = 40;
	var pianoH  = h - STRIP_H;
	var BOT_H   = 20;             // label strip between keys and controls
	var keyH    = pianoH - BOT_H; // actual key height

	// ── Background ───────────────────────────────────────────────────────────
	mgraphics.set_source_rgba(COL_BG[0], COL_BG[1], COL_BG[2], COL_BG[3]);
	mgraphics.rectangle(0, 0, w, h);
	mgraphics.fill();

	// ── Controls strip ───────────────────────────────────────────────────────
	mgraphics.set_source_rgba(COL_STRIP[0], COL_STRIP[1], COL_STRIP[2], COL_STRIP[3]);
	mgraphics.rectangle(0, pianoH, w, STRIP_H);
	mgraphics.fill();
	mgraphics.set_source_rgba(COL_SEP[0], COL_SEP[1], COL_SEP[2], COL_SEP[3]);
	mgraphics.rectangle(0, pianoH, w, 1);
	mgraphics.fill();

	// ── Toggle dot (color-only, right side of controls strip) ───────────────
	_btnW = 14; _btnH = 10;
	_btnX = w - _btnW - 8;
	_btnY = pianoH + 6;   // shifted 4px up total
	if (kbOnKeys)
		mgraphics.set_source_rgba(COL_ORANGE[0], COL_ORANGE[1], COL_ORANGE[2], 1.0);
	else
		mgraphics.set_source_rgba(0.20, 0.20, 0.22, 1.0);
	mgraphics.rectangle(_btnX, _btnY, _btnW, _btnH);
	mgraphics.fill();
	mgraphics.set_source_rgba(COL_SEP[0], COL_SEP[1], COL_SEP[2], 0.8);
	mgraphics.set_line_width(0.5);
	mgraphics.rectangle(_btnX, _btnY, _btnW, _btnH);
	mgraphics.stroke();

	// ── Label strip ──────────────────────────────────────────────────────────
	mgraphics.set_source_rgba(COL_STRIP[0], COL_STRIP[1], COL_STRIP[2], COL_STRIP[3]);
	mgraphics.rectangle(0, keyH, w, BOT_H);
	mgraphics.fill();
	mgraphics.set_source_rgba(COL_SEP[0], COL_SEP[1], COL_SEP[2], COL_SEP[3]);
	mgraphics.rectangle(0, keyH, w, 1);
	mgraphics.fill();

	// ── Piano: white keys ────────────────────────────────────────────────────
	var whiteW    = w / KB_WHITES;
	var blackW    = whiteW * 0.54;
	var blackH    = keyH * 0.62;
	var startMidi = 48;

	for (var oct = 0; oct < NUM_OCTAVES; oct++) {
		for (var wi = 0; wi < 7; wi++) {
			var gw    = oct * 7 + wi;
			if (gw >= KB_WHITES) break;

			var x        = gw * whiteW;
			var pitch    = startMidi + oct * 12 + WHITE_OFFSETS[wi];
			var pc       = pitch % 12;
			var inScale  = (scalePitchClasses.indexOf(pc) >= 0);
			var isActive = (activeNotes.indexOf(pitch) >= 0);
			var isRoot   = (pc === rootNote);

			// Key fill
			if (isActive)
				mgraphics.set_source_rgba(COL_ACTIVE_W[0], COL_ACTIVE_W[1], COL_ACTIVE_W[2], COL_ACTIVE_W[3]);
			else if (isRoot && inScale)
				mgraphics.set_source_rgba(COL_ROOT_W[0], COL_ROOT_W[1], COL_ROOT_W[2], COL_ROOT_W[3]);
			else if (inScale)
				mgraphics.set_source_rgba(COL_SCALE_W[0], COL_SCALE_W[1], COL_SCALE_W[2], COL_SCALE_W[3]);
			else
				mgraphics.set_source_rgba(COL_KEY_WHITE[0], COL_KEY_WHITE[1], COL_KEY_WHITE[2], COL_KEY_WHITE[3]);
			mgraphics.rectangle(x + 0.5, 0.5, whiteW - 1, keyH - 1);
			mgraphics.fill();

			// Outline
			mgraphics.set_source_rgba(COL_OUTLINE_W[0], COL_OUTLINE_W[1], COL_OUTLINE_W[2], COL_OUTLINE_W[3]);
			mgraphics.set_line_width(0.5);
			mgraphics.rectangle(x + 0.5, 0.5, whiteW - 1, keyH - 1);
			mgraphics.stroke();

			var kbW = KB_WHITE[gw];
			var nm  = NOTE_NAMES[pc];

			if (!kbOnKeys) {
				// MIDI mode: note name on key, KB letter in strip
				if (inScale)
					mgraphics.set_source_rgba(COL_NM_ON_W[0], COL_NM_ON_W[1], COL_NM_ON_W[2], 1.0);
				else
					mgraphics.set_source_rgba(COL_NM_OFF_W[0], COL_NM_OFF_W[1], COL_NM_OFF_W[2], COL_NM_OFF_W[3]);
				mgraphics.select_font_face("Arial");
				mgraphics.set_font_size(9);
				mgraphics.move_to(x + whiteW/2 - (nm.length > 1 ? 5 : 3), keyH - 14);
				mgraphics.show_text(nm);
				if (kbW) {
					mgraphics.set_source_rgba(COL_KB_W[0], COL_KB_W[1], COL_KB_W[2], COL_KB_W[3]);
					mgraphics.select_font_face("Arial");
					mgraphics.set_font_size(9);
					mgraphics.move_to(x + whiteW/2 - 3, keyH + BOT_H - 6);
					mgraphics.show_text(kbW);
				}
			} else {
				// KB mode: KB letter on key, note name in strip
				if (kbW) {
					if (inScale)
						mgraphics.set_source_rgba(COL_NM_ON_W[0], COL_NM_ON_W[1], COL_NM_ON_W[2], 1.0);
					else
						mgraphics.set_source_rgba(COL_NM_OFF_W[0], COL_NM_OFF_W[1], COL_NM_OFF_W[2], COL_NM_OFF_W[3]);
					mgraphics.select_font_face("Arial");
					mgraphics.set_font_size(9);
					mgraphics.move_to(x + whiteW/2 - 3, keyH - 14);
					mgraphics.show_text(kbW);
				}
				mgraphics.set_source_rgba(COL_KB_W[0], COL_KB_W[1], COL_KB_W[2], 1.0);
				mgraphics.select_font_face("Arial");
				mgraphics.set_font_size(8);
				mgraphics.move_to(x + whiteW/2 - (nm.length > 1 ? 5 : 3), keyH + BOT_H - 6);
				mgraphics.show_text(nm);
			}

			// Root dot (always on key)
			if (isRoot && inScale) {
				mgraphics.set_source_rgba(COL_ORANGE[0], COL_ORANGE[1], COL_ORANGE[2], 1.0);
				mgraphics.arc(x + whiteW/2, keyH - 6, 3, 0, 6.283);
				mgraphics.fill();
			}
		}
	}

	// ── Piano: black keys ────────────────────────────────────────────────────
	for (var oct2 = 0; oct2 < KB_BLACK_OCTS; oct2++) {
		for (var bi = 0; bi < 5; bi++) {
			var gw2 = oct2 * 7 + BLACK_AFTER_WHITE[bi];
			var xb  = gw2 * whiteW + whiteW - blackW/2;
			if (xb + blackW > KB_WHITES * whiteW) continue;

			var p2  = startMidi + oct2*12 + BLACK_OFFSETS[bi];
			var pc2 = p2 % 12;
			var iS2 = (scalePitchClasses.indexOf(pc2) >= 0);
			var iA2 = (activeNotes.indexOf(p2) >= 0);
			var iR2 = (pc2 === rootNote);

			// Key fill
			if (iA2)
				mgraphics.set_source_rgba(COL_ACTIVE_BK[0], COL_ACTIVE_BK[1], COL_ACTIVE_BK[2], COL_ACTIVE_BK[3]);
			else if (iR2 && iS2)
				mgraphics.set_source_rgba(COL_ROOT_BK[0], COL_ROOT_BK[1], COL_ROOT_BK[2], COL_ROOT_BK[3]);
			else if (iS2)
				mgraphics.set_source_rgba(COL_SCALE_BK[0], COL_SCALE_BK[1], COL_SCALE_BK[2], COL_SCALE_BK[3]);
			else
				mgraphics.set_source_rgba(COL_KEY_BLACK[0], COL_KEY_BLACK[1], COL_KEY_BLACK[2], COL_KEY_BLACK[3]);
			mgraphics.rectangle(xb, 0, blackW, blackH);
			mgraphics.fill();

			// Outline
			mgraphics.set_source_rgba(COL_OUTLINE_B[0], COL_OUTLINE_B[1], COL_OUTLINE_B[2], COL_OUTLINE_B[3]);
			mgraphics.set_line_width(0.5);
			mgraphics.rectangle(xb, 0, blackW, blackH);
			mgraphics.stroke();

			var kbB = KB_BLACK_OCT[oct2][bi];
			var nm2 = NOTE_NAMES[pc2];

			if (!kbOnKeys) {
				// MIDI mode: note name on key, KB letter in strip
				if (iS2)
					mgraphics.set_source_rgba(COL_NM_ON_BK[0], COL_NM_ON_BK[1], COL_NM_ON_BK[2], COL_NM_ON_BK[3]);
				else
					mgraphics.set_source_rgba(COL_NM_OFF_BK[0], COL_NM_OFF_BK[1], COL_NM_OFF_BK[2], COL_NM_OFF_BK[3]);
				mgraphics.select_font_face("Arial");
				mgraphics.set_font_size(7);
				mgraphics.move_to(xb + blackW/2 - (nm2.length > 1 ? 4 : 2), blackH - 5);
				mgraphics.show_text(nm2);
				if (kbB) {
					mgraphics.set_source_rgba(COL_KB_BK[0], COL_KB_BK[1], COL_KB_BK[2], COL_KB_BK[3]);
					mgraphics.select_font_face("Arial");
					mgraphics.set_font_size(9);
					mgraphics.move_to(xb + blackW/2 - 3, keyH + BOT_H - 6);
					mgraphics.show_text(kbB);
				}
			} else {
				// KB mode: KB letter on key, note name in strip
				if (kbB) {
					if (iS2)
						mgraphics.set_source_rgba(COL_NM_ON_BK[0], COL_NM_ON_BK[1], COL_NM_ON_BK[2], COL_NM_ON_BK[3]);
					else
						mgraphics.set_source_rgba(COL_NM_OFF_BK[0], COL_NM_OFF_BK[1], COL_NM_OFF_BK[2], COL_NM_OFF_BK[3]);
					mgraphics.select_font_face("Arial");
					mgraphics.set_font_size(7);
					mgraphics.move_to(xb + blackW/2 - (kbB.length > 1 ? 4 : 2), blackH - 5);
					mgraphics.show_text(kbB);
				}
				mgraphics.set_source_rgba(COL_KB_BK[0], COL_KB_BK[1], COL_KB_BK[2], 1.0);
				mgraphics.select_font_face("Arial");
				mgraphics.set_font_size(7);
				mgraphics.move_to(xb + blackW/2 - (nm2.length > 1 ? 4 : 2), keyH + BOT_H - 6);
				mgraphics.show_text(nm2);
			}
		}
	}
}

function onclick(x, y, but) {
	if (x >= _btnX && x <= _btnX + _btnW && y >= _btnY && y <= _btnY + _btnH) {
		kbOnKeys = !kbOnKeys;
		mgraphics.redraw();
	}
}
