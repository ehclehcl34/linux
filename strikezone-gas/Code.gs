/**
 * STRIKE ZONE — Google Apps Script 웹앱 서버 코드
 *
 * 게임은 브라우저에서 돌아가고, 온라인 대전은 플레이어끼리 직접(WebRTC) 연결합니다.
 * 이 서버는 웹페이지를 보여 주고, 처음 연결할 때 주고받는 접속 정보(SDP)만
 * 잠깐 전달해 주는 "중개" 역할만 합니다. (CacheService, 최대 6시간 보관)
 */

var ROOM_TTL = 21600;   // 6시간
var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('STRIKE ZONE')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** 방 만들기 → 5자리 방 코드 */
function szCreate(hostCid) {
  hostCid = cid_(hostCid);
  var cache = CacheService.getScriptCache();
  for (var n = 0; n < 20; n++) {
    var code = '';
    for (var i = 0; i < 5; i++) code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    if (!cache.get('SZ_R_' + code)) {
      cache.put('SZ_R_' + code, hostCid, ROOM_TTL);
      cache.put('SZ_O_' + code, '[]', ROOM_TTL);
      return code;
    }
  }
  throw new Error('방을 만들 수 없습니다. 다시 시도하세요.');
}

/** 참가자: 접속 제안(offer) 올리기 */
function szJoin(code, guestCid, offer) {
  code = code_(code); guestCid = cid_(guestCid);
  if (typeof offer !== 'string' || offer.length > 60000) throw new Error('잘못된 접속 정보입니다.');
  var cache = CacheService.getScriptCache();
  if (!cache.get('SZ_R_' + code)) throw new Error('방을 찾을 수 없습니다. 코드를 확인하세요.');
  return withLock_(function () {
    var list = JSON.parse(cache.get('SZ_O_' + code) || '[]').filter(function (o) { return o.cid !== guestCid; });
    if (list.length >= 12) throw new Error('접속 대기 중인 사람이 너무 많습니다.');
    list.push({ cid: guestCid, offer: offer });
    cache.put('SZ_O_' + code, JSON.stringify(list), ROOM_TTL);
    cache.remove('SZ_A_' + code + '_' + guestCid);
    return true;
  });
}

/** 방장: 새로 들어온 접속 제안들을 가져간다 (가져가면 목록에서 지워짐) */
function szOffers(code, hostCid) {
  code = code_(code);
  var cache = CacheService.getScriptCache();
  if (cache.get('SZ_R_' + code) !== cid_(hostCid)) throw new Error('방장이 아닙니다.');
  return withLock_(function () {
    var s = cache.get('SZ_O_' + code) || '[]';
    cache.put('SZ_O_' + code, '[]', ROOM_TTL);
    cache.put('SZ_R_' + code, hostCid, ROOM_TTL);   // 방 유지
    return s;
  });
}

/** 방장: 참가자에게 응답(answer) 전달 */
function szAnswerPut(code, hostCid, guestCid, answer) {
  code = code_(code);
  var cache = CacheService.getScriptCache();
  if (cache.get('SZ_R_' + code) !== cid_(hostCid)) throw new Error('방장이 아닙니다.');
  if (typeof answer !== 'string' || answer.length > 60000) throw new Error('잘못된 접속 정보입니다.');
  cache.put('SZ_A_' + code + '_' + cid_(guestCid), answer, 600);
  return true;
}

/** 참가자: 방장의 응답 확인 (아직 없으면 null) */
function szAnswer(code, guestCid) {
  return CacheService.getScriptCache().get('SZ_A_' + code_(code) + '_' + cid_(guestCid));
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

function code_(code) {
  code = String(code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{5}$/.test(code)) throw new Error('방 코드는 5자리입니다.');
  return code;
}

function cid_(cid) {
  cid = String(cid || '');
  if (!/^[a-z0-9]{8,32}$/.test(cid)) throw new Error('잘못된 접속 정보입니다.');
  return cid;
}
