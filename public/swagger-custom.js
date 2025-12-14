
    // Custom Swagger UI interceptors
    window.onload = function() {
      const ui = window.ui;
      
      if (ui) {
        // Request interceptor to add stored token
        ui.getConfigs().requestInterceptor = (request) => {
          const token = localStorage.getItem('bearer_token');
          if (token) {
            request.headers['Authorization'] = `Bearer ${token}`;
          }
          return request;
        };

        // Response interceptor to auto-store token from login
        ui.getConfigs().responseInterceptor = (response) => {
          // Check if this is a login response
          if (response.url.includes('/auth/login')) {
            
            try {
              const responseBody = JSON.parse(response.text);
              console.log('responseBodyresponseBodyresponseBody',responseBody)
              if (responseBody.success && responseBody.result && responseBody.result.accessToken) {
                const token = responseBody.result.accessToken;
                localStorage.setItem('bearer_token', token);
                
                // Auto-authorize with the token
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
        }
      }
    };
  