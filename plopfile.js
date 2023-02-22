const { exec } = require('node:child_process');

const { base_path } = require('./config.json');

const config = (plop) => {
  plop.setGenerator('test', {
    description: 'test generator',
    async prompts(inquirer) {
      const allAnswers = {};
      //
      if (base_path === '') {
        const project_path = await inquirer.prompt(
          {
            type: 'input',
            name: 'project_path',
            message: 'enter the project_path',
            default: 'C:/repos/',
          },
        );
        Object.assign(allAnswers, project_path);
      } else {
        console.log(`project will be created in: ${base_path}`);
      }
      //
      const project_slug = await inquirer.prompt(
        {
          type: 'input',
          name: 'project_slug',
          message: 'enter the project_slug',
        },
      );
      Object.assign(allAnswers, project_slug);
      //
      const lambdaOptions = await inquirer.prompt(
        {
          type: 'checkbox',
          name: 'selectedOptions',
          message: 'Select one or more options',
          choices: [
            { name: 'Incoming functions', value: 'Incoming' },
            { name: 'Outgoing function', value: 'Outgoing', checked: true },
          ],
        },
      );
      if (lambdaOptions.selectedOptions.length === 0) {
        throw new Error('Need to specify at least flow');
      }
      Object.assign(allAnswers, lambdaOptions);
      //
      if (lambdaOptions.selectedOptions.includes('Outgoing')) {
        const outgoingOptions = {};
        //
        const { outgoing_function_name } = await inquirer.prompt(
          {
            type: 'input',
            name: 'outgoing_function_name',
            message: 'name of the outgoing function',
            default: 'OutgoingFunction',
          },
        );
        outgoingOptions.name = outgoing_function_name;
        //
        const { include_vpc } = await inquirer.prompt(
          {
            type: 'confirm',
            name: 'include_vpc',
            message: 'Should the outgoing function include the vpc config?',
            default: false,
          },
        );
        outgoingOptions.includeVpc = include_vpc;
        //
        allAnswers.outgoingOptions = outgoingOptions;
      }
      if (lambdaOptions.selectedOptions.includes('Incoming')) {
        const incomingOptions = {};
        //
        const incoming_function_nums = await inquirer.prompt(
          {
            type: 'number',
            name: 'function_nums',
            message: 'how many incoming functions will there be?',
            default: 0,
          },
        );
        //
        const incoming_functions = [];
        for (let i = 0; i < incoming_function_nums.function_nums; i += 1) {
          const name = await inquirer.prompt(
            {
              type: 'input',
              name: `name_${i}`,
              message: `name of function ${i + 1}:`,
            },
          );
          incoming_functions.push(name[`name_${i}`]);
        }
        //
        incomingOptions.functions = incoming_functions;
        allAnswers.incomingOptions = incomingOptions;
      }
      return allAnswers;
    },
    actions: (data) => {
      const actions = [];
      console.log(data);
      const {
        project_path,
        project_slug,
        selectedOptions,
        outgoingOptions,
        incomingOptions,
      } = data;
      //
      actions.push(// template.yaml
        {
          type: 'add',
          path: '{{project_path}}{{project_slug}}/template.yaml',
          templateFile: 'templates/template.yaml/template.yaml',
        },
      );
      //
      if (selectedOptions.includes('Outgoing')) { // outgoing handlers
        actions.push(
          {
            type: 'append',
            path: '{{project_path}}{{project_slug}}/template.yaml',
            pattern: '',
            templateFile: 'templates/template.yaml/outgoing-function-template.yaml',
            data: { function_name: outgoingOptions.name },
          },
        );
        if (outgoingOptions.includeVpc) {
          actions.push(
            {
              type: 'modify',
              path: '{{project_path}}{{project_slug}}/template.yaml',
              pattern: /\s*VpcConfig:/,
              templateFile: 'templates/template.yaml/outgoing-function-vpc-template.yaml',
            },
          );
        } else {
          actions.push(
            {
              type: 'modify',
              path: '{{project_path}}{{project_slug}}/template.yaml',
              pattern: /\s*VpcConfig:/,
              template: '',
            },
          );
        }
        actions.push(
          {
            type: 'add',
            path: '{{project_path}}{{project_slug}}/src/outgoing/{{outgoingOptions.name}}.js',
            templateFile: 'templates/src/outgoing/handler.js',
            data: { function_name: outgoingOptions.name },
          },
        );
      }
      //
      if (selectedOptions.includes('Incoming')) { // incoming handlers
        for (let i = 0; i < incomingOptions.functions.length; i += 1) {
          const function_name = incomingOptions.functions[i];
          actions.push(
            {
              type: 'append',
              path: '{{project_path}}{{project_slug}}/template.yaml',
              pattern: '',
              templateFile: 'templates/template.yaml/incoming-function-template.yaml',
              data: { function_name },
            },
          );
          //
          actions.push(
            {
              type: 'add',
              path: '{{project_path}}{{project_slug}}/src/incoming/{{function_name}}.js',
              templateFile: 'templates/src/incoming/handler.js',
              data: { function_name },
            },
          );
        }
      }
      //
      actions.push(//.gitlab-ci.yml
        {
          type: 'add',
          path: '{{project_path}}{{project_slug}}/.gitlab-ci.yml',
          templateFile: 'templates/.gitlab-ci.yml',
        },
      );
      //
      actions.push(//.vscode
        {
          type: 'add',
          path: '{{project_path}}{{project_slug}}/.vscode/settings.json',
          templateFile: 'templates/.vscode/settings.json',
        },
      );
      //
      actions.push(//package.json
        {
          type: 'add',
          path: '{{project_path}}{{project_slug}}/package.json',
          templateFile: 'templates/package.json',
        },
      );
      //
      actions.push(//.gitignore
        {
          type: 'add',
          path: '{{project_path}}{{project_slug}}/.gitignore',
          templateFile: 'templates/.gitignore',
        },
      );
      //
      actions.push(//README.md
        {
          type: 'add',
          path: '{{project_path}}{{project_slug}}/README.md',
          templateFile: 'templates/README.md',
        },
      );
      //
      actions.push(//.eslintrc.json
        {
          type: 'add',
          path: '{{project_path}}{{project_slug}}/.eslintrc.json',
          templateFile: 'templates/.eslintrc.json',
        },
      );
      //
      actions.push(//create .git
        {
          type: 'git-init',
          path: '{{project_path}}{{project_slug}}/.eslintrc.json',
          templateFile: 'templates/.eslintrc.json',
          data: { project_slug, project_path },
        },
      );
      return actions;
    },
  });
  //
  plop.setActionType('git-init', (answers, actionConfig) => {
    // Define the function that will be executed when the action is triggered
    console.log(answers);
    console.log(actionConfig);
    const { data: { project_slug, project_path } } = actionConfig;
    if (project_path === '' || project_path === ' ' || project_path === undefined) {
      exec(`cd ${project_slug} && git init && git switch -c dev`);
    } else {
      exec(`cd ${project_path}${project_slug} && git init && git switch -c dev`);
    }
  });
};

module.exports = config;
