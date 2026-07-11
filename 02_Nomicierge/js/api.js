// Nomicierge — PostgREST / Edge Function 薄型クライアント(依存ゼロ)
// すべての画面から <script src="js/config.js"></script> の後に読み込むこと。
(function () {
  'use strict';

  function enabled() {
    return !!(NOMI_CONFIG.SUPABASE_URL && NOMI_CONFIG.SUPABASE_ANON_KEY && NOMI_CONFIG.EVENT_ID);
  }

  function headers(extra) {
    var h = {
      apikey: NOMI_CONFIG.SUPABASE_ANON_KEY,
      Authorization: 'Bearer ' + NOMI_CONFIG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    };
    for (var k in extra) h[k] = extra[k];
    return h;
  }

  function restUrl(pathWithQuery) {
    return NOMI_CONFIG.SUPABASE_URL + '/rest/v1/' + pathWithQuery;
  }

  function fail(res) {
    return res.text().then(function (t) {
      var msg;
      try { msg = JSON.parse(t).message || t; } catch (e) { msg = t; }
      throw new Error('Supabase エラー (' + res.status + '): ' + msg);
    });
  }

  // SELECT。query は PostgREST のクエリ文字列(event_id フィルタは自動で付く)
  function select(table, query) {
    var q = 'event_id=eq.' + NOMI_CONFIG.EVENT_ID + (query ? '&' + query : '');
    return fetch(restUrl(table + '?' + q), { headers: headers() }).then(function (res) {
      if (!res.ok) return fail(res);
      return res.json();
    });
  }

  // UPSERT。onConflict は 'event_id,participant_name' のようなカラム列。
  function upsert(table, row, onConflict) {
    row.event_id = NOMI_CONFIG.EVENT_ID;
    return fetch(restUrl(table + '?on_conflict=' + onConflict), {
      method: 'POST',
      headers: headers({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify(row),
    }).then(function (res) {
      if (!res.ok) return fail(res);
    });
  }

  // UPDATE。filter は 'id=eq.xxx' のような PostgREST フィルタ。
  function patch(table, filter, values) {
    return fetch(restUrl(table + '?' + filter), {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=minimal' }),
      body: JSON.stringify(values),
    }).then(function (res) {
      if (!res.ok) return fail(res);
    });
  }

  function getEvent() {
    return fetch(restUrl('events?id=eq.' + NOMI_CONFIG.EVENT_ID), { headers: headers() })
      .then(function (res) {
        if (!res.ok) return fail(res);
        return res.json();
      })
      .then(function (rows) {
        if (!rows.length) throw new Error('イベントが見つかりません。config.js の EVENT_ID を確認してください。');
        return rows[0];
      });
  }

  function setEvent(values) {
    return patch('events', 'id=eq.' + NOMI_CONFIG.EVENT_ID, values);
  }

  // AI 候補生成(Web 検索込みで 30〜90 秒かかる)
  function suggestCandidates(organizerToken) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 120000);
    return fetch(NOMI_CONFIG.SUPABASE_URL + '/functions/v1/suggest-candidates', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ organizer_token: organizerToken }),
      signal: ctrl.signal,
    }).then(function (res) {
      clearTimeout(timer);
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
        return data;
      });
    }, function (e) {
      clearTimeout(timer);
      throw e.name === 'AbortError' ? new Error('タイムアウトしました(120秒)。もう一度お試しください。') : e;
    });
  }

  // ポーリング。バックグラウンドタブでは止め、復帰時に即実行する。
  function startPolling(fn, intervalMs) {
    var timer = null;
    function tick() { if (document.visibilityState === 'visible') fn(); }
    function arm() {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') tick();
    });
    tick();
    arm();
    return { stop: function () { clearInterval(timer); timer = null; } };
  }

  window.NomiApi = {
    enabled: enabled,
    select: select,
    upsert: upsert,
    patch: patch,
    getEvent: getEvent,
    setEvent: setEvent,
    suggestCandidates: suggestCandidates,
    startPolling: startPolling,
  };
})();
