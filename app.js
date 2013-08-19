(function() {

  'use_strict';

  return {

    // Properties
    currAttempt : 0,
    defaultState: 'loading',
    initialised: false,
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
      '*.changed'                      : 'handleChanged',
      'getProfile.done'                : 'handleProfile',
      'getProfile.fail'                : 'handleFail',
      'getOrder.done'                  : 'handleOrder',
      'getOrder.fail'                  : 'handleFail',
      'click .toggle-address'          : 'toggleAddress'
    },

    handleChanged:  _.debounce(function(e) {
      if (e.propertyName === helpers.fmt("ticket.custom_field_%@", this.settings.order_id_field_id)) {
        this.orderId = e.newValue;
        if (this.profileData) {
          this._appendTicketOrder();
        } else {
          this.queryOrder();
        }
      } else if (e.propertyName === "ticket.requester.id") {
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

      // Got the profile data, populate interface
      this.switchTo('profile', this.profileData);

      this._appendTicketOrder();
    },

    handleOrder: function(data) {
      // Check that the response was successfuly
      if (_.isEmpty(data.id)) {
        this.showError(this.I18n.t('global.error.title'), data.message || this.I18n.t('order.error.message'));
        return;
      }

      this.switchTo('order', { order: data });
    },

    handleFail: function() {
      this.showError(this.I18n.t('global.error.title'), this.I18n.t('global.error.server'));
    },

    init: function(data){
      if(!data.firstLoad){
        return;
      }

      this.magentoApiEndpoint = this._checkMagentoApiEndpoint(this.settings.url);

      // Get order id field
      if (this.settings.order_id_field_id) {
        this.orderId = this.ticket().customField('custom_field_' + this.settings.order_id_field_id);
      }

      if (this.currentLocation() === 'ticket_sidebar') { this.queryCustomer(); }
    },

    queryCustomer: function(){
      this.switchTo('requesting');
      this.ajax('getProfile', this.ticket().requester().email());
    },

    queryOrder: function() {
      this.switchTo('requesting');
      this.ajax('getOrder', this.orderId);
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

    _appendTicketOrder: function(){
      var orderId = this.orderId,
          orderTemplate = "";

      // If there is an order ID custom field setup, look to see if the order ID exists in the profile data
      if (orderId) {
        orderTemplate += "<hr />";

        this.profileData.ticketOrder = _.find(this.profileData.orders, function(order){
          return (order.id === orderId);
        });

        if (this.profileData.ticketOrder) {
          this.profileData.ticketOrder.store = this.profileData.ticketOrder.store.replace(/\n/g, '<br>');
          orderTemplate += this.renderTemplate('order', {
            order: this.profileData.ticketOrder
          });
        } else {
          orderTemplate += this.renderTemplate('error', {
            title: this.I18n.t('global.error.title'),
            message: this.I18n.t('order.error.message')
          });
        }
      }

      this.$('.order').html(orderTemplate);
    }

  };

}());
