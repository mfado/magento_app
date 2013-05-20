(function() {

  'use_strict';

  return {

    // Constants
    MAX_ATTEMPTS : 20,

    // Properties
    currAttempt : 0,
    defaultState: 'loading',
    initialised: false,
    profileData: {},
    magentoApiEndpoint: '',

    resources: {
      PROFILE_URI       : '%@/index.php/zendesk/api/customers/%@',
      ORDER_URI         : '%@/index.php/zendesk/api/orders/%@'
    },

    requests: {
      'getProfile'   : function(email)   { return this._getRequest(helpers.fmt(this.resources.PROFILE_URI, this.magentoApiEndpoint, email)); },
      'getOrder'     : function(orderId) { return this._getRequest(helpers.fmt(this.resources.ORDER_URI, this.magentoApiEndpoint, orderId)); }
    },

    events: {
      'app.activated'                  : 'init',
      'requiredProperties.ready'       : 'queryCustomer',
      '*.changed'                      : 'handleChanged',
      'getProfile.done'                : 'handleProfile',
      'getProfile.fail'                : 'handleFail',
      'getOrder.done'                  : 'handleOrder',
      'getOrder.fail'                  : 'handleFail',
      'click .toggle-address'          : 'toggleAddress'
    },

    // Functions
    allRequiredPropertiesExist: function() {
      if (this.requiredProperties.length > 0) {
        var valid = this.validateRequiredProperty(this.requiredProperties[0]);

        // prop is valid, remove from array
        if (valid) {
          this.requiredProperties.shift();
        }

        if (this.requiredProperties.length > 0 && this.currAttempt < this.MAX_ATTEMPTS) {
          if (!valid) {
            ++this.currAttempt;
          }

          _.delay(_.bind(this.allRequiredPropertiesExist, this), 100);
          return;
        }
      }

      if (this.currAttempt < this.MAX_ATTEMPTS) {
        this.trigger('requiredProperties.ready');
      } else {
        this.showError(this.I18n.t('global.error.title'), this.I18n.t('global.error.data'));
      }
    },

    handleChanged:  _.debounce(function(e) {

      // test if change event fired before app.activated
      if (!this.hasActivated) {
        return;
      }

      if (e.propertyName === helpers.fmt("ticket.custom_field_%@", this.settings.order_id_field_id)) {
        this.orderId = e.newValue;
        this.queryCustomer();
      }
    }, 500),

    handleProfile: function(data) {
      var ordersLength = 0;

      // Check that the response was successfuly
      if (_.has(data, 'success') && data.success === false)
      {
        if (_.isEmpty(this.orderId) === false) {
          this.queryOrder();
        } else {
          this.showError(this.I18n.t('global.error.title'), data.message);
        }
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

      // Insert order html into view
      var orderTemplate = this.renderTemplate('order', this.profileData.ticketOrder);
      this.$('.order').html(orderTemplate);
    },

    handleOrder: function(data) {

      // Check that the response was successfuly
      if (_.isEmpty(data.id)) { //_.has(data, 'success') && data.success === false) {
        this.showError(this.I18n.t('global.error.title'), data.message || this.I18n.t('order.error.message'));
        return;
      }

      this.switchTo('order', data);
    },

    handleFail: function() {
      this.showError(this.I18n.t('global.error.title'), this.I18n.t('global.error.server'));
    },

    init: function(data){
      if(!data.firstLoad){
        return;
      }

      this.hasActivated = true;
      this.magentoApiEndpoint = this._checkMagentoApiEndpoint(this.settings.url);
      this.requiredProperties = [
        'ticket.requester.email'
      ];

      // Get order id field
      if (this.settings.order_id_field_id) {
        this.orderId = this.ticket().customField('custom_field_' + this.settings.order_id_field_id);
      }

      this.allRequiredPropertiesExist();
    },

    queryCustomer: function(){
      this.switchTo('requesting');
      this.ajax('getProfile', this.ticket().requester().email());
    },

    queryOrder: function() {
      this.switchTo('requesting');
      this.ajax('getOrder', this.orderId);
    },

    safeGetPath: function(propertyPath) {
      return _.inject( propertyPath.split('.'), function(context, segment) {
        if (context == null) { return context; }
        var obj = context[segment];
        if ( _.isFunction(obj) ) { obj = obj.call(context); }
        return obj;
      }, this);
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

    validateRequiredProperty: function(propertyPath) {
      var value = this.safeGetPath(propertyPath);
      return value != null && value !== '' && value !== 'no';
    },

    // Helpers
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

    // Format the line breaks for web
    _cleanupLineBreaks: function(toBeCleaned) {
      var cleaned = toBeCleaned;
      _.each(cleaned, function(value, key) {
        cleaned[key] = value.replace(/\n/g, '<br>');
      });
      return cleaned;
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

    // Look to see if we should show a specific order's details
    _orderToShow: function(){
      var orderId = this.orderId;

      // If there is an order ID custom field setup, look to see if the order ID exists in the profile data
      if (orderId) {
        this.profileData.ticketOrder = _.find(this.profileData.orders, function(order){
          return (order.id === orderId);
        });

        if (!_.isUndefined(this.profileData.ticketOrder)) {
          this.profileData.ticketOrder.store = this.profileData.ticketOrder.store.replace(/\n/g, '<br>');
        }
      }
    }

  };

}());
