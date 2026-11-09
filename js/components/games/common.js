import { $ } from '../../core/dom.js';
import { esc } from '../../core/format.js';

export const board = () => $('games');
export const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const topBar = (title, stats) => `<div class="gtop"><div><h2>${esc(title)}</h2>${stats ? `<div class="gstat">${stats}</div>` : ''}</div><button class="smallbtn" type="button" data-g="menu">‹ Giochi</button></div>`;
