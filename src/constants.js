export default {
  DEFAULT_INSTANCE: '$default_instance',
  API_VERSION: 2,
  MAX_STRING_LENGTH: 4096,
  MAX_PROPERTY_KEYS: 1000,
  IDENTIFY_EVENT: '$identify',
  GROUP_IDENTIFY_EVENT: '$groupidentify',

  // localStorageKeys
  LAST_EVENT_ID: 'datadive_lastEventId',
  LAST_EVENT_TIME: 'datadive_lastEventTime',
  LAST_IDENTIFY_ID: 'datadive_lastIdentifyId',
  LAST_SEQUENCE_NUMBER: 'datadive_lastSequenceNumber',
  SESSION_ID: 'datadive_sessionId',

  // Used in cookie as well
  DEVICE_ID: 'datadive_deviceId',
  OPT_OUT: 'datadive_optOut',
  USER_ID: 'datadive_userId',

  COOKIE_TEST_PREFIX: 'dave_cookie_test',
  COOKIE_PREFIX: "dave",

  // revenue keys
  REVENUE_EVENT: 'revenue_amount',
  REVENUE_PRODUCT_ID: '$productId',
  REVENUE_QUANTITY: '$quantity',
  REVENUE_PRICE: '$price',
  REVENUE_REVENUE_TYPE: '$revenueType',

  DAVE_DEVICE_ID_PARAM: 'dave_device_id',  // url param

  REFERRER: 'referrer',

  // UTM Params
  UTM_SOURCE: 'utm_source',
  UTM_MEDIUM: 'utm_medium',
  UTM_CAMPAIGN: 'utm_campaign',
  UTM_TERM: 'utm_term',
  UTM_CONTENT: 'utm_content',

  ATTRIBUTION_EVENT: '[Datadive] Attribution Captured'
};
