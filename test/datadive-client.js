import sinon from 'sinon';
import DatadiveClient from '../src/datadive-client.js';
import getUtmData from '../src/utm.js';
import Cookie from '../src/cookie';
import MetadataStorage from '../src/metadata-storage';
import localStorage from '../src/localstorage.js';
import CookieStorage from '../src/cookiestorage.js';
import baseCookie from '../src/base-cookie.js';
import Base64 from '../src/base64.js';
import cookie from '../src/cookie.js';
import utils from '../src/utils.js';
import queryString from 'query-string';
import Identify from '../src/identify.js';
import Revenue from '../src/revenue.js';
import constants from '../src/constants.js';
import { mockCookie, restoreCookie, getCookie } from './mock-cookie';

// maintain for testing backwards compatability
describe('DatadiveClient', function() {
  var apiKey = '000000';
  const cookieName = 'amp_' + apiKey.slice(0,6);
  const oldCookieName = 'datadive_id_' + apiKey;
  var keySuffix = '_' + apiKey.slice(0,6);
  var userId = 'user';
  var datadive;
  var server;

  beforeEach(function() {
    datadive = new DatadiveClient();
    server = sinon.fakeServer.create();
  });

  afterEach(function() {
    server.restore();
  });

  it('datadive object should exist', function() {
    assert.isObject(datadive);
  });

  function reset() {
    localStorage.clear();
    sessionStorage.clear();
    restoreCookie();
    cookie.remove(datadive.options.cookieName);
    cookie.remove(datadive.options.cookieName + keySuffix);
    cookie.remove(datadive.options.cookieName + '_new_app');
    cookie.remove(oldCookieName);
    cookie.remove(cookieName);
    cookie.remove('amp_');
    cookie.reset();
  }

  describe('init', function() {
    beforeEach(function() {
      reset();
    });

    afterEach(function() {
      reset();
    });

    it('should make instanceName case-insensitive', function() {
      assert.equal(new DatadiveClient('APP3')._instanceName, 'app3');
      assert.equal(new DatadiveClient('$DEFAULT_INSTANCE')._instanceName, '$default_instance');
    });

    it('should invoke onInit callbacks', () => {
      const callback = sinon.spy();
      datadive.onInit(callback);
      datadive.onInit(callback);

      datadive.init(apiKey);
      assert.isTrue(callback.calledTwice);
    });

    it('should not invoke onInit callbacks before init is called', () => {
      const callback = sinon.spy();
      datadive.onInit(callback);
      assert.isFalse(callback.calledOnce);
    });

    it('should pass the datadive instance to onInit callbacks', () => {
      const callback = sinon.spy();
      datadive.onInit(callback);
      datadive.init(apiKey);
      assert.isTrue(callback.calledWith(datadive));
    });

    it('should set the Secure flag on cookie with the secureCookie option', () => {
      mockCookie();
      datadive.init(apiKey, null, { secureCookie: true });
      assert.include(getCookie(cookieName).options, 'Secure');
    });

    it('should set the SameSite cookie option to Lax by default', () => {
      mockCookie();
      datadive.init(apiKey);
      assert.include(getCookie(cookieName).options, 'SameSite=Lax');
    });

    it('should set the sameSite option on a cookie with the sameSiteCookie Option', () => {
      mockCookie();
      datadive.init(apiKey, null, {sameSiteCookie: 'Strict'});
      assert.include(getCookie(cookieName).options, 'SameSite=Strict');
    });

    it('should immediately invoke onInit callbacks if already initialized', function() {
      let onInitCalled = false;
      datadive.init(apiKey);
      datadive.onInit(() => { onInitCalled = true; });
      assert.ok(onInitCalled);
    });

    it('should clear the onInitQueue', function() {
      let onInitCalled = false;
      let onInit2Called = false;
      datadive.onInit(() => { onInitCalled = true; });
      datadive.onInit(() => { onInit2Called = true; });

      datadive.init(apiKey);
      assert.lengthOf(datadive._onInit, 0);
    });

    it('fails on invalid apiKeys', function() {
      datadive.init(null);
      assert.equal(datadive.options.apiKey, undefined);
      assert.equal(datadive.options.deviceId, undefined);

      datadive.init('');
      assert.equal(datadive.options.apiKey, undefined);
      assert.equal(datadive.options.deviceId, undefined);

      datadive.init(apiKey);
      assert.equal(datadive.options.apiKey, apiKey);
      assert.lengthOf(datadive.options.deviceId, 22);
    });

    it('should accept userId', function() {
      datadive.init(apiKey, userId);
      assert.equal(datadive.options.userId, userId);
    });

    it('should accept numerical userIds', function() {
      const userId = 5;
      datadive.init(apiKey, 5);
      assert.equal(datadive.options.userId, '5');
    });

    it('should generate a random deviceId', function() {
      datadive.init(apiKey, userId);
      assert.lengthOf(datadive.options.deviceId, 22)
    });

    it('should validate config values', function() {
      var config = {
          apiEndpoint: 100,  // invalid type
          batchEvents: 'True',  // invalid type
          cookieExpiration: -1,   // negative number
          cookieName: '',  // empty string
          eventUploadPeriodMillis: '30', // 30s
          eventUploadThreshold: 0,   // zero value
          bogusKey: false
      };

      datadive.init(apiKey, userId, config);
      assert.equal(datadive.options.apiEndpoint, 'api.datadive.ai');
      assert.equal(datadive.options.batchEvents, false);
      assert.equal(datadive.options.cookieExpiration, 3650);
      assert.equal(datadive.options.cookieName, 'datadive_id');
      assert.equal(datadive.options.eventUploadPeriodMillis, 30000);
      assert.equal(datadive.options.eventUploadThreshold, 30);
      assert.equal(datadive.options.bogusKey, undefined);
    });

    it('should set the default log level', function() {
      const config = {};

      datadive.init(apiKey, userId, config);
      assert.equal(utils.getLogLevel(), 2);
    });

    it('should set log levels', function() {
      const config = {
          logLevel: 'INFO',
      };

      datadive.init(apiKey, userId, config);
      assert.equal(utils.getLogLevel(), 3);
    });

    it('should set cookie', function() {
      datadive.init(apiKey, userId);
      const storage = new MetadataStorage({storageKey: cookieName});
      const stored = storage.load();
      assert.property(stored, 'deviceId');
      assert.propertyVal(stored, 'userId', userId);
      assert.lengthOf(stored.deviceId, 22);
    });

    it('should set language', function() {
       datadive.init(apiKey, userId);
       assert.property(datadive.options, 'language');
       assert.isNotNull(datadive.options.language);
    });

    it('should allow language override', function() {
      datadive.init(apiKey, userId, {language: 'en-GB'});
      assert.propertyVal(datadive.options, 'language', 'en-GB');
    });

    it ('should not run callback if invalid callback', function() {
      datadive.init(apiKey, userId, null, 'invalid callback');
    });

    it ('should run valid callbacks', function() {
      var counter = 0;
      var callback = function() {
        counter++;
      };
      datadive.init(apiKey, userId, null, callback);
      assert.equal(counter, 1);
    });

    it ('should load the device id from url params if configured', function() {
      var deviceId = 'aa_bb_cc_dd';
      sinon.stub(datadive, '_getUrlParams').returns('?utm_source=datadive&utm_medium=email&gclid=12345&amp_device_id=aa_bb_cc_dd');
      datadive.init(apiKey, userId, {deviceIdFromUrlParam: true});
      assert.equal(datadive.options.deviceId, deviceId);

      const storage = new MetadataStorage({storageKey: cookieName});
      const cookieData = storage.load();
      assert.equal(cookieData.deviceId, deviceId);

      datadive._getUrlParams.restore();
    });

    it ('should not load device id from url params if not configured', function() {
      var deviceId = 'aa_bb_cc_dd';
      sinon.stub(datadive, '_getUrlParams').returns('?utm_source=datadive&utm_medium=email&gclid=12345&amp_device_id=aa_bb_cc_dd');
      datadive.init(apiKey, userId, {deviceIdFromUrlParam: false});
      assert.notEqual(datadive.options.deviceId, deviceId);

      const storage = new MetadataStorage({storageKey: cookieName});
      const cookieData = storage.load();
      assert.notEqual(cookieData.deviceId, deviceId);

      datadive._getUrlParams.restore();
    });

    it ('should create device id if not set in the url', function(){
        sinon.stub(datadive, '_getUrlParams').returns('?utm_source=datadive&utm_medium=email&gclid=12345');
        datadive.init(apiKey, userId, {deviceIdFromUrlParam: true});
        assert.notEqual(datadive.options.deviceId, null);
        assert.lengthOf(datadive.options.deviceId, 22);

        const storage = new MetadataStorage({storageKey: cookieName});
        const cookieData = storage.load();
        assert.notEqual(cookieData.deviceId, null);
        assert.lengthOf(cookieData.deviceId, 22);

        datadive._getUrlParams.restore();
    });

    it ('should prefer the device id in the config over the url params', function() {
      var deviceId = 'dd_cc_bb_aa';
      sinon.stub(datadive, '_getUrlParams').returns('?utm_source=datadive&utm_medium=email&gclid=12345&amp_device_id=aa_bb_cc_dd');
      datadive.init(apiKey, userId, {deviceId: deviceId, deviceIdFromUrlParam: true});
      assert.equal(datadive.options.deviceId, deviceId);

      const storage = new MetadataStorage({storageKey: cookieName});
      const cookieData = storage.load();
      assert.equal(cookieData.deviceId, deviceId);

      datadive._getUrlParams.restore();
    });

    it('should load device id from the cookie', function(){
      var now = new Date().getTime();

      // deviceId and sequenceNumber not set, init should load value from localStorage
      var cookieData = {
        deviceId: 'current_device_id',
      }

      cookie.set(datadive.options.cookieName + '_' + apiKey, cookieData);

      datadive.init(apiKey);
      assert.equal(datadive.options.deviceId, 'current_device_id');
    });

    it('should upgrade the new cookie to the old cookie if forceUpgrade is on', function(){
      var now = new Date().getTime();

      var cookieData = {
        deviceId: 'old_device_id',
        optOut: false,
        sessionId: now,
        lastEventTime: now,
        eventId: 50,
        identifyId: 60
      }

      cookie.set(oldCookieName, cookieData);

      datadive.init(apiKey, null, { cookieForceUpgrade: true });
      const cookieData = cookie.getRaw(cookieName);
      assert.equal('old_device_id', cookieData.slice(0, 'old_device_id'.length));
    });

    it('should delete the old old cookie if forceUpgrade is on', function(){
      var now = new Date().getTime();

      var cookieData = {
        deviceId: 'old_device_id',
        optOut: false,
        sessionId: now,
        lastEventTime: now,
        eventId: 50,
        identifyId: 60
      }

      cookie.set(oldCookieName, cookieData);

      datadive.init(apiKey, null, { cookieForceUpgrade: true });
      const cookieData = cookie.get(oldCookieName);
      assert.isNull(cookieData);
    });

    it('should use device id from the old cookie if a new cookie does not exist', function(){
      var now = new Date().getTime();

      var cookieData = {
        deviceId: 'old_device_id',
        optOut: false,
        sessionId: now,
        lastEventTime: now,
        eventId: 50,
        identifyId: 60
      }

      cookie.set(oldCookieName, cookieData);

      datadive.init(apiKey, null);
      assert.equal(datadive.options.deviceId, 'old_device_id');
    });

    it('should favor the device id from the new cookie even if the old cookie exists', function(){
      var now = new Date().getTime();

      var cookieData = {
        deviceId: 'old_device_id',
        optOut: false,
        sessionId: now,
        lastEventTime: now,
        eventId: 50,
        identifyId: 60
      }

      cookie.set(oldCookieName, cookieData);
      cookie.setRaw(cookieName, `new_device_id.${Base64.encode(userId)}..1000.1000.0.0.0`);

      datadive.init(apiKey, null);
      assert.equal(datadive.options.deviceId, 'new_device_id');
    });

    it('should save cookie data to localStorage if cookies are not enabled', function() {
      var deviceId = 'test_device_id';
      var clock = sinon.useFakeTimers();
      clock.tick(1000);

      localStorage.clear();
      sinon.stub(baseCookie, 'areCookiesEnabled').returns(false);
      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey, userId, {'deviceId': deviceId});
      baseCookie.areCookiesEnabled.restore();
      clock.restore();

      var cookieData = localStorage.getItem(cookieName);
      assert.equal(
        cookieData,
        `${deviceId}.${Base64.encode(userId)}..v8.v8.0.0.0`
      );
      assert.isNull(cookie.get(datadive2.options.cookieName)); // assert did not write to cookies
    });

    it('should load sessionId, eventId from cookie and ignore the one in localStorage', function() {
      var datadive2 = new DatadiveClient();

      var clock = sinon.useFakeTimers();
      clock.tick(1000);
      var sessionId = new Date().getTime();

      // the following values in localStorage will all be ignored
      localStorage.clear();
      localStorage.setItem('cookieName',`0.0.0.3.4.5.6.7`);

      var cookieData = {
        deviceId: 'test_device_id',
        userId: 'test_user_id',
        optOut: true,
        sessionId: sessionId,
        lastEventTime: sessionId,
        eventId: 50,
        identifyId: 60,
        sequenceNumber: 70
      }
      const storage = new MetadataStorage({storageKey: cookieName, disableCookies: true});
      storage.save(cookieData);

      clock.tick(10);
      datadive2.init(apiKey);
      clock.restore();

      assert.equal(datadive2._sessionId, sessionId);
      assert.equal(datadive2._lastEventTime, sessionId + 10);
      assert.equal(datadive2._eventId, 50);
      assert.equal(datadive2._identifyId, 60);
      assert.equal(datadive2._sequenceNumber, 70);
    });

    it('should load sessionId from localStorage if not in cookie', function() {
      var datadive2 = new DatadiveClient();

      var cookieData = {
        deviceId: 'test_device_id',
        userId: userId,
        optOut: true
      }
      cookie.set(datadive2.options.cookieName, cookieData);

      var clock = sinon.useFakeTimers();
      clock.tick(1000);
      var sessionId = new Date().getTime();

      localStorage.clear();
      localStorage.setItem(cookieName,`0.0.0.${sessionId.toString(32)}.${sessionId.toString(32)}.1i.1s.26`);

      clock.tick(10);
      datadive2.init(apiKey, userId);
      clock.restore();

      assert.equal(datadive2._sessionId, sessionId);
      assert.equal(datadive2._lastEventTime, sessionId + 10);
      assert.equal(datadive2._eventId, 50);
      assert.equal(datadive2._identifyId, 60);
      assert.equal(datadive2._sequenceNumber, 70);
    });

    it('should load saved events from localStorage for default instance', function() {
      var existingEvent = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769146589,' +
        '"event_id":49,"session_id":1453763315544,"event_type":"clicked","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{},"uuid":"3c508faa-a5c9-45fa-9da7-9f4f3b992fb0","library"' +
        ':{"name":"datadive-js","version":"2.9.0"},"sequence_number":130,"groups":{}}]';
      var existingIdentify = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769338995,' +
        '"event_id":82,"session_id":1453763315544,"event_type":"$identify","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{"$set":{"age":30,"city":"San Francisco, CA"}},"uuid":"' +
        'c50e1be4-7976-436a-aa25-d9ee38951082","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number"' +
        ':131,"groups":{}}]';
      localStorage.setItem('datadive_unsent_' + apiKey, existingEvent);
      localStorage.setItem('datadive_unsent_identify_' + apiKey, existingIdentify);

      var datadive2 = new DatadiveClient('$default_Instance');
      datadive2.init(apiKey, null, {batchEvents: true});

      // check event loaded into memory
      assert.deepEqual(datadive2._unsentEvents.map(({event}) => event), JSON.parse(existingEvent));
      assert.deepEqual(datadive2._unsentIdentifys.map(({event}) => event), JSON.parse(existingIdentify));

      // check local storage keys are still same for default instance
      assert.equal(localStorage.getItem('datadive_unsent_' + apiKey), existingEvent);
      assert.equal(localStorage.getItem('datadive_unsent_identify_' + apiKey), existingIdentify);
    });

    it('should load saved events for non-default instances', function() {
      var existingEvent = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769146589,' +
        '"event_id":49,"session_id":1453763315544,"event_type":"clicked","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{},"uuid":"3c508faa-a5c9-45fa-9da7-9f4f3b992fb0","library"' +
        ':{"name":"datadive-js","version":"2.9.0"},"sequence_number":130,"groups":{}}]';
      var existingIdentify = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769338995,' +
        '"event_id":82,"session_id":1453763315544,"event_type":"$identify","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{"$set":{"age":30,"city":"San Francisco, CA"}},"uuid":"' +
        'c50e1be4-7976-436a-aa25-d9ee38951082","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number"' +
        ':131,"groups":{}}]';
      localStorage.setItem('datadive_unsent_' + apiKey + '_new_app', existingEvent);
      localStorage.setItem('datadive_unsent_identify_' + apiKey + '_new_app', existingIdentify);
      assert.isNull(localStorage.getItem('datadive_unsent'));
      assert.isNull(localStorage.getItem('datadive_unsent_identify'));

      var datadive2 = new DatadiveClient('new_app');
      datadive2.init(apiKey, null, {batchEvents: true});

      // check event loaded into memory
      assert.deepEqual(datadive2._unsentEvents.map(({event}) => event), JSON.parse(existingEvent));
      assert.deepEqual(datadive2._unsentIdentifys.map(({event}) => event), JSON.parse(existingIdentify));

      // check local storage keys are still same
      assert.equal(localStorage.getItem('datadive_unsent_' + apiKey +'_new_app'), existingEvent);
      assert.equal(localStorage.getItem('datadive_unsent_identify_' + apiKey + '_new_app'), existingIdentify);
    });

    it('should validate event properties when loading saved events from localStorage', function() {
      var existingEvents = '[{"device_id":"15a82aaa-0d9e-4083-a32d-2352191877e6","user_id":"15a82aaa-0d9e-4083-a32d' +
        '-2352191877e6","timestamp":1455744744413,"event_id":2,"session_id":1455744733865,"event_type":"clicked",' +
        '"version_name":"Web","platform":"Web","os_name":"Chrome","os_version":"48","device_model":"Mac","language"' +
        ':"en-US","api_properties":{},"event_properties":"{}","user_properties":{},"uuid":"1b8859d9-e91e-403e-92d4-' +
        'c600dfb83432","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number":4},{"device_id":"15a82a' +
        'aa-0d9e-4083-a32d-2352191877e6","user_id":"15a82aaa-0d9e-4083-a32d-2352191877e6","timestamp":1455744746295,' +
        '"event_id":3,"session_id":1455744733865,"event_type":"clicked","version_name":"Web","platform":"Web",' +
        '"os_name":"Chrome","os_version":"48","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{"10":"false","bool":true,"null":null,"string":"test","array":' +
        '[0,1,2,"3"],"nested_array":["a",{"key":"value"},["b"]],"object":{"key":"value"},"nested_object":' +
        '{"k":"v","l":[0,1],"o":{"k2":"v2","l2":["e2",{"k3":"v3"}]}}},"user_properties":{},"uuid":"650407a1-d705-' +
        '47a0-8918-b4530ce51f89","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number":5}]'
      localStorage.setItem('datadive_unsent_' + apiKey, existingEvents);

      var datadive2 = new DatadiveClient('$default_instance');
      datadive2.init(apiKey, null, {batchEvents: true});

      var expected = {
        '10': 'false',
        'bool': true,
        'string': 'test',
        'array': [0, 1, 2, '3'],
        'nested_array': ['a', {'key':'value'}],
        'object': {'key':'value'},
        'nested_object': {'k':'v', 'l':[0,1], 'o':{'k2':'v2', 'l2': ['e2', {'k3':'v3'}]}}
      }

      // check that event loaded into memory
      assert.deepEqual(datadive2._unsentEvents[0].event.event_properties, {});
      assert.deepEqual(datadive2._unsentEvents[1].event.event_properties, expected);
    });

    it('should validate user properties when loading saved identifys from localStorage', function() {
      var existingEvents = '[{"device_id":"15a82a' +
        'aa-0d9e-4083-a32d-2352191877e6","user_id":"15a82aaa-0d9e-4083-a32d-2352191877e6","timestamp":1455744746295,' +
        '"event_id":3,"session_id":1455744733865,"event_type":"$identify","version_name":"Web","platform":"Web",' +
        '"os_name":"Chrome","os_version":"48","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"user_properties":{"$set":{"10":"false","bool":true,"null":null,"string":"test","array":' +
        '[0,1,2,"3"],"nested_array":["a",{"key":"value"},["b"]],"object":{"key":"value"},"nested_object":' +
        '{"k":"v","l":[0,1],"o":{"k2":"v2","l2":["e2",{"k3":"v3"}]}}}},"event_properties":{},"uuid":"650407a1-d705-' +
        '47a0-8918-b4530ce51f89","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number":5}]'
      localStorage.setItem('datadive_unsent_identify_' + apiKey, existingEvents);

      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey, null, {batchEvents: true});

      var expected = {
        '10': 'false',
        'bool': true,
        'string': 'test',
        'array': [0, 1, 2, '3'],
        'nested_array': ['a', {'key':'value'}],
        'object': {'key':'value'},
        'nested_object': {'k':'v', 'l':[0,1], 'o':{'k2':'v2', 'l2': ['e2', {'k3':'v3'}]}}
      }

      // check that event loaded into memory
      assert.deepEqual(datadive2._unsentIdentifys[0].event.user_properties, {'$set': expected});
    });

    it ('should load saved events from localStorage and send events for default instance', function() {
      var existingEvent = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769146589,' +
        '"event_id":49,"session_id":1453763315544,"event_type":"clicked","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{},"uuid":"3c508faa-a5c9-45fa-9da7-9f4f3b992fb0","library"' +
        ':{"name":"datadive-js","version":"2.9.0"},"sequence_number":130}]';
      var existingIdentify = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769338995,' +
        '"event_id":82,"session_id":1453763315544,"event_type":"$identify","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{"$set":{"age":30,"city":"San Francisco, CA"}},"uuid":"' +
        'c50e1be4-7976-436a-aa25-d9ee38951082","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number"' +
        ':131}]';
      localStorage.setItem('datadive_unsent_' + apiKey, existingEvent);
      localStorage.setItem('datadive_unsent_identify_' + apiKey, existingIdentify);

      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 2});
      server.respondWith('success');
      server.respond();

      // check event loaded into memory
      assert.deepEqual(datadive2._unsentEvents, []);
      assert.deepEqual(datadive2._unsentIdentifys, []);

      // check local storage keys are still same
      assert.equal(localStorage.getItem('datadive_unsent_' + apiKey), JSON.stringify([]));
      assert.equal(localStorage.getItem('datadive_unsent_identify_' + apiKey), JSON.stringify([]));

      // check request
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);
      assert.equal(events[0].event_id, 49);
      assert.equal(events[1].event_type, '$identify');
    });

