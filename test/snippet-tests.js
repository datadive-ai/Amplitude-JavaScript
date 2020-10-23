import '../datadive-snippet.min.js';

describe('Snippet', function() {

  it('datadive object should exist', function() {
    assert.isObject(window.datadive);
    assert.isFunction(window.datadive.init);
    assert.isFunction(window.datadive.logEvent);
  });

  it('datadive object should proxy functions', function() {
    datadive.init('API_KEY');
    datadive.logEvent('Event', {prop: 1});
    assert.lengthOf(datadive._q, 2);
    assert.deepEqual(datadive._q[0], ['init', 'API_KEY']);
  });

  it('datadive object should proxy Identify object and calls', function() {
    var identify = new datadive.Identify().set('key1', 'value1').unset('key2');
    identify.add('key3', 2).setOnce('key4', 'value2');

    assert.lengthOf(identify._q, 4);
    assert.deepEqual(identify._q[0], ['set', 'key1', 'value1']);
    assert.deepEqual(identify._q[1], ['unset', 'key2']);
    assert.deepEqual(identify._q[2], ['add', 'key3', 2]);
    assert.deepEqual(identify._q[3], ['setOnce', 'key4', 'value2']);
  });

  it('datadive object should proxy Revenue object and calls', function() {
    var revenue = new datadive.Revenue().setProductId('productIdentifier').setQuantity(5).setPrice(10.99);
    assert.lengthOf(revenue._q, 3);
    assert.deepEqual(revenue._q[0], ['setProductId', 'productIdentifier']);
    assert.deepEqual(revenue._q[1], ['setQuantity', 5]);
    assert.deepEqual(revenue._q[2], ['setPrice', 10.99]);
  });

  it('datadive object should proxy instance functions', function() {
    datadive.getInstance(null).init('API_KEY');
    datadive.getInstance('$DEFAULT_instance').logEvent('Click');
    datadive.getInstance('').clearUserProperties();
    datadive.getInstance('INSTANCE1').init('API_KEY1');
    datadive.getInstance('instanCE2').init('API_KEY2');
    datadive.getInstance('instaNce2').logEvent('Event');

    assert.deepEqual(Object.keys(datadive._iq), ['$default_instance', 'instance1', 'instance2']);
    assert.lengthOf(datadive._iq['$default_instance']._q, 3);
    assert.deepEqual(datadive._iq['$default_instance']._q[0], ['init', 'API_KEY']);
    assert.deepEqual(datadive._iq['$default_instance']._q[1], ['logEvent', 'Click']);
    assert.deepEqual(datadive._iq['$default_instance']._q[2], ['clearUserProperties']);
    assert.lengthOf(datadive._iq['instance1']._q, 1);
    assert.deepEqual(datadive._iq['instance1']._q[0], ['init', 'API_KEY1']);
    assert.lengthOf(datadive._iq['instance2']._q, 2);
    assert.deepEqual(datadive._iq['instance2']._q[0], ['init', 'API_KEY2']);
    assert.deepEqual(datadive._iq['instance2']._q[1], ['logEvent', 'Event']);
  });

  it('datadive object should proxy onInit', function() {
    const callback = () => { };
    datadive.getInstance('onInit').onInit(callback);
    datadive.getInstance('onInit').init('API_KEY');
    datadive.getInstance('onInit').logEvent('Event', {prop: 1});
    assert.lengthOf(datadive._iq['oninit']._q, 3);
    assert.deepEqual(datadive._iq['oninit']._q[0], ['onInit', callback]);
  });

  it('datadive object should proxy resetSessionId', function() {
    datadive.getInstance('reset_session_id_instance').init('API_KEY');
    datadive.getInstance('reset_session_id_instance').resetSessionId();
    assert.deepEqual(datadive._iq['reset_session_id_instance']._q[1], ['resetSessionId']);
  });
});
