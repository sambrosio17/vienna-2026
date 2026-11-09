// Tiny event bus so components can react to each other without importing each other.
// Events: programme (redraw the day), day (selected day changed), minute, pos, wx, profile, skin, people
const handlers = {};
export const on = (event, fn) => { (handlers[event] ||= []).push(fn); };
export const emit = (event, ...args) => { (handlers[event] || []).forEach(fn => fn(...args)); };
