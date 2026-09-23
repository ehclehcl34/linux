/**
 * 부루마블 — Google Apps Script 웹앱 서버 코드
 *
 * 게임 로직은 모두 Index.html(클라이언트)에서 돌아가고, 서버는
 *  - 웹페이지 제공
 *  - "저장 코드" 기반 저장/불러오기 (같은 PC 모드)
 *  - 온라인 방(로비, 게임 상태 동기화) 관리
 * 만 담당합니다.
 */

var SAVE_PREFIX = 'BM_SAVE_';
var INDEX_KEY = 'BM_INDEX';
var MAX_SAVES = 50;      // 보관할 최대 저장 슬롯 수 (오래된 것부터 삭제)
var MAX_BYTES = 8500;    // PropertiesService 값 하나당 한도(9KB)보다 약간 작게
var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

var ROOM_PREFIX = 'BM_ROOM_';
var ROOM_INDEX_KEY = 'BM_RINDEX';
var MAX_ROOMS = 50;
var MAX_SEATS = 4;
var CACHE_TTL = 21600;   // 6시간 (CacheService 최대치)

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('부루마블')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * 게임 상태를 저장하고 저장 코드를 돌려준다.
 * code가 유효하면 같은 슬롯에 덮어쓰고, 아니면 새 코드를 만든다.
 */
function saveGame(code, json) {
  if (typeof json !== 'string' || !json) throw new Error('저장할 데이터가 없습니다.');
  if (Utilities.newBlob(json).getBytes().length > MAX_BYTES) throw new Error('저장 데이터가 너무 큽니다.');
  JSON.parse(json); // 형식 검증

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var props = PropertiesService.getScriptProperties();
    var index = readJson_(props, INDEX_KEY);
    code = normalizeCode_(code);
    if (!code) code = newCode_(index);

    props.setProperty(SAVE_PREFIX + code, json);
    index[code] = Date.now();
    pruneIndex_(props, index);
    props.setProperty(INDEX_KEY, JSON.stringify(index));
    return code;
  } finally {
    lock.releaseLock();
  }
}

/** 저장 코드로 게임 상태(JSON 문자열)를 불러온다. 없으면 null. */
function loadGame(code) {
  code = normalizeCode_(code);
  if (!code) return null;
  return PropertiesService.getScriptProperties().getProperty(SAVE_PREFIX + code);
}

function normalizeCode_(code) {
  code = String(code || '').trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(code) ? code : '';
}