it ('should load saved events from localStorage new keys and send events', function() {
      var existingEvent = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769146589,' +
        '"event_id":49,"session_id":1453763315544,"event_type":"clicked","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{},"uuid":"3c508faa-a5c9-45fa-9da7-9f4f3b992fb0","library"' +
        ':{"name":"datadive-js","version":"2.9.0"},"sequence_number":130}]';
      var existingIdentify = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769338995,' +
        '"event_id":82,"session_id":1453763315544,"event_type":"$identify","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{"$set":{"age":30,"city":"San Francisco, CA"}},"uuid":"' +
        'c50e1be4-7976-436a-aa25-d9ee38951082","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number"' +
        ':131}]';
      localStorage.setItem('datadive_unsent_' + apiKey + '_new_app', existingEvent);
      localStorage.setItem('datadive_unsent_identify_' + apiKey + '_new_app', existingIdentify);

      var datadive2 = new DatadiveClient('new_app');
      datadive2.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 2});
      server.respondWith('success');
      server.respond();

      // check event loaded into memory
      assert.deepEqual(datadive2._unsentEvents, []);
      assert.deepEqual(datadive2._unsentIdentifys, []);

      // check local storage keys are still same
      assert.equal(localStorage.getItem('datadive_unsent_' + apiKey + '_new_app'), JSON.stringify([]));
      assert.equal(localStorage.getItem('datadive_unsent_identify_' + apiKey + '_new_app'), JSON.stringify([]));

      // check request
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);
      assert.equal(events[0].event_id, 49);
      assert.equal(events[1].event_type, '$identify');
    });

    it('should validate event properties when loading saved events from localStorage', function() {
      var existingEvents = '[{"device_id":"15a82aaa-0d9e-4083-a32d-2352191877e6","user_id":"15a82aaa-0d9e-4083-a32d' +
          '-2352191877e6","timestamp":1455744744413,"event_id":2,"session_id":1455744733865,"event_type":"clicked",' +
          '"version_name":"Web","platform":"Web","os_name":"Chrome","os_version":"48","device_model":"Mac","language"' +
          ':"en-US","api_properties":{},"event_properties":"{}","user_properties":{},"uuid":"1b8859d9-e91e-403e-92d4-' +
          'c600dfb83432","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number":4},{"device_id":"15a82a' +
          'aa-0d9e-4083-a32d-2352191877e6","user_id":"15a82aaa-0d9e-4083-a32d-2352191877e6","timestamp":1455744746295,' +
          '"event_id":3,"session_id":1455744733865,"event_type":"clicked","version_name":"Web","platform":"Web",' +
          '"os_name":"Chrome","os_version":"48","device_model":"Mac","language":"en-US","api_properties":{},' +
          '"event_properties":{"10":"false","bool":true,"null":null,"string":"test","array":' +
          '[0,1,2,"3"],"nested_array":["a",{"key":"value"},["b"]],"object":{"key":"value"},"nested_object":' +
          '{"k":"v","l":[0,1],"o":{"k2":"v2","l2":["e2",{"k3":"v3"}]}}},"user_properties":{},"uuid":"650407a1-d705-' +
          '47a0-8918-b4530ce51f89","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number":5}]';
      localStorage.setItem('datadive_unsent_' + apiKey, existingEvents);

      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey, null, {
        batchEvents: true
      });

      var expected = {
        '10': 'false',
        'bool': true,
        'string': 'test',
        'array': [0, 1, 2, '3'],
        'nested_array': ['a', {'key':'value'}],
        'object': {
          'key': 'value'
        },
        'nested_object': {
          'k': 'v',
          'l': [0, 1],
          'o': {
              'k2': 'v2',
              'l2': ['e2', {'k3':'v3'}]
          }
        }
      }

      // check that event loaded into memory
      assert.deepEqual(datadive2._unsentEvents[0].event.event_properties, {});
      assert.deepEqual(datadive2._unsentEvents[1].event.event_properties, expected);
    });

    it('should not load saved events from another instances\'s localStorage', function() {
      var existingEvent = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769146589,' +
        '"event_id":49,"session_id":1453763315544,"event_type":"clicked","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{},"uuid":"3c508faa-a5c9-45fa-9da7-9f4f3b992fb0","library"' +
        ':{"name":"datadive-js","version":"2.9.0"},"sequence_number":130}]';
      var existingIdentify = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769338995,' +
        '"event_id":82,"session_id":1453763315544,"event_type":"$identify","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{"$set":{"age":30,"city":"San Francisco, CA"}},"uuid":"' +
        'c50e1be4-7976-436a-aa25-d9ee38951082","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number"' +
        ':131}]';
      localStorage.setItem('datadive_unsent_' + apiKey, existingEvent);
      localStorage.setItem('datadive_unsent_identify_' + apiKey, existingIdentify);
      assert.isNull(localStorage.getItem('datadive_unsent_' + apiKey + '_new_app'));
      assert.isNull(localStorage.getItem('datadive_unsent_identify_' + apiKey + '_new_app'));

      var datadive2 = new DatadiveClient('new_app');
      datadive2.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 2});

      // check events not loaded into memory
      assert.deepEqual(datadive2._unsentEvents, []);
      assert.deepEqual(datadive2._unsentIdentifys, []);

      // check local storage
      assert.equal(localStorage.getItem('datadive_unsent_' + apiKey), existingEvent);
      assert.equal(localStorage.getItem('datadive_unsent_identify_' + apiKey), existingIdentify);
      assert.equal(localStorage.getItem('datadive_unsent_' + apiKey + '_new_app'), '[]');
      assert.equal(localStorage.getItem('datadive_unsent_identify_' + apiKey + '_new_app'), '[]');

      // check request
      assert.lengthOf(server.requests, 0);
    });

    it('should merge tracking options during parseConfig', function() {
      var trackingOptions = {
        city: false,
        ip_address: false,
        language: false,
        region: true,
      };

      var datadive2 = new DatadiveClient('new_app');
      datadive2.init(apiKey, null, {trackingOptions: trackingOptions});

      // check config loaded correctly
      assert.deepEqual(datadive2.options.trackingOptions, {
        city: false,
        country: true,
        carrier: true,
        device_manufacturer: true,
        device_model: true,
        dma: true,
        ip_address: false,
        language: false,
        os_name: true,
        os_version: true,
        platform: true,
        region: true,
        version_name: true
      });
    });

    it('should pregenerate tracking options for api properties', function() {
      var trackingOptions = {
        city: false,
        ip_address: false,
        language: false,
        region: true,
      };

      var datadive2 = new DatadiveClient('new_app');
      datadive2.init(apiKey, null, {trackingOptions: trackingOptions});

      assert.deepEqual(datadive2._apiPropertiesTrackingOptions, {tracking_options: {
        city: false,
        ip_address: false
      }});
    });
  });

  describe('runQueuedFunctions', function() {
    beforeEach(function() {
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
    });

    it('should run queued functions', function() {
      assert.equal(datadive._unsentCount(), 0);
      assert.lengthOf(server.requests, 0);
      var userId = 'testUserId'
      var eventType = 'test_event'
      var functions = [
        ['setUserId', userId],
        ['logEvent', eventType]
      ];
      datadive._q = functions;
      assert.lengthOf(datadive._q, 2);
      datadive.runQueuedFunctions();

      assert.equal(datadive.options.userId, userId);
      assert.equal(datadive._unsentCount(), 1);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, eventType);

      assert.lengthOf(datadive._q, 0);
    });
  });

  describe('setUserProperties', function() {
    beforeEach(function() {
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
    });

    it('should log identify call from set user properties', function() {
      assert.equal(datadive._unsentCount(), 0);
      datadive.setUserProperties({'prop': true, 'key': 'value'});

      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 1);
      assert.equal(datadive._unsentCount(), 1);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].event_properties, {});

      var expected = {
        '$set': {
          'prop': true,
          'key': 'value'
        }
      };
      assert.deepEqual(events[0].user_properties, expected);
    });
  });

  describe('clearUserProperties', function() {
    beforeEach(function() {
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
    });

    it('should log identify call from clear user properties', function() {
      assert.equal(datadive._unsentCount(), 0);
      datadive.clearUserProperties();

      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 1);
      assert.equal(datadive._unsentCount(), 1);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].event_properties, {});

      var expected = {
        '$clearAll': '-'
      };
      assert.deepEqual(events[0].user_properties, expected);
    });
  });

  describe('setGroup', function() {
    beforeEach(function() {
      reset();
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
    });

    it('should generate an identify event with groups set', function() {
      datadive.setGroup('orgId', 15);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);

      // verify identify event
      var identify = events[0];
      assert.equal(identify.event_type, '$identify');
      assert.deepEqual(identify.user_properties, {
        '$set': {'orgId': 15},
      });
      assert.deepEqual(identify.event_properties, {});
      assert.deepEqual(identify.groups, {
        'orgId': '15',
      });
    });

    it('should ignore empty string groupTypes', function() {
      datadive.setGroup('', 15);
      assert.lengthOf(server.requests, 0);
    });

    it('should ignore non-string groupTypes', function() {
      datadive.setGroup(10, 10);
      datadive.setGroup([], 15);
      datadive.setGroup({}, 20);
      datadive.setGroup(true, false);
      assert.lengthOf(server.requests, 0);
    });
  });


