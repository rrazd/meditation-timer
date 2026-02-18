import './styles/main.css';
import './styles/variables.css';
import { bus } from './event-bus.js';
import { state } from './state.js';
import { formatTime } from './utils/format.js';
import { Timer } from './timer.js';

// Smoke test — remove before Plan 03 wiring
console.log('bus:', bus);
console.log('state:', state);
console.log('formatTime(600000):', formatTime(600000)); // expected: "10:00"
console.log('formatTime(37000):', formatTime(37000));   // expected: "00:37"
console.log('formatTime(1):', formatTime(1));           // expected: "00:01"

// Smoke test for timer module — instantiate only, do not start
void new Timer();
console.log('Timer instantiated OK — worker loaded');