function newCode_(index, len) {
  len = len || 6;
  for (;;) {
    var code = '';
    for (var i = 0; i < len; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    if (!index[code]) return code;
  }
}

function pruneIndex_(props, index, prefix, max) {
  prefix = prefix || SAVE_PREFIX;
  max = max || MAX_SAVES;
  var codes = Object.keys(index).sort(function (a, b) { return index[a] - index[b]; });
  while (codes.length > max) {
    var old = codes.shift();
    props.deleteProperty(prefix + old);
    delete index[old];
  }
}

/* ================= 온라인 방 =================
 * 방 하나 = { v: 버전, host: 방장 cid, lobby: [{name, cid, ai}], game: 게임 상태 | null }
 * 차례인 플레이어의 브라우저가 게임을 진행하고 putGame으로 상태를 올리면,
 * 나머지는 getRoom으로 1~2초마다 새 버전을 받아 갑니다.
 * 자주 읽는 값은 CacheService에, 영구 보관은 ScriptProperties에 둡니다.
 */

function createRoom(name, cid) {
  name = cleanName_(name);
  cid = cleanCid_(cid);
  return withLock_(function () {
    var props = PropertiesService.getScriptProperties();
    var index = readJson_(props, ROOM_INDEX_KEY);
    var code = newCode_(index, 5);
    var room = { v: 1, host: cid, lobby: [{ name: name, cid: cid, ai: false }], game: null };
    writeRoom_(code, room);
    index[code] = Date.now();
    pruneIndex_(props, index, ROOM_PREFIX, MAX_ROOMS);
    props.setProperty(ROOM_INDEX_KEY, JSON.stringify(index));
    return roomReply_(code, room);
  });
}

/** 방 참가. 이미 시작한 방이면 같은 이름의 자리로 다시 들어갈 수 있다. */
function joinRoom(code, name, cid) {
  code = roomCode_(code);
  name = cleanName_(name);
  cid = cleanCid_(cid);
  return withLock_(function () {
    var room = mustRoom_(code);
    if (seatOf_(room, cid) < 0) {
      if (room.game) {
        var i = -1;
        room.lobby.forEach(function (s, k) { if (!s.ai && s.name === name) i = k; });
        if (i < 0) throw new Error('이미 시작된 방입니다. 원래 쓰던 이름으로 들어오세요.');
        if (room.host === room.lobby[i].cid) room.host = cid;
        room.lobby[i].cid = cid;
        if (room.game.players[i]) { room.game.players[i].cid = cid; room.game.players[i].ai = false; }
      } else {
        if (room.lobby.length >= MAX_SEATS) throw new Error('방이 꽉 찼습니다.');
        room.lobby.push({ name: uniqueName_(room, name), cid: cid, ai: false });
      }
      room.v++;
      writeRoom_(code, room);
    }
    return roomReply_(code, room);
  });
}

/** 방장: 컴퓨터 자리 추가 */
function addBot(code, cid) {
  return editLobby_(code, cid, function (room) {
    if (room.lobby.length >= MAX_SEATS) throw new Error('방이 꽉 찼습니다.');
    var n = room.lobby.filter(function (s) { return s.ai; }).length + 1;
    room.lobby.push({ name: uniqueName_(room, '컴퓨터' + n), cid: null, ai: true });
  });
}

/** 방장: 자리 빼기 (방장 자신은 불가) */
function removeSeat(code, cid, i) {
  return editLobby_(code, cid, function (room) {
    var s = room.lobby[i];
    if (!s || s.cid === room.host) throw new Error('뺄 수 없는 자리입니다.');
    room.lobby.splice(i, 1);
  });
}

/** 시작 전 방 나가기. 방장이 나가면 다음 사람이 방장이 된다. */
function leaveRoom(code, cid) {
  code = roomCode_(code);
  return withLock_(function () {
    var room = readRoom_(code);
    if (!room || room.game) return true;
    var i = seatOf_(room, cid);
    if (i < 0) return true;
    room.lobby.splice(i, 1);
    if (room.host === cid) {
      var next = room.lobby.filter(function (s) { return !s.ai; })[0];
      room.host = next ? next.cid : null;
    }
    room.v++;
    writeRoom_(code, room);
    return true;
  });
}

/** 방 상태 조회. knownV와 버전이 같으면 {"same":true}만 돌려준다. */
function getRoom(code, knownV) {
  code = roomCode_(code);
  var room = mustRoom_(code);
  if (room.v === knownV) return '{"same":true}';
  return JSON.stringify(room);
}

/** 게임 상태 올리기. baseV가 서버 버전과 다르면 CONFLICT. 새 버전 번호를 돌려준다. */
function putGame(code, cid, baseV, json) {
  code = roomCode_(code);
  var game = JSON.parse(json);
  return withLock_(function () {
    var room = mustRoom_(code);
    if (seatOf_(room, cid) < 0) throw new Error('이 방의 플레이어가 아닙니다.');
    if (!room.game && cid !== room.host) throw new Error('방장만 게임을 시작할 수 있습니다.');
    if (room.v !== baseV) throw new Error('CONFLICT');
    room.game = game;
    room.v++;
    writeRoom_(code, room);
    return room.v;
  });
}

function editLobby_(code, cid, fn) {
  code = roomCode_(code);
  return withLock_(function () {
    var room = mustRoom_(code);
    if (room.host !== cid) throw new Error('방장만 할 수 있습니다.');
    if (room.game) throw new Error('이미 시작된 방입니다.');
    fn(room);
    room.v++;
    writeRoom_(code, room);
    return roomReply_(code, room);
  });
}

function roomReply_(code, room) {
  var url = '';
  try { url = ScriptApp.getService().getUrl(); } catch (e) { /* 편집기 실행 등 */ }
  return JSON.stringify({ code: code, room: room, url: url });
}

function readRoom_(code) {
  var key = ROOM_PREFIX + code;
  var cache = CacheService.getScriptCache();
  var s = cache.get(key);
  if (!s) {
    s = PropertiesService.getScriptProperties().getProperty(key);
    if (s) cache.put(key, s, CACHE_TTL);
  }
  return s ? JSON.parse(s) : null;
}

function writeRoom_(code, room) {
  var s = JSON.stringify(room);
  if (Utilities.newBlob(s).getBytes().length > MAX_BYTES) throw new Error('방 데이터가 너무 큽니다.');
  var key = ROOM_PREFIX + code;
  PropertiesService.getScriptProperties().setProperty(key, s);
  CacheService.getScriptCache().put(key, s, CACHE_TTL);
}

function mustRoom_(code) {
  var room = code && readRoom_(code);
  if (!room) throw new Error('방을 찾을 수 없습니다. 코드를 확인하세요.');
  return room;
}

function seatOf_(room, cid) {
  for (var i = 0; i < room.lobby.length; i++) if (cid && room.lobby[i].cid === cid) return i;
  return -1;
}

function uniqueName_(room, name) {
  var taken = room.lobby.map(function (s) { return s.name; });
  var out = name, n = 2;
  while (taken.indexOf(out) >= 0) out = name + n++;
  return out;
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function readJson_(props, key) {
  try {
    return JSON.parse(props.getProperty(key) || '{}');
  } catch (e) {
    return {};
  }
}

function roomCode_(code) {
  code = String(code || '').trim().toUpperCase();
  return /^[A-Z0-9]{5}$/.test(code) ? code : '';
}

function cleanName_(name) {
  name = String(name || '').trim().slice(0, 10);
  return name || '플레이어';
}

function cleanCid_(cid) {
  cid = String(cid || '');
  if (!/^[a-z0-9]{8,32}$/.test(cid)) throw new Error('잘못된 접속 정보입니다.');
  return cid;
}
