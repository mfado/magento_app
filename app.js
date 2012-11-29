(function() {

	'use_strict';

	var currAttempt = 0;
	var MAX_ATTEMPTS = 20;

	return {

		defaultState: 'loading',

		initialised: false,

		profileData: {},

		magentoApiEndpoint: '',

		resources: {
			PROFILE_URI       : '%@/index.php/zendesk/api/customers/%@'
		},

		requests: {
			'getProfile'   : function(email) { return this._getRequest(helpers.fmt(this.resources.PROFILE_URI, this.magentoApiEndpoint, email)); }
		},

		events: {
			'app.activated'                  : 'init',
			'requiredProperties.ready'       : 'queryMagento',
			'getProfile.done'                : 'handleGetProfile',
			'getProfile.fail'                : 'handleFail',
			'click .toggle-address'          : 'toggleAddress'
		},

		requiredProperties : [
			'ticket.requester.email'
		],

		init: function(data){
			if(!data.firstLoad){
				return;
			}

			this.magentoApiEndpoint = this._checkMagentoApiEndpoint(this.settings.url);

			// We're ready to do layout & ask for data
			this.switchTo('waiting');

			this.allRequiredPropertiesExist(this);
		},

		queryMagento: function(){
			this.switchTo('requesting');
			this.ajax('getProfile', this.ticket().requester().email());
		},

		allRequiredPropertiesExist: function(app) {
			if (app.requiredProperties.length > 0) {
				var valid = app.validateRequiredProperty(app.requiredProperties[0]);

				// prop is valid, remove from array
				if (valid) {
					app.requiredProperties.shift();
				}

				if (app.requiredProperties.length > 0 && currAttempt < MAX_ATTEMPTS) {
					if (!valid) {
						++currAttempt;
					}

					_.delay(app.allRequiredPropertiesExist, 100, app);
					return;
				}
			}

			if (currAttempt < MAX_ATTEMPTS) {
				app.trigger('requiredProperties.ready');
			} else {
				app.showError(app.I18n.t('global.error.title'), app.I18n.t('global.error.data'));
			}
		},

		validateRequiredProperty: function(property) {
			var parts = property.split('.');
			var n = '', o = this;

			while (parts.length) {
				n = parts.shift();
				try {
					o = o[n]();
				} catch (e) {
					return false;
				}
				// check if property is invalid
				if (parts.length > 0 && !_.isObject(o)) {
					return false;
				}
				// check if value returned from property is invalid
				if (parts.length === 0 && (_.isNull(o) || _.isUndefined(o) || o === '' || o === 'no')) {
					return false;
				}
			}

			return true;
		},

		handleGetProfile: function(data) {
			var ordersLength = 0, i;

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

		_checkMagentoApiEndpoint: function(url) {
			// First, lets make sure there is no trailing slash, we'll add one later.
			if (url.slice(-1) === '/') { url = url.slice(0, -1); }
			// Test whether we have a front-controller reference here.
			if (url.indexOf('index.php') === -1)
			{
				// Nothing to do, the front-controller isn't in the url, pass it back unaltered.
				return url;
			}
			url = url.replace(/\/index.php/g, '');
			return url;
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
						return (order.id === orderId);
					});

					if (!_.isUndefined(this.profileData.ticketOrder)) {
						this.profileData.ticketOrder.store = this.profileData.ticketOrder.store.replace(/\n/g, '<br>');
					}
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