const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VJTI Energy API',
      version: '1.0.0',
      description: 'API documentation for Energy Management System',
    },
    components: {
        securitySchemes: {
            bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            },
        },
    },
    security: [{ bearerAuth: [] }],
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
  },
  apis: ['./**/*.js'], // path to your route files
};

const specs = swaggerJsdoc(options);

module.exports = specs;