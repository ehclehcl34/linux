/**
 * 부루마블 — Google Apps Script 웹앱 서버 코드
 *
 * 게임 로직은 모두 Index.html(클라이언트)에서 돌아가고,
 * 서버는 웹페이지 제공과 "저장 코드" 기반 저장/불러오기만 담당합니다.
 */

var SAVE_PREFIX = 'BM_SAVE_';
var INDEX_KEY = 'BM_INDEX';
var MAX_SAVES = 50;      // 보관할 최대 저장 슬롯 수 (오래된 것부터 삭제)
var MAX_BYTES = 8500;    // PropertiesService 값 하나당 한도(9KB)보다 약간 작게
var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
    var index = readIndex_(props);
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

function readIndex_(props) {
  try {
    return JSON.parse(props.getProperty(INDEX_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function newCode_(index) {
  for (;;) {
    var code = '';
    for (var i = 0; i < 6; i++) {
      code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    }
    if (!index[code]) return code;
  }
}

function pruneIndex_(props, index) {
  var codes = Object.keys(index).sort(function (a, b) { return index[a] - index[b]; });
  while (codes.length > MAX_SAVES) {
    var old = codes.shift();
    props.deleteProperty(SAVE_PREFIX + old);
    delete index[old];
  }
}
