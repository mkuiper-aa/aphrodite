import asap from 'asap';
import {assert} from 'chai';
import jsdom from 'jsdom';

import {
  StyleSheet,
  css,
  getStylesGlobal,
} from '../src/index.js';

describe('css', () => {
    
    let document;
    
    beforeEach(() => {
        document = jsdom.jsdom();
        getStylesGlobal().setUseImportant(false);
        getStylesGlobal().getInjector().setDocument(document);
        getStylesGlobal().clearBufferAndResumeStyleInjection();
    });

    afterEach(() => {
        document.close();
        getStylesGlobal().setUseImportant(true);
        getStylesGlobal().getInjector().setDocument(undefined);
        document = undefined;
    });

    it('adds styles to the DOM', done => {
        const sheet = StyleSheet.create({
            red: {
                color: 'red',
            },
        });

        css(sheet.red);

        asap(() => {
            const styleTags = document.getElementsByTagName("style");
            const lastTag = styleTags[styleTags.length - 1];

            assert.include(lastTag.textContent, `${sheet.red._name}{`);
            assert.match(lastTag.textContent, /color:red/);
            assert.notMatch(lastTag.textContent, /!important/);
            done();
        });
    });
});
