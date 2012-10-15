(function() {

	'use_strict';

	return {

		defaultState: 'loading',

		profileData: {
			name           : 'John Citizen',
			recent_orders  : [],
			customer_since : new Date()
		},

		resources: {
			MAGENTO_PROFILE_URI : '%@/zendesk/api/customers/%@',
			ORDER_URI           : '%@/zendesk/api/orders/%@'
		},

		requests: {
			'getProfile'      : function(email) { return this._getRequest(helpers.fmt(this.resources.MAGENTO_PROFILE_URI, this.settings.url, email)); },
			'getRecentOrders' : function() { return this._getRequest(helpers.fmt(this.resources.MAGENTO_PROFILE_URI)); },
			'getOrder'        : function(orderNumber) { return this._getRequest(helpers.fmt(this.resources.MAGENTO_PROFILE_URI, this.settings.url, orderNumber)); }
		},

		events: {
			'app.activated'        : 'handleAppActivated',
			'getProfile.done'      : 'handleGetProfile',
			'getRecentOrders.done' : 'handleGetRecentOrders',
			'getOrder.done'        : 'handleGetOrder',
			'getProfile.fail'      : 'handleFail',
			'getOrder.fail'        : 'handleFail'
		},

		handleAppActivated: function() {
			// App was activated.
			var email;
			try {
				email = this.ticket().requester().email();
			} catch (err) {
				email = 'chris@chnorton.com.au';
			}
			this.ajax('getProfile', email);
		},

		handleGetProfile: function(data) {
			if (_.has(data, 'error'))
			{
				this.showError(this.I18n.t('global.error.title'), this.I18n.t('profile.error'));
				return;
			}
			// console.log('Profile data ---');
			console.log(data);
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

		handleClickBackBtn: function(evt) {
			this.switchTo('profile', this.profileData);
			alert('blah');
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
