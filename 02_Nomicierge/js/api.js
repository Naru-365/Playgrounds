// Nomicierge — PostgREST / Edge Function 薄型クライアント(依存ゼロ)
// すべての画面から <script src="js/config.js"></script> の後に読み込むこと。
(function () {
  'use strict';

  // イベント ID の解決。?event=<uuid> が config の EVENT_ID より優先される。
  // UUID 形式以外は無視する(PostgREST フィルタへ連結するため厳密に検証する)。
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var urlEventId = (function () {
    try {
      var v = new URLSearchParams(location.search).get('event');
      return v && UUID_RE.test(v) ? v.toLowerCase() : '';
    } catch (e) { return ''; }
  })();

  function eventId() {
    return urlEventId || NOMI_CONFIG.EVENT_ID;
  }

  // Supabase 接続設定があるか(イベント ID は不問。create-event 用)。
  function hasBackend() {
    return !!(NOMI_CONFIG.SUPABASE_URL && NOMI_CONFIG.SUPABASE_ANON_KEY);
  }

  function enabled() {
    return !!(hasBackend() && eventId());
  }

  // ページ内リンクに ?event= を伝播させる。全ページの内部リンクはこれを使うこと。
  function link(page) {
    return page + (urlEventId ? '?event=' + urlEventId : '');
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
    var q = 'event_id=eq.' + eventId() + (query ? '&' + query : '');
    return fetch(restUrl(table + '?' + q), { headers: headers() }).then(function (res) {
      if (!res.ok) return fail(res);
      return res.json();
    });
  }

  // UPSERT。onConflict は 'event_id,participant_name' のようなカラム列。
  function upsert(table, row, onConflict) {
    row.event_id = eventId();
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
    return fetch(restUrl('events?id=eq.' + eventId()), { headers: headers() })
      .then(function (res) {
        if (!res.ok) return fail(res);
        return res.json();
      })
      .then(function (rows) {
        if (!rows.length) throw new Error('イベントが見つかりません。URL の ?event= または config.js の EVENT_ID を確認してください。');
        return rows[0];
      });
  }

  function setEvent(values) {
    return patch('events', 'id=eq.' + eventId(), values);
  }

  // イベント新規作成(create-event エッジ関数)。成功時 {event_id, organizer_token} を返す。
  function createEvent(payload) {
    if (!hasBackend()) {
      return Promise.reject(new Error('Supabase が未設定です。js/config.js を設定してください。'));
    }
    return fetch(NOMI_CONFIG.SUPABASE_URL + '/functions/v1/create-event', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
        return data;
      });
    });
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
    hasBackend: hasBackend,
    eventId: eventId,
    link: link,
    createEvent: createEvent,
    select: select,
    upsert: upsert,
    patch: patch,
    getEvent: getEvent,
    setEvent: setEvent,
    suggestCandidates: suggestCandidates,
    startPolling: startPolling,
  };
})();
