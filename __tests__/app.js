'use strict';
const path = require('path');
const fs = require('fs-extra');
const assert = require('yeoman-assert');
const helpers = require('yeoman-test');

describe('generator-api-proxy:app', () => {
  beforeAll(() => {
    console.log('>>>>>>>>>>>>>>>>>>>>>', path.join(__dirname, '../generators/app'));
    return helpers.run(path.join(__dirname, '../generators/app'))
      .inTmpDir(function (dir) {
        // `dir` is the path to the new temporary directory
        fs.copySync(path.join(__dirname, '../templates'), dir);
      })
      .withPrompts({actionType: 'generate'})
      .withPrompts({apiSource: 'file'})
      .withPrompts({routeList: 'route-list.json'})
      .withPrompts({className: 'proxy-class.ts'});
  });

  it('creates files', () => {
    assert.file([
      'route-list.json',
      'proxy-class.ts'
    ]);
  });
});
