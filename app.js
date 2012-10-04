(function() {

	'use_strict';

	return {

		defaultState: 'loading',

		profileData: {
			id: 3424,
			name: 'Jennifer Hansen',
			profile_uri: 'http://jens-shop.com/index.php/admin/system_account',
			orders_uri: 'http://jens-shop.com/index.php/admin/sales_order',
			recent_orders: [
				{
					order_id: 576899,
					status: 'Pending PayPal',
					status_code: 'pending',
					order_uri: 'http://jens-shop.com/index.php/admin/sales_order/576899',
					titles: 'Order 1 - Awesome!'
				},
				{
					order_id: 343267,
					status: 'Shipped',
					status_code: 'shipped',
					order_uri: 'http://jens-shop.com/index.php/admin/sales_order/343267',
					titles: 'Order 2 - Super!'
				},
				{
					order_id: 986642,
					status: 'Cancelled',
					status_code: 'cancelled',
					order_uri: 'http://jens-shop.com/index.php/admin/sales_order/986642',
					titles: 'Order 3 - Still OK!'
				}
			],
			total_orders: 2,
			phone: '+61 3 9123 4567',
			group: 'Administrators',
			member_since: 'May 24, 2012, 11:46:33AM (EST)'
		},

		resources: {
			MAGENTO_PROFILE_URI: '%@/zendesk/api/profile.php'
		},

		requests: {
			'getProfile': function() { return this._getRequest(helpers.fmt(this.resources.MAGENTO_PROFILE_URI, this.settings.url)); }
		},

		events: {
			'app.activated': 'handleAppActivated',
			'getProfile.done': 'handleGetProfile'
		},

		_ajax: function(request, expectedData) {
			var app = this,
				evts = this.events,
				fn = null;
			_.delay(function() {
				var promises = ['done', 'always'];
				_.each(promises, function(p) {
					fn = evts[helpers.fmt('%@.%@', request, p)];
					if (!_.isUndefined(fn))
					{
						app[fn].apply(app, [_.extend({fake: true}, expectedData || {})]);
					}
				});
			}, 250);
		},

		handleAppActivated: function() {
			// App was activated.
			// Let's load user profile from Magento.
			this._ajax('getProfile', this.profileData);
		},

		handleGetProfile: function(data) {
			// Got the profile data, populate interface
			this.switchTo('profile', data);
		},

		_getRequest: function(resource) {
			return {
				url: resource
				//method: 'GET'
				// Some additional params required?
			};
		}

	};

}());