describe('setVersionName', function() {
    beforeEach(function() {
      reset();
    });

    afterEach(function() {
      reset();
    });

    it('should set version name', function() {
      datadive.init(apiKey, null, {batchEvents: true});
      datadive.setVersionName('testVersionName1');
      datadive.logEvent('testEvent1');
      assert.equal(datadive._unsentEvents[0].event.version_name, 'testVersionName1');

      // should ignore non-string values
      datadive.setVersionName(15000);
      datadive.logEvent('testEvent2');
      assert.equal(datadive._unsentEvents[1].event.version_name, 'testVersionName1');
    });
  });

  describe('regenerateDeviceId', function() {
    beforeEach(function() {
      reset();
    });

    afterEach(function() {
      reset();
    });

    it('should regenerate the deviceId', function() {
      var deviceId = 'oldDeviceId';
      datadive.init(apiKey, null, {'deviceId': deviceId});
      datadive.regenerateDeviceId();
      assert.notEqual(datadive.options.deviceId, deviceId);
      assert.lengthOf(datadive.options.deviceId, 22);
    });
  });

  describe('setDeviceId', function() {

    beforeEach(function() {
      reset();
    });

    afterEach(function() {
      reset();
    });

    it('should change device id', function() {
      datadive.init(apiKey, null, {'deviceId': 'fakeDeviceId'});
      datadive.setDeviceId('deviceId');
      assert.equal(datadive.options.deviceId, 'deviceId');
    });

    it('should not change device id if empty', function() {
      datadive.init(apiKey, null, {'deviceId': 'deviceId'});
      datadive.setDeviceId('');
      assert.notEqual(datadive.options.deviceId, '');
      assert.equal(datadive.options.deviceId, 'deviceId');
    });

    it('should not change device id if null', function() {
      datadive.init(apiKey, null, {'deviceId': 'deviceId'});
      datadive.setDeviceId(null);
      assert.notEqual(datadive.options.deviceId, null);
      assert.equal(datadive.options.deviceId, 'deviceId');
    });

    it('should store device id in cookie', function() {
      datadive.init(apiKey, null, {'deviceId': 'fakeDeviceId'});
      datadive.setDeviceId('deviceId');
      var stored = datadive._metadataStorage.load();
      assert.propertyVal(stored, 'deviceId', 'deviceId');
    });
  });

  describe('resetSessionId', function() {
    let clock;

    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      reset();
      clock.restore();
    });

    it('should reset the session Id', function() {
      clock.tick(10);
      datadive.init(apiKey);

      clock.tick(100);
      datadive.resetSessionId();

      clock.tick(200);

      assert.equal(datadive._sessionId, 110);
    });
  });

  describe('identify', function() {
    let clock;

    beforeEach(function() {
      clock = sinon.useFakeTimers();
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
      clock.restore();
    });

    it('should ignore inputs that are not identify objects', function() {
      datadive.identify('This is a test');
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);

      datadive.identify(150);
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);

      datadive.identify(['test']);
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);

      datadive.identify({'user_prop': true});
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);
    });

    it('should generate an event from the identify object', function() {
      var identify = new Identify().set('prop1', 'value1').unset('prop2').add('prop3', 3).setOnce('prop4', true);
      datadive.identify(identify);

      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 1);
      assert.equal(datadive._unsentCount(), 1);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].event_properties, {});
      assert.deepEqual(events[0].user_properties, {
        '$set': {
          'prop1': 'value1'
        },
        '$unset': {
          'prop2': '-'
        },
        '$add': {
          'prop3': 3
        },
        '$setOnce': {
          'prop4': true
        }
      });
    });

    it('should ignore empty identify objects', function() {
      datadive.identify(new Identify());
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);
    });

    it('should ignore empty proxy identify objects', function() {
      datadive.identify({'_q': {}});
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);

      datadive.identify({});
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);
    });

    it('should generate an event from a proxy identify object', function() {
      var proxyObject = {'_q':[
        ['setOnce', 'key2', 'value4'],
        ['unset', 'key1'],
        ['add', 'key1', 'value1'],
        ['set', 'key2', 'value3'],
        ['set', 'key4', 'value5'],
        ['prepend', 'key5', 'value6']
      ]};
      datadive.identify(proxyObject);

      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 1);
      assert.equal(datadive._unsentCount(), 1);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].event_properties, {});
      assert.deepEqual(events[0].user_properties, {
        '$setOnce': {'key2': 'value4'},
        '$unset': {'key1': '-'},
        '$set': {'key4': 'value5'},
        '$prepend': {'key5': 'value6'}
      });
    });

    it('should run the callback after making the identify call', function() {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      }
      var identify = new datadive.Identify().set('key', 'value');
      datadive.identify(identify, callback);

      // before server responds, callback should not fire
      assert.lengthOf(server.requests, 1);
      assert.equal(counter, 0);
      assert.equal(value, -1);
      assert.equal(message, '');

      // after server response, fire callback
      server.respondWith('success');
      server.respond();
      assert.equal(counter, 1);
      assert.equal(value, 200);
      assert.equal(message, 'success');
    });

    it('should run the callback even if client not initialized with apiKey', function() {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      }
      var identify = new datadive.Identify().set('key', 'value');
      new DatadiveClient().identify(identify, callback);

      // verify callback fired
      assert.equal(counter, 1);
      assert.equal(value, 0);
      assert.equal(message, 'No request sent');
    });

    it('should run the callback even with an invalid identify object', function() {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      }
      datadive.identify(null, callback);

      // verify callback fired
      assert.equal(counter, 1);
      assert.equal(value, 0);
      assert.equal(message, 'No request sent');
    });
  });

  describe('groupIdentify', function() {
    let clock;
    let group_type;
    let group_name;

    beforeEach(function() {
      clock = sinon.useFakeTimers();
      group_type = 'test group type';
      group_name = 'test group name';
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
      clock.restore();
    });

    it('should ignore inputs that are not identify objects', function() {
      datadive.groupIdentify(group_type, group_name, 'This is a test');
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);

      datadive.groupIdentify(group_type, group_name, 150);
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);

      datadive.groupIdentify(group_type, group_name, ['test']);
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);

      datadive.groupIdentify(group_type, group_name, {'user_prop': true});
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);
    });

    it('should generate an event from the identify object', function() {
      var identify = new Identify().set('prop1', 'value1').unset('prop2').add('prop3', 3).setOnce('prop4', true);
      datadive.groupIdentify(group_type, group_name, identify);

      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 1);
      assert.equal(datadive._unsentCount(), 1);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, '$groupidentify');
      assert.deepEqual(events[0].event_properties, {});
      assert.deepEqual(events[0].user_properties, {});
      assert.deepEqual(events[0].group_properties, {
        '$set': {
          'prop1': 'value1'
        },
        '$unset': {
          'prop2': '-'
        },
        '$add': {
          'prop3': 3
        },
        '$setOnce': {
          'prop4': true
        }
      });
      assert.deepEqual(events[0].groups, {'test group type': 'test group name'});
    });

    it('should ignore empty identify objects', function() {
      datadive.groupIdentify(group_type, group_name, new Identify());
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);
    });

    it('should ignore empty proxy identify objects', function() {
      datadive.groupIdentify(group_type, group_name, {'_q': {}});
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);

      datadive.groupIdentify(group_type, group_name, {});
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);
    });

    it('should generate an event from a proxy identify object', function() {
      var proxyObject = {'_q':[
        ['setOnce', 'key2', 'value4'],
        ['unset', 'key1'],
        ['add', 'key1', 'value1'],
        ['set', 'key2', 'value3'],
        ['set', 'key4', 'value5'],
        ['prepend', 'key5', 'value6']
      ]};
      datadive.groupIdentify(group_type, group_name, proxyObject);

      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 1);
      assert.equal(datadive._unsentCount(), 1);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, '$groupidentify');
      assert.deepEqual(events[0].event_properties, {});
      assert.deepEqual(events[0].user_properties, {});
      assert.deepEqual(events[0].group_properties, {
        '$setOnce': {'key2': 'value4'},
        '$unset': {'key1': '-'},
        '$set': {'key4': 'value5'},
        '$prepend': {'key5': 'value6'}
      });
      assert.deepEqual(events[0].groups, {'test group type': 'test group name'});
    });

    it('should run the callback after making the identify call', function() {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      }
      var identify = new datadive.Identify().set('key', 'value');
      datadive.groupIdentify(group_type, group_name, identify, callback);

      // before server responds, callback should not fire
      assert.lengthOf(server.requests, 1);
      assert.equal(counter, 0);
      assert.equal(value, -1);
      assert.equal(message, '');

      // after server response, fire callback
      server.respondWith('success');
      server.respond();
      assert.equal(counter, 1);
      assert.equal(value, 200);
      assert.equal(message, 'success');
    });

    it('should run the callback even if client not initialized with apiKey', function() {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      }
      var identify = new datadive.Identify().set('key', 'value');
      new DatadiveClient().groupIdentify(group_type, group_name, identify, callback);

      // verify callback fired
      assert.equal(counter, 1);
      assert.equal(value, 0);
      assert.equal(message, 'No request sent');
    });

    it('should run the callback even with an invalid identify object', function() {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      }
      datadive.groupIdentify(group_type, group_name, null, callback);

      // verify callback fired
      assert.equal(counter, 1);
      assert.equal(value, 0);
      assert.equal(message, 'No request sent');
    });
  });

  describe('logEvent with tracking options', function() {

    var clock;

    beforeEach(function() {
      clock = sinon.useFakeTimers();
      var trackingOptions = {
        city: false,
        country: true,
        ip_address: false,
        language: false,
        platform: false,
        region: true
      };
      datadive.init(apiKey, null, {trackingOptions: trackingOptions});
    });

    afterEach(function() {
      reset();
      clock.restore();
    });

    it('should not track language or platform', function() {
      assert.equal(datadive.options.trackingOptions.language, false);
      assert.equal(datadive.options.trackingOptions.platform, false);
      datadive.logEvent('Event Type 1');
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events[0].language, null);
      assert.equal(events[0].platform, null);
    });

    it('should send trackingOptions in api properties', function() {
      datadive.logEvent('Event Type 2');
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);

      // verify country is not sent since it matches the default value of true
      assert.deepEqual(events[0].api_properties, {
        tracking_options: {
          city: false,
          ip_address: false,
        }
      });
    });
  });

  describe('logEvent', function() {

    let clock, startTime;

    beforeEach(function() {
      startTime = Date.now();
      clock = sinon.useFakeTimers(startTime);
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
      clock.restore();
    });

    it('should send request', function() {
      datadive.options.forceHttps = false;
      datadive.logEvent('Event Type 1');
      assert.lengthOf(server.requests, 1);
      assert.equal(server.requests[0].url, 'http://api.datadive.ai');
      assert.equal(server.requests[0].method, 'POST');
      assert.equal(server.requests[0].async, true);
    });

    it('should send https request', function() {
      datadive.options.forceHttps = true;
      datadive.logEvent('Event Type 1');
      assert.lengthOf(server.requests, 1);
      assert.equal(server.requests[0].url, 'https://api.datadive.ai');
      assert.equal(server.requests[0].method, 'POST');
      assert.equal(server.requests[0].async, true);
    });

    it('should send https request by configuration', function() {
      datadive.init(apiKey, null, { forceHttps: true });
      datadive.logEvent('Event Type 1');
      assert.lengthOf(server.requests, 1);
      assert.equal(server.requests[0].url, 'https://api.datadive.ai');
      assert.equal(server.requests[0].method, 'POST');
      assert.equal(server.requests[0].async, true);
    });

    it('should reject empty event types', function() {
      datadive.logEvent();
      assert.lengthOf(server.requests, 0);
    });

    it('should send api key', function() {
      datadive.logEvent('Event Type 2');
      assert.lengthOf(server.requests, 1);
      assert.equal(queryString.parse(server.requests[0].requestBody).client, apiKey);
    });

    it('should send api version', function() {
      datadive.logEvent('Event Type 3');
      assert.lengthOf(server.requests, 1);
      assert.equal(queryString.parse(server.requests[0].requestBody).v, '2');
    });

    it('should send event JSON', function() {
      datadive.logEvent('Event Type 4');
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events.length, 1);
      assert.equal(events[0].event_type, 'Event Type 4');
    });

    it('should send language', function() {
      datadive.logEvent('Event Should Send Language');
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events.length, 1);
      assert.isNotNull(events[0].language);
    });

    it('should not send trackingOptions in api properties', function() {
      datadive.logEvent('Event Should Not Send Tracking Properties');
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events.length, 1);
      assert.deepEqual(events[0].api_properties, {});
    });

    it('should send platform', function() {
      datadive.logEvent('Event Should Send Platform');
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events.length, 1);
      assert.equal(events[0].platform, 'Web');
    });

    it('should accept properties', function() {
      datadive.logEvent('Event Type 5', {prop: true});
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.deepEqual(events[0].event_properties, {prop: true});
    });

    it('should queue events', function() {
      datadive._sending = true;
      datadive.logEvent('Event', {index: 1});
      datadive.logEvent('Event', {index: 2});
      datadive.logEvent('Event', {index: 3});
      datadive._sending = false;

      datadive.logEvent('Event', {index: 100});

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 4);
      assert.deepEqual(events[0].event_properties, {index: 1});
      assert.deepEqual(events[3].event_properties, {index: 100});
    });

    it('should limit events queued', function() {
      datadive.init(apiKey, null, {savedMaxCount: 10});

      datadive._sending = true;
      for (var i = 0; i < 15; i++) {
        datadive.logEvent('Event', {index: i});
      }
      datadive._sending = false;

      datadive.logEvent('Event', {index: 100});

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 10);
      assert.deepEqual(events[0].event_properties, {index: 6});
      assert.deepEqual(events[9].event_properties, {index: 100});
    });

    it('should remove only sent events', function() {
      datadive._sending = true;
      datadive.logEvent('Event', {index: 1});
      datadive.logEvent('Event', {index: 2});
      datadive._sending = false;
      datadive.logEvent('Event', {index: 3});

      server.respondWith('success');
      server.respond();

      datadive.logEvent('Event', {index: 4});

      assert.lengthOf(server.requests, 2);
      var events = JSON.parse(queryString.parse(server.requests[1].requestBody).e);
      assert.lengthOf(events, 1);
      assert.deepEqual(events[0].event_properties, {index: 4});
    });

    it('should save events', function() {
      datadive.init(apiKey, null, {saveEvents: true});
      datadive.logEvent('Event', {index: 1});
      datadive.logEvent('Event', {index: 2});
      datadive.logEvent('Event', {index: 3});

      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey);
      assert.deepEqual(
        datadive2._unsentEvents.map(({event}) => event),
        datadive._unsentEvents.map(({event}) => event)
      );
    });

    it('should not save events', function() {
      datadive.init(apiKey, null, {saveEvents: false});
      datadive.logEvent('Event', {index: 1});
      datadive.logEvent('Event', {index: 2});
      datadive.logEvent('Event', {index: 3});

      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey);
      assert.deepEqual(datadive2._unsentEvents, []);
    });

    it('should limit events sent', function() {
      datadive.init(apiKey, null, {uploadBatchSize: 10});

      datadive._sending = true;
      for (var i = 0; i < 15; i++) {
        datadive.logEvent('Event', {index: i});
      }
      datadive._sending = false;

      datadive.logEvent('Event', {index: 100});

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 10);
      assert.deepEqual(events[0].event_properties, {index: 0});
      assert.deepEqual(events[9].event_properties, {index: 9});

      server.respondWith('success');
      server.respond();

      assert.lengthOf(server.requests, 2);
      var events = JSON.parse(queryString.parse(server.requests[1].requestBody).e);
      assert.lengthOf(events, 6);
      assert.deepEqual(events[0].event_properties, {index: 10});
      assert.deepEqual(events[5].event_properties, {index: 100});
    });

    it('should batch events sent', function() {
      var eventUploadPeriodMillis = 10*1000;
      datadive.init(apiKey, null, {
        batchEvents: true,
        eventUploadThreshold: 10,
        eventUploadPeriodMillis: eventUploadPeriodMillis
      });

      for (var i = 0; i < 15; i++) {
        datadive.logEvent('Event', {index: i});
      }

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 10);
      assert.deepEqual(events[0].event_properties, {index: 0});
      assert.deepEqual(events[9].event_properties, {index: 9});

      server.respondWith('success');
      server.respond();

      assert.lengthOf(server.requests, 1);
      var unsentEvents = datadive._unsentEvents;
      assert.lengthOf(unsentEvents, 5);
      assert.deepEqual(unsentEvents[4].event.event_properties, {index: 14});

      // remaining 5 events should be sent by the delayed sendEvent call
      clock.tick(eventUploadPeriodMillis);
      assert.lengthOf(server.requests, 2);
      server.respondWith('success');
      server.respond();
      assert.lengthOf(datadive._unsentEvents, 0);
      var events = JSON.parse(queryString.parse(server.requests[1].requestBody).e);
      assert.lengthOf(events, 5);
      assert.deepEqual(events[4].event_properties, {index: 14});
    });

    it('should send events after a delay', function() {
      var eventUploadPeriodMillis = 10*1000;
      datadive.init(apiKey, null, {
        batchEvents: true,
        eventUploadThreshold: 2,
        eventUploadPeriodMillis: eventUploadPeriodMillis
      });
      datadive.logEvent('Event');

      // saveEvent should not have been called yet
      assert.lengthOf(datadive._unsentEvents, 1);
      assert.lengthOf(server.requests, 0);

      // saveEvent should be called after delay
      clock.tick(eventUploadPeriodMillis);
      assert.lengthOf(server.requests, 1);
      server.respondWith('success');
      server.respond();
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.deepEqual(events[0].event_type, 'Event');
    });

    it('should not send events after a delay if no events to send', function() {
      var eventUploadPeriodMillis = 10*1000;
      datadive.init(apiKey, null, {
        batchEvents: true,
        eventUploadThreshold: 2,
        eventUploadPeriodMillis: eventUploadPeriodMillis
      });
      datadive.logEvent('Event1');
      datadive.logEvent('Event2');

      // saveEvent triggered by 2 event batch threshold
      assert.lengthOf(datadive._unsentEvents, 2);
      assert.lengthOf(server.requests, 1);
      server.respondWith('success');
      server.respond();
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);
      assert.deepEqual(events[1].event_type, 'Event2');

      // saveEvent should be called after delay, but no request made
      assert.lengthOf(datadive._unsentEvents, 0);
      clock.tick(eventUploadPeriodMillis);
      assert.lengthOf(server.requests, 1);
    });

    it('should not schedule more than one upload', function() {
      var eventUploadPeriodMillis = 5*1000; // 5s
      datadive.init(apiKey, null, {
        batchEvents: true,
        eventUploadThreshold: 30,
        eventUploadPeriodMillis: eventUploadPeriodMillis
      });

      // log 2 events, 1 millisecond apart, second event should not schedule upload
      datadive.logEvent('Event1');
      clock.tick(1);
      datadive.logEvent('Event2');
      assert.lengthOf(datadive._unsentEvents, 2);
      assert.lengthOf(server.requests, 0);

      // advance to upload period millis, and should have 1 server request
      // from the first scheduled upload
      clock.tick(eventUploadPeriodMillis-1);
      assert.lengthOf(server.requests, 1);
      server.respondWith('success');
      server.respond();

      // log 3rd event, advance 1 more millisecond, verify no 2nd server request
      datadive.logEvent('Event3');
      clock.tick(1);
      assert.lengthOf(server.requests, 1);

      // the 3rd event, however, should have scheduled another upload after 5s
      clock.tick(eventUploadPeriodMillis-2);
      assert.lengthOf(server.requests, 1);
      clock.tick(1);
      assert.lengthOf(server.requests, 2);
    });

    it('should back off on 413 status', function() {
      datadive.init(apiKey, null, {uploadBatchSize: 10});

      datadive._sending = true;
      for (var i = 0; i < 15; i++) {
        datadive.logEvent('Event', {index: i});
      }
      datadive._sending = false;

      datadive.logEvent('Event', {index: 100});

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 10);
      assert.deepEqual(events[0].event_properties, {index: 0});
      assert.deepEqual(events[9].event_properties, {index: 9});

      server.respondWith([413, {}, '']);
      server.respond();

      assert.lengthOf(server.requests, 2);
      var events = JSON.parse(queryString.parse(server.requests[1].requestBody).e);
      assert.lengthOf(events, 5);
      assert.deepEqual(events[0].event_properties, {index: 0});
      assert.deepEqual(events[4].event_properties, {index: 4});
    });

    it('should back off on 413 status all the way to 1 event with drops', function() {
      datadive.init(apiKey, null, {uploadBatchSize: 9});

      datadive._sending = true;
      for (var i = 0; i < 10; i++) {
        datadive.logEvent('Event', {index: i});
      }
      datadive._sending = false;
      datadive.logEvent('Event', {index: 100});

      for (var i = 0; i < 6; i++) {
        assert.lengthOf(server.requests, i+1);
        server.respondWith([413, {}, '']);
        server.respond();
      }

      var events = JSON.parse(queryString.parse(server.requests[6].requestBody).e);
      assert.lengthOf(events, 1);
      assert.deepEqual(events[0].event_properties, {index: 2});
    });

    it ('should run callback if no eventType', function () {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      }
      datadive.logEvent(null, null, callback);
      assert.equal(counter, 1);
      assert.equal(value, 0);
      assert.equal(message, 'No request sent');
    });

    it ('should run callback if optout', function () {
      datadive.setOptOut(true);
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      };
      datadive.logEvent('test', null, callback);
      assert.equal(counter, 1);
      assert.equal(value, 0);
      assert.equal(message, 'No request sent');
    });

    it ('should not run callback if invalid callback and no eventType', function () {
      datadive.logEvent(null, null, 'invalid callback');
    });

    it ('should run callback after logging event', function () {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      };
      datadive.logEvent('test', null, callback);

      // before server responds, callback should not fire
      assert.lengthOf(server.requests, 1);
      assert.equal(counter, 0);
      assert.equal(value, -1);
      assert.equal(message, '');

      // after server response, fire callback
      server.respondWith('success');
      server.respond();
      assert.equal(counter, 1);
      assert.equal(value, 200);
      assert.equal(message, 'success');
    });

    it ('should run callback if batchEvents but under threshold', function () {
      var eventUploadPeriodMillis = 5*1000;
      datadive.init(apiKey, null, {
        batchEvents: true,
        eventUploadThreshold: 2,
        eventUploadPeriodMillis: eventUploadPeriodMillis
      });
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      };
      datadive.logEvent('test', null, callback);
      assert.lengthOf(server.requests, 0);

      // check that request is made after delay, but callback is not run a second time
      clock.tick(eventUploadPeriodMillis);
      assert.lengthOf(server.requests, 1);
      server.respondWith('success');
      server.respond();
      assert.equal(counter, 1);
      assert.equal(value, 200);
      assert.equal(message, 'success');
    });

    it ('should run callback once and only after all events are uploaded', function () {
      datadive.init(apiKey, null, {uploadBatchSize: 10});
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      };

      // queue up 15 events, since batchsize 10, need to send in 2 batches
      datadive._sending = true;
      for (var i = 0; i < 15; i++) {
        datadive.logEvent('Event', {index: i});
      }
      datadive._sending = false;

      datadive.logEvent('Event', {index: 100}, callback);

      assert.lengthOf(server.requests, 1);
      server.respondWith('success');
      server.respond();

      // after first response received, callback should not have fired
      assert.equal(counter, 0);
      assert.equal(value, -1);
      assert.equal(message, '');

      assert.lengthOf(server.requests, 2);
      server.respondWith('success');
      server.respond();

      // after last response received, callback should fire
      assert.equal(counter, 1);
      assert.equal(value, 200);
      assert.equal(message, 'success');
    });

    it ('should run callback once and only after 413 resolved', function () {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        counter++;
        value = status;
        message = response;
      };

      // queue up 15 events
      datadive._sending = true;
      for (var i = 0; i < 15; i++) {
        datadive.logEvent('Event', {index: i});
      }
      datadive._sending = false;

      // 16th event with 413 will backoff to batches of 8
      datadive.logEvent('Event', {index: 100}, callback);

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 16);

      // after 413 response received, callback should not have fired
      server.respondWith([413, {}, '']);
      server.respond();
      assert.equal(counter, 0);
      assert.equal(value, -1);
      assert.equal(message, '');

      // after sending first backoff batch, callback still should not have fired
      assert.lengthOf(server.requests, 2);
      var events = JSON.parse(queryString.parse(server.requests[1].requestBody).e);
      assert.lengthOf(events, 8);
      server.respondWith('success');
      server.respond();
      assert.equal(counter, 0);
      assert.equal(value, -1);
      assert.equal(message, '');

      // after sending second backoff batch, callback should fire
      assert.lengthOf(server.requests, 3);
      var events = JSON.parse(queryString.parse(server.requests[1].requestBody).e);
      assert.lengthOf(events, 8);
      server.respondWith('success');
      server.respond();
      assert.equal(counter, 1);
      assert.equal(value, 200);
      assert.equal(message, 'success');
    });

    it ('should _not_ run callback when the server returns a 500', function () {
      const callback = sinon.spy();

      datadive.logEvent('test', null, callback);
      server.respondWith([500, {}, 'Not found']);
      server.respond();
      assert.isFalse(callback.calledOnce);
    });

    it('should run the callback when the server finally returns a 200 after a 500', function () {
      const callback = sinon.spy();

      datadive.logEvent('test', null, callback);
      server.respondWith([500, {}, 'Not found']);
      server.respond();
      // The SDK retries failed events when a new event is sent
      datadive.logEvent('test2');
      server.respondWith([200, {}, 'success']);
      server.respond();

      assert.isTrue(callback.calledOnce);
    });

    it('should run the callback when the server finally returns a 413 after a 500', function () {
      const callback = sinon.spy();

      datadive.logEvent('test', null, callback);
      server.respondWith([500, {}, 'Not found']);
      server.respond();
      // The SDK retries failed events when a new event is sent
      datadive.logEvent('test2');
      server.respondWith([413, {}, '']);
      server.respond();
      // The SDK will try to shrink the payload in half until its down to one event before giving up
      server.respondWith([413, {}, '']);
      server.respond();

      assert.isTrue(callback.calledOnce);
    });

    it('should send 3 identify events', function() {
      datadive.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 3});
      assert.equal(datadive._unsentCount(), 0);

      datadive.identify(new Identify().add('photoCount', 1));
      datadive.identify(new Identify().add('photoCount', 1).set('country', 'USA'));
      datadive.identify(new Identify().add('photoCount', 1));

      // verify some internal counters
      assert.equal(datadive._eventId, 0);
      assert.equal(datadive._identifyId, 3);
      assert.equal(datadive._unsentCount(), 3);
      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 3);

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 3);
      for (var i = 0; i < 3; i++) {
        assert.equal(events[i].event_type, '$identify');
        assert.isTrue('$add' in events[i].user_properties);
        assert.deepEqual(events[i].user_properties['$add'], {'photoCount': 1});
        assert.equal(events[i].event_id, i+1);
        assert.equal(events[i].sequence_number, i+1);
      }

      // send response and check that remove events works properly
      server.respondWith('success');
      server.respond();
      assert.equal(datadive._unsentCount(), 0);
      assert.lengthOf(datadive._unsentIdentifys, 0);
    });

    it('should send 3 events', function() {
      datadive.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 3});
      assert.equal(datadive._unsentCount(), 0);

      datadive.logEvent('test');
      datadive.logEvent('test');
      datadive.logEvent('test');

      // verify some internal counters
      assert.equal(datadive._eventId, 3);
      assert.equal(datadive._identifyId, 0);
      assert.equal(datadive._unsentCount(), 3);
      assert.lengthOf(datadive._unsentEvents, 3);
      assert.lengthOf(datadive._unsentIdentifys, 0);

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 3);
      for (var i = 0; i < 3; i++) {
        assert.equal(events[i].event_type, 'test');
        assert.equal(events[i].event_id, i+1);
        assert.equal(events[i].sequence_number, i+1);
      }

      // send response and check that remove events works properly
      server.respondWith('success');
      server.respond();
      assert.equal(datadive._unsentCount(), 0);
      assert.lengthOf(datadive._unsentEvents, 0);
    });

    it('should send 1 event and 1 identify event', function() {
      datadive.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 2});
      assert.equal(datadive._unsentCount(), 0);

      datadive.logEvent('test');
      datadive.identify(new Identify().add('photoCount', 1));

      // verify some internal counters
      assert.equal(datadive._eventId, 1);
      assert.equal(datadive._identifyId, 1);
      assert.equal(datadive._unsentCount(), 2);
      assert.lengthOf(datadive._unsentEvents, 1);
      assert.lengthOf(datadive._unsentIdentifys, 1);

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);

      // event should come before identify - maintain order using sequence number
      assert.equal(events[0].event_type, 'test');
      assert.equal(events[0].event_id, 1);
      assert.deepEqual(events[0].user_properties, {});
      assert.equal(events[0].sequence_number, 1);
      assert.equal(events[1].event_type, '$identify');
      assert.equal(events[1].event_id, 1);
      assert.isTrue('$add' in events[1].user_properties);
      assert.deepEqual(events[1].user_properties['$add'], {'photoCount': 1});
      assert.equal(events[1].sequence_number, 2);

      // send response and check that remove events works properly
      server.respondWith('success');
      server.respond();
      assert.equal(datadive._unsentCount(), 0);
      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 0);
    });

    it('should properly coalesce events and identify events into a request', function() {
      datadive.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 6});
      assert.equal(datadive._unsentCount(), 0);

      datadive.logEvent('test1');
      clock.tick(1);
      datadive.identify(new Identify().add('photoCount', 1));
      clock.tick(1);
      datadive.logEvent('test2');
      clock.tick(1);
      datadive.logEvent('test3');
      clock.tick(1);
      datadive.logEvent('test4');
      datadive.identify(new Identify().add('photoCount', 2));

      // verify some internal counters
      assert.equal(datadive._eventId, 4);
      assert.equal(datadive._identifyId, 2);
      assert.equal(datadive._unsentCount(), 6);
      assert.lengthOf(datadive._unsentEvents, 4);
      assert.lengthOf(datadive._unsentIdentifys, 2);

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 6);

      // verify the correct coalescing
      assert.equal(events[0].event_type, 'test1');
      assert.deepEqual(events[0].user_properties, {});
      assert.equal(events[0].sequence_number, 1);
      assert.equal(events[1].event_type, '$identify');
      assert.isTrue('$add' in events[1].user_properties);
      assert.deepEqual(events[1].user_properties['$add'], {'photoCount': 1});
      assert.equal(events[1].sequence_number, 2);
      assert.equal(events[2].event_type, 'test2');
      assert.deepEqual(events[2].user_properties, {});
      assert.equal(events[2].sequence_number, 3);
      assert.equal(events[3].event_type, 'test3');
      assert.deepEqual(events[3].user_properties, {});
      assert.equal(events[3].sequence_number, 4);
      assert.equal(events[4].event_type, 'test4');
      assert.deepEqual(events[4].user_properties, {});
      assert.equal(events[4].sequence_number, 5);
      assert.equal(events[5].event_type, '$identify');
      assert.isTrue('$add' in events[5].user_properties);
      assert.deepEqual(events[5].user_properties['$add'], {'photoCount': 2});
      assert.equal(events[5].sequence_number, 6);

      // send response and check that remove events works properly
      server.respondWith('success');
      server.respond();
      assert.equal(datadive._unsentCount(), 0);
      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 0);
    });

    it('should merge events supporting backwards compatability', function() {
      // events logged before v2.5.0 won't have sequence number, should get priority
      datadive.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 3});
      assert.equal(datadive._unsentCount(), 0);

      datadive.identify(new Identify().add('photoCount', 1));
      datadive.logEvent('test');
      delete datadive._unsentEvents[0].event.sequence_number; // delete sequence number to simulate old event
      datadive._sequenceNumber = 1; // reset sequence number
      datadive.identify(new Identify().add('photoCount', 2));

      // verify some internal counters
      assert.equal(datadive._eventId, 1);
      assert.equal(datadive._identifyId, 2);
      assert.equal(datadive._unsentCount(), 3);
      assert.lengthOf(datadive._unsentEvents, 1);
      assert.lengthOf(datadive._unsentIdentifys, 2);

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 3);

      // event should come before identify - prioritize events with no sequence number
      assert.equal(events[0].event_type, 'test');
      assert.equal(events[0].event_id, 1);
      assert.deepEqual(events[0].user_properties, {});
      assert.isFalse('sequence_number' in events[0]);

      assert.equal(events[1].event_type, '$identify');
      assert.equal(events[1].event_id, 1);
      assert.isTrue('$add' in events[1].user_properties);
      assert.deepEqual(events[1].user_properties['$add'], {'photoCount': 1});
      assert.equal(events[1].sequence_number, 1);

      assert.equal(events[2].event_type, '$identify');
      assert.equal(events[2].event_id, 2);
      assert.isTrue('$add' in events[2].user_properties);
      assert.deepEqual(events[2].user_properties['$add'], {'photoCount': 2});
      assert.equal(events[2].sequence_number, 3);

      // send response and check that remove events works properly
      server.respondWith('success');
      server.respond();
      assert.equal(datadive._unsentCount(), 0);
      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 0);
    });

    it('should drop event and keep identify on 413 response', function() {
      datadive.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 2});
      datadive.logEvent('test');
      clock.tick(1);
      datadive.identify(new Identify().add('photoCount', 1));

      assert.equal(datadive._unsentCount(), 2);
      assert.lengthOf(server.requests, 1);
      server.respondWith([413, {}, '']);
      server.respond();

      // backoff and retry
      assert.equal(datadive.options.uploadBatchSize, 1);
      assert.equal(datadive._unsentCount(), 2);
      assert.lengthOf(server.requests, 2);
      server.respondWith([413, {}, '']);
      server.respond();

      // after dropping massive event, only 1 event left
      assert.equal(datadive.options.uploadBatchSize, 1);
      assert.equal(datadive._unsentCount(), 1);
      assert.lengthOf(server.requests, 3);

      var events = JSON.parse(queryString.parse(server.requests[2].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, '$identify');
      assert.isTrue('$add' in events[0].user_properties);
      assert.deepEqual(events[0].user_properties['$add'], {'photoCount': 1});
    });

    it('should drop identify if 413 and uploadBatchSize is 1', function() {
      datadive.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 2});
      datadive.identify(new Identify().add('photoCount', 1));
      clock.tick(1);
      datadive.logEvent('test');

      assert.equal(datadive._unsentCount(), 2);
      assert.lengthOf(server.requests, 1);
      server.respondWith([413, {}, '']);
      server.respond();

      // backoff and retry
      assert.equal(datadive.options.uploadBatchSize, 1);
      assert.equal(datadive._unsentCount(), 2);
      assert.lengthOf(server.requests, 2);
      server.respondWith([413, {}, '']);
      server.respond();

      // after dropping massive event, only 1 event left
      assert.equal(datadive.options.uploadBatchSize, 1);
      assert.equal(datadive._unsentCount(), 1);
      assert.lengthOf(server.requests, 3);

      var events = JSON.parse(queryString.parse(server.requests[2].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, 'test');
      assert.deepEqual(events[0].user_properties, {});
    });

    it('should truncate long event property strings', function() {
      var longString = new Array(5000).join('a');
      datadive.logEvent('test', {'key': longString});
      var event = JSON.parse(queryString.parse(server.requests[0].requestBody).e)[0];

      assert.isTrue('key' in event.event_properties);
      assert.lengthOf(event.event_properties['key'], 4096);
    });

    it('should truncate long user property strings', function() {
      var longString = new Array(5000).join('a');
      datadive.identify(new Identify().set('key', longString));
      var event = JSON.parse(queryString.parse(server.requests[0].requestBody).e)[0];

      assert.isTrue('$set' in event.user_properties);
      assert.lengthOf(event.user_properties['$set']['key'], 4096);
    });

    it('should increment the counters in local storage if cookies disabled', function() {
      localStorage.clear();
      var deviceId = 'test_device_id';
      var datadive2 = new DatadiveClient();

      sinon.stub(baseCookie, 'areCookiesEnabled').returns(false);
      datadive2.init(apiKey, null, {deviceId: deviceId, batchEvents: true, eventUploadThreshold: 5});
      baseCookie.areCookiesEnabled.restore();

      datadive2.logEvent('test');
      clock.tick(10); // starts the session
      datadive2.logEvent('test2');
      clock.tick(20);
      datadive2.setUserProperties({'key':'value'}); // identify event at time 30

      const cookieData = datadive2._metadataStorage.load();
      assert.deepEqual(cookieData, {
        'deviceId': deviceId,
        'userId': null,
        'optOut': false,
        'sessionId': startTime,
        'lastEventTime': startTime + 30,
        'eventId': 2,
        'identifyId': 1,
        'sequenceNumber': 3
      });
    });

    it('should validate event properties', function() {
      var e = new Error('oops');
      clock.tick(1);
      datadive.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 5});
      clock.tick(1);
      datadive.logEvent('String event properties', '{}');
      clock.tick(1);
      datadive.logEvent('Bool event properties', true);
      clock.tick(1);
      datadive.logEvent('Number event properties', 15);
      clock.tick(1);
      datadive.logEvent('Array event properties', [1, 2, 3]);
      clock.tick(1);
      datadive.logEvent('Object event properties', {
        10: 'false', // coerce key
        'bool': true,
        'null': null, // should be ignored
        'function': console.log, // should be ignored
        'regex': /afdg/, // should be ignored
        'error': e, // coerce value
        'string': 'test',
        'array': [0, 1, 2, '3'],
        'nested_array': ['a', {'key': 'value'}, ['b']],
        'object': {'key':'value', 15: e},
        'nested_object': {'k':'v', 'l':[0,1], 'o':{'k2':'v2', 'l2': ['e2', {'k3': 'v3'}]}}
      });
      clock.tick(1);

      assert.lengthOf(datadive._unsentEvents, 5);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 5);

      assert.deepEqual(events[0].event_properties, {});
      assert.deepEqual(events[1].event_properties, {});
      assert.deepEqual(events[2].event_properties, {});
      assert.deepEqual(events[3].event_properties, {});
      assert.deepEqual(events[4].event_properties, {
        '10': 'false',
        'bool': true,
        'error': 'Error: oops',
        'string': 'test',
        'array': [0, 1, 2, '3'],
        'nested_array': ['a', {'key': 'value'}],
        'object': {'key':'value', '15':'Error: oops'},
        'nested_object': {'k':'v', 'l':[0,1], 'o':{'k2':'v2', 'l2': ['e2', {'k3': 'v3'}]}}
      });
    });

    it('should validate user properties', function() {
      var identify = new Identify().set(10, 10);
      datadive.init(apiKey, null, {batchEvents: true});
      datadive.identify(identify);

      assert.deepEqual(datadive._unsentIdentifys[0].event.user_properties, {'$set': {'10': 10}});
    });

    it('should ignore event and user properties with too many items', function() {
      datadive.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 2});
      var eventProperties = {};
      var userProperties = {};
      var identify = new Identify();
      for (var i = 0; i < constants.MAX_PROPERTY_KEYS + 1; i++) {
        eventProperties[i] = i;
        userProperties[i*2] = i*2;
        identify.set(i, i);
      }

      // verify that setUserProperties ignores the dict completely
      datadive.setUserProperties(userProperties);
      assert.lengthOf(datadive._unsentIdentifys, 0);
      assert.lengthOf(server.requests, 0);

      // verify that the event properties and user properties are scrubbed
      datadive.logEvent('test event', eventProperties);
      datadive.identify(identify);

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);

      assert.equal(events[0].event_type, 'test event');
      assert.deepEqual(events[0].event_properties, {});
      assert.deepEqual(events[0].user_properties, {});
      assert.equal(events[1].event_type, '$identify');
      assert.deepEqual(events[1].event_properties, {});
      assert.deepEqual(events[1].user_properties, {'$set': {}});
    });

    it('should synchronize event data across multiple datadive instances that share the same cookie', function() {
      // this test fails if logEvent does not reload cookie data every time
      var datadive1 = new DatadiveClient();
      datadive1.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 5});
      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey, null, {batchEvents: true, eventUploadThreshold: 5});

      datadive1.logEvent('test1');
      datadive2.logEvent('test2');
      datadive1.logEvent('test3');
      datadive2.logEvent('test4');
      datadive2.identify(new datadive2.Identify().set('key', 'value'));
      datadive1.logEvent('test5');

      // the event ids should all be sequential since datadive1 and datadive2 have synchronized cookies
      var eventId = datadive1._unsentEvents[0].event['event_id'];
      assert.equal(datadive2._unsentEvents[0].event['event_id'], eventId + 1);
      assert.equal(datadive1._unsentEvents[1].event['event_id'], eventId + 2);
      assert.equal(datadive2._unsentEvents[1].event['event_id'], eventId + 3);

      var sequenceNumber = datadive1._unsentEvents[0].event['sequence_number'];
      assert.equal(datadive2._unsentIdentifys[0].event['sequence_number'], sequenceNumber + 4);
      assert.equal(datadive1._unsentEvents[2].event['sequence_number'], sequenceNumber +  5);
    });

    it('should handle groups input', function() {
      var counter = 0;
      var value = -1;
      var message = '';
      var callback = function (status, response) {
        console.log('called callback', status, response);
        counter++;
        value = status;
        message = response;
      };

      var eventProperties = {
        'key': 'value'
      };

      var groups = {
        10: 1.23,  // coerce numbers to strings
        'array': ['test2', false, ['test', 23, null], null],  // should ignore nested array and nulls
        'dictionary': {160: 'test3'},  // should ignore dictionaries
        'null': null, // ignore null values
      }

      datadive.logEventWithGroups('Test', eventProperties, groups, callback);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);

      // verify event is correctly formatted
      var event = events[0];
      assert.equal(event.event_type, 'Test');
      assert.equal(event.event_id, 1);
      assert.deepEqual(event.user_properties, {});
      assert.deepEqual(event.event_properties, eventProperties);
      assert.deepEqual(event.groups, {
        '10': '1.23',
        'array': ['test2', 'false'],
      });

      // verify callback behavior
      assert.equal(counter, 0);
      assert.equal(value, -1);
      assert.equal(message, '');
      server.respondWith('success');
      server.respond();
      assert.equal(counter, 1);
      assert.equal(value, 200);
      assert.equal(message, 'success');
    });

    it('should track the raw user agent string', function() {
      // Unit test UA is set by phantomJS test environment, should be constant for all tests
      var userAgentString = navigator.userAgent;
      assert.isTrue(datadive._userAgent.indexOf(userAgentString) > -1);

      // log an event and verify UA field is filled out
      datadive.logEvent('testEvent');
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, 'testEvent');
      assert.isTrue(events[0].user_agent.indexOf(userAgentString) > -1);
    });

    it('should allow logging event with custom timestamp', function() {
      var timestamp = 2000;
      datadive.logEventWithTimestamp('test', null, timestamp, null);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);

      // verify the event is correct
      var event = events[0];
      assert.equal(event.event_type, 'test');
      assert.equal(event.event_id, 1);
      assert.equal(event.timestamp, timestamp);
    });

    it('should use current time if timestamp is null', function() {
      var timestamp = 5000;
      clock.tick(timestamp);
      datadive.logEventWithTimestamp('test', null, null, null);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);

      // verify the event is correct
      var event = events[0];
      assert.equal(event.event_type, 'test');
      assert.equal(event.event_id, 1);
      assert.isTrue(event.timestamp >= timestamp);
    });

    it('should use current time if timestamp is not valid form', function() {
      var timestamp = 6000;
      clock.tick(timestamp);
      datadive.logEventWithTimestamp('test', null, 'invalid', null);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);

      // verify the event is correct
      var event = events[0];
      assert.equal(event.event_type, 'test');
      assert.equal(event.event_id, 1);
      assert.isTrue(event.timestamp >= timestamp);
    });
  });

  describe('optOut', function() {
    beforeEach(function() {
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
    });

    it('should not send events while enabled', function() {
      datadive.setOptOut(true);
      datadive.logEvent('Event Type 1');
      assert.lengthOf(server.requests, 0);
    });

    it('should not send saved events while enabled', function() {
      datadive.logEvent('Event Type 1');
      assert.lengthOf(server.requests, 1);

      datadive._sending = false;
      datadive.setOptOut(true);
      datadive.init(apiKey);
      assert.lengthOf(server.requests, 1);
    });

    it('should start sending events again when disabled', function() {
      datadive.setOptOut(true);
      datadive.logEvent('Event Type 1');
      assert.lengthOf(server.requests, 0);

      datadive.setOptOut(false);
      datadive.logEvent('Event Type 1');
      assert.lengthOf(server.requests, 1);

      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
    });

    it('should have state be persisted in the cookie', function() {
      var datadive = new DatadiveClient();
      datadive.init(apiKey);
      assert.strictEqual(datadive.options.optOut, false);

      datadive.setOptOut(true);

      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey);
      assert.strictEqual(datadive2.options.optOut, true);
    });

    it('should favor the config optOut setting over cookie optOut if the config optOut is set to true', function() {
      var datadive = new DatadiveClient();
      cookie.set(datadive.options.cookieName, { optOut: false });
      datadive.init(apiKey, null, { optOut: true });

      assert.strictEqual(datadive.options.optOut, true);
    });

    it('should limit identify events queued', function() {
      datadive.init(apiKey, null, {savedMaxCount: 10});

      datadive._sending = true;
      for (var i = 0; i < 15; i++) {
        datadive.identify(new Identify().add('test', i));
      }
      datadive._sending = false;

      datadive.identify(new Identify().add('test', 100));
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 10);
      assert.deepEqual(events[0].user_properties, {$add: {'test': 6}});
      assert.deepEqual(events[9].user_properties, {$add: {'test': 100}});
    });
  });

  describe('gatherUtm', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers(100);
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
      cookie.remove('__utmz');
      cookie.reset();
      clock.restore();
    });

    it('should not send utm data when the includeUtm flag is false', function() {
      reset();
      cookie.set('__utmz', '133232535.1424926227.1.1.utmcct=top&utmccn=new');
      clock.tick(30 * 60 * 1000 + 1);
      datadive.init(apiKey, undefined, {});

      datadive.setUserProperties({user_prop: true});
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events[0].user_properties.utm_campaign, undefined);
      assert.equal(events[0].user_properties.utm_content, undefined);
      assert.equal(events[0].user_properties.utm_medium, undefined);
      assert.equal(events[0].user_properties.utm_source, undefined);
      assert.equal(events[0].user_properties.utm_term, undefined);
    });

    it('should send utm data via identify when the includeUtm flag is true', function() {
      reset();
      cookie.set('__utmz', '133232535.1424926227.1.1.utmcct=top&utmccn=new');
      clock.tick(30 * 60 * 1000 + 1);
      datadive.init(apiKey, undefined, {includeUtm: true, batchEvents: true, eventUploadThreshold: 2});

      datadive.logEvent('UTM Test Event', {});

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$setOnce': {
          initial_utm_campaign: 'new',
          initial_utm_content: 'top'
        },
        '$set': {
          utm_campaign: 'new',
          utm_content: 'top'
        }
      });

      assert.equal(events[1].event_type, 'UTM Test Event');
      assert.deepEqual(events[1].user_properties, {});
    });

    it('should parse utm params', function() {
      reset();
      cookie.set('__utmz', '133232535.1424926227.1.1.utmcct=top&utmccn=new');
      var utmParams = '?utm_source=datadive&utm_medium=email&utm_term=terms';
      clock.tick(30 * 60 * 1000 + 1);
      datadive._initUtmData(utmParams);

      var expectedProperties = {
          utm_campaign: 'new',
          utm_content: 'top',
          utm_medium: 'email',
          utm_source: 'datadive',
          utm_term: 'terms'
        }

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$setOnce': {
          initial_utm_campaign: 'new',
          initial_utm_content: 'top',
          initial_utm_medium: 'email',
          initial_utm_source: 'datadive',
          initial_utm_term: 'terms'
        },
        '$set': expectedProperties
      });
      server.respondWith('success');
      server.respond();

      datadive.logEvent('UTM Test Event', {});
      assert.lengthOf(server.requests, 2);
      var events = JSON.parse(queryString.parse(server.requests[1].requestBody).e);
      assert.deepEqual(events[0].user_properties, {});
    });

    it('should only send utm data once per session', function() {
      reset();
      const sessionTimeout = 100;
      cookie.set('__utmz', '133232535.1424926227.1.1.utmcct=top&utmccn=new');
      datadive.init(apiKey, undefined, {includeUtm: true});

      // still same session, should not send any identify events
      assert.lengthOf(server.requests, 0);
      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 0);

      // advance clock to force new session
      clock.tick(sessionTimeout + 1);
      datadive.init(apiKey, undefined, {includeUtm: true, sessionTimeout, batchEvents: true, eventUploadThreshold: 2});
      datadive.logEvent('UTM Test Event', {});

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$setOnce': {
          initial_utm_campaign: 'new',
          initial_utm_content: 'top'
        },
        '$set': {
          utm_campaign: 'new',
          utm_content: 'top'
        }
      });

      assert.equal(events[1].event_type, 'UTM Test Event');
      assert.deepEqual(events[1].user_properties, {});
    });

    it('should send utm data more than once per session if configured', function() {
      reset();
      cookie.set('__utmz', '133232535.1424926227.1.1.utmcct=top&utmccn=new');
      datadive.init(apiKey, undefined, {includeUtm: true, saveParamsReferrerOncePerSession: false});

      // even though same session, utm params are sent again
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$setOnce': {
          initial_utm_campaign: 'new',
          initial_utm_content: 'top'
        },
        '$set': {
          utm_campaign: 'new',
          utm_content: 'top'
        }
      });
    });

    it('should allow utm parameters to unset upon instantiating a new session', function(done) {
      reset();
      const sessionTimeout = 100;
      // send first $identify call with UTM params
      sinon.stub(datadive, '_getUrlParams').returns('?utm_source=google&utm_campaign=(organic)&utm_medium=organic&utm_term=(none)&utm_content=link');
      datadive.init(apiKey, undefined, {includeUtm: true, sessionTimeout, saveParamsReferrerOncePerSession: false, unsetParamsReferrerOnNewSession: true});

      // advance clock to force new session
      clock.tick(sessionTimeout + 1);
      datadive._getUrlParams.restore();

      // send new session events
      datadive.init(apiKey, undefined, {includeUtm: true, saveParamsReferrerOncePerSession: false, unsetParamsReferrerOnNewSession: true});
      datadive.logEvent('UTM Test Event', {});

      // ensure the server has responded
      server.respondWith('success');
      server.respond();

      var firstSessionEvents = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      var secondSessionEvents = JSON.parse(queryString.parse(server.requests[1].requestBody).e);
      var firstSessionInit = firstSessionEvents[0];
      var secondSessionInit = secondSessionEvents[0];
      var secondSessionEvent = secondSessionEvents[1];

      assert.equal(firstSessionInit.event_type, '$identify', 'should correctly called $identify');
      assert.deepEqual(firstSessionInit.user_properties, {
        $setOnce: {
            initial_utm_source: "google",
            initial_utm_medium: "organic",
            initial_utm_campaign: "(organic)",
            initial_utm_term: "(none)",
            initial_utm_content: "link"
        },
        $set: {
            utm_source: "google",
            utm_medium: "organic",
            utm_campaign: "(organic)",
            utm_term: "(none)",
            utm_content: "link"
        }
      }, 'should call $identify to set the correct UTM params');
      assert.equal(secondSessionInit.event_type, '$identify', 'should have re-called $identify to unset utm params upon a new session');
      assert.deepEqual(secondSessionInit.user_properties, {
        '$unset': {
          referrer: "-",
          utm_source:"-",
          utm_medium:"-",
          utm_campaign:"-",
          utm_term:"-",
          utm_content:"-"
        }
      }, 'should correctly unset UTM params');
      assert.deepEqual(secondSessionEvent.user_properties, {}, 'should correctly unset UTM params upon a new session');
      done()
    });

    it('should reset utm parameters if it has changed during a new session', function(done) {
      reset();
      const sessionTimeout = 100;
      // send first $identify call with UTM params
      sinon.stub(datadive, '_getUrlParams').returns('?utm_source=google&utm_campaign=(organic)&utm_medium=organic&utm_term=(none)&utm_content=link');
      datadive.init(apiKey, undefined, {includeUtm: true, sessionTimeout, saveParamsReferrerOncePerSession: false, unsetParamsReferrerOnNewSession: true});

      // advance clock to force new session, enter through a different campaign
      clock.tick(sessionTimeout + 1);
      datadive._getUrlParams.restore();
      sinon.stub(datadive, '_getUrlParams').returns('?utm_source=google&utm_campaign=(mail_promotion)&utm_medium=email&utm_term=(none)&utm_content=click');
      datadive.init(apiKey, undefined, {includeUtm: true, saveParamsReferrerOncePerSession: false, unsetParamsReferrerOnNewSession: true});

      // send new session events
      datadive.init(apiKey, undefined, {includeUtm: true, saveParamsReferrerOncePerSession: false, unsetParamsReferrerOnNewSession: true});
      datadive.logEvent('UTM Test Event', {});

      // ensure the server has responded
      server.respondWith('success');
      server.respond();

      datadive._getUrlParams.restore();
      var firstSessionEvents = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      var secondSessionEvents = JSON.parse(queryString.parse(server.requests[1].requestBody).e);
      var firstSessionInit = firstSessionEvents[0];
      var secondSessionInit = secondSessionEvents[0];
      var secondSessionEvent = secondSessionEvents[1];

      assert.equal(firstSessionInit.event_type, '$identify', 'should correctly called $identify');
      assert.deepEqual(firstSessionInit.user_properties, {
        $setOnce: {
            initial_utm_source: "google",
            initial_utm_medium: "organic",
            initial_utm_campaign: "(organic)",
            initial_utm_term: "(none)",
            initial_utm_content: "link"
        },
        $set: {
            utm_source: "google",
            utm_medium: "organic",
            utm_campaign: "(organic)",
            utm_term: "(none)",
            utm_content: "link"
        }
      }, 'should call $identify to set the correct UTM params');
      assert.equal(secondSessionInit.event_type, '$identify', 'should have re-called $identify to unset utm params upon a new session');
      assert.deepEqual(secondSessionInit.user_properties, {
        '$unset': {
          referrer: "-",
          utm_source:"-",
          utm_medium:"-",
          utm_campaign:"-",
          utm_term:"-",
          utm_content:"-"
        }
      }, 'should correctly unset UTM params');
      assert.deepEqual(secondSessionEvent.user_properties, {
        $setOnce: {
            initial_utm_source: "google",
            initial_utm_medium: "email",
            initial_utm_campaign: "(mail_promotion)",
            initial_utm_term: "(none)",
            initial_utm_content: "click"
        },
        "$set": {
          "utm_source": "google",
          "utm_medium": "email",
          "utm_campaign": "(mail_promotion)",
          "utm_term": "(none)",
          "utm_content": "click"
        }
      }, 'should correctly set new UTM params upon a new session');
      done()
    });
  });

  describe('gatherReferrer', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers(100);
      datadive.init(apiKey);
      sinon.stub(datadive, '_getReferrer').returns('https://datadive.ai/contact');
    });

    afterEach(function() {
      datadive._getReferrer.restore();
      clock.restore();
      reset();
    });

    it('should not send referrer data when the includeReferrer flag is false', function() {
      clock.tick(30 * 60 * 1000 + 1);
      datadive.init(apiKey, undefined, {});

      datadive.setUserProperties({user_prop: true});
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events[0].user_properties.referrer, undefined);
      assert.equal(events[0].user_properties.referring_domain, undefined);
    });

    it('should only send referrer via identify call when the includeReferrer flag is true', function() {
      clock.tick(30 * 60 * 1000 + 1);  // force new session
      datadive.init(apiKey, undefined, {includeReferrer: true, batchEvents: true, eventUploadThreshold: 2});
      datadive.logEvent('Referrer Test Event', {});
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);

      // first event should be identify with initial_referrer and referrer
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$set': {
          'referrer': 'https://datadive.ai/contact',
          'referring_domain': 'datadive.ai'
        },
        '$setOnce': {
          'initial_referrer': 'https://datadive.ai/contact',
          'initial_referring_domain': 'datadive.ai'
        }
      });

      // second event should be the test event with no referrer information
      assert.equal(events[1].event_type, 'Referrer Test Event');
      assert.deepEqual(events[1].user_properties, {});
    });

    it('should only send referrer once per session', function() {
      datadive.init(apiKey, undefined, {includeReferrer: true});

      // still same session, no referrer sent
      assert.lengthOf(server.requests, 0);
      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 0);

      // advance the clock to force a new session
      clock.tick(30 * 60 * 1000 + 1);
      datadive.init(apiKey, undefined, {includeReferrer: true, batchEvents: true, eventUploadThreshold: 2});
      datadive.logEvent('Referrer Test Event', {});
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);

      // first event should be identify with initial_referrer and referrer
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$set': {
          'referrer': 'https://datadive.ai/contact',
          'referring_domain': 'datadive.ai'
        },
        '$setOnce': {
          'initial_referrer': 'https://datadive.ai/contact',
          'initial_referring_domain': 'datadive.ai'
        }
      });

      // second event should be the test event with no referrer information
      assert.equal(events[1].event_type, 'Referrer Test Event');
      assert.deepEqual(events[1].user_properties, {});
    });

    it('should send referrer multiple times per session if configured', function() {
      datadive.init(apiKey, undefined, {includeReferrer:true, saveParamsReferrerOncePerSession: false});

      // even though session is same, referrer is sent again
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$set': {
          'referrer': 'https://datadive.ai/contact',
          'referring_domain': 'datadive.ai'
        },
        '$setOnce': {
          'initial_referrer': 'https://datadive.ai/contact',
          'initial_referring_domain': 'datadive.ai'
        }
      });
    });

    it('should log attribution event when referrer is updated if configured', function() {
      clock.tick(30 * 60 * 1000 + 1);  // force new session
      datadive.init(apiKey, undefined, {includeReferrer: true, logAttributionCapturedEvent: true, batchEvents: true, eventUploadThreshold: 2});
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);
      // first event should be identify with initial_referrer and referrer
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$set': {
          'referrer': 'https://datadive.ai/contact',
          'referring_domain': 'datadive.ai'
        },
        '$setOnce': {
          'initial_referrer': 'https://datadive.ai/contact',
          'initial_referring_domain': 'datadive.ai'
        }
      });
      // second event should be the attribution captured event with referrer information
      assert.equal(events[1].event_type, constants.ATTRIBUTION_EVENT);
      assert.deepEqual(events[1].event_properties, {
        'referrer': 'https://datadive.ai/contact',
        'referring_domain': 'datadive.ai'
      });
    });

    it('should not delete unsent events saved to localStorage', function() {
      var existingEvent = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769146589,' +
        '"event_id":49,"session_id":1453763315544,"event_type":"clicked","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{},"uuid":"3c508faa-a5c9-45fa-9da7-9f4f3b992fb0","library"' +
        ':{"name":"datadive-js","version":"2.9.0"},"sequence_number":130, "groups":{}}]';
      var existingIdentify = '[{"device_id":"test_device_id","user_id":"test_user_id","timestamp":1453769338995,' +
        '"event_id":82,"session_id":1453763315544,"event_type":"$identify","version_name":"Web","platform":"Web"' +
        ',"os_name":"Chrome","os_version":"47","device_model":"Mac","language":"en-US","api_properties":{},' +
        '"event_properties":{},"user_properties":{"$set":{"age":30,"city":"San Francisco, CA"}},"uuid":"' +
        'c50e1be4-7976-436a-aa25-d9ee38951082","library":{"name":"datadive-js","version":"2.9.0"},"sequence_number"' +
        ':131, "groups":{}}]';
      localStorage.setItem('datadive_unsent_' + apiKey, existingEvent);
      localStorage.setItem('datadive_unsent_identify_' + apiKey, existingIdentify);

      clock.tick(30 * 60 * 1000 + 1);  // force new session
      datadive.init(apiKey, undefined, {
        includeReferrer: true, batchEvents: true, eventUploadThreshold: 3, saveParamsReferrerOncePerSession: false
      });

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 3);

      // validate the events
      assert.equal(events[0].event_type, 'clicked');
      assert.equal(events[1].event_type, '$identify');
      assert.equal(events[2].event_type, '$identify');

      assert.deepEqual(events[1].user_properties, {'$set': {'age': 30, 'city': 'San Francisco, CA'}});
      assert.deepEqual(events[2].user_properties, {
        '$set': {
          'referrer': 'https://datadive.ai/contact',
          'referring_domain': 'datadive.ai'
        },
        '$setOnce': {
          'initial_referrer': 'https://datadive.ai/contact',
          'initial_referring_domain': 'datadive.ai'
        }
      });
    });

    it('should log attribution event when UTMs are captured if configured', function() {
      reset();
      cookie.set('__utmz', '133232535.1424926227.1.1.utmcct=top&utmccn=new');
      clock.tick(30 * 60 * 1000 + 1);
      datadive.init(apiKey, undefined, {includeUtm: true, logAttributionCapturedEvent: true, batchEvents: true, eventUploadThreshold: 2});
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      // first event should be identify with UTM state
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$setOnce': {
          initial_utm_campaign: 'new',
          initial_utm_content: 'top'
        },
        '$set': {
          utm_campaign: 'new',
          utm_content: 'top'
        }
      });
      // second event should be the attribution captured event with UTMs populated
      assert.equal(events[1].event_type, constants.ATTRIBUTION_EVENT);
      assert.deepEqual(events[1].event_properties, {
        utm_campaign: 'new',
        utm_content: 'top'
      });
    });

    it('should log attribution event more than once per session if configured and UTMs changes', function() {
      reset();
      cookie.set('__utmz', '133232535.1424926227.1.1.utmcct=top&utmccn=new');
      datadive.init(apiKey, undefined, {
        includeUtm: true, logAttributionCapturedEvent: true, saveParamsReferrerOncePerSession: false, batchEvents: true, eventUploadThreshold: 2
      });
      // even though same session, utm params are sent again
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
            // first event should be identify with UTM state
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$setOnce': {
          initial_utm_campaign: 'new',
          initial_utm_content: 'top'
        },
        '$set': {
          utm_campaign: 'new',
          utm_content: 'top'
        }
      });
      // second event should be the attribution captured event with UTMs populated
      assert.equal(events[1].event_type, constants.ATTRIBUTION_EVENT);
      assert.deepEqual(events[1].event_properties, {
        utm_campaign: 'new',
        utm_content: 'top'
      });
    });
  });

  describe('gatherGclid', function() {
    var clock;
    beforeEach(function() {
      clock = sinon.useFakeTimers(100);
      datadive.init(apiKey);
      sinon.stub(datadive, '_getUrlParams').returns('?utm_source=datadive&utm_medium=email&gclid=12345');
    });

    afterEach(function() {
      reset();
      datadive._getUrlParams.restore();
      clock.restore();
    });

    it('should parse gclid once per session', function() {
      datadive.init(apiKey, undefined, {includeGclid: true});

      // still same session, no gclid sent
      assert.lengthOf(server.requests, 0);
      assert.lengthOf(datadive._unsentEvents, 0);
      assert.lengthOf(datadive._unsentIdentifys, 0);

      // advance the clock to force a new session
      clock.tick(30 * 60 * 1000 + 1);
      datadive.init(apiKey, undefined, {includeGclid: true, batchEvents: true, eventUploadThreshold: 2});
      datadive.logEvent('Gclid test event', {});
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);

      // first event should be identify with gclid
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$set': {'gclid': '12345'},
        '$setOnce': {'initial_gclid': '12345'}
      });

      // second event should be the test event with no gclid information
      assert.equal(events[1].event_type, 'Gclid test event');
      assert.deepEqual(events[1].user_properties, {});
    });

    it('should parse gclid multiple times per session if configured', function() {
      datadive.init(apiKey, undefined, {includeGclid: true, saveParamsReferrerOncePerSession: false});

      // even though session is same, gclid is sent again
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 1);
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$set': {'gclid': '12345'},
        '$setOnce': {'initial_gclid': '12345'}
      });
    });

    it('should log attribution event when gclid is captured if configured', () => {
      clock.tick(30 * 60 * 1000 + 1);
      datadive.init(apiKey, undefined, {includeGclid: true, logAttributionCapturedEvent: true, batchEvents: true, eventUploadThreshold: 2});

      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(events, 2);

      // first event should be identify with gclid
      assert.equal(events[0].event_type, '$identify');
      assert.deepEqual(events[0].user_properties, {
        '$set': {'gclid': '12345'},
        '$setOnce': {'initial_gclid': '12345'}
      });
      // second event should be the attribution captured event with gclid populated
      assert.equal(events[1].event_type, constants.ATTRIBUTION_EVENT);
      assert.deepEqual(events[1].event_properties, {
        'gclid': '12345'
      })
    });
  });

  describe('logRevenue', function() {
    beforeEach(function() {
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
    });

    /**
     * Deep compare an object against the api_properties of the
     * event queued for sending.
     */
    function revenueEqual(api, event) {
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.deepEqual(events[0].api_properties, api || {});
      assert.deepEqual(events[0].event_properties, event || {});
    }

    it('should log simple amount', function() {
      datadive.logRevenue(10.10);
      revenueEqual({
        special: 'revenue_amount',
        price: 10.10,
        quantity: 1
      })
    });

    it('should log complex amount', function() {
      datadive.logRevenue(10.10, 7);
      revenueEqual({
        special: 'revenue_amount',
        price: 10.10,
        quantity: 7
      })
    });

    it('shouldn\'t log invalid price', function() {
      datadive.logRevenue('kitten', 7);
      assert.lengthOf(server.requests, 0);
    });

    it('shouldn\'t log invalid quantity', function() {
      datadive.logRevenue(10.00, 'puppy');
      assert.lengthOf(server.requests, 0);
    });

    it('should log complex amount with product id', function() {
      datadive.logRevenue(10.10, 7, 'chicken.dinner');
      revenueEqual({
        special: 'revenue_amount',
        price: 10.10,
        quantity: 7,
        productId: 'chicken.dinner'
      });
    });
  });

  describe('logRevenueV2', function() {
    beforeEach(function() {
      reset();
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
    });

    it('should log with the Revenue object', function () {
      // ignore invalid revenue objects
      datadive.logRevenueV2(null);
      assert.lengthOf(server.requests, 0);
      datadive.logRevenueV2({});
      assert.lengthOf(server.requests, 0);
      datadive.logRevenueV2(new datadive.Revenue());

      // log valid revenue object
      var productId = 'testProductId';
      var quantity = 15;
      var price = 10.99;
      var revenueType = 'testRevenueType'
      var properties = {'city': 'San Francisco'};

      var revenue = new datadive.Revenue().setProductId(productId).setQuantity(quantity).setPrice(price);
      revenue.setRevenueType(revenueType).setEventProperties(properties);

      datadive.logRevenueV2(revenue);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events.length, 1);
      var event = events[0];
      assert.equal(event.event_type, 'revenue_amount');

      assert.deepEqual(event.event_properties, {
        '$productId': productId,
        '$quantity': quantity,
        '$price': price,
        '$revenueType': revenueType,
        'city': 'San Francisco'
      });

      // verify user properties empty
      assert.deepEqual(event.user_properties, {});

      // verify no revenue data in api_properties
      assert.deepEqual(event.api_properties, {});
    });

    it('should convert proxied Revenue object into real revenue object', function() {
      var fakeRevenue = {'_q':[
        ['setProductId', 'questionable'],
        ['setQuantity', 10],
        ['setPrice', 'key1']  // invalid price type, this will fail to generate revenue event
      ]};
      datadive.logRevenueV2(fakeRevenue);
      assert.lengthOf(server.requests, 0);

      var proxyRevenue = {'_q':[
        ['setProductId', 'questionable'],
        ['setQuantity', 15],
        ['setPrice', 10.99],
        ['setRevenueType', 'purchase']
      ]};
      datadive.logRevenueV2(proxyRevenue);
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      var event = events[0];
      assert.equal(event.event_type, 'revenue_amount');

      assert.deepEqual(event.event_properties, {
        '$productId': 'questionable',
        '$quantity': 15,
        '$price': 10.99,
        '$revenueType': 'purchase'
      });
    });
  });

  describe('setDomain', function() {
    beforeEach(() => {
      reset();
      datadive.init(apiKey, null, { cookieExpiration: 365, secureCookie: true });
    });

    it('should set the cookie domain to null for an invalid domain', () => {
      datadive.setDomain('.foobar.com');
      const options = cookie.options();
      assert.equal(options.domain, null);
    });

    it('should not change the expirationDays options', () => {
      datadive.setDomain('.foobar.com');
      const options = cookie.options();
      assert.equal(options.expirationDays, 365);
    });

    it('should not change the secureCookie options', () => {
      datadive.setDomain('.foobar.com');
      const options = cookie.options();
      assert.equal(options.secure, true);
    });

    afterEach(() => {
      reset();
    });
  });

  describe('sessionId', function() {
    let clock, startTime;
    beforeEach(function() {
      reset();
      startTime = Date.now();
      clock = sinon.useFakeTimers(startTime);
      datadive.init(apiKey);
    });

    afterEach(function() {
      reset();
      clock.restore();
    });

    it('should create new session IDs on timeout', function() {
      var sessionId = datadive._sessionId;
      clock.tick(30 * 60 * 1000 + 1);
      datadive.logEvent('Event Type 1');
      assert.lengthOf(server.requests, 1);
      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.equal(events.length, 1);
      assert.notEqual(events[0].session_id, sessionId);
      assert.notEqual(datadive._sessionId, sessionId);
      assert.equal(events[0].session_id, datadive._sessionId);
    });

    it('should be fetched correctly by getSessionId', function() {
      var timestamp = 1000;
      clock.tick(timestamp);
      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey);
      assert.equal(datadive2.getSessionId(), datadive2._sessionId);
    });

    it('should ignore bad session id values', function() {
      var timestamp = 1000;
      clock.tick(timestamp);
      var datadive2 = new DatadiveClient();
      datadive2.init(apiKey);
      assert.equal(datadive2.getSessionId(), startTime);

      datadive2.setSessionId('invalid session id');
      assert.equal(datadive2.getSessionId(), startTime);
    });

    it('should let user override sessionId with setSessionId', function() {
      var datadive2 = new DatadiveClient();
      var cookieStorage = new CookieStorage().getStorage();

      // set up initial session
      var sessionId = 1000;
      clock.tick(sessionId);
      datadive2.init(apiKey);
      assert.equal(datadive2.getSessionId(), startTime);
      assert.equal(datadive2._metadataStorage.load().sessionId, startTime);

      // override sessionId with setSessionId
      var newSessionId = 10000;
      datadive2.setSessionId(newSessionId);
      assert.equal(datadive2.getSessionId(), newSessionId);
      assert.equal(datadive2._metadataStorage.load().sessionId, newSessionId);
    });
  });

  describe('deferInitialization config', function () {
    it('should keep tracking users who already have an datadive cookie', function () {
      var now = new Date().getTime();
      var cookieData = {
        userId: 'test_user_id',
        optOut: false,
        sessionId: now,
        lastEventTime: now,
        eventId: 50,
        identifyId: 60
      }

      cookie.set(datadive.options.cookieName + keySuffix, cookieData);
      datadive.init(apiKey, null, { cookieExpiration: 365, deferInitialization: true });
      datadive.identify(new Identify().set('prop1', 'value1'));

      var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
      assert.lengthOf(server.requests, 1, 'should have sent a request to Datadive');
      assert.equal(events[0].event_type, '$identify');
    });

    describe('prior to opting into analytics', function () {
      beforeEach(function () {
        reset();
        datadive.init(apiKey, null, { cookieExpiration: 365, deferInitialization: true });
      });
      it('should not initially drop a cookie if deferInitialization is set to true', function () {
        var cookieData = datadive._metadataStorage.load();
        assert.isNull(cookieData);
      });
      it('should not send anything to datadive', function () {
        datadive.identify(new Identify().set('prop1', 'value1'));
        datadive.logEvent('Event Type 1');
        datadive.setDomain('.foobar.com');
        datadive.setUserId(123456);
        datadive.setGroup('orgId', 15);
        datadive.setOptOut(true);
        datadive.regenerateDeviceId();
        datadive.setDeviceId('deviceId');
        datadive.setUserProperties({'prop': true, 'key': 'value'});
        datadive.clearUserProperties();
        datadive.groupIdentify(null, null, new datadive.Identify().set('key', 'value'));
        datadive.setVersionName('testVersionName1');
        datadive.logEventWithTimestamp('test', null, 2000, null);
        datadive.logEventWithGroups('Test', {'key': 'value' }, {group: 'abc'});
        datadive.logRevenue(10.10);

        var revenue = new datadive.Revenue().setProductId('testProductId').setQuantity(15).setPrice(10.99);
        revenue.setRevenueType('testRevenueType').setEventProperties({'city': 'San Francisco'});
        datadive.logRevenueV2(revenue);

        assert.lengthOf(server.requests, 0, 'should not send any requests to datadive');
        assert.lengthOf(datadive._unsentEvents, 0, 'should not queue events to be sent')
      });
    });

    describe('upon opting into analytics', function () {
      beforeEach(function () {
        reset();
        datadive.init(apiKey, null, { cookieExpiration: 365, deferInitialization: true });
      });
      it('should drop a cookie', function () {
        datadive.enableTracking();
        var cookieData = datadive._metadataStorage.load();
        assert.isNotNull(cookieData);
      });
      it('should send pending calls and events', function () {
        datadive.identify(new Identify().set('prop1', 'value1'));
        datadive.logEvent('Event Type 1');
        datadive.logEvent('Event Type 2');
        datadive.logEventWithTimestamp('test', null, 2000, null);
        assert.lengthOf(datadive._unsentEvents, 0, 'should not have any pending events to be sent');
        datadive.enableTracking();

        assert.lengthOf(server.requests, 1, 'should have sent a request to Datadive');
        var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
        assert.lengthOf(events, 1, 'should have sent a request to Datadive');
        assert.lengthOf(datadive._unsentEvents, 3, 'should have saved the remaining events')
      });
      it('should send new events', function () {
        assert.lengthOf(datadive._unsentEvents, 0, 'should start with no pending events to be sent');
        datadive.identify(new Identify().set('prop1', 'value1'));
        datadive.logEvent('Event Type 1');
        datadive.logEvent('Event Type 2');
        datadive.logEventWithTimestamp('test', null, 2000, null);
        assert.lengthOf(datadive._unsentEvents, 0, 'should not have any pending events to be sent');

        datadive.enableTracking();
        assert.lengthOf(datadive._unsentEvents, 3, 'should have saved the remaining events')

        datadive.logEvent('Event Type 3');
        assert.lengthOf(datadive._unsentEvents, 4, 'should save the new events')
      });
      it('should not continue to deferInitialization if an datadive cookie exists', function () {
        datadive.enableTracking();
        datadive.init(apiKey, null, { cookieExpiration: 365, deferInitialization: true });
        datadive.logEvent('Event Type 1');

        var events = JSON.parse(queryString.parse(server.requests[0].requestBody).e);
        assert.lengthOf(events, 1, 'should have sent a request to Datadive');
      });
    });
  });
});
