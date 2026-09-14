/* HUG Learning. A quiz-style learning tool that runs entirely in the browser. */
(function () {
  'use strict';

  var DRAFT_KEY = 'hug-learning-draft-v1';
  var CURRICULA_DIR = 'curricula/';

  var app = document.getElementById('app');
  var homeBtn = document.getElementById('home-btn');
  var params = new URLSearchParams(window.location.search);

  if (params.get('embed') === '1') {
    document.body.classList.add('embed');
  }

  /* ------------------------------------------------------------------ */
  /* DOM helpers                                                          */
  /* ------------------------------------------------------------------ */

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) { return; }
        if (key === 'class') { el.className = value; }
        else if (key === 'text') { el.textContent = value; }
        else if (key.slice(0, 2) === 'on') { el.addEventListener(key.slice(2), value); }
        else if (key === 'checked' || key === 'disabled' || key === 'hidden' || key === 'value' || key === 'selected') { el[key] = value; }
        else { el.setAttribute(key, value === true ? '' : value); }
      });
    }
    for (var i = 2; i < arguments.length; i++) { append(el, arguments[i]); }
    return el;
  }

  function append(el, child) {
    if (child === null || child === undefined || child === false) { return; }
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
      return;
    }
    el.appendChild(child);
  }

  function svg(pathData) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    pathData.forEach(function (d) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }

  var ICON_BOOK = ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'];
  var ICON_PEN = ['M12 20h9', 'M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'];
  var ICON_LEAF = ['M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z', 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'];
  var ICON_TRASH = ['M3 6h18', 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6', 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', 'M10 11v6', 'M14 11v6'];

  function render(node, opts) {
    app.innerHTML = '';
    append(app, node);
    homeBtn.hidden = !(opts && opts.home);
    if (!(opts && opts.keepScroll)) { window.scrollTo(0, 0); }
  }

  /* ------------------------------------------------------------------ */
  /* Modal dialogs                                                        */
  /* ------------------------------------------------------------------ */

  /* Shows content over a dark backdrop. Escape and a backdrop click dismiss it. */
  function openModal(buildContent) {
    var previous = document.activeElement;
    var box = h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' });
    var backdrop = h('div', { class: 'modal-backdrop' }, box);
    var onDismiss = null;
    var closed = false;

    function close() {
      if (closed) { return; }
      closed = true;
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      document.body.classList.remove('modal-open');
      if (previous && typeof previous.focus === 'function') { previous.focus(); }
    }
    function dismiss() { if (onDismiss) { onDismiss(); } else { close(); } }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); dismiss(); } }

    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) { dismiss(); } });
    document.addEventListener('keydown', onKey);

    var api = { close: close, onDismiss: function (fn) { onDismiss = fn; } };
    append(box, buildContent(api));
    document.body.classList.add('modal-open');
    document.body.appendChild(backdrop);
    var focusTarget = box.querySelector('[data-autofocus]') || box.querySelector('button, input, textarea, select');
    if (focusTarget) { focusTarget.focus(); }
    return api;
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      openModal(function (modal) {
        function finish(result) { modal.close(); resolve(result); }
        modal.onDismiss(function () { finish(false); });
        return [
          h('h2', { text: opts.title }),
          h('p', { text: opts.message }),
          h('div', { class: 'btn-row' },
            h('button', { type: 'button', class: 'btn btn-secondary', 'data-autofocus': true, onclick: function () { finish(false); } }, opts.cancelLabel || 'Cancel'),
            h('button', { type: 'button', class: 'btn' + (opts.danger ? ' btn-danger-solid' : ''), onclick: function () { finish(true); } }, opts.confirmLabel || 'OK')
          )
        ];
      });
    });
  }

  /* Lists the curricula on this site and resolves with the one picked, or null. */
  function pickFromSite() {
    return new Promise(function (resolve) {
      openModal(function (modal) {
        function finish(result) { modal.close(); resolve(result); }
        modal.onDismiss(function () { finish(null); });
        var listEl = h('div', { class: 'list' });
        fillCurriculumList(listEl, {
          actionLabel: 'Edit',
          allowInvalid: true,
          showFile: true,
          fileHint: 'Use Open from file instead.',
          onPick: finish
        });
        return [
          h('h2', { text: 'Open a curriculum from this site' }),
          listEl,
          h('div', { class: 'btn-row' },
            h('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { finish(null); } }, 'Cancel')
          )
        ];
      });
    });
  }

  function plural(n, word) {
    return n + ' ' + word + (n === 1 ? '' : 's');
  }

  function slugify(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'curriculum';
  }

  /* ------------------------------------------------------------------ */
  /* Curriculum model                                                     */
  /* ------------------------------------------------------------------ */

  function newOption() { return { text: '', correct: false, explanation: '' }; }
  function newQuestion() {
    return { type: 'single', prompt: '', explanation: '', options: [newOption(), newOption(), newOption()] };
  }
  function newCurriculum() { return { title: '', description: '', questions: [newQuestion()] }; }

  function normalizeCurriculum(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('This file is not a curriculum. Expected an object with a title and a list of questions.');
    }
    return {
      title: String(raw.title || '').trim(),
      description: String(raw.description || '').trim(),
      file: typeof raw.file === 'string' ? raw.file.split('/').pop() : '',
      questions: (Array.isArray(raw.questions) ? raw.questions : []).map(normalizeQuestion)
    };
  }

  function normalizeQuestion(q) {
    q = (q && typeof q === 'object') ? q : {};
    return {
      type: q.type === 'multiple' ? 'multiple' : 'single',
      prompt: String(q.prompt || q.question || '').trim(),
      explanation: String(q.explanation || '').trim(),
      options: (Array.isArray(q.options) ? q.options : []).map(function (o) {
        if (typeof o === 'string') { return { text: o.trim(), correct: false, explanation: '' }; }
        o = (o && typeof o === 'object') ? o : {};
        return {
          text: String(o.text || '').trim(),
          correct: !!o.correct,
          explanation: String(o.explanation || '').trim()
        };
      })
    };
  }

  function validateCurriculum(c) {
    var errors = [];
    if (!c.title) { errors.push('Give the curriculum a name.'); }
    if (!c.questions.length) { errors.push('Add at least one question.'); }
    c.questions.forEach(function (q, i) {
      var label = 'Question ' + (i + 1);
      if (!q.prompt) { errors.push(label + ' needs a prompt.'); }
      var filled = q.options.filter(function (o) { return o.text; });
      if (filled.length < 2) { errors.push(label + ' needs at least two answer options.'); }
      var correct = filled.filter(function (o) { return o.correct; }).length;
      if (q.type === 'single' && correct !== 1) { errors.push(label + ' must have exactly one correct answer.'); }
      if (q.type === 'multiple' && correct < 1) { errors.push(label + ' must have at least one correct answer.'); }
    });
    return errors;
  }

  /* Strip empty options and empty fields so the saved file stays small. */
  function exportCurriculum(c) {
    var out = { title: c.title, description: c.description, questions: [] };
    c.questions.forEach(function (q) {
      var eq = { type: q.type, prompt: q.prompt, options: [] };
      q.options.forEach(function (o) {
        if (!o.text) { return; }
        var eo = { text: o.text };
        if (o.correct) { eo.correct = true; }
        if (o.explanation) { eo.explanation = o.explanation; }
        eq.options.push(eo);
      });
      if (q.explanation) { eq.explanation = q.explanation; }
      out.questions.push(eq);
    });
    return out;
  }

  function parseCurriculumText(text) {
    var raw;
    try { raw = JSON.parse(text); }
    catch (e) { throw new Error('The file is not valid JSON. ' + e.message); }
    return normalizeCurriculum(raw);
  }

  /* ------------------------------------------------------------------ */
  /* Finding curricula on the host                                        */
  /* ------------------------------------------------------------------ */

  function manifestEntryName(entry) {
    if (typeof entry === 'string') { return entry.trim(); }
    if (entry && typeof entry.file === 'string') { return entry.file.trim(); }
    return '';
  }

  function discoverCurricula() {
    if (window.location.protocol === 'file:') {
      return Promise.resolve({ files: [], reason: 'file' });
    }
    return fetch(CURRICULA_DIR + 'index.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('no index')); })
      .then(function (list) {
        if (!Array.isArray(list)) { throw new Error('bad index'); }
        return { files: list.map(manifestEntryName).filter(Boolean) };
      })
      .catch(function () {
        return fetch(CURRICULA_DIR, { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error('no listing')); })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var files = [];
            Array.prototype.forEach.call(doc.querySelectorAll('a[href]'), function (a) {
              var href = a.getAttribute('href').split('?')[0].split('#')[0];
              var name = decodeURIComponent(href.split('/').pop());
              if (/\.json$/i.test(name) && name.toLowerCase() !== 'index.json' && files.indexOf(name) < 0) {
                files.push(name);
              }
            });
            return { files: files };
          })
          .catch(function () { return { files: [], reason: 'none' }; });
      });
  }

  function loadCurriculumFile(name) {
    var clean = String(name).split('/').pop();
    return fetch(CURRICULA_DIR + encodeURIComponent(clean), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) { throw new Error('Could not load "' + clean + '" (HTTP ' + r.status + ').'); }
        return r.text();
      })
      .then(parseCurriculumText)
      .then(function (c) { c.file = clean; return c; });
  }

  function readFileInput(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(new Error('Could not read the file.')); };
      reader.readAsText(file);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Screens: home and load                                               */
  /* ------------------------------------------------------------------ */

  function showHome() {
    session = null;
    var hasDraft = !!loadDraft();
    render(h('div', { class: 'narrow' },
      h('h1', { text: 'Welcome' }),
      h('p', { class: 'lead', text: 'Work through a set of questions until every answer is right, or build a set for someone else.' }),
      h('div', { class: 'choice-grid' },
        h('button', { type: 'button', class: 'choice-card', onclick: showLoad },
          h('span', { class: 'choice-icon' }, svg(ICON_BOOK)),
          h('span', { class: 'choice-title', text: 'Load a curriculum' }),
          h('span', { class: 'choice-desc', text: 'Pick a curriculum that is already here or open one from a file.' })
        ),
        h('button', { type: 'button', class: 'choice-card', onclick: function () { showEditor(); } },
          h('span', { class: 'choice-icon' }, svg(ICON_PEN)),
          h('span', { class: 'choice-title', text: hasDraft ? 'Continue your draft' : 'Create a curriculum' }),
          h('span', { class: 'choice-desc', text: hasDraft
            ? 'Pick up the curriculum you were writing.'
            : 'Write questions, mark the right answers, and add explanations, or edit a curriculum that is already here.' })
        )
      )
    ));
  }

  function showLoad() {
    var listEl = h('div', { class: 'list' }, h('p', { class: 'hint', text: 'Looking for curricula on this site...' }));
    var fileError = h('ul', { class: 'errors', hidden: true });

    function useText(text, errorEl) {
      try {
        var c = parseCurriculumText(text);
        var errors = validateCurriculum(c);
        if (errors.length) { showErrors(errorEl, errors); return; }
        showIntro(c);
      } catch (e) {
        showErrors(errorEl, [e.message]);
      }
    }

    var fileInput = h('input', {
      type: 'file', accept: '.json,application/json',
      onchange: function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) { return; }
        readFileInput(file).then(function (text) { useText(text, fileError); })
          .catch(function (err) { showErrors(fileError, [err.message]); });
        e.target.value = '';
      }
    });

    render(h('div', { class: 'narrow' },
      h('h1', { text: 'Load a curriculum' }),
      h('section', { class: 'card' },
        h('h2', { text: 'Available on this site' }),
        listEl
      ),
      h('section', { class: 'card' },
        h('h2', { text: 'Open a file from your computer' }),
        h('p', { class: 'hint', text: 'Choose a curriculum file that was saved from the editor.' }),
        fileError,
        h('label', { class: 'btn btn-secondary file-label' }, 'Choose a file', fileInput)
      )
    ), { home: true });

    fillCurriculumList(listEl, {
      actionLabel: 'Open',
      fileHint: 'Open a file below instead.',
      onPick: function (c) { showIntro(c); }
    });
  }

  /* Fills listEl with the curricula found on this site, one row per file. */
  function fillCurriculumList(listEl, opts) {
    listEl.innerHTML = '';
    listEl.appendChild(h('p', { class: 'hint', text: 'Looking for curricula on this site...' }));
    discoverCurricula().then(function (found) {
      listEl.innerHTML = '';
      if (!found.files.length) {
        var msg = found.reason === 'file'
          ? 'Curriculum detection only works when this page is served from a website. ' + opts.fileHint
          : 'No curricula were found in the "curricula" folder yet.';
        listEl.appendChild(h('p', { class: 'hint', text: msg }));
        return;
      }
      found.files.forEach(function (name) {
        var row = h('div', { class: 'list-item' }, h('div', null, h('h3', { text: name }), h('p', { class: 'meta', text: 'Loading...' })));
        listEl.appendChild(row);
        loadCurriculumFile(name).then(function (c) {
          var errors = validateCurriculum(c);
          row.innerHTML = '';
          if (errors.length && !opts.allowInvalid) {
            row.classList.add('is-error');
            append(row, h('div', null, h('h3', { text: name }), h('p', { text: 'This file has problems: ' + errors[0] })));
            return;
          }
          append(row, [
            h('div', null,
              h('h3', { text: c.title || name }),
              c.description ? h('p', { text: c.description }) : null,
              h('p', { class: 'meta', text: plural(c.questions.length, 'question') + (opts.showFile ? ' in ' + name : '') }),
              errors.length ? h('p', { class: 'meta', text: 'Needs fixing: ' + errors[0] }) : null
            ),
            h('button', { type: 'button', class: 'btn', onclick: function () { opts.onPick(c); } }, opts.actionLabel)
          ]);
        }).catch(function (err) {
          row.classList.add('is-error');
          row.innerHTML = '';
          append(row, h('div', null, h('h3', { text: name }), h('p', { text: err.message })));
        });
      });
    });
  }

  function showErrors(el, errors) {
    el.innerHTML = '';
    el.hidden = !errors.length;
    errors.forEach(function (msg) { el.appendChild(h('li', { text: msg })); });
    if (errors.length) { el.scrollIntoView({ block: 'nearest' }); }
  }

  function showLoadError(message) {
    render(h('div', { class: 'narrow' }, h('div', { class: 'card' },
      h('h1', { text: 'Could not open that curriculum' }),
      h('p', { text: message }),
      h('button', { type: 'button', class: 'btn', onclick: showHome }, 'Go to the start')
    )));
  }

  /* ------------------------------------------------------------------ */
  /* Screens: learner flow                                                */
  /* ------------------------------------------------------------------ */

  var session = null;

  function showIntro(curriculum, opts) {
    opts = opts || {};
    var n = curriculum.questions.length;
    render(h('div', { class: 'narrow' }, h('div', { class: 'card' },
      h('p', { class: 'eyebrow', text: opts.preview ? 'Preview' : 'Curriculum' }),
      h('h1', { text: curriculum.title }),
      curriculum.description ? h('p', { class: 'lead', text: curriculum.description }) : null,
      h('p', { class: 'hint', text: plural(n, 'question') }),
      h('hr', { class: 'divider' }),
      h('h3', { text: 'How it works' }),
      h('p', { text: 'Answer each question. If you miss one, you will see the right answer with an explanation, and that question comes back around after the rest. This continues until you have answered every question correctly.' }),
      h('div', { class: 'btn-row' },
        h('button', { type: 'button', class: 'btn', onclick: function () { startSession(curriculum, opts); } }, 'Start'),
        opts.preview ? h('button', { type: 'button', class: 'btn btn-ghost', onclick: function () { showEditor({ keepScroll: false }); } }, 'Back to editor') : null
      )
    )), { home: !opts.preview });
  }

  function startSession(curriculum, opts) {
    opts = opts || {};
    var questions = curriculum.questions.map(function (q) {
      return {
        type: q.type,
        prompt: q.prompt,
        explanation: q.explanation,
        options: q.options.filter(function (o) { return o.text; })
      };
    });
    session = {
      title: curriculum.title,
      questions: questions,
      queue: questions.map(function (_, i) { return i; }),
      pos: 0,
      retry: [],
      round: 1,
      preview: !!opts.preview
    };
    showQuestion();
  }

  function sameSet(a, b) {
    if (a.length !== b.length) { return false; }
    return a.every(function (x) { return b.indexOf(x) >= 0; });
  }

  function showQuestion() {
    var s = session;
    var qi = s.queue[s.pos];
    var q = s.questions[qi];
    var multi = q.type === 'multiple';
    var inputName = 'answer-' + qi;
    var inputs = [];

    var optionItems = q.options.map(function (o, i) {
      var input = h('input', { type: multi ? 'checkbox' : 'radio', name: inputName, value: String(i), onchange: onSelect });
      inputs.push(input);
      var label = h('label', { class: 'option' }, input,
        h('span', { class: 'option-body' }, h('span', { class: 'option-text', text: o.text }))
      );
      return h('li', null, label);
    });

    var list = h('ul', { class: 'options' }, optionItems);
    var checkBtn = h('button', { type: 'submit', class: 'btn', disabled: true }, 'Check answer');
    var actions = h('div', { class: 'btn-row' }, checkBtn);
    var feedbackSlot = h('div');
    var form = h('form', { onsubmit: function (e) { e.preventDefault(); check(); } }, list, feedbackSlot, actions);

    var pct = Math.round((s.pos / s.queue.length) * 100);
    var meta = h('div', { class: 'progress-meta' },
      h('span', { text: 'Question ' + (s.pos + 1) + ' of ' + s.queue.length }),
      s.round > 1 ? h('span', { class: 'badge', text: 'Round ' + s.round }) : null,
      s.retry.length ? h('span', { class: 'badge retry', text: plural(s.retry.length, 'question') + ' to retry' }) : null
    );

    render(h('div', { class: 'narrow' },
      h('div', { class: 'progress' }, meta,
        h('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct) },
          h('span', { style: 'width:' + pct + '%' }))
      ),
      h('div', { class: 'card' },
        h('p', { class: 'eyebrow', text: s.title }),
        h('h2', { class: 'prompt', text: q.prompt }),
        h('p', { class: 'hint prompt-hint', text: multi ? 'Select all that apply.' : 'Select one answer.' }),
        form
      )
    ), { home: !s.preview });

    function selectedIndices() {
      return inputs.map(function (inp, i) { return inp.checked ? i : -1; }).filter(function (i) { return i >= 0; });
    }

    function onSelect() {
      inputs.forEach(function (inp) {
        inp.parentNode.classList.toggle('is-selected', inp.checked);
      });
      checkBtn.disabled = selectedIndices().length === 0;
    }

    function check() {
      var selected = selectedIndices();
      if (!selected.length) { return; }
      var correctSet = q.options.map(function (o, i) { return o.correct ? i : -1; }).filter(function (i) { return i >= 0; });
      var isCorrect = sameSet(selected, correctSet);

      list.classList.add('locked');
      inputs.forEach(function (inp, i) {
        inp.disabled = true;
        var label = inp.parentNode;
        var body = label.querySelector('.option-body');
        var o = q.options[i];
        var picked = inp.checked;
        label.classList.remove('is-selected');
        if (o.correct) {
          label.classList.add('is-correct');
          if (picked) {
            body.appendChild(h('span', { class: 'tag ok', text: 'Correct' }));
          } else {
            label.classList.add('is-missed');
            body.appendChild(h('span', { class: 'tag ok', text: multi ? 'Also correct' : 'Correct answer' }));
          }
        } else if (picked) {
          label.classList.add('is-wrong');
          body.appendChild(h('span', { class: 'tag bad', text: 'Incorrect' }));
          if (o.explanation) { body.appendChild(h('p', { class: 'why', text: o.explanation })); }
        }
      });

      var panel;
      if (isCorrect) {
        panel = h('div', { class: 'feedback ok', tabindex: '-1', role: 'status' },
          h('h3', { text: 'Correct' }),
          q.explanation ? h('p', { text: q.explanation }) : null
        );
      } else {
        s.retry.push(qi);
        panel = h('div', { class: 'feedback bad', tabindex: '-1', role: 'status' },
          h('h3', { text: 'Not quite' }),
          h('p', { text: (correctSet.length > 1 ? 'The correct answers are highlighted above.' : 'The correct answer is highlighted above.') + (q.explanation ? ' ' + q.explanation : '') }),
          h('p', { text: 'You will get another try later.' })
        );
      }
      feedbackSlot.appendChild(panel);

      var nextBtn = h('button', { type: 'button', class: 'btn', onclick: next }, nextLabel());
      actions.innerHTML = '';
      actions.appendChild(nextBtn);
      panel.focus();
    }

    function nextLabel() {
      if (s.pos + 1 < s.queue.length) { return 'Next question'; }
      return s.retry.length ? 'Continue' : 'Finish';
    }

    function next() {
      s.pos += 1;
      if (s.pos < s.queue.length) { showQuestion(); }
      else if (s.retry.length) { showRoundBreak(); }
      else { showDone(); }
    }
  }

  function showRoundBreak() {
    var s = session;
    var n = s.retry.length;
    render(h('div', { class: 'narrow' }, h('div', { class: 'card center' },
      h('p', { class: 'eyebrow', text: 'Round ' + s.round + ' complete' }),
      h('h1', { text: n === 1 ? 'One question to try again' : n + ' questions to try again' }),
      h('p', { text: 'You can now try again on the questions you missed.' }),
      h('button', { type: 'button', class: 'btn', onclick: function () {
        s.queue = s.retry;
        s.retry = [];
        s.round += 1;
        s.pos = 0;
        showQuestion();
      } }, 'Continue')
    )), { home: !s.preview });
  }

  function showDone() {
    var s = session;
    render(h('div', { class: 'narrow' }, h('div', { class: 'card done' },
      h('div', { class: 'leaf' }, svg(ICON_LEAF)),
      h('h1', { text: 'You have completed the learning tool.' }),
      h('p', { class: 'wait', text: 'Please wait.' }),
      s.preview ? h('p', null, h('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { showEditor(); } }, 'Back to editor')) : null
    )));
  }

  /* ------------------------------------------------------------------ */
  /* Screens: editor                                                      */
  /* ------------------------------------------------------------------ */

  var draft = null;

  function saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) { /* storage may be unavailable */ }
  }

  function loadDraft() {
    try {
      var text = localStorage.getItem(DRAFT_KEY);
      return text ? normalizeCurriculum(JSON.parse(text)) : null;
    } catch (e) { return null; }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
  }

  function draftIsEmpty(d) {
    if (!d) { return true; }
    if (d.title || d.description) { return false; }
    return d.questions.every(function (q) {
      return !q.prompt && !q.explanation && q.options.every(function (o) { return !o.text && !o.explanation; });
    });
  }

  function showEditor(opts) {
    opts = opts || {};
    session = null;
    if (!draft) { draft = loadDraft() || newCurriculum(); }

    var errorsEl = h('ul', { class: 'errors', hidden: true });
    var statusEl = h('span', { class: 'status', role: 'status' });
    var questionsEl = h('div');
    var toolbarErrors = h('ul', { class: 'errors', hidden: true });

    var titleInput = h('input', { type: 'text', value: draft.title, placeholder: 'For example: Seed saving basics',
      oninput: function (e) { draft.title = e.target.value; saveDraft(); } });
    var descInput = h('textarea', { rows: 2, value: draft.description, placeholder: 'One or two sentences about what this curriculum covers.',
      oninput: function (e) { draft.description = e.target.value; saveDraft(); } });

    /* Replaces the draft with another curriculum, asking first when there is work to lose. */
    function adoptCurriculum(c) {
      var proceed = draftIsEmpty(draft) ? Promise.resolve(true) : confirmDialog({
        title: 'Replace your draft?',
        message: 'Opening "' + (c.title || 'this curriculum') + '" replaces the draft you are working on. This cannot be undone.',
        confirmLabel: 'Replace',
        danger: true
      });
      proceed.then(function (yes) {
        if (!yes) { return; }
        draft = c;
        if (!draft.questions.length) { draft.questions.push(newQuestion()); }
        saveDraft();
        showEditor();
      });
    }

    var importInput = h('input', {
      type: 'file', accept: '.json,application/json', hidden: true, tabindex: '-1', 'aria-hidden': 'true',
      onchange: function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) { return; }
        readFileInput(file).then(function (text) {
          var c = parseCurriculumText(text);
          c.file = file.name;
          adoptCurriculum(c);
        }).catch(function (err) { showErrors(toolbarErrors, [err.message]); });
        e.target.value = '';
      }
    });

    function openFromSite() {
      pickFromSite().then(function (c) { if (c) { adoptCurriculum(c); } });
    }

    function deleteDraft() {
      confirmDialog({
        title: 'Delete this draft?',
        message: 'This removes everything in the editor, including every question. This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true
      }).then(function (yes) {
        if (!yes) { return; }
        clearDraft();
        draft = newCurriculum();
        showEditor();
      });
    }

    function checkedDraft() {
      var errors = validateCurriculum(draft);
      showErrors(toolbarErrors, errors);
      return errors.length ? null : exportCurriculum(draft);
    }

    function setStatus(text) {
      statusEl.textContent = text;
      if (text) { setTimeout(function () { if (statusEl.textContent === text) { statusEl.textContent = ''; } }, 4000); }
    }

    function downloadJSON() {
      var c = checkedDraft();
      if (!c) { return; }
      var json = JSON.stringify(c, null, 2);
      var name = /\.json$/i.test(draft.file || '') ? draft.file : slugify(c.title) + '.json';
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = h('a', { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      setStatus('Saved as ' + name);
      savedDialog(name);
    }

    /* Tells the author what to do with the file that was just downloaded. */
    function savedDialog(name) {
      openModal(function (modal) {
        modal.onDismiss(modal.close);
        return [
          h('h2', { text: 'Saved as ' + name }),
          h('p', { text: 'The file is in your downloads folder. There are two ways to use it.' }),
          h('ul', { class: 'plain-list' },
            h('li', null, h('strong', { text: 'Add it to the site. ' }), 'Send the file to Maple to upload to the curriculum directory. Once it is there, it appears in the list whenever anyone opens this tool.'),
            h('li', null, h('strong', { text: 'Run it yourself. ' }), 'Open this tool, choose Load a curriculum, then Choose a file, and pick the file from your computer.')
          ),
          h('div', { class: 'btn-row' },
            h('button', { type: 'button', class: 'btn', 'data-autofocus': true, onclick: modal.close }, 'OK')
          )
        ];
      });
    }

    function preview() {
      var c = checkedDraft();
      if (!c) { return; }
      showIntro(normalizeCurriculum(c), { preview: true });
    }

    function renderQuestions() {
      questionsEl.innerHTML = '';
      draft.questions.forEach(function (q, i) { questionsEl.appendChild(questionCard(q, i)); });
    }

    function replaceQuestion(i) {
      var old = questionsEl.children[i];
      var fresh = questionCard(draft.questions[i], i);
      questionsEl.replaceChild(fresh, old);
      return fresh;
    }

    function questionCard(q, i) {
      var card = h('section', { class: 'card q-card', 'aria-label': 'Question ' + (i + 1) });
      var typeSelect = h('select', { 'aria-label': 'Question type', onchange: function (e) {
        q.type = e.target.value;
        if (q.type === 'single') {
          var seen = false;
          q.options.forEach(function (o) { if (o.correct) { if (seen) { o.correct = false; } seen = true; } });
        }
        saveDraft();
        replaceQuestion(i);
      } },
        h('option', { value: 'single', selected: q.type === 'single', text: 'Single choice (one correct answer)' }),
        h('option', { value: 'multiple', selected: q.type === 'multiple', text: 'Multiple choice (one or more correct answers)' })
      );

      var promptInput = h('textarea', { rows: 2, value: q.prompt, placeholder: 'Write the question here.',
        oninput: function (e) { q.prompt = e.target.value; saveDraft(); } });
      var explanationInput = h('textarea', { rows: 2, value: q.explanation, placeholder: 'Shown after answering.',
        oninput: function (e) { q.explanation = e.target.value; saveDraft(); } });

      var optionsEl = h('div');
      q.options.forEach(function (o, j) { optionsEl.appendChild(optionRow(q, o, i, j)); });

      var move = function (delta) {
        var target = i + delta;
        if (target < 0 || target >= draft.questions.length) { return; }
        var list = draft.questions;
        var tmp = list[i]; list[i] = list[target]; list[target] = tmp;
        saveDraft();
        renderQuestions();
        questionsEl.children[target].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      };

      append(card, [
        h('div', { class: 'q-head' },
          h('span', { class: 'q-num', text: 'Question ' + (i + 1) + ' of ' + draft.questions.length }),
          h('div', { class: 'q-actions' },
            h('button', { type: 'button', class: 'btn btn-ghost btn-small', disabled: i === 0, onclick: function () { move(-1); } }, 'Move up'),
            h('button', { type: 'button', class: 'btn btn-ghost btn-small', disabled: i === draft.questions.length - 1, onclick: function () { move(1); } }, 'Move down'),
            h('button', { type: 'button', class: 'btn btn-danger btn-small', onclick: function () {
              if (draft.questions.length === 1) {
                draft.questions[0] = newQuestion();
              } else if (window.confirm('Remove question ' + (i + 1) + '?')) {
                draft.questions.splice(i, 1);
              } else { return; }
              saveDraft();
              renderQuestions();
            } }, 'Remove')
          )
        ),
        h('div', { class: 'field' }, h('label', { text: 'Question' }), promptInput),
        h('div', { class: 'field' }, h('label', { text: 'Answer type' }), typeSelect),
        h('div', { class: 'field' },
          h('span', { class: 'label', text: 'Answer options' }),
          h('p', { class: 'hint', text: q.type === 'single'
            ? 'Mark the one correct answer. For any incorrect answer you can add a short note on why it is incorrect.'
            : 'Mark every correct answer. For any incorrect answer you can add a short note on why it is incorrect.' }),
          optionsEl,
          h('button', { type: 'button', class: 'btn btn-secondary btn-small', onclick: function () {
            q.options.push(newOption());
            saveDraft();
            var fresh = replaceQuestion(i);
            var inputs = fresh.querySelectorAll('.opt-row input[type="text"]');
            if (inputs.length) { inputs[inputs.length - 1].focus(); }
          } }, 'Add an option')
        ),
        h('div', { class: 'field' }, h('label', { text: 'Explanation of the correct answer' }), explanationInput)
      ]);
      return card;
    }

    function optionRow(q, o, qi, j) {
      var single = q.type === 'single';
      var correctInput = h('input', {
        type: single ? 'radio' : 'checkbox',
        name: 'correct-' + qi,
        checked: o.correct,
        'aria-label': 'Option ' + (j + 1) + ' is correct',
        onchange: function (e) {
          if (single) { q.options.forEach(function (x) { x.correct = false; }); }
          o.correct = e.target.checked;
          saveDraft();
          replaceQuestion(qi);
        }
      });
      var textInput = h('input', { type: 'text', value: o.text, placeholder: 'Answer option ' + (j + 1), 'aria-label': 'Option ' + (j + 1) + ' text',
        oninput: function (e) { o.text = e.target.value; saveDraft(); } });
      var removeBtn = h('button', { type: 'button', class: 'btn btn-ghost btn-small', disabled: q.options.length <= 2, onclick: function () {
        q.options.splice(j, 1);
        saveDraft();
        replaceQuestion(qi);
      } }, 'Remove');

      var row = h('div', { class: 'opt-row' + (o.correct ? ' is-correct' : '') },
        h('label', { class: 'correct-toggle' }, correctInput, h('span', { text: 'Correct' })),
        textInput,
        removeBtn
      );
      if (!o.correct) {
        var whyInput = h('textarea', { rows: 1, value: o.explanation, placeholder: 'Optional: why this answer is incorrect.',
          oninput: function (e) { o.explanation = e.target.value; saveDraft(); } });
        row.appendChild(h('div', { class: 'why-field' }, h('label', { text: 'Why it is incorrect (optional)' }), whyInput));
      }
      return row;
    }

    renderQuestions();

    render(h('div', null,
      h('h1', { text: 'Create a curriculum' }),
      h('p', { class: 'hint', text: 'Your work is kept in this browser as you type. When you are done, save the file, then send it to Maple to add to the site or open it from the load screen when you run the curriculum.' }),
      h('div', { class: 'toolbar' },
        toolbarErrors,
        h('div', { class: 'btn-row' },
          h('button', { type: 'button', class: 'btn', onclick: downloadJSON }, 'Save'),
          h('button', { type: 'button', class: 'btn btn-secondary', onclick: preview }, 'Try it out'),
          h('button', { type: 'button', class: 'btn btn-secondary', onclick: openFromSite }, 'Open from site'),
          h('button', { type: 'button', class: 'btn btn-secondary', onclick: function () { importInput.click(); } }, 'Open from file'),
          importInput,
          statusEl,
          h('span', { class: 'spacer' }),
          h('button', { type: 'button', class: 'btn btn-danger btn-icon', 'aria-label': 'Delete draft', title: 'Delete draft', onclick: deleteDraft }, svg(ICON_TRASH))
        )
      ),
      h('section', { class: 'card' },
        h('h2', { text: 'About this curriculum' }),
        draft.file ? h('p', { class: 'hint', text: 'Editing ' + draft.file + '. Saving keeps that file name.' }) : null,
        errorsEl,
        h('div', { class: 'field' }, h('label', { text: 'Name' }), titleInput),
        h('div', { class: 'field' }, h('label', { text: 'Description' }), descInput)
      ),
      questionsEl,
      h('div', { class: 'btn-row', style: 'margin-top:20px' },
        h('button', { type: 'button', class: 'btn btn-secondary', onclick: function () {
          draft.questions.push(newQuestion());
          saveDraft();
          renderQuestions();
          var last = questionsEl.lastElementChild;
          last.scrollIntoView({ block: 'start', behavior: 'smooth' });
          var first = last.querySelector('textarea');
          if (first) { first.focus({ preventScroll: true }); }
        } }, 'Add a question')
      )
    ), { home: true, keepScroll: !!opts.keepScroll });
  }

  /* ------------------------------------------------------------------ */
  /* Start                                                                */
  /* ------------------------------------------------------------------ */

  homeBtn.addEventListener('click', showHome);

  var requested = params.get('c');
  if (requested) {
    loadCurriculumFile(requested).then(function (c) {
      var errors = validateCurriculum(c);
      if (errors.length) { showLoadError('The file "' + c.file + '" has problems: ' + errors.join(' ')); return; }
      showIntro(c);
    }).catch(function (err) { showLoadError(err.message); });
  } else {
    showHome();
  }
})();
