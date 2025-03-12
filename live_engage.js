var liveEngageSSOController = window.liveEngageSSOController || {};

///////////////////////////////////
// Live Engage token management
///////////////////////////////////

liveEngageSSOController.q2Token = null;

liveEngageSSOController.getQ2Token = function(callback) {
  callback(liveEngageSSOController.q2Token);
};

liveEngageSSOController.setQ2Token = function(newToken) {
  liveEngageSSOController.q2Token = newToken;
};
