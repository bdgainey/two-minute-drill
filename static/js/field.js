/*
 * Two Minute Drill: field renderer.
 * Draws a top-down field with X's and O's and animates each play.
 * Positions are in yards: y = 0 is your goal line, y = 100 the opponent's.
 * x = 0 is the middle of the field; the sidelines are at -26.7 and +26.7.
 */

(function () {
  'use strict';

  const HALF_WIDTH = 26.7;

  // Where each player lines up, relative to the line of scrimmage (dy < 0 = behind it).
  const OFFENSE = [
    { role: 'LT', x: -4, dy: -1 }, { role: 'LG', x: -2, dy: -1 }, { role: 'C', x: 0, dy: -1 },
    { role: 'RG', x: 2, dy: -1 }, { role: 'RT', x: 4, dy: -1 }, { role: 'TE', x: 6, dy: -1 },
    { role: 'WR1', x: -18, dy: -1 }, { role: 'WR2', x: -12, dy: -2 }, { role: 'WR3', x: 15, dy: -1 },
    { role: 'QB', x: 0, dy: -5 }, { role: 'RB', x: 3, dy: -6 }
  ];
  const DEFENSE = [
    { x: -5, dy: 1 }, { x: -1.5, dy: 1 }, { x: 1.5, dy: 1 }, { x: 5, dy: 1 },
    { x: -5, dy: 5 }, { x: 0, dy: 5 }, { x: 5, dy: 5 },
    { x: -18, dy: 7 }, { x: 15, dy: 7 },
    { x: -8, dy: 12 }, { x: 8, dy: 12 }
  ];

  class FieldRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.anim = null;
      this.reset(25);
      this.cameraY = this.cameraTarget;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      requestAnimationFrame(time => this.frame(time));
    }

    // line players up
    reset(lineOfScrimmage) {
      this.los = lineOfScrimmage;
      this.offense = OFFENSE.map(p => ({ role: p.role, x: p.x, y: lineOfScrimmage + p.dy }));
      this.defense = DEFENSE.map(p => ({ x: p.x, y: Math.min(lineOfScrimmage + p.dy, 109) }));
      const qb = this.player('QB');
      this.ball = { x: qb.x + 1, y: qb.y, lift: 0, visible: true };
      this.cameraTarget = lineOfScrimmage;
    }

    player(role) {
      return this.offense.find(p => p.role === role);
    }

    // match screen size
    resize() {
      const ratio = window.devicePixelRatio || 1;
      this.width = this.canvas.clientWidth;
      this.height = this.canvas.clientHeight;
      this.canvas.width = this.width * ratio;
      this.canvas.height = this.height * ratio;
      this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    // yards = screen pixels
    get scale() {
      return Math.min(this.width / 60, this.height / 45); // pixels per yard
    }

    toScreen(x, y) {
      return {
        x: this.width / 2 + x * this.scale,
        y: this.height * 0.75 - (y - this.cameraY) * this.scale
      };
    }

    // drawing
    frame(time) {
      if (this.anim) this.updateAnimation(time);
      this.cameraY += (this.cameraTarget - this.cameraY) * 0.08;
      this.draw();
      requestAnimationFrame(t => this.frame(t));
    }

    draw() {
      const ctx = this.ctx;
      const s = this.scale;
      ctx.fillStyle = '#0a1424';
      ctx.fillRect(0, 0, this.width, this.height);

      // grass and end zones
      this.box(-HALF_WIDTH, -10, HALF_WIDTH, 110, '#3f9a36');
      this.box(-HALF_WIDTH, -10, HALF_WIDTH, 0, '#2f7d2c');
      this.box(-HALF_WIDTH, 100, HALF_WIDTH, 110, '#2f7d2c');

      // yard lines every 5 yards, numbers every 10
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.font = 'bold ' + Math.round(s * 1.8) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let y = 0; y <= 100; y += 5) {
        this.line(-HALF_WIDTH, y, HALF_WIDTH, y);
        if (y % 10 === 0 && y > 0 && y < 100) {
          const label = String(y <= 50 ? y : 100 - y);
          for (const x of [-20, 20]) {
            const p = this.toScreen(x, y);
            ctx.fillText(label, p.x, p.y);
          }
        }
      }

      // sidelines and end lines
      this.line(-HALF_WIDTH, -10, -HALF_WIDTH, 110);
      this.line(HALF_WIDTH, -10, HALF_WIDTH, 110);
      this.line(-HALF_WIDTH, 110, HALF_WIDTH, 110);

      // goalpost at the back of the end zone
      ctx.strokeStyle = '#f2c230';
      ctx.lineWidth = 4;
      this.line(-3, 110, 3, 110);

      // line of scrimmage
      ctx.strokeStyle = '#58b4ff';
      ctx.lineWidth = 3;
      this.line(-HALF_WIDTH, this.los, HALF_WIDTH, this.los);

      // players and ball
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      this.defense.forEach(p => this.drawX(p));
      this.offense.forEach(p => this.drawO(p));
      if (this.ball.visible) this.drawBall();
    }

    box(x0, y0, x1, y1, color) {
      const a = this.toScreen(x0, y1);
      const b = this.toScreen(x1, y0);
      this.ctx.fillStyle = color;
      this.ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }

    line(x0, y0, x1, y1) {
      const a = this.toScreen(x0, y0);
      const b = this.toScreen(x1, y1);
      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
      this.ctx.stroke();
    }

    drawO(p) {
      const c = this.toScreen(p.x, p.y);
      this.ctx.beginPath();
      this.ctx.arc(c.x, c.y, this.scale * 0.8, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    drawX(p) {
      const r = 0.7;
      this.line(p.x - r, p.y - r, p.x + r, p.y + r);
      this.line(p.x - r, p.y + r, p.x + r, p.y - r);
    }

    drawBall() {
      const c = this.toScreen(this.ball.x, this.ball.y);
      const size = this.scale * (0.5 + this.ball.lift * 0.5); // bigger = higher in the air
      this.ctx.fillStyle = '#8b4a22';
      this.ctx.beginPath();
      this.ctx.ellipse(c.x, c.y, size, size * 0.65, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // plays
    animate({ type, yards }) {
      return new Promise(resolve => {
        const qb = this.player('QB');
        let carrier, endY, duration;
        if (type === 'run') {
          carrier = this.player('RB'); endY = this.los + yards; duration = 1200 + yards * 20;
        } else if (type === 'hail_mary') {
          carrier = this.player('WR1'); endY = 105; duration = 2400;
        } else if (type === 'pass') {
          carrier = this.player('WR3'); endY = this.los + yards; duration = 1600;
        } else {
          carrier = this.player('WR3'); endY = this.los + 10; duration = 1300;
        }

        const thrown = type !== 'run';
        this.anim = {
          carrier, duration, resolve,
          start: performance.now(),
          from: { x: carrier.x, y: carrier.y },
          to: { x: carrier.x, y: endY },
          throwAt: thrown ? 0.3 : null,
          throwFrom: { x: qb.x + 1, y: qb.y },
          throwTo: type === 'incomplete' ? { x: carrier.x + 3, y: endY + 4 } : { x: carrier.x, y: endY },
          miss: type === 'incomplete',
          defenseStart: this.defense.map(d => ({ x: d.x, y: d.y }))
        };
      });
    }

    updateAnimation(time) {
      const a = this.anim;
      const t = Math.min(1, (time - a.start) / a.duration);

      // the runner or receiver moves in a straight line
      a.carrier.x = a.from.x + (a.to.x - a.from.x) * t;
      a.carrier.y = a.from.y + (a.to.y - a.from.y) * t;

      // defenders drift toward him
      this.defense.forEach((d, i) => {
        const s = a.defenseStart[i];
        d.x = s.x + (a.carrier.x - s.x) * t * 0.4;
        d.y = s.y + (a.carrier.y - s.y) * t * 0.4;
      });

      // the ball: carried, held by the QB, or in the air
      if (a.throwAt === null) {
        this.ball.x = a.carrier.x + 1;
        this.ball.y = a.carrier.y;
      } else if (t < a.throwAt) {
        this.ball.x = a.throwFrom.x;
        this.ball.y = a.throwFrom.y;
      } else {
        const u = (t - a.throwAt) / (1 - a.throwAt);
        this.ball.x = a.throwFrom.x + (a.throwTo.x - a.throwFrom.x) * u;
        this.ball.y = a.throwFrom.y + (a.throwTo.y - a.throwFrom.y) * u;
        this.ball.lift = Math.sin(Math.PI * u);
      }

      this.cameraTarget = Math.min(Math.max(this.los, this.ball.y), 90);

      if (t === 1) {
        if (a.miss) this.ball.visible = false;
        this.anim = null;
        setTimeout(a.resolve, 600);
      }
    }
  }

  window.FieldRenderer = FieldRenderer;
})();