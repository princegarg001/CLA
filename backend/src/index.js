const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ ok: true, service: 'cla-v2-backend' }));
app.use('/api', apiRoutes);

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`CLA backend listening on port ${port}`));
