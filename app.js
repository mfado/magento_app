(function() {

	'use_strict';

	return {

		defaultState: 'loading',

		initialised: false,

		profileData: {
			name           : 'John Citizen',
			recent_orders  : [],
			customer_since : new Date()
		},

		resources: {
			PROFILE_URI       : '%@/zendesk/api/customers/%@',
			RECENT_ORDERS_URI : '%@/zendesk/api/orders/%@',
			ORDER_URI         : '%@/zendesk/api/orders/%@'
		},

		requests: {
			'getProfile'   : function(email) { return this._getRequest(helpers.fmt(this.resources.PROFILE_URI, this.settings.url, email)); },
			'getAllOrders' : function() { return this._getRequest(helpers.fmt(this.resources.RECENT_ORDERS_URI)); },
			'getOrder'     : function(orderNumber) { return this._getRequest(helpers.fmt(this.resources.ORDER_URI, this.settings.url, orderNumber)); }
		},

		events: {
			'app.activated'                  : 'dataChanged',
			'ticket.subject.changed'         : 'dataChanged',
			'ticket.requester.email.changed' : 'dataChanged',
			'getProfile.done'                : 'handleGetProfile',
			'getRecentOrders.done'           : 'handleGetRecentOrders',
			'getOrder.done'                  : 'handleGetOrder',
			'getProfile.fail'                : 'handleFail',
			'getOrder.fail'                  : 'handleFail'
		},

		dataChanged: function(data) {
			var ticketSubject = this.ticket().subject();
			if (_.isUndefined(ticketSubject)) { return; }
			var requester = this.ticket().requester();
			if (_.isUndefined(requester)) { return; }
			var email = requester.email();
			if (_.isUndefined(email)) { return; }
			this.ajax('getProfile', email);
		},

		handleGetProfile: function(data) {
			if (_.has(data, 'error'))
			{
				this.showError(this.I18n.t('global.error.title'), this.I18n.t('profile.error'));
				return;
			}
			// We'll do a little transformation on the data and store locally.
			this.profileData = data;
			// Add customer since value
			var d = new Date(Date.parse(data.created));
			this.profileData.customer_since = d.toLocaleString();
			// Got the profile data, populate interface
			this.switchTo('profile', this.profileData);
		},

		handleFail: function() {
			// Show fail message
			this.showError();
		},

		_getRequest: function(resource) {
			return {
				url      : resource,
				method   : 'GET',
				dataType : 'json'
			};
		},

		showError: function(title, msg) {
			this.switchTo('error', {
				title: title || this.I18n.t('global.error.title'),
				message: msg || this.I18n.t('global.error.message')
			});
		}

	};

}());
