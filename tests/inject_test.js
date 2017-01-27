import asap from 'asap';
import {assert} from 'chai';
import jsdom from 'jsdom';

import { StyleSheet, Styles } from '../src/index.js';
import {Injector} from "../src/inject";

const sheet = StyleSheet.create({
    red: {
        color: 'red',
    },

    blue: {
        color: 'blue',
    },

    green: {
        color: 'green',
    },
});

describe('injection', () => {
    
    let document,
        styles,
        injector;
    
    beforeEach(() => {
        document = jsdom.jsdom();
        styles = new Styles(document);
        injector = styles.getInjector();
        injector.reset();
    });

    afterEach(() => {
        document.close();
        document = undefined;
        styles = undefined;
        injector = undefined;
    });

    describe('injectStyleOnce', () => {
        it('causes styles to automatically be added', done => {
            injector.injectStyleOnce("x", ".x", [{ color: "red" }], false);

            asap(() => {
                const styleTags = document.getElementsByTagName("style");
                assert.equal(styleTags.length, 1);
                const styles = styleTags[0].textContent;

                assert.include(styles, ".x{");
                assert.include(styles, "color:red");

                done();
            });
        });

        it('causes styles to be added async, and buffered', done => {
            injector.injectStyleOnce("x", ".x", [{ color: "red" }], false);

            const styleTags = document.getElementsByTagName("style");
            assert.equal(styleTags.length, 0);

            injector.injectStyleOnce("y", ".y", [{ color: "blue" }], false);

            asap(() => {
                const styleTags = document.getElementsByTagName("style");
                assert.equal(styleTags.length, 1);
                const styles = styleTags[0].textContent;

                assert.include(styles, ".x{");
                assert.include(styles, ".y{");
                assert.include(styles, "color:red");
                assert.include(styles, "color:blue");

                done();
            });
        });

        it('doesn\'t inject the same style twice', done => {
            injector.injectStyleOnce("x", ".x", [{ color: "red" }], false);
            injector.injectStyleOnce("x", ".x", [{ color: "blue" }], false);

            asap(() => {
                const styleTags = document.getElementsByTagName("style");
                assert.equal(styleTags.length, 1);
                const styles = styleTags[0].textContent;

                assert.include(styles, ".x{");
                assert.include(styles, "color:red");
                assert.notInclude(styles, "color:blue");
                assert.equal(styles.match(/\.x{/g).length, 1);

                done();
            });
        });

        it('throws an error if we\'re not buffering and on the server', () => {
            
            const serverInjector = new Injector();
            
            assert.throws(() => {
                serverInjector.injectStyleOnce("x", ".x", [{ color: "red" }], false);
            }, "Cannot automatically buffer");
        });

        // browser-specific tests
        it('adds to the .styleSheet.cssText if available', done => {
            const styleTag = document.createElement("style");
            styleTag.setAttribute("data-aphrodite", "");
            document.head.appendChild(styleTag);
            styleTag.styleSheet = { cssText: "" };

            injector.injectStyleOnce("x", ".x", [{ color: "red" }], false);

            asap(() => {
                assert.include(styleTag.styleSheet.cssText, ".x{");
                assert.include(styleTag.styleSheet.cssText, "color:red");
                done();
            });
        });

        it('uses document.getElementsByTagName without document.head', done => {
            Object.defineProperty(document, "head", {
                value: null,
            });

            injector.injectStyleOnce("x", ".x", [{ color: "red" }], false);

            asap(() => {
                const styleTags = document.getElementsByTagName("style");
                assert.equal(styleTags.length, 1);
                const styles = styleTags[0].textContent;

                assert.include(styles, ".x{");
                assert.include(styles, "color:red");

                done();
            });
        });
    });

    describe('startBuffering', () => {
        it('causes styles to not be added automatically', done => {
            injector.startBuffering();

            styles.css(sheet.red);

            asap(() => {
                const styleTags = document.getElementsByTagName("style");
                assert.equal(styleTags.length, 0);
                done();
            });
        });

        it('throws an error if we try to buffer twice', () => {
            injector.startBuffering();

            assert.throws(() => {
                injector.startBuffering();
            }, "already buffering");
        });
    });

    describe('flushToStyleTag', () => {
        it('adds a style tag with all the buffered styles', () => {
            injector.startBuffering();

            styles.css(sheet.red);
            styles.css(sheet.blue);

            injector.flushToStyleTag();

            const styleTags = document.getElementsByTagName("style");
            const lastTag = styleTags[styleTags.length - 1];

            assert.include(lastTag.textContent, `.${sheet.red._name}{`);
            assert.include(lastTag.textContent, `.${sheet.blue._name}{`);
            assert.match(lastTag.textContent, /color:red/);
            assert.match(lastTag.textContent, /color:blue/);
        });

        it('clears the injection buffer', () => {
            injector.startBuffering();

            styles.css(sheet.red);
            styles.css(sheet.blue);

            injector.flushToStyleTag();

            let styleTags = document.getElementsByTagName("style");
            assert.equal(styleTags.length, 1);
            let styleContentLength = styleTags[0].textContent.length;

            injector.startBuffering();
            injector.flushToStyleTag();

            styleTags = document.getElementsByTagName("style");
            assert.equal(styleTags.length, 1);
            assert.equal(styleTags[0].textContent.length, styleContentLength);
        });
    });

    describe('flushToString', () => {
        it('returns the buffered styles', () => {
            injector.startBuffering();

            styles.css(sheet.red);
            styles.css(sheet.blue);

            const style = injector.flushToString();

            assert.include(style, `.${sheet.red._name}{`);
            assert.include(style, `.${sheet.blue._name}{`);
            assert.match(style, /color:red/);
            assert.match(style, /color:blue/);
        });

        it('clears the injection buffer', () => {
            injector.startBuffering();

            styles.css(sheet.red);
            styles.css(sheet.blue);

            assert.notEqual(injector.flushToString(), "");

            injector.startBuffering();
            assert.equal(injector.flushToString(), "");
        });
    });

    describe('getRenderedClassNames', () => {
        it('returns classes that have been rendered', () => {
            styles.css(sheet.red);
            styles.css(sheet.blue);

            const classNames = injector.getRenderedClassNames();

            assert.include(classNames, sheet.red._name);
            assert.include(classNames, sheet.blue._name);
            assert.notInclude(classNames, sheet.green._name);
        });
    });

    describe('addRenderedClassNames', () => {
        it('doesn\'t render classnames that were added', () => {
            injector.startBuffering();
            injector.addRenderedClassNames([sheet.red._name, sheet.blue._name]);

            styles.css(sheet.red);
            styles.css(sheet.blue);
            styles.css(sheet.green);

            injector.flushToStyleTag();

            const styleTags = document.getElementsByTagName("style");
            assert.equal(styleTags.length, 1);
            const style = styleTags[0].textContent;

            assert.include(style, `.${sheet.green._name}{`);
            assert.notInclude(style, `.${sheet.red._name}{`);
            assert.notInclude(style, `.${sheet.blue._name}{`);
            assert.match(style, /color:green/);
            assert.notMatch(style, /color:red/);
            assert.notMatch(style, /color:blue/);
        });
    });
});

describe('String handlers', () => {

    let document,
        styles,
        injector;

    beforeEach(() => {
        document = jsdom.jsdom();
        styles = new Styles(document);
        injector = styles.getInjector();
        injector.reset();
    });

    afterEach(() => {
        document.close();
        document = undefined;
        styles = undefined;
        injector = undefined;
    });

    function assertStylesInclude(str) {
        const styleTags = document.getElementsByTagName("style");
        const styles = styleTags[0].textContent;

        assert.include(styles, str);
    }

    describe('fontFamily', () => {
        it('leaves plain strings alone', () => {
            const sheet = StyleSheet.create({
                base: {
                    fontFamily: "Helvetica",
                },
            });

            injector.startBuffering();
            styles.css(sheet.base);
            injector.flushToStyleTag();

            assertStylesInclude('font-family:Helvetica !important');
        });

        it('concatenates arrays', () => {
            const sheet = StyleSheet.create({
                base: {
                    fontFamily: ["Helvetica", "sans-serif"],
                },
            });

            injector.startBuffering();
            styles.css(sheet.base);
            injector.flushToStyleTag();

            assertStylesInclude('font-family:Helvetica,sans-serif !important');
        });

        it('adds @font-face rules for objects', () => {
            const fontface = {
                fontFamily: "CoolFont",
                src: "url('coolfont.ttf')",
            };

            const sheet = StyleSheet.create({
                base: {
                    fontFamily: [fontface, "sans-serif"],
                },
            });

            injector.startBuffering();
            styles.css(sheet.base);
            injector.flushToStyleTag();

            assertStylesInclude('font-family:"CoolFont",sans-serif !important');
            assertStylesInclude('font-family:CoolFont;');
            assertStylesInclude("src:url('coolfont.ttf');");
        });
    });

    describe('animationName', () => {
        it('leaves plain strings alone', () => {
            const sheet = StyleSheet.create({
                animate: {
                    animationName: "boo",
                },
            });

            injector.startBuffering();
            styles.css(sheet.animate);
            injector.flushToStyleTag();

            assertStylesInclude('animation-name:boo !important');
        });

        it('generates css for keyframes', () => {
            const sheet = StyleSheet.create({
                animate: {
                    animationName: {
                        'from': {
                            left: 10,
                        },
                        '50%': {
                            left: 20,
                        },
                        'to': {
                            left: 40,
                        },
                    },
                },
            });

            injector.startBuffering();
            styles.css(sheet.animate);
            injector.flushToStyleTag();

            assertStylesInclude('@keyframes keyframe_1ptfkz1');
            assertStylesInclude('from{left:10px;}');
            assertStylesInclude('50%{left:20px;}');
            assertStylesInclude('to{left:40px;}');
            assertStylesInclude('animation-name:keyframe_1ptfkz1');
        });

        it('doesn\'t add the same keyframes twice', () => {
            const keyframes = {
                'from': {
                    left: 10,
                },
                '50%': {
                    left: 20,
                },
                'to': {
                    left: 40,
                },
            };

            const sheet = StyleSheet.create({
                animate: {
                    animationName: keyframes,
                },
                animate2: {
                    animationName: keyframes,
                },
            });

            injector.startBuffering();
            styles.css(sheet.animate);
            styles.css(sheet.animate2);
            injector.flushToStyleTag();

            const styleTags = document.getElementsByTagName("style");
            const style = styleTags[0].textContent;

            assert.include(style, '@keyframes keyframe_1ptfkz1');
            assert.equal(style.match(/@keyframes/g).length, 1);
        });

        it('concatenates arrays of custom keyframes', () => {
            const keyframes1 = {
                'from': {
                    left: 10,
                },
                'to': {
                    left: 50,
                },
            };

            const keyframes2 = {
                'from': {
                    top: -50,
                },
                'to': {
                    top: 0,
                },
            };

            const sheet = StyleSheet.create({
                animate: {
                    animationName: [keyframes1, keyframes2],
                },
            });

            injector.startBuffering();
            styles.css(sheet.animate);
            injector.flushToStyleTag();

            assertStylesInclude('@keyframes keyframe_1q5qq7q');
            assertStylesInclude('@keyframes keyframe_1sbxkmr');
            assertStylesInclude('animation-name:keyframe_1q5qq7q,keyframe_1sbxkmr')
        });

        it('concatenates a custom keyframe animation with a plain string', () => {
            const keyframes1 = {
                'from': {
                    left: 10,
                },
                'to': {
                    left: 50,
                },
            };

            const sheet = StyleSheet.create({
                animate: {
                    animationName: [keyframes1, 'hoo'],
                },
            });

            injector.startBuffering();
            styles.css(sheet.animate);
            injector.flushToStyleTag();

            assertStylesInclude('@keyframes keyframe_1q5qq7q');
            assertStylesInclude('animation-name:keyframe_1q5qq7q,hoo')
        });
    });
});
