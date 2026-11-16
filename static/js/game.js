/*
 * Two Minute Drill: game controller.
 * Runs the clock, sends answers to `api`, tells `field` which play to animate,
 * and decides when the game is won or lost.
 */

(function () {
  'use strict';

  const RUNOFF_SECONDS = 10;

  const $ = id => document.getElementById(id);
  const field = new FieldRenderer($('field'));

  const state = {
    playing: false,
    busy: false,
    clock: 120, ballOn: 25, home: 17, away: 21,
    gameId: null, questionId: null
  };

  // updating the screen
  function formatClock(seconds) {
    const s = Math.ceil(seconds);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function describeSpot(y) {
    if (y === 50) return 'MIDFIELD';
    return y < 50 ? 'OWN ' + y : 'OPP ' + (100 - y);
  }

  function render() {
    $('homeScore').textContent = state.home;
    $('awayScore').textContent = state.away;
    $('clock').textContent = formatClock(state.clock);
    $('clock').classList.toggle('urgent', state.clock < 15);
    $('ballOn').textContent = state.ballOn >= 100
      ? 'TOUCHDOWN!'
      : describeSpot(state.ballOn) + ' · ' + (100 - state.ballOn) + ' TO GO';
  }

  function showResult(title, sub, tone) {
    $('resultTitle').textContent = title;
    $('resultSub').textContent = sub;
    $('result').className = 'result show ' + tone;
  }

  function flashRunoff() {
    const tag = $('runoff');
    tag.classList.remove('show');
    void tag.offsetWidth;
    tag.classList.add('show');
  }

  // clock
  let lastTime = performance.now();
  function tick(time) {
    const elapsed = (time - lastTime) / 1000;
    lastTime = time;
    if (state.playing && !state.busy) {
      state.clock = Math.max(0, state.clock - elapsed);
      if (state.clock === 0) endGame(false);
    }
    render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // game flow
  async function startGame() {
    const game = await api.startGame();
    Object.assign(state, {
      playing: true, busy: false, clock: game.clock, ballOn: game.ballOn,
      home: game.score.home, away: game.score.away,
      gameId: game.gameId, questionId: game.question.id
    });
    $('questionText').textContent = game.question.text;
    $('result').className = 'result';
    $('startScreen').hidden = true;
    $('endScreen').hidden = true;
    field.reset(state.ballOn);
    const input = $('answerInput');
    input.value = '';
    input.disabled = false;
    input.focus();
  }

  async function submitAnswer(event) {
    event.preventDefault();
    const input = $('answerInput');
    const answer = input.value.trim();
    if (!answer || !state.playing || state.busy) return;

    state.busy = true;
    input.disabled = true;
    showResult('Checking…', '', '');

    const res = await api.submitAnswer({
      gameId: state.gameId, questionId: state.questionId, answer, clockRemaining: state.clock
    });

    if (res.correct) {
      const tone = res.rarity === 'rare' || res.rarity === 'hail_mary' ? 'gold' : 'good';
      showResult(res.play.label, '+' + res.play.yards + ' yards · ' + res.matchedName, tone);
    } else {
      showResult('INCOMPLETE', '"' + answer + '" doesn\'t count', 'bad');
    }

    await field.animate(res.play);
    state.ballOn = res.ballOn;

    if (res.touchdown) {
      state.home += 6;
      endGame(true);
      return;
    }

    state.clock = Math.max(0, state.clock - RUNOFF_SECONDS);
    flashRunoff();
    if (state.clock === 0) {
      endGame(false);
      return;
    }

    field.reset(state.ballOn);
    state.questionId = res.nextQuestion.id;
    $('questionText').textContent = res.nextQuestion.text;
    input.value = '';
    input.disabled = false;
    input.focus();
    state.busy = false;
  }

  function endGame(won) {
    state.playing = false;
    $('answerInput').disabled = true;
    $('endTitle').textContent = won ? 'Touchdown! You win.' : 'Time expired';
    $('endSub').textContent = won
      ? 'Final score: HOME ' + state.home + ', AWAY ' + state.away + '.'
      : 'You reached the ' + describeSpot(state.ballOn).toLowerCase() + ', ' + (100 - state.ballOn) + ' yards short.';
    $('endScreen').hidden = false;
  }

  // buttons and the answer box
  $('answerForm').addEventListener('submit', submitAnswer);
  $('startBtn').addEventListener('click', startGame);
  $('againBtn').addEventListener('click', startGame);
})();