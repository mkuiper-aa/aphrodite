/* @flow */
import {mapObj, hashObject} from './util';
import {defaultSelectorHandlers} from './generate';
import {Injector} from './inject';

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

let stylesGlobal /* : Styles */;

const getStylesGlobal = () => {
    
    if (!stylesGlobal) {
        throw 'No global Styles instance has been initialized.';
    }
    
    return stylesGlobal;
};

const Styles = (document /* : ?Document */ = null,
                useImportant /* : boolean */ = true,
                selectorHandlers /* : ?SelectorHandler[] */) => {
    
    let important = useImportant;
    
    const handlers = selectorHandlers ? selectorHandlers : defaultSelectorHandlers;
    
    const injector = new Injector(document);
    
    return {
        css(...styleDefinitions /* : MaybeSheetDefinition[] */) {
            return injector.injectAndGetClassName(
                important, styleDefinitions, handlers);
        },
        
        renderStatic(renderFunc /* : RenderFunction */) {
            injector.reset();
            injector.startBuffering();
            const html = renderFunc();
            const cssContent = injector.flushToString();
            
            return {
                html: html,
                css: {
                    content: cssContent,
                    renderedClassNames: injector.getRenderedClassNames(),
                },
            };
        },
        
        rehydrate(renderedClassNames /* : string[] */ =[]) {
            injector.addRenderedClassNames(renderedClassNames);
        },
        
        suppressStyleInjection() {
            injector.reset();
            injector.startBuffering();
        },
        
        clearBufferAndResumeStyleInjection() {
            injector.reset();
        },
        
        setUseImportant(useImportant /* : boolean */) {
            important = useImportant;
        },
        
        getInjector() {
            return injector;
        },
    }
};

const StyleSheet = {
    create(sheetDefinition /* : SheetDefinition */) {
        return mapObj(sheetDefinition, ([key, val]) => {
            return [key, {
                // TODO(emily): Make a 'production' mode which doesn't prepend
                // the class name here, to make the generated CSS smaller.
                _name: `${key}_${hashObject(val)}`,
                _definition: val
            }];
        });
    },

    rehydrate(renderedClassNames /* : string[] */ =[]) {
        getStylesGlobal().rehydrate(renderedClassNames);
    },
};

/**
 * Utilities for using Aphrodite server-side.
 */
const StyleSheetServer = {
    renderStatic(renderFunc /* : RenderFunction */) {
        return getStylesGlobal().renderStatic(renderFunc);
    },
};

/**
 * Utilities for using Aphrodite in tests.
 *
 * Not meant to be used in production.
 */
const StyleSheetTestUtils = {
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
    suppressStyleInjection() {
        getStylesGlobal().suppressStyleInjection();
    },

    /**
     * Opposite method of preventStyleInject.
     */
    clearBufferAndResumeStyleInjection() {
        getStylesGlobal().clearBufferAndResumeStyleInjection();
    },
};

/**
 * Generate the Aphrodite API exports, with given `selectorHandlers` and
 * `useImportant` state.
 */
const makeExports = (
    useImportant /* : boolean */,
    selectorHandlers /* : SelectorHandler[] */
) => {
    
    stylesGlobal = new Styles(global.document, useImportant, selectorHandlers);
    
    return {
        Styles,
        
        StyleSheet: {
            ...StyleSheet,

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
            extend(extensions /* : Extension[] */) {
                const extensionSelectorHandlers = extensions
                    // Pull out extensions with a selectorHandler property
                    .map(extension => extension.selectorHandler)
                    // Remove nulls (i.e. extensions without a selectorHandler
                    // property).
                    .filter(handler => handler);

                return makeExports(
                    useImportant,
                    selectorHandlers.concat(extensionSelectorHandlers)
                );
            },
        },

        StyleSheetServer,
        StyleSheetTestUtils,

        css(...styleDefinitions /* : MaybeSheetDefinition[] */) {
            return stylesGlobal.css(...styleDefinitions);
        },

        /**
         * FIXME: this is exposed only to facilitate tests. Meh!
         * 
         * Would be better no to have a global at all, but that would require a more
         * drastic rewrite of the library and dropping backwards compatibility.
         * 
         * @returns {Styles}
         */
        getStylesGlobal() {
            return stylesGlobal;
        },
        
        useImportant,
    };
};

module.exports = makeExports;
