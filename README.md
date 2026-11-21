## How to run

In PyCharm: open the project, create a `.venv` interpreter, install `requirements.txt`, then run `app.py`.

Until the backend exists, `api.js` just uses a mock backend with a sample question/answer set.

## Switch to the real backend

Set `USE_MOCK = false` at the top of `static/js/api.js`. The frontend then calls two endpoints:

`POST /api/game/start`

`POST /api/game/answer`

## Game system

| Field          | Values                                                                  |
|----------------|-------------------------------------------------------------------------|
| `rarity`       | `"common"`, `"uncommon"`, `"rare"`, `"hail_mary"`, or `null` when wrong |
| `play.type`    | `"run"`, `"pass"`, `"hail_mary"`, `"incomplete"` (picks the animation)  |
| `play.label`   | Big text shown after the play, e.g. `"BIG RUN"`                         |
| `ballOn`       | New field position, 0–100 (100 = touchdown)                             |
| `nextQuestion` | `null` when `touchdown` is true                                         |

A wrong answer returns `correct: false`, `play.type: "incomplete"`, `yards: 0`, the same `ballOn`, and the next question.

## How the clock works

The frontend runs the 2:00 clock and pauses it while an answer is checked and while the play runs, so a slow server won't waste time.
It sends `clockRemaining` with each answer in case the backend wants it.
After every play, 10 seconds run off (`RUNOFF_SECONDS` in `game.js`).
You lose when the clock reaches 0:00.

## Question generator

There is a question generator script inside build_questions.py. It takes information from the nflreadpy library and makes questions
based on the template in the function. Right now it has TD from a QB, played for team A and team B, and 100-yd games (rushing/receiving) vs. a team.
Questions are generated to questions.json.
