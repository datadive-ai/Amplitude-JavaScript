/* jshint expr:true */
// Entry point
import Datadive from  './datadive';

const old = window.datadive || {};
const newInstance = new Datadive();
newInstance._q = old._q || [];

/**
* Instantiates Datadive object and runs all queued function logged by stubbed methods provided by snippets
* Event queue allows async loading of SDK to not blocking client's app
*/
for (let instance in old._iq) { // migrate each instance's queue
  if (old._iq.hasOwnProperty(instance)) {
    newInstance.getInstance(instance)._q = old._iq[instance]._q || [];
  }
}

// If SDK is enabled as snippet, process the events queued by stubbed function
if (BUILD_COMPAT_SNIPPET) {
  newInstance.runQueuedFunctions();
}

// export the instance
export default newInstance;
