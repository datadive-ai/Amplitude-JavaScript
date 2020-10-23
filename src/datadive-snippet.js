/**
* Imported in client browser via <script> tag
* Async capabilities: Interally creates stubbed window.datadive object until real SDK loaded
* Stubbed functions keep track of funciton calls and their arguments
* These are sent once real SDK loaded through another <script> tag
*/
(function(window, document) {
  var datadive = window.datadive || {'_q':[],'_iq':{}};
  var as = document.createElement('script');
  as.type = 'text/javascript';
  // Don't edit as.integrity, it is tracked by semantic-release-bot during releases
  as.integrity = 'sha384-1FBF2gemQrP+46XhACWiygjt50Hls2GBuUSCoOe4gBt2xKVflucxbDiLD20lMR9T';
  as.crossOrigin = 'anonymous';
  as.async = true;
  // Don't edit as.src, it is tracked by semantic-release-bot during releases
  as.src = 'https://cdn.datadive.ai/libs/datadive-7.3.0-min.gz.js';
  as.onload = function() {if(!window.datadive.runQueuedFunctions) {console.log('[Datadive] Error: could not load SDK');}};
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(as, s);
  function proxy(obj, fn) {
    obj.prototype[fn] = function() {
      this._q.push([fn].concat(Array.prototype.slice.call(arguments, 0))); return this;
    };
  }
  var Identify = function() {this._q = []; return this;};
  var identifyFuncs = ['add', 'append', 'clearAll', 'prepend', 'set', 'setOnce', 'unset'];
  for (var i = 0; i < identifyFuncs.length; i++) {proxy(Identify,identifyFuncs[i]);}
  datadive.Identify = Identify;
  var Revenue = function() {this._q = []; return this;};
  var revenueFuncs = ['setProductId', 'setQuantity', 'setPrice', 'setRevenueType', 'setEventProperties'];
  for (var j = 0; j < revenueFuncs.length; j++) {proxy(Revenue, revenueFuncs[j]);}
  datadive.Revenue = Revenue;
  var funcs = ['init', 'logEvent', 'logRevenue', 'setUserId', 'setUserProperties',
               'setOptOut', 'setVersionName', 'setDomain', 'setDeviceId', 'enableTracking',
               'setGlobalUserProperties', 'identify', 'clearUserProperties',
               'setGroup', 'logRevenueV2', 'regenerateDeviceId', 'groupIdentify', 'onInit',
               'logEventWithTimestamp', 'logEventWithGroups', 'setSessionId', 'resetSessionId'];
  function setUpProxy(instance) {
    function proxyMain(fn) {
      instance[fn] = function() {
        instance._q.push([fn].concat(Array.prototype.slice.call(arguments, 0)));
      };
    }
    for (var k = 0; k < funcs.length; k++) {proxyMain(funcs[k]);}
  }
  setUpProxy(datadive);
  datadive.getInstance = function(instance) {
    instance = ((!instance || instance.length===0) ? '$default_instance' : instance).toLowerCase();
    if (!datadive._iq.hasOwnProperty(instance)) {
      datadive._iq[instance] = {'_q':[]}; setUpProxy(datadive._iq[instance]);
    }
    return datadive._iq[instance];
  };
  window.datadive = datadive;
})(window, document);
