/* =========================================================
   deck.js — 강의용 슬라이드 엔진 + 인터랙션
   S&J희망나눔 · 삼덕SOS자립생활관 청년 역량강화 과정
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. 배경: 뉴럴 네트워크 파티클 캔버스
     --------------------------------------------------------- */
  function initNeural() {
    var cv = document.getElementById('neural');
    if (!cv) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, nodes = [], pulses = [];
    var mouse = { x: -9999, y: -9999 };

    function resize() {
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function build() {
      var count = Math.max(28, Math.min(78, Math.round((W * H) / 26000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: Math.random() * 1.5 + 0.7,
          hue: Math.random() < 0.72 ? 'mint' : (Math.random() < 0.6 ? 'blue' : 'coral')
        });
      }
    }

    var COLOR = {
      mint: [77, 225, 193],
      blue: [124, 156, 255],
      coral: [255, 107, 74]
    };

    var LINK = 158;

    function tick() {
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;

        // 마우스 밀어내기
        var mdx = n.x - mouse.x, mdy = n.y - mouse.y;
        var md = Math.sqrt(mdx * mdx + mdy * mdy);
        if (md < 130 && md > 0.1) {
          n.x += (mdx / md) * (130 - md) * 0.035;
          n.y += (mdy / md) * (130 - md) * 0.035;
        }
      }

      // 연결선
      for (var a = 0; a < nodes.length; a++) {
        for (var b = a + 1; b < nodes.length; b++) {
          var dx = nodes[a].x - nodes[b].x, dy = nodes[a].y - nodes[b].y;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            var o = (1 - d / LINK) * 0.2;
            ctx.strokeStyle = 'rgba(125,175,230,' + o.toFixed(3) + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(nodes[a].x, nodes[a].y);
            ctx.lineTo(nodes[b].x, nodes[b].y);
            ctx.stroke();
          }
        }
      }

      // 노드
      for (var k = 0; k < nodes.length; k++) {
        var p = nodes[k], c = COLOR[p.hue];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',.62)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',.055)';
        ctx.fill();
      }

      // 신호 펄스
      if (Math.random() < 0.035 && nodes.length > 4 && pulses.length < 9) {
        var s = nodes[(Math.random() * nodes.length) | 0];
        var e = nodes[(Math.random() * nodes.length) | 0];
        if (s !== e) pulses.push({ s: s, e: e, t: 0 });
      }
      for (var q = pulses.length - 1; q >= 0; q--) {
        var pu = pulses[q];
        pu.t += 0.016;
        if (pu.t >= 1) { pulses.splice(q, 1); continue; }
        var px = pu.s.x + (pu.e.x - pu.s.x) * pu.t;
        var py = pu.s.y + (pu.e.y - pu.s.y) * pu.t;
        var fade = Math.sin(pu.t * Math.PI);
        ctx.beginPath();
        ctx.arc(px, py, 2.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(77,225,193,' + (fade * 0.85).toFixed(3) + ')';
        ctx.fill();
      }

      requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('mouseout', function () { mouse.x = -9999; mouse.y = -9999; });
    resize();
    tick();
  }

  /* ---------------------------------------------------------
     2. 슬라이드 엔진
     --------------------------------------------------------- */
  function initDeck() {
    var deck = document.querySelector('.deck');
    if (!deck) return;

    var slides = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
    if (!slides.length) return;

    var total = slides.length;
    var cur = 0;
    var revealGuard = null;

    var elCur = document.getElementById('cur');
    var elTot = document.getElementById('tot');
    var elBar = document.getElementById('bar');
    var elPart = document.getElementById('part');
    var elGhost = document.getElementById('ghost');
    var overlay = document.getElementById('overlay');
    var tocBox = document.getElementById('toc');
    var blackout = document.getElementById('blackout');

    if (elTot) elTot.textContent = String(total).padStart(2, '0');

    /* 목차 생성 */
    if (tocBox) {
      slides.forEach(function (s, i) {
        var b = document.createElement('button');
        b.className = 'toc-item';
        b.innerHTML = '<i>' + String(i + 1).padStart(2, '0') + '</i><span>' +
          (s.dataset.title || '슬라이드 ' + (i + 1)) + '</span>';
        b.addEventListener('click', function () { go(i); closeOverlay(); });
        tocBox.appendChild(b);
      });
    }

    function paintToc() {
      if (!tocBox) return;
      Array.prototype.forEach.call(tocBox.children, function (c, i) {
        c.classList.toggle('cur', i === cur);
      });
    }

    function go(i, skipHash) {
      i = Math.max(0, Math.min(total - 1, i));
      slides[cur].classList.remove('is-active');
      cur = i;
      var s = slides[cur];
      s.classList.add('is-active');
      s.scrollTop = 0;

      // 등장 애니메이션 재시작
      var rv = s.querySelectorAll('.reveal');
      Array.prototype.forEach.call(rv, function (el, n) {
        el.style.opacity = '';
        el.style.transform = '';
        el.style.animation = 'none';
        el.style.setProperty('--i', Math.min(n, 10));
        void el.offsetWidth;
        el.style.animation = '';
      });

      // 안전장치 — 브라우저가 애니메이션을 멈춘 상태(백그라운드 탭, 저전력 모드,
      // 화면 미러링 등)에서도 내용이 반드시 보이도록 강제로 표시한다.
      clearTimeout(revealGuard);
      revealGuard = setTimeout(function () {
        Array.prototype.forEach.call(rv, function (el) {
          if (parseFloat(getComputedStyle(el).opacity) < 1) {
            el.style.opacity = '1';
            el.style.transform = 'none';
          }
        });
      }, 2000);

      if (elCur) elCur.textContent = String(cur + 1).padStart(2, '0');
      if (elBar) elBar.style.width = ((cur + 1) / total * 100) + '%';
      if (elPart) elPart.textContent = s.dataset.part || '';
      if (elGhost) elGhost.textContent = String(cur + 1).padStart(2, '0');
      if (!skipHash) history.replaceState(null, '', '#' + (cur + 1));
      paintToc();
    }

    function next() { if (cur < total - 1) go(cur + 1); }
    function prev() { if (cur > 0) go(cur - 1); }

    function openOverlay() { if (overlay) { overlay.classList.add('open'); paintToc(); } }
    function closeOverlay() { if (overlay) overlay.classList.remove('open'); }
    function toggleOverlay() {
      if (!overlay) return;
      overlay.classList.contains('open') ? closeOverlay() : openOverlay();
    }

    /* 키보드 */
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;

      switch (e.key) {
        case 'ArrowRight': case 'PageDown': case ' ': case 'Enter':
          e.preventDefault(); next(); break;
        case 'ArrowLeft': case 'PageUp':
          e.preventDefault(); prev(); break;
        case 'ArrowDown': e.preventDefault(); next(); break;
        case 'ArrowUp': e.preventDefault(); prev(); break;
        case 'Home': e.preventDefault(); go(0); break;
        case 'End': e.preventDefault(); go(total - 1); break;
        case 'Escape': closeOverlay(); break;
        default:
          var k = e.key.toLowerCase();
          if (k === 'm') { e.preventDefault(); toggleOverlay(); }
          else if (k === 'f') { e.preventDefault(); toggleFull(); }
          else if (k === 'b') { e.preventDefault(); if (blackout) blackout.classList.toggle('on'); }
          else if (k === 't') { e.preventDefault(); toggleTimer(); }
      }
    });

    if (blackout) blackout.addEventListener('click', function () { blackout.classList.remove('on'); });

    /* 터치 스와이프 */
    var tx = 0, ty = 0;
    deck.addEventListener('touchstart', function (e) {
      tx = e.changedTouches[0].clientX; ty = e.changedTouches[0].clientY;
    }, { passive: true });
    deck.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 62 && Math.abs(dx) > Math.abs(dy) * 1.6) { dx < 0 ? next() : prev(); }
    }, { passive: true });

    /* 버튼 */
    var bNext = document.getElementById('btn-next');
    var bPrev = document.getElementById('btn-prev');
    var bToc = document.getElementById('btn-toc');
    var bFull = document.getElementById('btn-full');
    if (bNext) bNext.addEventListener('click', next);
    if (bPrev) bPrev.addEventListener('click', prev);
    if (bToc) bToc.addEventListener('click', toggleOverlay);
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) closeOverlay(); });

    function toggleFull() {
      if (!document.fullscreenElement) {
        (document.documentElement.requestFullscreen || function () {}).call(document.documentElement);
      } else if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    if (bFull) bFull.addEventListener('click', toggleFull);

    /* 타이머 (2시간 강의용) */
    var tEl = document.getElementById('timer');
    var tRun = false, tSec = 0, tId = null;
    function paintTimer() {
      if (!tEl) return;
      var m = Math.floor(tSec / 60), s = tSec % 60;
      tEl.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      tEl.classList.toggle('on', tRun);
    }
    function toggleTimer() {
      tRun = !tRun;
      if (tRun) { tId = setInterval(function () { tSec++; paintTimer(); }, 1000); }
      else { clearInterval(tId); }
      paintTimer();
    }
    if (tEl) {
      tEl.addEventListener('click', toggleTimer);
      tEl.addEventListener('dblclick', function () { tSec = 0; paintTimer(); });
      paintTimer();
    }

    /* 해시로 시작 슬라이드 복원 + 주소창에서 번호를 바꿔도 이동 */
    function fromHash(skipHash) {
      var h = parseInt(location.hash.replace('#', ''), 10);
      if (!isNaN(h) && h - 1 !== cur) go(h - 1, skipHash);
      else if (isNaN(h) && skipHash) go(0, true);
    }
    window.addEventListener('hashchange', function () { fromHash(true); });
    fromHash(true);
  }

  /* ---------------------------------------------------------
     3. 인터랙션 컴포넌트
     --------------------------------------------------------- */
  function initComponents() {
    /* 3-1. 아코디언 */
    document.addEventListener('click', function (e) {
      var q = e.target.closest ? e.target.closest('.acc-q') : null;
      if (!q) return;
      var item = q.parentElement;
      var group = item.parentElement;
      var wasOpen = item.classList.contains('open');
      if (group.dataset.single !== 'false') {
        Array.prototype.forEach.call(group.querySelectorAll('.acc-item'), function (x) { x.classList.remove('open'); });
      }
      item.classList.toggle('open', !wasOpen);
    });

    /* 3-2. 탭 */
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.tab-btn') : null;
      if (!b) return;
      var nav = b.parentElement;
      var wrap = nav.parentElement;
      Array.prototype.forEach.call(nav.querySelectorAll('.tab-btn'), function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      Array.prototype.forEach.call(wrap.querySelectorAll('.tab-panel'), function (p) {
        p.classList.toggle('on', p.dataset.tab === b.dataset.tab);
      });
    });

    /* 3-3. 체크리스트 */
    document.addEventListener('click', function (e) {
      var c = e.target.closest ? e.target.closest('.chk') : null;
      if (!c) return;
      c.classList.toggle('done');
      var list = c.parentElement;
      var score = list.parentElement.querySelector('.chk-score');
      if (score) {
        var all = list.querySelectorAll('.chk').length;
        var done = list.querySelectorAll('.chk.done').length;
        score.textContent = '// 완료 ' + done + ' / ' + all +
          (done === all ? '  —  완벽합니다. 이제 지원하셔도 됩니다.' : '');
      }
    });

    /* 3-4. 복사 버튼 */
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.copy-btn') : null;
      if (!b) return;
      var box = b.closest('.prompt') || b.closest('.builder-out');
      var pre = box ? box.querySelector('pre') : null;
      if (!pre) return;
      var txt = pre.innerText;
      var done = function () {
        var old = b.textContent;
        b.textContent = '복사됨 ✓'; b.classList.add('ok');
        setTimeout(function () { b.textContent = old; b.classList.remove('ok'); }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, function () { fallback(txt, done); });
      } else { fallback(txt, done); }
    });
    function fallback(txt, cb) {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); cb(); } catch (err) {}
      document.body.removeChild(ta);
    }

    /* 3-5. 거수 집계 바 — 강사가 손 든 인원만큼 직접 올리고 내린다
       · 클릭        = +1명
       · 우클릭       = -1명
       · Shift+클릭   = 0명으로 초기화
       인원수는 .poll 컨테이너의 data-total 로 정한다 (기본 15명). */
    function pollTotal(row) {
      var box = row.closest('.poll');
      var n = parseInt((box && box.dataset.total) || '15', 10);
      return (isNaN(n) || n < 1) ? 15 : n;
    }

    function pollSet(row, next) {
      var total = pollTotal(row);
      next = Math.max(0, Math.min(total, next));
      row.dataset.pollN = next;

      var fill = row.querySelector('.poll-fill');
      if (fill) fill.style.width = (next / total * 100) + '%';

      var label = row.querySelector('.poll-count');
      if (label) {
        label.textContent = next + '명';
        label.classList.toggle('zero', next === 0);
      }
    }

    function pollStep(row, delta) {
      pollSet(row, parseInt(row.dataset.pollN || '0', 10) + delta);
    }

    document.addEventListener('click', function (e) {
      var r = e.target.closest ? e.target.closest('.poll-row') : null;
      if (!r) return;
      e.preventDefault();
      if (e.shiftKey) pollSet(r, 0);   // Shift+클릭 = 초기화
      else pollStep(r, 1);             // 클릭 = +1명
    });

    document.addEventListener('contextmenu', function (e) {
      var r = e.target.closest ? e.target.closest('.poll-row') : null;
      if (!r) return;
      e.preventDefault();              // 우클릭 = -1명
      pollStep(r, -1);
    });

    // 초기 표시 (0명)
    Array.prototype.forEach.call(document.querySelectorAll('.poll-row'), function (r) {
      pollSet(r, parseInt(r.dataset.pollN || '0', 10));
    });

    /* 3-6. 템플릿 빌더 (프롬프트 빌더 · 자기소개 빌더 공용)
       - data-template 속성에 {{키}} 자리표시자를 쓴 템플릿을 넣으면 그대로 채워집니다.
       - 없으면 기본 프롬프트 템플릿을 사용합니다. */
    var DEFAULT_TPL =
      '[역할] 너는 {{role}}야.\n\n' +
      '[맥락] 나는 {{ctx}}이고,\n' +
      '        {{goal}}하려고 해.\n\n' +
      '[요청] {{task}}\n\n' +
      '[형식] {{fmt}}\n\n' +
      '[제약] 과장하지 말고, 내가 말한 사실만 사용해.\n' +
      '        모르는 부분은 나에게 되물어봐.';

    Array.prototype.forEach.call(document.querySelectorAll('[data-builder]'), function (builder) {
      var out = builder.querySelector('[data-builder-out]') || builder.querySelector('pre');
      if (!out) return;
      var tpl = (builder.getAttribute('data-template') || DEFAULT_TPL).replace(/\\n/g, '\n');
      var fields = builder.querySelectorAll('[data-bf]');
      var render = function () {
        var v = {};
        Array.prototype.forEach.call(fields, function (f) {
          v[f.dataset.bf] = f.value.trim() || (f.getAttribute('placeholder') || '____');
        });
        out.textContent = tpl.replace(/\{\{(\w+)\}\}/g, function (m, k) {
          return v[k] !== undefined ? v[k] : m;
        });
      };
      Array.prototype.forEach.call(fields, function (f) {
        f.addEventListener('input', render); f.addEventListener('change', render);
      });
      render();
    });

    /* 3-7. 모의면접 질문 룰렛 */
    var roul = document.querySelector('[data-roulette]');
    if (roul) {
      var BANK = [
        ['공통', '1분 동안 자기소개 해보세요.'],
        ['공통', '우리 회사에 지원한 이유가 무엇인가요?'],
        ['공통', '본인의 가장 큰 강점 한 가지와 근거를 말해보세요.'],
        ['공통', '단점은 무엇이고, 그것 때문에 실패한 경험이 있나요?'],
        ['공통', '5년 뒤 본인은 어떤 모습일 것 같나요?'],
        ['경험', '가장 힘들었던 순간과 그것을 이겨낸 방법을 말해주세요.'],
        ['경험', '누군가와 갈등이 있었을 때 어떻게 해결했나요?'],
        ['경험', '스스로 목표를 세우고 끝까지 해낸 경험이 있나요?'],
        ['경험', '실수를 했을 때 어떻게 수습했는지 사례를 들어주세요.'],
        ['AI시대', 'AI를 실제 업무에 어떻게 활용하실 수 있나요?'],
        ['AI시대', '최근 써 본 AI 도구와, 그걸로 만든 결과물을 말해보세요.'],
        ['AI시대', 'AI가 잘못된 답을 줬을 때 어떻게 확인하시겠습니까?'],
        ['압박', '경력이 없는데 왜 우리가 뽑아야 하나요?'],
        ['압박', '공백 기간 동안 무엇을 하셨습니까?'],
        ['압박', '더 좋은 회사에 붙으면 바로 나가는 것 아닌가요?'],
        ['압박', '연봉이 기대보다 낮다면 어떻게 하시겠어요?'],
        ['복지분야', '왜 사회복지 분야에서 일하고 싶으신가요?'],
        ['복지분야', '이용자가 무리한 요구를 하면 어떻게 대응하시겠어요?'],
        ['복지분야', '감정적으로 소진될 때 스스로 어떻게 관리하시나요?'],
        ['중소기업', '업무 범위가 넓은데 여러 일을 동시에 할 수 있나요?'],
        ['중소기업', '입사하면 3개월 안에 무엇을 하시겠습니까?'],
        ['중소기업', '우리 회사 제품(서비스)에 대해 아는 대로 말해보세요.'],
        ['마무리', '마지막으로 하고 싶은 말이 있나요?'],
        ['마무리', '저희에게 궁금한 점이 있으신가요?']
      ];
      var box = roul.querySelector('.roul-box');
      var qEl = roul.querySelector('.roul-q');
      var cEl = roul.querySelector('.roul-cat');
      var btn = roul.querySelector('[data-spin]');
      var last = -1;
      btn.addEventListener('click', function () {
        box.classList.add('spin');
        var n = 0;
        var iv = setInterval(function () {
          var i = (Math.random() * BANK.length) | 0;
          cEl.textContent = BANK[i][0];
          qEl.textContent = BANK[i][1];
          if (++n > 12) {
            clearInterval(iv);
            var f;
            do { f = (Math.random() * BANK.length) | 0; } while (f === last && BANK.length > 1);
            last = f;
            cEl.textContent = BANK[f][0];
            qEl.textContent = BANK[f][1];
            box.classList.remove('spin');
          }
        }, 65);
      });
    }

    /* 3-8. 호흡 훈련 */
    var br = document.querySelector('[data-breathe]');
    if (br) {
      var circle = br.querySelector('.breathe');
      var bbtn = br.querySelector('[data-breathe-btn]');
      var lbl = br.querySelector('[data-breathe-label]');
      var running = false, phase = 0, pid = null;
      var PH = ['들이쉬기 4초', '멈추기 4초', '내쉬기 4초', '멈추기 4초'];
      bbtn.addEventListener('click', function () {
        running = !running;
        circle.classList.toggle('run', running);
        bbtn.textContent = running ? '■  멈추기' : '▶  같이 해보기';
        if (running) {
          phase = 0; lbl.textContent = PH[0];
          pid = setInterval(function () {
            phase = (phase + 1) % 4;
            lbl.textContent = PH[phase];
          }, 4000);
        } else {
          clearInterval(pid);
          lbl.textContent = '준비';
        }
      });
    }

    /* 3-9. 숫자 카운트업 */
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.dataset.counted) return;
        el.dataset.counted = '1';
        var end = parseFloat(el.dataset.count);
        var suf = el.dataset.suffix || '';
        var dec = (String(end).split('.')[1] || '').length;
        var t0 = performance.now(), dur = 1100;
        (function step(t) {
          var p = Math.min(1, (t - t0) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = (end * e).toFixed(dec) + suf;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.4 }) : null;

    if (io) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el) { io.observe(el); });
      // 슬라이드 전환 시에도 다시 관찰되도록 (display:none → block)
      document.addEventListener('keydown', function () {
        setTimeout(function () {
          Array.prototype.forEach.call(document.querySelectorAll('.slide.is-active [data-count]'), function (el) { io.observe(el); });
        }, 60);
      });
    }
  }

  /* ---------------------------------------------------------
     4. 부팅
     --------------------------------------------------------- */
  function boot() {
    initNeural();
    initDeck();
    initComponents();

    // 허브 페이지 등장 애니메이션에도 동일한 안전장치를 건다.
    setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.rise'), function (el) {
        if (parseFloat(getComputedStyle(el).opacity) < 1) {
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
    }, 2400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
