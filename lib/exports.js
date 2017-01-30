'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _util = require('./util');

var _generate = require('./generate');

var _inject = require('./inject');

/* ::
import type { SelectorHandler } from './generate.js';
export type SheetDefinition = { [id:string]: any };
export type SheetDefinitions = SheetDefinition | SheetDefinition[];
type RenderFunction = () => string;
type Extension = {
    selectorHandler: SelectorHandler
};
export type MaybeSheetDefinition = SheetDefinition | false | null | void
*/

var stylesGlobal = undefined /* : Styles */;

var getStylesGlobal = function getStylesGlobal() {

    if (!stylesGlobal) {
        throw 'No global Styles instance has been initialized.';
    }

    return stylesGlobal;
};

var Styles = function Styles(document, /* : ?Document */useImportant, /* : boolean */selectorHandlers /* : ?SelectorHandler[] */) {
    if (document === undefined) document = null;
    if (useImportant === undefined) useImportant = true;

    var important = useImportant;

    var handlers = selectorHandlers ? selectorHandlers : _generate.defaultSelectorHandlers;

    var injector = new _inject.Injector(document);

    return {
        css: function css() /* : MaybeSheetDefinition[] */{
            for (var _len = arguments.length, styleDefinitions = Array(_len), _key = 0; _key < _len; _key++) {
                styleDefinitions[_key] = arguments[_key];
            }

            return injector.injectAndGetClassName(important, styleDefinitions, handlers);
        },

        renderStatic: function renderStatic(renderFunc /* : RenderFunction */) {
            injector.reset();
            injector.startBuffering();
            var html = renderFunc();
            var cssContent = injector.flushToString();

            return {
                html: html,
                css: {
                    content: cssContent,
                    renderedClassNames: injector.getRenderedClassNames()
                }
            };
        },

        rehydrate: function rehydrate() {
            var renderedClassNames /* : string[] */ = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

            injector.addRenderedClassNames(renderedClassNames);
        },

        suppressStyleInjection: function suppressStyleInjection() {
            injector.reset();
            injector.startBuffering();
        },

        clearBufferAndResumeStyleInjection: function clearBufferAndResumeStyleInjection() {
            injector.reset();
        },

        setUseImportant: function setUseImportant(useImportant /* : boolean */) {
            important = useImportant;
        },

        getInjector: function getInjector() {
            return injector;
        }
    };
};

var StyleSheet = {
    create: function create(sheetDefinition /* : SheetDefinition */) {
        return (0, _util.mapObj)(sheetDefinition, function (_ref) {
            var _ref2 = _slicedToArray(_ref, 2);

            var key = _ref2[0];
            var val = _ref2[1];

            return [key, {
                // TODO(emily): Make a 'production' mode which doesn't prepend
                // the class name here, to make the generated CSS smaller.
                _name: key + '_' + (0, _util.hashObject)(val),
                _definition: val
            }];
        });
    },

    rehydrate: function rehydrate() {
        var renderedClassNames /* : string[] */ = arguments.length <= 0 || arguments[0] === undefined ? [] : arguments[0];

        getStylesGlobal().rehydrate(renderedClassNames);
    }
};

/**
 * Utilities for using Aphrodite server-side.
 */
var StyleSheetServer = {
    renderStatic: function renderStatic(renderFunc /* : RenderFunction */) {
        return getStylesGlobal().renderStatic(renderFunc);
    }
};

/**
 * Utilities for using Aphrodite in tests.
 *
 * Not meant to be used in production.
 */
var StyleSheetTestUtils = {
    /**
     * Prevent styles from being injected into the DOM.
     *
     * This is useful in situations where you'd like to test rendering UI
     * components which use Aphrodite without any of the side-effects of
     * Aphrodite happening. Particularly useful for testing the output of
     * components when you have no DOM, e.g. testing in Node without a fake DOM.
     *
     * Should be paired with a subsequent call to
     * clearBufferAndResumeStyleInjection.
     */
    suppressStyleInjection: function suppressStyleInjection() {
        getStylesGlobal().suppressStyleInjection();
    },

    /**
     * Opposite method of preventStyleInject.
     */
    clearBufferAndResumeStyleInjection: function clearBufferAndResumeStyleInjection() {
        getStylesGlobal().clearBufferAndResumeStyleInjection();
    }
};

/**
 * Generate the Aphrodite API exports, with given `selectorHandlers` and
 * `useImportant` state.
 */
var makeExports = function makeExports(useImportant, /* : boolean */
selectorHandlers /* : SelectorHandler[] */
) {

    stylesGlobal = new Styles(global.document, useImportant, selectorHandlers);

    return {
        Styles: Styles,

        StyleSheet: _extends({}, StyleSheet, {

            /**
             * Returns a version of the exports of Aphrodite (i.e. an object
             * with `css` and `StyleSheet` properties) which have some
             * extensions included.
             *
             * @param {Array.<Object>} extensions: An array of extensions to
             *     add to this instance of Aphrodite. Each object should have a
             *     single property on it, defining which kind of extension to
             *     add.
             * @param {SelectorHandler} [extensions[].selectorHandler]: A
             *     selector handler extension. See `defaultSelectorHandlers` in
             *     generate.js.
             *
             * @returns {Object} An object containing the exports of the new
             *     instance of Aphrodite.
             */
            extend: function extend(extensions /* : Extension[] */) {
                var extensionSelectorHandlers = extensions
                // Pull out extensions with a selectorHandler property
                .map(function (extension) {
                    return extension.selectorHandler;
                })
                // Remove nulls (i.e. extensions without a selectorHandler
                // property).
                .filter(function (handler) {
                    return handler;
                });

                return makeExports(useImportant, selectorHandlers.concat(extensionSelectorHandlers));
            }
        }),

        StyleSheetServer: StyleSheetServer,
        StyleSheetTestUtils: StyleSheetTestUtils,

        css: function css() /* : MaybeSheetDefinition[] */{
            var _stylesGlobal;

            return (_stylesGlobal = stylesGlobal).css.apply(_stylesGlobal, arguments);
        },

        /**
         * FIXME: this is exposed only to facilitate tests. Meh!
         * 
         * Would be better no to have a global at all, but that would require a more
         * drastic rewrite of the library and dropping backwards compatibility.
         * 
         * @returns {Styles}
         */
        getStylesGlobal: function getStylesGlobal() {
            return stylesGlobal;
        },

        useImportant: useImportant
    };
};

module.exports = makeExports;