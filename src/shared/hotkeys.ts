import { en } from './i18n/en';
import type { Messages } from './i18n/en';
import type { HotkeyConfig } from './types';

const isWindows = ((): boolean => {
  // Node also has a navigator, so ask process first; the sandboxed renderer only has navigator.
  if (typeof process !== 'undefined' && typeof process.platform === 'string') return process.platform === 'win32';
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Windows');
})();

export const MODIFIER_FLAGS = {
  command: 0x100000,
  option: 0x80000,
  shift: 0x20000,
  control: 0x40000,
} as const;

export const MODIFIER_LABELS: Record<string, string> = {
  command: isWindows ? 'Win ' : '\u2318',
  option: isWindows ? 'Alt ' : '\u2325',
  shift: isWindows ? 'Shift ' : '\u21E7',
  control: isWindows ? 'Ctrl ' : '\u2303',
};

type KeyName = Exclude<keyof Messages['keys'], 'other'>;

/** Keys whose name depends on the language. */
const NAMED_KEYS: Record<number, KeyName> = {
  // Modifier-only keys (right-side variants)
  54: 'rightCommand',
  61: 'rightOption',
  60: 'rightShift',
  62: 'rightControl',
  // Modifier-only keys (left-side variants)
  55: 'leftCommand',
  58: 'leftOption',
  56: 'leftShift',
  59: 'leftControl',
  // Common keys
  36: 'return',
  48: 'tab',
  49: 'space',
  51: 'delete',
  53: 'escape',
};

/** Keys that read the same in every language. */
const LITERAL_KEYS: Record<number, string> = {
  63: 'Fn',
  122: 'F1',
  120: 'F2',
  99: 'F3',
  118: 'F4',
  96: 'F5',
  97: 'F6',
  98: 'F7',
  100: 'F8',
  101: 'F9',
  109: 'F10',
  103: 'F11',
  111: 'F12',
  105: 'F13',
  107: 'F14',
  113: 'F15',
  // Letters (a-z)
  0: 'A', 11: 'B', 8: 'C', 2: 'D', 14: 'E', 3: 'F', 5: 'G', 4: 'H',
  34: 'I', 38: 'J', 40: 'K', 37: 'L', 46: 'M', 45: 'N', 31: 'O',
  35: 'P', 12: 'Q', 15: 'R', 1: 'S', 17: 'T', 32: 'U', 9: 'V',
  13: 'W', 7: 'X', 16: 'Y', 6: 'Z',
  // Numbers
  29: '0', 18: '1', 19: '2', 20: '3', 21: '4',
  23: '5', 22: '6', 26: '7', 28: '8', 25: '9',
};

/** Windows has no Command or Option key; the labels need the real names. */
const WINDOWS_KEY_RENAMES: Partial<Record<KeyName, string>> = {
  leftCommand: 'Win (\u229E)',
  rightCommand: 'Right Win (\u229E)',
  leftOption: 'Left Alt (\u2325)',
  rightOption: 'Right Alt (\u2325)',
  leftControl: 'Left Ctrl (\u2303)',
  rightControl: 'Right Ctrl (\u2303)',
};

function keyName(keyCode: number, names: Messages['keys']): string {
  const named = NAMED_KEYS[keyCode];
  if (named) {
    if (isWindows) {
      const rename = WINDOWS_KEY_RENAMES[named];
      if (rename) return rename;
    }
    return names[named];
  }
  return LITERAL_KEYS[keyCode] ?? names.other(keyCode);
}

export const MODIFIER_ONLY_KEYCODES = new Set([54, 55, 56, 58, 59, 60, 61, 62, 63]);

const MODIFIER_KEY_FLAGS: Record<number, number> = {
  54: MODIFIER_FLAGS.command, 55: MODIFIER_FLAGS.command,
  58: MODIFIER_FLAGS.option, 61: MODIFIER_FLAGS.option,
  56: MODIFIER_FLAGS.shift, 60: MODIFIER_FLAGS.shift,
  59: MODIFIER_FLAGS.control, 62: MODIFIER_FLAGS.control,
};

/** The key's name in a language. English is what settings.json stores. */
export function buildHotkeyLabel(keyCode: number, modifiers: number, names: Messages['keys'] = en.keys): string {
  const parts: string[] = [];

  if (modifiers & MODIFIER_FLAGS.control) parts.push(MODIFIER_LABELS.control);
  if (modifiers & MODIFIER_FLAGS.option) parts.push(MODIFIER_LABELS.option);
  if (modifiers & MODIFIER_FLAGS.shift) parts.push(MODIFIER_LABELS.shift);
  if (modifiers & MODIFIER_FLAGS.command) parts.push(MODIFIER_LABELS.command);

  // A modifier key already shown by its own flag is not repeated; a chord like Ctrl + Win still names Win.
  const ownFlag = MODIFIER_KEY_FLAGS[keyCode];
  if (!MODIFIER_ONLY_KEYCODES.has(keyCode) || parts.length === 0 || (ownFlag !== undefined && !(modifiers & ownFlag))) {
    parts.push(keyName(keyCode, names));
  }

  return parts.join('');
}

/** The dictation key as the UI shows it, in the current language. */
export function hotkeyLabel(config: Pick<HotkeyConfig, 'keyCode' | 'modifiers'>, names: Messages['keys']): string {
  return buildHotkeyLabel(config.keyCode, config.modifiers, names);
}

export const FN_KEY_CODE = 63;
export const FN_KEY_FLAG = 0x800000;

export const FN_HOTKEY: HotkeyConfig = {
  keyCode: FN_KEY_CODE,
  modifiers: 0,
  label: 'Fn',
};

export const RIGHT_ALT_HOTKEY: HotkeyConfig = {
  // macOS: Right Option. Used as the fallback when the fn key is deselected.
  keyCode: 61,
  modifiers: 0,
  label: 'Right Option (\u2325)',
};

/** The Windows chord: hold Ctrl, then press Win. Rarely used elsewhere,
    and the helper swallows the key while the chord is held, so the Start
    menu never opens from dictating. */
export const CTRL_WIN_HOTKEY: HotkeyConfig = {
  keyCode: 55,
  modifiers: 0x40000,
  label: 'Ctrl + Win',
};

export const DEFAULT_HOTKEY: HotkeyConfig = FN_HOTKEY;
export const DEFAULT_HOTKEY_WINDOWS: HotkeyConfig = CTRL_WIN_HOTKEY;
