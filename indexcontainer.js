define("@ember/-internals/container/index", ["exports", "@ember/-internals/owner", "@ember/-internals/utils", "@ember/debug", "@ember/polyfills"], function (_exports, _owner, _utils, _debug, _polyfills) {
  "use strict";

  Object.defineProperty(_exports, "__esModule", {
    value: true
  });
  _exports.privatize = privatize;
  _exports.getFactoryFor = getFactoryFor;
  _exports.setFactoryFor = setFactoryFor;
  _exports.INIT_FACTORY = _exports.Container = _exports.Registry = void 0;
  var leakTracking;
  var containers;

  if (true
  /* DEBUG */
  ) {
    // requires v8
    // chrome --js-flags="--allow-natives-syntax --expose-gc"
    // node --allow-natives-syntax --expose-gc
    try {
      if (typeof gc === 'function') {
        leakTracking = function () {
          // avoid syntax errors when --allow-natives-syntax not present
          var GetWeakSetValues = new Function('weakSet', 'return %GetWeakSetValues(weakSet, 0)');
          containers = new WeakSet();
          return {
            hasContainers: function hasContainers() {
              gc();
              return GetWeakSetValues(containers).length > 0;
            },
            reset: function reset() {
              var values = GetWeakSetValues(containers);

              for (var i = 0; i < values.length; i++) {
                containers.delete(values[i]);
              }
            }
          };
        }();
      }
    } catch (e) {// ignore
    }
  }
  /**
   A container used to instantiate and cache objects.
  
   Every `Container` must be associated with a `Registry`, which is referenced
   to determine the factory and options that should be used to instantiate
   objects.
  
   The public API for `Container` is still in flux and should not be considered
   stable.
  
   @private
   @class Container
   */


  var Container = /*#__PURE__*/function () {
    function Container(registry, options) {
      if (options === void 0) {
        options = {};
      }

      this.registry = registry;
      this.owner = options.owner || null;
      this.cache = (0, _utils.dictionary)(options.cache || null);
      this.factoryManagerCache = (0, _utils.dictionary)(options.factoryManagerCache || null);
      this.isDestroyed = false;
      this.isDestroying = false;

      if (true
      /* DEBUG */
      ) {
        this.validationCache = (0, _utils.dictionary)(options.validationCache || null);

        if (containers !== undefined) {
          containers.add(this);
        }
      }
    }
    /**
     @private
     @property registry
     @type Registry
     @since 1.11.0
     */

    /**
     @private
     @property cache
     @type InheritingDict
     */

    /**
     @private
     @property validationCache
     @type InheritingDict
     */

    /**
     Given a fullName return a corresponding instance.
      The default behavior is for lookup to return a singleton instance.
     The singleton is scoped to the container, allowing multiple containers
     to all have their own locally scoped singletons.
      ```javascript
     let registry = new Registry();
     let container = registry.container();
      registry.register('api:twitter', Twitter);
      let twitter = container.lookup('api:twitter');
      twitter instanceof Twitter; // => true
      // by default the container will return singletons
     let twitter2 = container.lookup('api:twitter');
     twitter2 instanceof Twitter; // => true
      twitter === twitter2; //=> true
     ```
      If singletons are not wanted, an optional flag can be provided at lookup.
      ```javascript
     let registry = new Registry();
     let container = registry.container();
      registry.register('api:twitter', Twitter);
      let twitter = container.lookup('api:twitter', { singleton: false });
     let twitter2 = container.lookup('api:twitter', { singleton: false });
      twitter === twitter2; //=> false
     ```
      @private
     @method lookup
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] The fullname of the request source (used for local lookup)
     @return {any}
     */


    var _proto = Container.prototype;

    _proto.lookup = function lookup(fullName, options) {
      if (this.isDestroyed) {
        throw new Error("Can not call `.lookup` after the owner has been destroyed");
      }

      (true && !(this.registry.isValidFullName(fullName)) && (0, _debug.assert)('fullName must be a proper full name', this.registry.isValidFullName(fullName)));
      return _lookup(this, this.registry.normalize(fullName), options);
    }
    /**
     A depth first traversal, destroying the container, its descendant containers and all
     their managed objects.
      @private
     @method destroy
     */
    ;

    _proto.destroy = function destroy() {
      this.isDestroying = true;
      destroyDestroyables(this);
    };

    _proto.finalizeDestroy = function finalizeDestroy() {
      resetCache(this);
      this.isDestroyed = true;
    }
    /**
     Clear either the entire cache or just the cache for a particular key.
        @private
     @method reset
     @param {String} fullName optional key to reset; if missing, resets everything
    */
    ;

    _proto.reset = function reset(fullName) {
      if (this.isDestroyed) return;

      if (fullName === undefined) {
        destroyDestroyables(this);
        resetCache(this);
      } else {
        resetMember(this, this.registry.normalize(fullName));
      }
    }
    /**
     Returns an object that can be used to provide an owner to a
     manually created instance.
      @private
     @method ownerInjection
     @returns { Object }
    */
    ;

    _proto.ownerInjection = function ownerInjection() {
      var injection = {};
      (0, _owner.setOwner)(injection, this.owner);
      return injection;
    }
    /**
     Given a fullName, return the corresponding factory. The consumer of the factory
     is responsible for the destruction of any factory instances, as there is no
     way for the container to ensure instances are destroyed when it itself is
     destroyed.
      @public
     @method factoryFor
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] The fullname of the request source (used for local lookup)
     @return {any}
     */
    ;

    _proto.factoryFor = function factoryFor(fullName) {
      if (this.isDestroyed) {
        throw new Error("Can not call `.factoryFor` after the owner has been destroyed");
      }

      var normalizedName = this.registry.normalize(fullName);
      (true && !(this.registry.isValidFullName(normalizedName)) && (0, _debug.assert)('fullName must be a proper full name', this.registry.isValidFullName(normalizedName)));
      return _factoryFor(this, normalizedName, fullName);
    };

    return Container;
  }();

  _exports.Container = Container;

  if (true
  /* DEBUG */
  ) {
    Container._leakTracking = leakTracking;
  }
  /*
   * Wrap a factory manager in a proxy which will not permit properties to be
   * set on the manager.
   */


  function wrapManagerInDeprecationProxy(manager) {
    if (_utils.HAS_NATIVE_PROXY) {
      var validator = {
        set: function set(_obj, prop) {
          throw new Error("You attempted to set \"" + prop + "\" on a factory manager created by container#factoryFor. A factory manager is a read-only construct.");
        }
      }; // Note:
      // We have to proxy access to the manager here so that private property
      // access doesn't cause the above errors to occur.

      var m = manager;
      var proxiedManager = {
        class: m.class,
        create: function create(props) {
          return m.create(props);
        }
      };
      return new Proxy(proxiedManager, validator);
    }

    return manager;
  }

  function isSingleton(container, fullName) {
    return container.registry.getOption(fullName, 'singleton') !== false;
  }

  function isInstantiatable(container, fullName) {
    return container.registry.getOption(fullName, 'instantiate') !== false;
  }

  function _lookup(container, fullName, options) {
    if (options === void 0) {
      options = {};
    }

    var normalizedName = fullName;

    if (options.singleton !== false) {
      var cached = container.cache[normalizedName];

      if (cached !== undefined) {
        return cached;
      }
    }

    return instantiateFactory(container, normalizedName, fullName, options);
  }

  function _factoryFor(container, normalizedName, fullName) {
    var cached = container.factoryManagerCache[normalizedName];

    if (cached !== undefined) {
      return cached;
    }

    var factory = container.registry.resolve(normalizedName);

    if (factory === undefined) {
      return;
    }

    if (true
    /* DEBUG */
    && factory && typeof factory._onLookup === 'function') {
      factory._onLookup(fullName);
    }

    var manager = new FactoryManager(container, factory, fullName, normalizedName);

    if (true
    /* DEBUG */
    ) {
      manager = wrapManagerInDeprecationProxy(manager);
    }

    container.factoryManagerCache[normalizedName] = manager;
    return manager;
  }

  function isSingletonClass(container, fullName, _ref) {
    var instantiate = _ref.instantiate,
        singleton = _ref.singleton;
    return singleton !== false && !instantiate && isSingleton(container, fullName) && !isInstantiatable(container, fullName);
  }

  function isSingletonInstance(container, fullName, _ref2) {
    var instantiate = _ref2.instantiate,
        singleton = _ref2.singleton;
    return singleton !== false && instantiate !== false && isSingleton(container, fullName) && isInstantiatable(container, fullName);
  }

  function isFactoryClass(container, fullname, _ref3) {
    var instantiate = _ref3.instantiate,
        singleton = _ref3.singleton;
    return instantiate === false && (singleton === false || !isSingleton(container, fullname)) && !isInstantiatable(container, fullname);
  }

  function isFactoryInstance(container, fullName, _ref4) {
    var instantiate = _ref4.instantiate,
        singleton = _ref4.singleton;
    return instantiate !== false && (singleton !== false || isSingleton(container, fullName)) && isInstantiatable(container, fullName);
  }

  function instantiateFactory(container, normalizedName, fullName, options) {
    var factoryManager = _factoryFor(container, normalizedName, fullName);

    if (factoryManager === undefined) {
      return;
    } // SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
    // By default majority of objects fall into this case


    if (isSingletonInstance(container, fullName, options)) {
      var instance = container.cache[normalizedName] = factoryManager.create(); // if this lookup happened _during_ destruction (emits a deprecation, but
      // is still possible) ensure that it gets destroyed

      if (container.isDestroying) {
        if (typeof instance.destroy === 'function') {
          instance.destroy();
        }
      }

      return instance;
    } // SomeClass { singleton: false, instantiate: true }


    if (isFactoryInstance(container, fullName, options)) {
      return factoryManager.create();
    } // SomeClass { singleton: true, instantiate: false } | { instantiate: false } | { singleton: false, instantiation: false }


    if (isSingletonClass(container, fullName, options) || isFactoryClass(container, fullName, options)) {
      return factoryManager.class;
    }

    throw new Error('Could not create factory');
  }

  function processInjections(container, injections, result) {
    if (true
    /* DEBUG */
    ) {
      container.registry.validateInjections(injections);
    }

    var hash = result.injections;

    for (var i = 0; i < injections.length; i++) {
      var _injections$i = injections[i],
          property = _injections$i.property,
          specifier = _injections$i.specifier;
      hash[property] = _lookup(container, specifier);

      if (!result.isDynamic) {
        result.isDynamic = !isSingleton(container, specifier);
      }
    }
  }

  function buildInjections(container, typeInjections, injections) {
    var injectionsHash = {};
    (0, _owner.setOwner)(injectionsHash, container.owner);
    var result = {
      injections: injectionsHash,
      isDynamic: false
    };

    if (typeInjections !== undefined) {
      processInjections(container, typeInjections, result);
    }

    if (injections !== undefined) {
      processInjections(container, injections, result);
    }

    return result;
  }

  function injectionsFor(container, fullName) {
    var registry = container.registry;

    var _fullName$split = fullName.split(':'),
        type = _fullName$split[0];

    var typeInjections = registry.getTypeInjections(type);
    var injections = registry.getInjections(fullName);
    return buildInjections(container, typeInjections, injections);
  }

  function destroyDestroyables(container) {
    var cache = container.cache;
    var keys = Object.keys(cache);

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var value = cache[key];

      if (value.destroy) {
        value.destroy();
      }
    }
  }

  function resetCache(container) {
    container.cache = (0, _utils.dictionary)(null);
    container.factoryManagerCache = (0, _utils.dictionary)(null);
  }

  function resetMember(container, fullName) {
    var member = container.cache[fullName];
    delete container.factoryManagerCache[fullName];

    if (member) {
      delete container.cache[fullName];

      if (member.destroy) {
        member.destroy();
      }
    }
  }

  var INIT_FACTORY = (0, _utils.symbol)('INIT_FACTORY');
  _exports.INIT_FACTORY = INIT_FACTORY;

  function getFactoryFor(obj) {
    return obj[INIT_FACTORY];
  }

  function setFactoryFor(obj, factory) {
    obj[INIT_FACTORY] = factory;
  }

  var FactoryManager = /*#__PURE__*/function () {
    function FactoryManager(container, factory, fullName, normalizedName) {
      this.container = container;
      this.owner = container.owner;
      this.class = factory;
      this.fullName = fullName;
      this.normalizedName = normalizedName;
      this.madeToString = undefined;
      this.injections = undefined;
      setFactoryFor(this, this);

      if (factory && (_utils.HAS_NATIVE_SYMBOL || INIT_FACTORY in factory)) {
        setFactoryFor(factory, this);
      }
    }

    var _proto2 = FactoryManager.prototype;

    _proto2.toString = function toString() {
      if (this.madeToString === undefined) {
        this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
      }

      return this.madeToString;
    };

    _proto2.create = function create(options) {
      var container = this.container;

      if (container.isDestroyed) {
        throw new Error("Can not create new instances after the owner has been destroyed (you attempted to create " + this.fullName + ")");
      }

      var props = this.injections;

      if (props === undefined) {
        var _injectionsFor = injectionsFor(this.container, this.normalizedName),
            injections = _injectionsFor.injections,
            isDynamic = _injectionsFor.isDynamic;

        setFactoryFor(injections, this);
        props = injections;

        if (!isDynamic) {
          this.injections = injections;
        }
      }

      if (options !== undefined) {
        props = (0, _polyfills.assign)({}, props, options);
      }

      if (true
      /* DEBUG */
      ) {
        var lazyInjections;
        var validationCache = this.container.validationCache; // Ensure that all lazy injections are valid at instantiation time

        if (!validationCache[this.fullName] && this.class && typeof this.class._lazyInjections === 'function') {
          lazyInjections = this.class._lazyInjections();
          lazyInjections = this.container.registry.normalizeInjectionsHash(lazyInjections);
          this.container.registry.validateInjections(lazyInjections);
        }

        validationCache[this.fullName] = true;
        (true && !(typeof this.class.create === 'function') && (0, _debug.assert)("Failed to create an instance of '" + this.normalizedName + "'. Most likely an improperly defined class or an invalid module export.", typeof this.class.create === 'function'));
      }

      return this.class.create(props);
    };

    return FactoryManager;
  }();

  var VALID_FULL_NAME_REGEXP = /^[^:]+:[^:]+$/;
  /**
   A registry used to store factory and option information keyed
   by type.
  
   A `Registry` stores the factory and option information needed by a
   `Container` to instantiate and cache objects.
  
   The API for `Registry` is still in flux and should not be considered stable.
  
   @private
   @class Registry
   @since 1.11.0
  */

  var Registry = /*#__PURE__*/function () {
    function Registry(options) {
      if (options === void 0) {
        options = {};
      }

      this.fallback = options.fallback || null;
      this.resolver = options.resolver || null;
      this.registrations = (0, _utils.dictionary)(options.registrations || null);
      this._typeInjections = (0, _utils.dictionary)(null);
      this._injections = (0, _utils.dictionary)(null);
      this._localLookupCache = Object.create(null);
      this._normalizeCache = (0, _utils.dictionary)(null);
      this._resolveCache = (0, _utils.dictionary)(null);
      this._failSet = new Set();
      this._options = (0, _utils.dictionary)(null);
      this._typeOptions = (0, _utils.dictionary)(null);
    }
    /**
     A backup registry for resolving registrations when no matches can be found.
        @private
     @property fallback
     @type Registry
     */

    /**
     An object that has a `resolve` method that resolves a name.
        @private
     @property resolver
     @type Resolver
     */

    /**
     @private
     @property registrations
     @type InheritingDict
     */

    /**
     @private
        @property _typeInjections
     @type InheritingDict
     */

    /**
     @private
        @property _injections
     @type InheritingDict
     */

    /**
     @private
        @property _normalizeCache
     @type InheritingDict
     */

    /**
     @private
        @property _resolveCache
     @type InheritingDict
     */

    /**
     @private
        @property _options
     @type InheritingDict
     */

    /**
     @private
        @property _typeOptions
     @type InheritingDict
     */

    /**
     Creates a container based on this registry.
        @private
     @method container
     @param {Object} options
     @return {Container} created container
     */


    var _proto3 = Registry.prototype;

    _proto3.container = function container(options) {
      return new Container(this, options);
    }
    /**
     Registers a factory for later injection.
        Example:
        ```javascript
     let registry = new Registry();
        registry.register('model:user', Person, {singleton: false });
     registry.register('fruit:favorite', Orange);
     registry.register('communication:main', Email, {singleton: false});
     ```
        @private
     @method register
     @param {String} fullName
     @param {Function} factory
     @param {Object} options
     */
    ;

    _proto3.register = function register(fullName, factory, options) {
      if (options === void 0) {
        options = {};
      }

      (true && !(this.isValidFullName(fullName)) && (0, _debug.assert)('fullName must be a proper full name', this.isValidFullName(fullName)));
      (true && !(factory !== undefined) && (0, _debug.assert)("Attempting to register an unknown factory: '" + fullName + "'", factory !== undefined));
      var normalizedName = this.normalize(fullName);
      (true && !(!this._resolveCache[normalizedName]) && (0, _debug.assert)("Cannot re-register: '" + fullName + "', as it has already been resolved.", !this._resolveCache[normalizedName]));

      this._failSet.delete(normalizedName);

      this.registrations[normalizedName] = factory;
      this._options[normalizedName] = options;
    }
    /**
     Unregister a fullName
        ```javascript
     let registry = new Registry();
     registry.register('model:user', User);
        registry.resolve('model:user').create() instanceof User //=> true
        registry.unregister('model:user')
     registry.resolve('model:user') === undefined //=> true
     ```
        @private
     @method unregister
     @param {String} fullName
     */
    ;

    _proto3.unregister = function unregister(fullName) {
      (true && !(this.isValidFullName(fullName)) && (0, _debug.assert)('fullName must be a proper full name', this.isValidFullName(fullName)));
      var normalizedName = this.normalize(fullName);
      this._localLookupCache = Object.create(null);
      delete this.registrations[normalizedName];
      delete this._resolveCache[normalizedName];
      delete this._options[normalizedName];

      this._failSet.delete(normalizedName);
    }
    /**
     Given a fullName return the corresponding factory.
        By default `resolve` will retrieve the factory from
     the registry.
        ```javascript
     let registry = new Registry();
     registry.register('api:twitter', Twitter);
        registry.resolve('api:twitter') // => Twitter
     ```
        Optionally the registry can be provided with a custom resolver.
     If provided, `resolve` will first provide the custom resolver
     the opportunity to resolve the fullName, otherwise it will fallback
     to the registry.
        ```javascript
     let registry = new Registry();
     registry.resolver = function(fullName) {
        // lookup via the module system of choice
      };
        // the twitter factory is added to the module system
     registry.resolve('api:twitter') // => Twitter
     ```
        @private
     @method resolve
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] the fullname of the request source (used for local lookups)
     @return {Function} fullName's factory
     */
    ;

    _proto3.resolve = function resolve(fullName) {
      var factory = _resolve(this, this.normalize(fullName));

      if (factory === undefined && this.fallback !== null) {
        var _this$fallback;

        factory = (_this$fallback = this.fallback).resolve.apply(_this$fallback, arguments);
      }

      return factory;
    }
    /**
     A hook that can be used to describe how the resolver will
     attempt to find the factory.
        For example, the default Ember `.describe` returns the full
     class name (including namespace) where Ember's resolver expects
     to find the `fullName`.
        @private
     @method describe
     @param {String} fullName
     @return {string} described fullName
     */
    ;

    _proto3.describe = function describe(fullName) {
      if (this.resolver !== null && this.resolver.lookupDescription) {
        return this.resolver.lookupDescription(fullName);
      } else if (this.fallback !== null) {
        return this.fallback.describe(fullName);
      } else {
        return fullName;
      }
    }
    /**
     A hook to enable custom fullName normalization behavior
        @private
     @method normalizeFullName
     @param {String} fullName
     @return {string} normalized fullName
     */
    ;

    _proto3.normalizeFullName = function normalizeFullName(fullName) {
      if (this.resolver !== null && this.resolver.normalize) {
        return this.resolver.normalize(fullName);
      } else if (this.fallback !== null) {
        return this.fallback.normalizeFullName(fullName);
      } else {
        return fullName;
      }
    }
    /**
     Normalize a fullName based on the application's conventions
        @private
     @method normalize
     @param {String} fullName
     @return {string} normalized fullName
     */
    ;

    _proto3.normalize = function normalize(fullName) {
      return this._normalizeCache[fullName] || (this._normalizeCache[fullName] = this.normalizeFullName(fullName));
    }
    /**
     @method makeToString
        @private
     @param {any} factory
     @param {string} fullName
     @return {function} toString function
     */
    ;

    _proto3.makeToString = function makeToString(factory, fullName) {
      var _a;

      if (this.resolver !== null && this.resolver.makeToString) {
        return this.resolver.makeToString(factory, fullName);
      } else if (this.fallback !== null) {
        return this.fallback.makeToString(factory, fullName);
      } else {
        return typeof factory === 'string' ? factory : (_a = factory.name) !== null && _a !== void 0 ? _a : '(unknown class)';
      }
    }
    /**
     Given a fullName check if the container is aware of its factory
     or singleton instance.
        @private
     @method has
     @param {String} fullName
     @param {Object} [options]
     @param {String} [options.source] the fullname of the request source (used for local lookups)
     @return {Boolean}
     */
    ;

    _proto3.has = function has(fullName) {
      if (!this.isValidFullName(fullName)) {
        return false;
      }

      return _has(this, this.normalize(fullName));
    }
    /**
     Allow registering options for all factories of a type.
        ```javascript
     let registry = new Registry();
     let container = registry.container();
        // if all of type `connection` must not be singletons
     registry.optionsForType('connection', { singleton: false });
        registry.register('connection:twitter', TwitterConnection);
     registry.register('connection:facebook', FacebookConnection);
        let twitter = container.lookup('connection:twitter');
     let twitter2 = container.lookup('connection:twitter');
        twitter === twitter2; // => false
        let facebook = container.lookup('connection:facebook');
     let facebook2 = container.lookup('connection:facebook');
        facebook === facebook2; // => false
     ```
        @private
     @method optionsForType
     @param {String} type
     @param {Object} options
     */
    ;

    _proto3.optionsForType = function optionsForType(type, options) {
      this._typeOptions[type] = options;
    };

    _proto3.getOptionsForType = function getOptionsForType(type) {
      var optionsForType = this._typeOptions[type];

      if (optionsForType === undefined && this.fallback !== null) {
        optionsForType = this.fallback.getOptionsForType(type);
      }

      return optionsForType;
    }
    /**
     @private
     @method options
     @param {String} fullName
     @param {Object} options
     */
    ;

    _proto3.options = function options(fullName, _options) {
      var normalizedName = this.normalize(fullName);
      this._options[normalizedName] = _options;
    };

    _proto3.getOptions = function getOptions(fullName) {
      var normalizedName = this.normalize(fullName);
      var options = this._options[normalizedName];

      if (options === undefined && this.fallback !== null) {
        options = this.fallback.getOptions(fullName);
      }

      return options;
    };

    _proto3.getOption = function getOption(fullName, optionName) {
      var options = this._options[fullName];

      if (options !== undefined && options[optionName] !== undefined) {
        return options[optionName];
      }

      var type = fullName.split(':')[0];
      options = this._typeOptions[type];

      if (options && options[optionName] !== undefined) {
        return options[optionName];
      } else if (this.fallback !== null) {
        return this.fallback.getOption(fullName, optionName);
      }

      return undefined;
    }
    /**
     Used only via `injection`.
        Provides a specialized form of injection, specifically enabling
     all objects of one type to be injected with a reference to another
     object.
        For example, provided each object of type `controller` needed a `router`.
     one would do the following:
        ```javascript
     let registry = new Registry();
     let container = registry.container();
        registry.register('router:main', Router);
     registry.register('controller:user', UserController);
     registry.register('controller:post', PostController);
        registry.typeInjection('controller', 'router', 'router:main');
        let user = container.lookup('controller:user');
     let post = container.lookup('controller:post');
        user.router instanceof Router; //=> true
     post.router instanceof Router; //=> true
        // both controllers share the same router
     user.router === post.router; //=> true
     ```
        @private
     @method typeInjection
     @param {String} type
     @param {String} property
     @param {String} fullName
     */
    ;

    _proto3.typeInjection = function typeInjection(type, property, fullName) {
      (true && !(this.isValidFullName(fullName)) && (0, _debug.assert)('fullName must be a proper full name', this.isValidFullName(fullName)));
      var fullNameType = fullName.split(':')[0];
      (true && !(fullNameType !== type) && (0, _debug.assert)("Cannot inject a '" + fullName + "' on other " + type + "(s).", fullNameType !== type));
      var injections = this._typeInjections[type] || (this._typeInjections[type] = []);
      injections.push({
        property: property,
        specifier: fullName
      });
    }
    /**
     Defines injection rules.
        These rules are used to inject dependencies onto objects when they
     are instantiated.
        Two forms of injections are possible:
        * Injecting one fullName on another fullName
     * Injecting one fullName on a type
        Example:
        ```javascript
     let registry = new Registry();
     let container = registry.container();
        registry.register('source:main', Source);
     registry.register('model:user', User);
     registry.register('model:post', Post);
        // injecting one fullName on another fullName
     // eg. each user model gets a post model
     registry.injection('model:user', 'post', 'model:post');
        // injecting one fullName on another type
     registry.injection('model', 'source', 'source:main');
        let user = container.lookup('model:user');
     let post = container.lookup('model:post');
        user.source instanceof Source; //=> true
     post.source instanceof Source; //=> true
        user.post instanceof Post; //=> true
        // and both models share the same source
     user.source === post.source; //=> true
     ```
        @private
     @method injection
     @param {String} factoryName
     @param {String} property
     @param {String} injectionName
     */
    ;

    _proto3.injection = function injection(fullName, property, injectionName) {
      (true && !(this.isValidFullName(injectionName)) && (0, _debug.assert)("Invalid injectionName, expected: 'type:name' got: " + injectionName, this.isValidFullName(injectionName)));
      var normalizedInjectionName = this.normalize(injectionName);

      if (fullName.indexOf(':') === -1) {
        return this.typeInjection(fullName, property, normalizedInjectionName);
      }

      (true && !(this.isValidFullName(fullName)) && (0, _debug.assert)('fullName must be a proper full name', this.isValidFullName(fullName)));
      var normalizedName = this.normalize(fullName);
      var injections = this._injections[normalizedName] || (this._injections[normalizedName] = []);
      injections.push({
        property: property,
        specifier: normalizedInjectionName
      });
    }
    /**
     @private
     @method knownForType
     @param {String} type the type to iterate over
    */
    ;

    _proto3.knownForType = function knownForType(type) {
      var localKnown = (0, _utils.dictionary)(null);
      var registeredNames = Object.keys(this.registrations);

      for (var index = 0; index < registeredNames.length; index++) {
        var fullName = registeredNames[index];
        var itemType = fullName.split(':')[0];

        if (itemType === type) {
          localKnown[fullName] = true;
        }
      }

      var fallbackKnown, resolverKnown;

      if (this.fallback !== null) {
        fallbackKnown = this.fallback.knownForType(type);
      }

      if (this.resolver !== null && this.resolver.knownForType) {
        resolverKnown = this.resolver.knownForType(type);
      }

      return (0, _polyfills.assign)({}, fallbackKnown, localKnown, resolverKnown);
    };

    _proto3.isValidFullName = function isValidFullName(fullName) {
      return VALID_FULL_NAME_REGEXP.test(fullName);
    };

    _proto3.getInjections = function getInjections(fullName) {
      var injections = this._injections[fullName];

      if (this.fallback !== null) {
        var fallbackInjections = this.fallback.getInjections(fullName);

        if (fallbackInjections !== undefined) {
          injections = injections === undefined ? fallbackInjections : injections.concat(fallbackInjections);
        }
      }

      return injections;
    };

    _proto3.getTypeInjections = function getTypeInjections(type) {
      var injections = this._typeInjections[type];

      if (this.fallback !== null) {
        var fallbackInjections = this.fallback.getTypeInjections(type);

        if (fallbackInjections !== undefined) {
          injections = injections === undefined ? fallbackInjections : injections.concat(fallbackInjections);
        }
      }

      return injections;
    };

    return Registry;
  }();

  _exports.Registry = Registry;

  if (true
  /* DEBUG */
  ) {
    var proto = Registry.prototype;

    proto.normalizeInjectionsHash = function (hash) {
      var injections = [];

      for (var key in hash) {
        if (Object.prototype.hasOwnProperty.call(hash, key)) {
          var specifier = hash[key].specifier;
          (true && !(this.isValidFullName(specifier)) && (0, _debug.assert)("Expected a proper full name, given '" + specifier + "'", this.isValidFullName(specifier)));
          injections.push({
            property: key,
            specifier: specifier
          });
        }
      }

      return injections;
    };

    proto.validateInjections = function (injections) {
      if (!injections) {
        return;
      }

      for (var i = 0; i < injections.length; i++) {
        var specifier = injections[i].specifier;
        (true && !(this.has(specifier)) && (0, _debug.assert)("Attempting to inject an unknown injection: '" + specifier + "'", this.has(specifier)));
      }
    };
  }

  function _resolve(registry, _normalizedName) {
    var normalizedName = _normalizedName;
    var cached = registry._resolveCache[normalizedName];

    if (cached !== undefined) {
      return cached;
    }

    if (registry._failSet.has(normalizedName)) {
      return;
    }

    var resolved;

    if (registry.resolver) {
      resolved = registry.resolver.resolve(normalizedName);
    }

    if (resolved === undefined) {
      resolved = registry.registrations[normalizedName];
    }

    if (resolved === undefined) {
      registry._failSet.add(normalizedName);
    } else {
      registry._resolveCache[normalizedName] = resolved;
    }

    return resolved;
  }

  function _has(registry, fullName) {
    return registry.resolve(fullName) !== undefined;
  }

  var privateNames = (0, _utils.dictionary)(null);
  var privateSuffix = ("" + Math.random() + Date.now()).replace('.', '');

  function privatize(_ref5) {
    var fullName = _ref5[0];
    var name = privateNames[fullName];

    if (name) {
      return name;
    }

    var _fullName$split2 = fullName.split(':'),
        type = _fullName$split2[0],
        rawName = _fullName$split2[1];

    return privateNames[fullName] = (0, _utils.intern)(type + ":" + rawName + "-" + privateSuffix);
  }
  /*
  Public API for the container is still in flux.
  The public API, specified on the application namespace should be considered the stable API.
  // @module container
    @private
  */

});