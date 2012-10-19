(function() {

	'use_strict';

	return {

		defaultState: 'loading',

		initialised: false,

		profileData: {
			/*
			"guest": false,
			"id": "1",
			"name": "Chris Norton",
			"email": "chris@chnorton.com.au",
			"active": true,
			"created": "2012-08-24 00:40:31",
			"dob": null,
			"addresses": {
				"billing": "Chris Norton Fontis Suite 2, Level 9 167-169 Queen St Melbourne, Victoria, 3000 Australia T: 0396021025 ",
				"shipping": "Chris Norton Fontis Suite 2, Level 9 167-169 Queen St Melbourne, Victoria, 3000 Australia T: 0396021025 "
			},
			"orders": [
				{
					"id": "100000001",
					"status": "pending",
					"created": "2012-08-24 00:40:31",
					"updated": "2012-08-24 00:40:32",
					"customer": {
					"name": "Chris Norton",
					"email": "chris@chnorton.com.au",
					"ip": "127.0.0.1",
					"guest": false
				},
				"store": "Main Website Main Website Store Default Store View",
				"total": "15.0000",
				"currency": "AUD",
				"items": [
					{
					"sku": "test",
					"name": "Test Product"
					}
				]
				}
			],
			"ticketOrder": {}
			*/
		},

		resources: {
			PROFILE_URI       : '%@/zendesk/api/customers/%@',
			RECENT_ORDERS_URI : '%@/zendesk/api/orders/%@',
			ORDER_URI         : '%@/zendesk/api/orders/%@',
			CUSTOMER_URI      : '%@'
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
			'getOrder.fail'                  : 'handleFail',
			'click .toggle-address'          : 'toggleAddress'
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
			// Check that the response was successfuly
			if (_.has(data, 'success') && data.success === false)
			{
				this.showError(this.I18n.t('global.error.title'), data.message);
				return;
			}
			// We'll do a little transformation on the data and store locally.
			this.profileData = data;
			this._cleanupAddresses();

			this._orderToShow();

			// Got the profile data, populate interface
			this.switchTo('profile', this.profileData);
		},

		handleFail: function() {
			// Show fail message
			this.showError();
		},

		_getRequest: function(resource) {
			return {
				headers  : {
					'Authorization': 'Token token="c426ef185fe729c0ad560cfc69f4486c"',
					'X-Token': 'c426ef185fe729c0ad560cfc69f4486c'
				},
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
		},

		toggleAddress: function (e) {
			this.$(e.target).parent().next('p').toggleClass('hide');
		},

		// Look to see if we should show a specific order's details
		_orderToShow: function(){
			var orderId, customFieldName, order;

			// If there is an order ID custom field setup
			if ( this.settings.order_id_field_id ) {
				// Look to see if the order ID exists in the profile data
				customFieldName = 'custom_field_' + this.settings.order_id_field_id;
				orderId = this.ticket().customField(customFieldName);

				this.profileData.ticketOrder = _.find(this.profileData.orders, function(order){
					return order.id = orderId;
				});

			}
		},

		// Format the line breaks for web
		_cleanupAddresses: function() {
			var addresses = this.profileData.addresses;
			_.each(addresses, function(address, key) {
				addresses[key] = address.replace(/\n/g, '<br>');
			});

		}


	};

}());
