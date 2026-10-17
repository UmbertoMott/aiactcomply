import type { ToolDictionaries } from "./types";

// Testi del gruppo "shell": namespace → chiave → testo, in IT e EN.
// Precedenza in translate(): questi testi vincono su dictionaries.ts per la stessa lingua.
const dict: ToolDictionaries = {
  it: {},
  en: {},
};

export default dict;
