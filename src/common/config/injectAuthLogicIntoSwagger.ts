import { NestExpressApplication } from '@nestjs/platform-express';

export function injectAuthLogicIntoSwagger(app: NestExpressApplication<any>) {
    app.use('/api', (req, res, next) => {
        if (
            req.url.includes('swagger-ui-init.js') ||
            req.url.includes('swagger-initializer.js')
        ) {
            const originalSend = res.send;
            res.send = function (data) {
                const modifiedData = data.replace(
                    'window.ui = ui',
                    `window.ui = ui
          
  // Custom request interceptor
  ui.getConfigs().requestInterceptor = (request) => {
    const token = localStorage.getItem('bearer_token');
    if (token) {
      request.headers['Authorization'] = \`Bearer \${token}\`;
    }
    return request;
  };

  // Custom response interceptor  
  ui.getConfigs().responseInterceptor = (response) => {
    if (response.url.includes('/auth/login')) {
      try {
        const responseBody = JSON.parse(response.text);
        console.log("responseBodyresponseBody", responseBody)
        if (responseBody.success && responseBody.result && responseBody.result.accessToken) {
          const token = responseBody.result.accessToken;
          localStorage.setItem('bearer_token', token);
          
          const bearerAuth = {
            bearerAuth: {
              name: "Authorization",
              schema: { type: "http", scheme: "bearer" },
              value: token
            }
          };
          
          setTimeout(() => {
            ui.authActions.authorize(bearerAuth);
          }, 100);
        }
      } catch (e) {
        console.error('Error processing login response:', e);
      }
    }
    return response;
  };

  // Auto-authorize on page load if token exists
  const storedToken = localStorage.getItem('bearer_token');
  if (storedToken) {
    const bearerAuth = {
      bearerAuth: {
        name: "Authorization",
        schema: { type: "http", scheme: "bearer" },
        value: storedToken
      }
    };
    
    setTimeout(() => {
      ui.authActions.authorize(bearerAuth);
    }, 500);
  }`,
                );
                originalSend.call(this, modifiedData);
            };
        }
        next();
    });
}
