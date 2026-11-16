/*
 * Two Minute Drill: API layer.
 * The game only talks to `window.api`. Until the Flask backend exists, a mock
 * plays the game in the browser with one sample question.
 */

(function () {
  'use strict';

  const USE_MOCK = true;

  // real backend
  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(url + ' failed: ' + res.status);
    return res.json();
  }

  const flaskApi = {
    startGame: () => postJSON('/api/game/start', {}),
    submitAnswer: payload => postJSON('/api/game/answer', payload)
  };

  // mock backend
  const QUESTION = {
    id: 'mahomes-td',
    text: 'Name a player who has caught a touchdown from Patrick Mahomes.'
  };

  // rarities
  const ANSWERS = {
    'travis kelce': 'common',
    'tyreek hill': 'common',
    'rashee rice': 'uncommon',
    'noah gray': 'rare',
    'justin watson': 'hail_mary'
  };

  const PLAYS = {
    common:    { type: 'run',       label: 'SHORT GAIN', min: 5,  max: 10 },
    uncommon:  { type: 'run',       label: 'BIG RUN',    min: 12, max: 20 },
    rare:      { type: 'pass',      label: 'DEEP PASS',  min: 25, max: 35 },
    hail_mary: { type: 'hail_mary', label: 'HAIL MARY!' }
  };

  const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const titleCase = s => s.replace(/\b\w/g, c => c.toUpperCase());

  let ballOn = 25;
  let used = new Set();

  const mockApi = {
    async startGame() {
      ballOn = 25;
      used = new Set();
      return { gameId: 'mock', ballOn, clock: 120, score: { home: 17, away: 21 }, question: QUESTION };
    },

    async submitAnswer({ answer }) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const name = answer.trim().toLowerCase().replace(/\s+/g, ' ');
      const rarity = ANSWERS[name];

      if (!rarity || used.has(name)) {
        return {
          correct: false, matchedName: null, rarity: null,
          play: { type: 'incomplete', label: 'INCOMPLETE', yards: 0 },
          ballOn, touchdown: false, nextQuestion: QUESTION
        };
      }

      used.add(name);
      const play = PLAYS[rarity];
      const yards = rarity === 'hail_mary' ? 100 - ballOn : Math.min(randomInt(play.min, play.max), 100 - ballOn);
      ballOn += yards;
      const touchdown = ballOn >= 100;
      return {
        correct: true, matchedName: titleCase(name), rarity,
        play: { type: play.type, label: touchdown && rarity !== 'hail_mary' ? 'TOUCHDOWN!' : play.label, yards },
        ballOn, touchdown, nextQuestion: touchdown ? null : QUESTION
      };
    }
  };

  window.api = USE_MOCK ? mockApi : flaskApi;
})();