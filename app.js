(function() {

  'use_strict';

  return {

    currAttempt : 0,

    MAX_ATTEMPTS : 20,

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

      this.allRequiredPropertiesExist();
    },

    queryMagento: function(){
      this.switchTo('requesting');
      this.ajax('getProfile', this.ticket().requester().email());
    },

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

    validateRequiredProperty: function(property) {
      var parts = property.split('.');
      var part = '', obj = this;

      while (parts.length) {
        part = parts.shift();
        try {
          obj = obj[part]();
        } catch (e) {
          return false;
        }
        // check if property is invalid
        if (parts.length > 0 && !_.isObject(obj)) {
          return false;
        }
        // check if value returned from property is invalid
        if (parts.length === 0 && (_.isNull(obj) || _.isUndefined(obj) || obj === '' || obj === 'no')) {
          return false;
        }
      }

      return true;
    },

    handleGetProfile: function(data) {
      var ordersLength = 0;

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
