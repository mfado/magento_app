(function() {

	'use_strict';

	return {

		defaultState: 'loading',

		initialised: false,

		profileData: {},

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
			var ordersLength = 0,
          i;

			// Check that the response was successfuly
			if (_.has(data, 'success') && data.success === false)
			{
				this.showError(this.I18n.t('global.error.title'), data.message);
				return;
			}

			// We'll do a little transformation on the data and store locally.
			this.profileData = data;
			this.profileData.settings = this.settings;
			this.profileData.addresses = this._cleanupLineBreaks(this.profileData.addresses);

			// See if we should show all orders or only recent orders.
			ordersLength = this.profileData.orders.length;
			if ( ordersLength > 3 ) {
				this.profileData.recentOrders = this.profileData.orders.slice(ordersLength-3, ordersLength).reverse();
			} else {
				this.profileData.recentOrders = this.profileData.orders.reverse();
			}

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
					'Authorization': 'Token token="'+this.settings.access_token+'"'
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
			return false;
		},

		// Look to see if we should show a specific order's details
		_orderToShow: function(){
			var orderId, customFieldName, order;

			// If there is an order ID custom field setup
			if ( this.settings.order_id_field_id ) {
				// Look to see if the order ID exists in the profile data
				customFieldName = 'custom_field_' + this.settings.order_id_field_id;
				orderId = this.ticket().customField(customFieldName);

				if (orderId) {
					this.profileData.ticketOrder = _.find(this.profileData.orders, function(order){
						return order.id = orderId;
					});

					this.profileData.ticketOrder.store = this.profileData.ticketOrder.store.replace(/\n/g, '<br>');
				}

			}
		},

		// Format the line breaks for web
		_cleanupLineBreaks: function(toBeCleaned) {
			var cleaned = toBeCleaned;
			_.each(cleaned, function(value, key) {
				cleaned[key] = value.replace(/\n/g, '<br>');
			});
			return cleaned;
		}


	};

}());
