'use strict';
const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const _ = require('lodash');
const agent = require('superagent');

/*
 Plan:
 1. There're two options: generate proxy and validate proxy.                                       V
 2. Generate proxy:
 2.1. Ask user for path of JSON with REST API list or API returns list of REST API.                V
 2.2. Ask user for file name.                                                                      V
 2.3. Generate an interface from REST API list. For example: GET /api/v1/users -> getUsers(){...}  V
 2.4. When method is POST/PUT then add to function parameter `data:any` and send `.send(data)`.    V
 2.5. When method is GET/DELETE and have parameters then add them to function parameters and.
 */

module.exports = class extends Generator {
  prompting() {
    // Have Yeoman greet the user.
    this.log(yosay(
      `Hello, dear ${chalk.blue(this.user.git.name())}.\nWelcome to the tremendous ${chalk.red('api-proxy')} generator!`
    ));

    const prompts = [{
      type: 'list',
      name: 'actionType',
      message: 'Which action would like to execute?',
      choices: [{
        name: 'generate proxy',
        value: 'generate'
      }, {
        name: 'validate',
        value: 'validate'
      }]
    }, {
      type: 'list',
      name: 'apiSource',
      message: 'Select source for code generation',
      choices: [{
        name: 'file',
        value: 'file'
      }, {
        name: 'url',
        value: 'url'
      }],
      when: answers => answers.actionType === 'generate'
    }, {
      type: 'input',
      name: 'routeList',
      message: 'file path:',
      default: 'route-list.json',
      store: true,
      when: answers => answers.apiSource === 'file'
    }, {
      type: 'input',
      name: 'url',
      message: 'url to get route list',
      default: 'http://localhost:8081/',
      store: true,
      when: answers => answers.apiSource === 'url'
    }, {
      type: 'input',
      name: 'className',
      message: 'Your class name',
      default: 'api-proxy',
      store: true,
      when: answers => answers.actionType === 'generate'
    }];

    return this.prompt(prompts).then(props => {
      // To access props later use this.props.someAnswer;
      this.props = props;
    });
  }

  asyncTask() {
    let done = this.async();
    if (this.props.url) {
      agent.get(this.props.url)
        .end((err, res) => {
          if (err) {
            done(err);
          }
          this.log(`Route list loaded from ${chalk.blue(this.props.url)}`);
          this.apiCallRes = res.body;
          done();
        })
    } else {
      done();
    }
  }

  writing() {
    let routeList;
    if (this.props.url) {
      routeList = this.apiCallRes;
    } else {
      // Search in client current dir
      routeList = this.fs.readJSON(this.props.routeList, {});
    }
    routeList.API.forEach(item => {
      item.functionName = this.createGeneratedFunctionName(item.method, item.path);
      item.isNeedSendData = this.isNeedSendData(item.method);
      item.requestParams = this.retrieveRequestParams(item.method, item.path);
      item.requestParamsStr = this.requestParamsToString(item.requestParams);
    });

    let routeMap = {};
    routeList.API.forEach(item => {
      let microServicePath = item.path;
      let gateWayPath = item.path.replace(/\/api|\/v[0-9]/g, '');
      let method = item.method;
      if (routeMap[gateWayPath]) {
        if (!routeMap[gateWayPath].methods.includes(method)) {
          routeMap[gateWayPath].methods.push(method);
        }
      } else {
         if (gateWayPath !== '/') routeMap[gateWayPath] = { gateWayPath: gateWayPath, microServicePath: microServicePath, methods: [method] };
      }
        
    });

    this.fs.copyTpl(
      this.templatePath('api-proxy.txt'),
      this.destinationPath(`${this.createFileName(this.props.className)}.ts`),
      {
        className: this.createClassName(this.props.className),
        routeList: routeList.API,
        url: this.props.url,
        routeMap
      }
    );

    this.fs.copy(
      this.templatePath('route-info.txt'),
      this.destinationPath(`route-info.ts`)
    );
  };



  retrieveRequestParams(method, path) {
    if (!_.includes(['GET', 'DELETE'], method)) {
      return;
    }
    const result = [];
    const urlSegments = (_.split(path, '/'));
    for (let i = 0; i < urlSegments.length; i++) {
      const segment = urlSegments[i];
      if (segment.startsWith(':')) {
        let paramName = segment;
        if (i > 0) {
          paramName = `${urlSegments[i - 1]}${_.upperFirst(paramName.slice(1))}`;
        }
        result.push({ paramName });
      }
    }
    return result;
  }

  requestParamsToString(arr) {
    if (_.isNil(arr)) {
      return;
    }
    return arr.reduce((acc, val) => acc + ', ' + val.paramName, '').slice(2);
  }

  isNeedSendData(method) {
    return _.includes(['POST', 'PUT'], method);
  }


  createFileName(name) {
    return _.kebabCase(name);
  }

  createClassName(name) {
    return _.upperFirst(_.camelCase(name));
  }

  /*
   Returns function name.
   */
  createGeneratedFunctionName(method, path) {
    const withoutApi = _.without(_.split(path, '/'), 'api');
    for (let i = 0; i < withoutApi.length; i++) {
      const segment = withoutApi[i];
      if (segment.startsWith(':')) {
        withoutApi[i] = `by${_.upperFirst(segment.slice(1))}`;
      }
    }
    const name = withoutApi.reduce((acc, str) => `${acc ? acc : ''}${_.upperFirst(str)}`);

    return `${_.toLower(method)}${_.upperFirst(name)}`;
  }

};
