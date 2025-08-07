require('dotenv').config();
require('module-alias/register');
const express = require('express');

// Fear and Greed API
const fngRouter = require('@/feargreed/routes/fngRoute');

// routing
const app = express();
app.use(express.json());

const fng_routes = [
  { path: '/fng', router: fngRouter }
];

const allRoutes = [...fng_routes];
allRoutes.forEach(({ path, router }) => app.use(path, router));

// env
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
