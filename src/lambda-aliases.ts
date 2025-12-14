import * as moduleAlias from 'module-alias';

// Only register aliases in Lambda environment
if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    moduleAlias.addAliases({
        src: 'dist/src',
    });
}
